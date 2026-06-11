# backend/app/api/sessions.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
import fitz  # PyMuPDF
import uuid
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.services.nlp import analyze_skill_gap  # Imported the NLP service

router = APIRouter()

@router.post("/setup", status_code=status.HTTP_201_CREATED)
async def setup_interview_session(
    resume: UploadFile = File(...),
    job_description: str = Form(""),
    db = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    if not resume.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF format resumes are accepted."
        )

    try:
        pdf_bytes = await resume.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        extracted_resume_text = ""
        for page in doc:
            extracted_resume_text += page.get_text()
        doc.close()

        if not extracted_resume_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF appears to be empty or unscannable."
            )

        # Execute NLP Skill Gap Analysis Engine
        analysis = analyze_skill_gap(extracted_resume_text, job_description)

        session_id = str(uuid.uuid4())
        session_document = {
            "id": session_id,
            "user_id": user_id,
            "resume_filename": resume.filename,
            "resume_text": extracted_resume_text,
            "job_description": job_description,
            "extracted_skills": analysis["extracted_skills"],  # Populated live
            "missing_skills": analysis["missing_skills"],      # Populated live
            "created_at": datetime.now(timezone.utc)
        }

        await db.interview_sessions.insert_one(session_document)

        return {
            "session_id": session_id,
            "message": "Resume context parsed and analyzed successfully."
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing the text file: {str(e)}"
        )

@router.get("/{session_id}")
async def get_interview_session(
    session_id: str,
    db = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Retrieves session context and skill analytics for the frontend interview dashboard."""
    session = await db.interview_sessions.find_one({"id": session_id, "user_id": user_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session context not found or unauthorized access."
        )
    
    # Remove database internal _id before serving JSON
    if "_id" in session:
        del session["_id"]
        
    return session