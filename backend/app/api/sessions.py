# backend/app/api/sessions.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
import fitz  # PyMuPDF
import uuid
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user_id

router = APIRouter()

@router.post("/setup", status_code=status.HTTP_201_CREATED)
async def setup_interview_session(
    resume: UploadFile = File(...),
    job_description: str = Form(""),
    db = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    # 1. Validate file extension type
    if not resume.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF format resumes are accepted."
        )

    try:
        # 2. Read file stream completely into memory
        pdf_bytes = await resume.read()
        
        # 3. Initialize PyMuPDF to extract text
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

        # 4. Assemble the MongoDB Session document
        session_id = str(uuid.uuid4())
        session_document = {
            "id": session_id,
            "user_id": user_id,
            "resume_filename": resume.filename,
            "resume_text": extracted_resume_text,
            "job_description": job_description,
            "extracted_skills": [],  # Filled in Phase 2 NLP pipeline
            "missing_skills": [],    # Filled in Phase 2 NLP pipeline
            "created_at": datetime.now(timezone.utc)
        }

        # 5. Commit to the interview_sessions collection
        await db.interview_sessions.insert_one(session_document)

        return {
            "session_id": session_id,
            "message": "Resume context parsed and synchronized successfully."
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing the text file: {str(e)}"
        )