# backend/app/api/interviews.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.services.interview_engine import generate_next_question, evaluate_response

router = APIRouter()

class AnswerPayload(BaseModel):
    question: str
    transcript: str

@router.get("/{session_id}/next-question")
async def get_next_question(
    session_id: str, 
    db = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    session = await db.interview_sessions.find_one({"id": session_id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Active interview session not found.")

    history_count = await db.interview_interactions.count_documents({"session_id": session_id})

    # Standard interview limits to 5 questions
    if history_count >= 5:
        return {"status": "complete", "message": "Interview sequence concluded.", "question": None}

    # Await the GPT generator
    question_text = await generate_next_question(session, history_count)
    return {"status": "ongoing", "question": question_text}

@router.post("/{session_id}/answer")
async def submit_answer(
    session_id: str, 
    payload: AnswerPayload, 
    db = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    # Await the GPT evaluation
    evaluation = await evaluate_response(payload.question, payload.transcript)

    interaction = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user_id,
        "question": payload.question,
        "transcript": payload.transcript,
        "score": evaluation["score"],
        "feedback": evaluation["feedback"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.interview_interactions.insert_one(interaction)

    return {"message": "Response analyzed successfully.", "evaluation": evaluation}


@router.get("/{session_id}/report")
async def get_interview_report(
    session_id: str, 
    db = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    # Verify the session exists and belongs to the user
    session = await db.interview_sessions.find_one({"id": session_id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    # Fetch all recorded Q&A interactions
    cursor = db.interview_interactions.find({"session_id": session_id}).sort("created_at", 1)
    interactions = await cursor.to_list(length=100)

    # Calculate overall metrics
    total_score = 0
    valid_answers = 0
    
    for item in interactions:
        item["_id"] = str(item["_id"]) # Serialize MongoDB ObjectId
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