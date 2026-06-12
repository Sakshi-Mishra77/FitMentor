# backend/app/api/sessions.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import StreamingResponse
import fitz  # PyMuPDF
import uuid
import io
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.services.nlp import evaluate_resume_and_ats

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

        analysis = evaluate_resume_and_ats(extracted_resume_text, job_description)

        session_id = str(uuid.uuid4())
        session_document = {
            "id": session_id,
            "user_id": user_id,
            "resume_filename": resume.filename,
            "resume_text": extracted_resume_text,
            "job_description": job_description,
            "extracted_skills": analysis["extracted_skills"],
            "missing_skills": analysis["missing_skills"],
            "match_percentage": analysis["match_percentage"],
            "ats_suggestions": analysis["ats_suggestions"],
            "modified_resume_text": analysis["modified_resume_text"],  # Stored safely in Mongo
            "created_at": datetime.now(timezone.utc)
        }

        await db.interview_sessions.insert_one(session_document)

        return {
            "session_id": session_id,
            "message": "Resume context parsed, analyzed, and optimized successfully."
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing the text file: {str(e)}"
        )

@router.get("/", response_model=list)
async def get_all_user_sessions(db = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    cursor = db.interview_sessions.find({"user_id": user_id}).sort("created_at", -1)
    sessions = await cursor.to_list(length=100)
    for s in sessions:
        if "_id" in s:
            del s["_id"]
    return sessions

@router.get("/{session_id}")
async def get_interview_session(session_id: str, db = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    session = await db.interview_sessions.find_one({"id": session_id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session context layout not found.")
    if "_id" in session:
        del session["_id"]
    return session

@router.get("/{session_id}/download-resume")
async def download_optimized_resume_pdf(
    session_id: str,
    db = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Generates an ATS-compliant single-column clean PDF from the modified text metrics."""
    session = await db.interview_sessions.find_one({"id": session_id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session context parameters missing.")
    
    modified_text = session.get("modified_resume_text", "No optimizations generated.")

    # Render fresh PDF document using built-in PyMuPDF text insertion frameworks
    doc = fitz.open()
    page = doc.new_page(width=595, height=842) # Standard A4 geometry specs
    
    # Margin boundary layout parameters
    margin = 50
    y_position = 60
    line_height = 14
    
    for line in modified_text.split('\n'):
        if y_position > 780:  # Automatic page break trigger overflow boundary
            page = doc.new_page(width=595, height=842)
            y_position = 60
        
        # Draw text to page layout safely
        page.insert_text((margin, y_position), line, fontsize=10, fontname="courier")
        y_position += line_height

    # Save document into a memory byte buffer stream
    pdf_stream = io.BytesIO()
    doc.save(pdf_stream)
    doc.close()
    pdf_stream.seek(0)

    clean_filename = f"Optimized_{session.get('resume_filename', 'Resume.pdf')}"
    
    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={clean_filename}"}
    )