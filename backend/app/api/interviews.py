# backend/app/api/interviews.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
import uuid
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.services.interview_engine import generate_next_question, evaluate_response, transcribe_audio

router = APIRouter()

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

    evaluation = await evaluate_response(question, final_transcript)

    # THE FIX: Intercept "Pause" requests. 
    # Do NOT log this to the database, ensuring the user doesn't lose a question attempt!
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