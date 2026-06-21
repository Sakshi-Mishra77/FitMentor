# backend/app/services/interview_engine.py
import json
import logging
from typing import Dict, Any
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

def get_local_llm_client():
    """Initializes the client using the local Ollama server running Qwen."""
    return AsyncOpenAI(
        base_url='http://localhost:11434/v1',
        api_key='ollama'  # Required by the SDK framework, but ignored by Ollama locally
    )

async def generate_next_question(session_data: Dict[str, Any], history_count: int) -> str:
    client = get_local_llm_client()

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
            model="qwen2.5:3b",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.7,
            max_tokens=150
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Local Qwen Question Error: {e}")
        return "Could you tell me more about a complex challenge you recently faced and how you overcame it?"

async def evaluate_response(question: str, transcript: str) -> Dict[str, Any]:
    word_count = len(transcript.split())
    client = get_local_llm_client()

    prompt = f"""
    Evaluate this interview answer.
    Question: "{question}"
    Answer: "{transcript}"

    Provide a JSON response with exactly:
    "score": Integer 0-100 representing quality.
    "feedback": 1-2 sentence constructive critique.
    "acknowledgement": A brief conversational transition (e.g. "Great point.", "Understood.")
    
    Output ONLY valid JSON. Do not include markdown formatting like ```json.
    """

    try:
        response = await client.chat.completions.create(
            model="qwen2.5:3b",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.4,
            response_format={ "type": "json_object" }
        )
        
        result = json.loads(response.choices[0].message.content)
        result["word_count"] = word_count
        return result
    except Exception as e:
        logger.error(f"Local Qwen Evaluation Error: {e}")
        return {
            "score": 50,
            "feedback": f"Ensure Ollama is running. Evaluation failed: {str(e)}",
            "acknowledgement": "Okay, thank you for that.",
            "word_count": word_count
        }