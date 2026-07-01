# backend/app/api/interviews.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
import uuid
import re
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.services.interview_engine import generate_next_question, evaluate_response, transcribe_audio

router = APIRouter()

_PAUSE_PATTERNS = [
    r"\blet me think\b",
    r"\bi need (a )?(minute|moment|second|some time)\b",
    r"\bgive me (a )?(minute|moment|second)\b",
    r"\bcan i (have|take) (a )?(minute|moment|second)\b",
    r"\bone moment\b",
    r"\bjust a second\b",
    r"\bneed time to think\b",
    r"\bi'?m thinking\b",
    r"\bcan i think\b",
]


def _is_pause_request(transcript: str) -> bool:
    text = (transcript or "").strip().lower()
    if not text:
        return False

    return any(re.search(pattern, text) for pattern in _PAUSE_PATTERNS)

@router.get("/{session_id}/next-question")
async def get_next_question(
    session_id: str, 
    db = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    session = await db.interview_sessions.find_one({"id": session_id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Active interview session not found.")

    cursor = db.interview_interactions.find({"session_id": session_id}).sort("created_at", 1)
    interactions = await cursor.to_list(length=10)
    history_count = len(interactions)

    if history_count >= 5:
        return {"status": "complete", "message": "Interview sequence concluded.", "question": None}

    question_text = await generate_next_question(session, history_count, interactions)
    return {"status": "ongoing", "question": question_text}

@router.post("/{session_id}/answer")
async def submit_answer(
    session_id: str, 
    question: str = Form(...),
    audio: UploadFile = File(None),
    db = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    final_transcript = ""
    
    if audio:
        audio_bytes = await audio.read()
        final_transcript = await transcribe_audio(audio_bytes, audio.filename)
    
    if not final_transcript.strip():
        final_transcript = "User skipped or provided no audible response."

    # Fast-path pause detection so we can respond immediately without an extra LLM evaluation call.
    if _is_pause_request(final_transcript):
        return {
            "status": "pause",
            "transcript": final_transcript,
            "acknowledgement": "Of course, take your time. Let me know when you're ready.",
        }

    evaluation = await evaluate_response(question, final_transcript)

    # Keep a fallback pause check from evaluation for safety.
    if evaluation.get("is_pause_request", False):
        return {
            "status": "pause", 
            "transcript": final_transcript, 
            "acknowledgement": evaluation.get("acknowledgement", "Take your time.")
        }

    interaction = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user_id,
        "question": question,
        "transcript": final_transcript,
        "score": evaluation.get("score", 0),
        "feedback": evaluation.get("feedback", ""),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.interview_interactions.insert_one(interaction)

    return {"status": "success", "evaluation": evaluation, "transcript": final_transcript}

@router.get("/{session_id}/report")
async def get_interview_report(
    session_id: str,
    db = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    session = await db.interview_sessions.find_one({"id": session_id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Active interview session not found.")
        
    cursor = db.interview_interactions.find({"session_id": session_id}).sort("created_at", 1)
    interactions = await cursor.to_list(length=100)
    
    total_questions = len(interactions)
    skipped_questions = len([i for i in interactions if i.get("score") == 0])
    valid_answers = total_questions - skipped_questions
    
    average_score = 0
    if total_questions > 0:
        total_score = sum(i.get("score", 0) for i in interactions)
        average_score = round(total_score / total_questions)
        
    return {
        "session": {
            "id": session_id,
            "interview_type": session.get("interview_type", "technical"),
            "resume_filename": session.get("resume_filename", "Resume.pdf")
        },
        "metrics": {
            "average_score": average_score,
            "total_questions": total_questions,
            "valid_answers": valid_answers,
            "skipped_questions": skipped_questions
        },
        "interactions": [
            {
                "id": i.get("id"),
                "question": i.get("question"),
                "transcript": i.get("transcript"),
                "score": i.get("score", 0),
                "feedback": i.get("feedback", "")
            } for i in interactions
        ]
    }