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
    """Fetches the next contextual question for the active session."""
    session = await db.interview_sessions.find_one({"id": session_id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Active interview session not found.")

    # Determine how many questions have already been asked
    history_count = await db.interview_interactions.count_documents({"session_id": session_id})

    # Conclude interview after 5 questions
    if history_count >= 5:
        return {"status": "complete", "message": "Interview sequence concluded.", "question": None}

    question_text = generate_next_question(session, history_count)
    return {"status": "ongoing", "question": question_text}

@router.post("/{session_id}/answer")
async def submit_answer(
    session_id: str, 
    payload: AnswerPayload, 
    db = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    """Processes the spoken transcript, calculates metrics, and stores the interaction."""
    evaluation = evaluate_response(payload.question, payload.transcript)

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