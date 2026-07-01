# backend/app/api/sessions.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import StreamingResponse
import io
import fitz  # PyMuPDF
import uuid
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.services.ml_nlp import execute_ai_ats_analysis

router = APIRouter()

def draw_multiline_text(page, text, x, y, max_width, line_height=14):
    words = text.split(' ')
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        if len(test_line) * 5.2 > max_width:
            lines.append(' '.join(current_line))
            current_line = [word]
        else:
            current_line.append(word)
    if current_line:
        lines.append(' '.join(current_line))
        
    for line in lines:
        page.insert_text(fitz.Point(x, y), line, fontsize=10, fontname="helv")
        y += line_height
    return y

@router.post("/setup", status_code=status.HTTP_201_CREATED)
async def setup_interview_session(
    resume: UploadFile = File(...),
    job_description: str = Form(default=""),
    session_type: str = Form(default="analysis"),
    interview_type: str = Form(default="technical"),
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

        # NEW: Await the blazing fast GPT ATS Analyzer
        analysis = await execute_ai_ats_analysis(extracted_resume_text, job_description)

        session_id = str(uuid.uuid4())
        session_document = {
            "id": session_id,
            "user_id": user_id,
            "session_type": session_type,
            "interview_type": interview_type,
            "resume_filename": resume.filename,
            "resume_text": extracted_resume_text,
            "job_description": job_description,
            "extracted_skills": analysis["extracted_skills"],
            "missing_skills": analysis["missing_skills"],
            "match_percentage": analysis["match_percentage"],
            "ats_suggestions": analysis["ats_suggestions"],
            "modified_resume_text": analysis.get("modified_resume_text") or extracted_resume_text,
            "created_at": datetime.now(timezone.utc)
        }

        await db.interview_sessions.insert_one(session_document)

        return {
            "session_id": session_id,
            "message": "Resume parameters parsed and interview track successfully mapped."
        }

    except Exception as e:
        print(f"🔥 Session Setup Error: {str(e)}") # Logs exact error to terminal
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
async def download_optimized_resume(
    session_id: str,
    db = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    session = await db.interview_sessions.find_one({"id": session_id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    modified_text = session.get("modified_resume_text") or session.get("resume_text", "")
    
    doc = fitz.open()
    margin = 50
    page_width = 595
    page_height = 842
    max_width = page_width - 2 * margin
    line_height = 14
    
    page = doc.new_page(width=page_width, height=page_height)
    y = margin
    
    paragraphs = modified_text.split("\n")
    for para in paragraphs:
        if not para.strip():
            y += 10
            continue
            
        # Wrap estimation check for pagination
        words = para.strip().split(' ')
        test_lines = 1
        current_len = 0
        for w in words:
            current_len += len(w) + 1
            if current_len * 5.2 > max_width:
                test_lines += 1
                current_len = len(w)
                
        if y + (test_lines * line_height) > page_height - margin:
            page = doc.new_page(width=page_width, height=page_height)
            y = margin
            
        y = draw_multiline_text(page, para.strip(), margin, y, max_width, line_height)
        y += 5  # paragraph space
        
    pdf_bytes = doc.write()
    doc.close()
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Optimized_{session.get('resume_filename', 'Resume.pdf')}"}
    )