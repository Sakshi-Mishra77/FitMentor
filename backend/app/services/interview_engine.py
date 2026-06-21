# backend/app/services/interview_engine.py
import os
import json
import logging
from typing import Dict, Any
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

def get_openai_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key or "your-actual-api-key-here" in api_key:
        return None
    return AsyncOpenAI(api_key=api_key)

async def generate_next_question(session_data: Dict[str, Any], history_count: int) -> str:
    client = get_openai_client()
    
    if not client:
        return "System Configuration Error: Please add a valid OPENAI_API_KEY to your backend/.env file to generate questions."

    interview_type = session_data.get("interview_type", "technical")
    extracted_skills = ", ".join(session_data.get("extracted_skills", []))
    missing_skills = ", ".join(session_data.get("missing_skills", []))
    job_description = session_data.get("job_description", "General Role")

    if history_count == 0:
        return "Welcome to your mock interview. Let's begin. Could you please introduce yourself and give a brief overview of your background?"

    prompt = f"""
    You are an expert technical recruiter conducting a {interview_type} mock interview.
    Candidate Profile:
    - Known Skills: {extracted_skills}
    - Skill Gaps: {missing_skills}
    Target Role: {job_description}

    This is question number {history_count + 1}. Ask ONE highly relevant, challenging interview question.
    CRITICAL: Output ONLY the question itself. Do not include introductory text.
    """

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.7,
            max_tokens=150
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"GPT Question Error: {e}")
        return "Could you tell me more about a complex challenge you recently faced and how you overcame it?"

async def evaluate_response(question: str, transcript: str) -> Dict[str, Any]:
    word_count = len(transcript.split())
    client = get_openai_client()
    
    if not client:
        return {
            "score": 0,
            "feedback": "Cannot evaluate response. OpenAI API Key is missing.",
            "acknowledgement": "Okay.",
            "word_count": word_count
        }

    prompt = f"""
    Evaluate this interview answer.
    Question: "{question}"
    Answer: "{transcript}"

    Provide a JSON response with exactly:
    "score": Integer 0-100 representing quality.
    "feedback": 1-2 sentence constructive critique.
    "acknowledgement": A brief conversational transition (e.g. "Great point.", "Understood.")
    
    Output ONLY valid JSON.
    """

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.4,
            response_format={ "type": "json_object" }
        )
        
        result = json.loads(response.choices[0].message.content)
        result["word_count"] = word_count
        return result
    except Exception as e:
        logger.error(f"GPT Evaluation Error: {e}")
        return {
            "score": 50,
            "feedback": f"Evaluation failed: {str(e)}",
            "acknowledgement": "Okay, thank you for that.",
            "word_count": word_count
        }