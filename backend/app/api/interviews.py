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

# NEW: Accepts audio files via Form Data
@router.post("/{session_id}/answer")
async def submit_answer(
    session_id: str, 
    question: str = Form(...),
    audio: UploadFile = File(None),
    db = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    final_transcript = ""
    
    # 1. Transcribe the audio via Whisper
    if audio:
        audio_bytes = await audio.read()
        final_transcript = await transcribe_audio(audio_bytes, audio.filename)
    
    if not final_transcript.strip():
        final_transcript = "User skipped or provided no audible response."

    # 2. Evaluate the transcribed text
    evaluation = await evaluate_response(question, final_transcript)

    # 3. Save to database
    interaction = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user_id,
        "question": question,
        "transcript": final_transcript,
        "score": evaluation["score"],
        "feedback": evaluation["feedback"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.interview_interactions.insert_one(interaction)

    # Return the transcript back to the frontend so the user can see what Whisper heard
    return {"message": "Response analyzed successfully.", "evaluation": evaluation, "transcript": final_transcript}

@router.get("/{session_id}/report")
async def get_interview_report(
    session_id: str,
    db = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    session = await db.interview_sessions.find_one({"id": session_id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    
    cursor = db.interview_interactions.find({"session_id": session_id, "user_id": user_id}).sort("created_at", 1)
    interactions = await cursor.to_list(length=100)
    
    if not interactions:
        raise HTTPException(status_code=400, detail="No recorded answers for this session.")
        
    formatted_interactions = []
    total_score = 0
    valid_answers = 0
    skipped_questions = 0
    
    for i in interactions:
        score = i.get("score", 0)
        total_score += score
        if score > 0:
            valid_answers += 1
        else:
            skipped_questions += 1
            
        formatted_interactions.append({
            "id": i.get("id"),
            "question": i.get("question"),
            "transcript": i.get("transcript"),
            "score": score,
            "feedback": i.get("feedback")
        })
        
    average_score = round(total_score / len(interactions)) if interactions else 0
    
    return {
        "session": {
            "id": session["id"],
            "interview_type": session.get("interview_type", "technical"),
            "resume_filename": session.get("resume_filename", "")
        },
        "metrics": {
            "average_score": average_score,
            "total_questions": len(interactions),
            "valid_answers": valid_answers,
            "skipped_questions": skipped_questions
        },
        "interactions": formatted_interactions
    }