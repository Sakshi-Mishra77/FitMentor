# backend/app/api/interviews.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional # THE FIX: Added Optional here!
import uuid
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.services.interview_engine import generate_next_question, evaluate_response, transcribe_audio
from app.services.cv_engine import cv_module

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
    images: Optional[List[UploadFile]] = File(None),
    db = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    final_transcript = ""
    cv_summary = "No visual data recorded."
    
    if audio:
        audio_bytes = await audio.read()
        final_transcript = await transcribe_audio(audio_bytes, audio.filename)
    
    if not final_transcript.strip():
        final_transcript = "User skipped or provided no audible response."

    # Process Video Frames through CV Module
    if images:
        image_bytes_list = [await img.read() for img in images if img.filename]
        if image_bytes_list:
            cv_summary = cv_module.analyze_snapshots(image_bytes_list)

    evaluation = await evaluate_response(question, final_transcript, cv_summary)

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
        raise HTTPException(status_code=404, detail="Interview session not found.")

    cursor = db.interview_interactions.find({"session_id": session_id}).sort("created_at", 1)
    interactions = await cursor.to_list(length=100)

    total_score = 0
    valid_answers = 0
    
    for item in interactions:
        item["_id"] = str(item["_id"]) 
        if item.get("score", 0) > 0:
            total_score += item["score"]
            valid_answers += 1
            
    avg_score = round(total_score / valid_answers) if valid_answers > 0 else 0

    return {
        "session": {
            "id": session["id"],
            "interview_type": session.get("interview_type", "technical"),
            "resume_filename": session.get("resume_filename", "Unknown")
        },
        "metrics": {
            "average_score": avg_score,
            "total_questions": len(interactions),
            "valid_answers": valid_answers,
            "skipped_questions": len(interactions) - valid_answers
        },
        "interactions": interactions
    }