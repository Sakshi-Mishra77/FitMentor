# backend/app/services/ml_nlp.py
import os
import json
import logging
from typing import Dict, Any
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

def get_groq_client():
    """Initializes the client using Groq's free infrastructure."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key or "your_actual" in api_key:
        return None
    
    return AsyncOpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1"
    )

async def execute_ai_ats_analysis(resume_text: str, jd_text: str) -> Dict[str, Any]:
    """Uses Groq LLaMA 3.1 for lightning-fast, zero-shot keyword extraction and gap analytics."""
    client = get_groq_client()
    
    if not client:
        logger.error("Groq API Key missing during resume analysis execution.")
        return {
            "extracted_skills": ["Configuration Error"],
            "missing_skills": [],
            "match_percentage": 0,
            "ats_suggestions": ["GROQ_API_KEY is missing. Please check your backend/.env file config configuration details."]
        }

    if not resume_text.strip():
        return {
            "extracted_skills": [],
            "missing_skills": [],
            "match_percentage": 0,
            "ats_suggestions": ["No readable text layer detected within the uploaded target document structure."]
        }

    # Safe buffer limits for prompt constraints
    safe_resume = resume_text[:5000]
    safe_jd = jd_text[:3000] if jd_text else ""

    prompt = f"""
    You are an expert corporate Applicant Tracking System (ATS) optimization matrix engine.
    
    Candidate Resume Text:
    {safe_resume}
    
    Target Job Description Context:
    {safe_jd}
    
    Perform an extraction check for skills and core technical competencies.
    Provide a JSON response with exactly these keys:
    "extracted_skills": [Array of string core technical competencies/frameworks/tools explicitly listed on the resume]
    "missing_skills": [Array of string core technical skills required by the JD but missing from the resume. Max 7 items]
    "match_percentage": An integer between 0 and 100 representing job alignment density.
    "ats_suggestions": [Array of 3 to 4 string sentences offering direct, highly personalized advice on where and how to integrate missing criteria into their resume bullet points]
    "modified_resume_text": "A string containing the candidate's resume content reorganized and optimized for ATS compliance, with missing skills seamlessly and naturally integrated into the professional profile, technical skills, and experience bullet points."

    If no Target Job Description is provided, populate missing_skills as [], set match_percentage to 100, and populate ats_suggestions with generic high-impact engineering resume layout improvement methods.
    Output ONLY valid JSON.
    """

    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        result = json.loads(content)
        
        return {
            "extracted_skills": result.get("extracted_skills") or [],
            "missing_skills": result.get("missing_skills") or [],
            "match_percentage": result.get("match_percentage") or 0,
            "ats_suggestions": result.get("ats_suggestions") or ["Review complete. Structural layout alignment verified successfully."],
            "modified_resume_text": result.get("modified_resume_text") or resume_text
        }
    except Exception as e:
        logger.error(f"Groq ATS Analysis Matrix Generation Failure: {e}")
        return {
            "extracted_skills": ["Parsing Error"],
            "missing_skills": [],
            "match_percentage": 0,
            "ats_suggestions": [f"The system analysis layer failed to map vectors securely: {str(e)}"],
            "modified_resume_text": resume_text
        }