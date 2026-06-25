# backend/app/services/interview_engine.py
import os
import json
import logging
from typing import Dict, Any, List
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

def get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key or "your_actual" in api_key:
        return None
    
    # FIX: Added strict timeouts and automatic retries for network stability
    return AsyncOpenAI(
        api_key=api_key, 
        base_url="https://api.groq.com/openai/v1",
        timeout=45.0,
        max_retries=3
    )

async def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    # FIX: Byte-size validation. 
    # If the file is less than 100 bytes, it is our frontend "empty" fallback blob. 
    # Do not send it to Groq, or it will crash their audio decoder and cause a timeout.
    if len(audio_bytes) < 100:
        logger.info("Empty audio blob detected. Bypassing Whisper API.")
        return ""
        
    client = get_groq_client()
    if not client:
        return "System Error: GROQ_API_KEY missing."
    
    try:
        file_tuple = (filename, audio_bytes)
        response = await client.audio.transcriptions.create(
            file=file_tuple,
            model="whisper-large-v3",
            response_format="json"
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Groq Whisper Error: {e}")
        return "Audio transcription failed."

async def generate_next_question(session_data: Dict[str, Any], history_count: int, interactions: List[Dict[str, Any]] = None) -> str:
    client = get_groq_client()
    if not client:
        return "System Configuration Error: Please add a valid GROQ_API_KEY."

    interview_type = session_data.get("interview_type", "technical")
    extracted_skills = ", ".join(session_data.get("extracted_skills", []))
    missing_skills = ", ".join(session_data.get("missing_skills", []))
    job_description = session_data.get("job_description", "General Role")

    if history_count == 0:
        return "Welcome to your mock interview. Let's begin. Could you please introduce yourself and give a brief overview of your background?"

    history_text = ""
    if interactions:
        for idx, interaction in enumerate(interactions):
            history_text += f"\nQ{idx+1}: {interaction.get('question')}\nCandidate Answer: {interaction.get('transcript')}\n"

    prompt = f"""
    You are an expert technical recruiter conducting a {interview_type} mock interview.
    
    Candidate Profile:
    - Known Skills: {extracted_skills}
    - Skill Gaps: {missing_skills}
    Target Role: {job_description}

    Previous Conversation History:
    {history_text if history_text else "None"}

    This is question number {history_count + 1}. 
    
    CRITICAL BEHAVIORAL INSTRUCTIONS:
    1. If the Candidate Answer in the history shows they don't know, skipped, or are unable to answer the previous question, DO NOT ask a similar question. Pivot completely to a different technical skill or behavioral trait.
    2. If the candidate gave a detailed answer, ask a natural, related follow-up question digging deeper into their response.
    3. Never repeat a previous question.
    4. Output ONLY the next question itself. Do not include introductory text, pleasantries, or feedback.
    """

    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.7,
            max_tokens=150
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq LLaMA Question Error: {e}")
        return "Moving on, could you describe a time you had to learn a new technology quickly to solve a problem?"

async def evaluate_response(question: str, transcript: str) -> Dict[str, Any]:
    word_count = len(transcript.split())
    client = get_groq_client()
    if not client:
        return {"score": 0, "feedback": "Missing GROQ_API_KEY.", "acknowledgement": "Okay.", "word_count": word_count}

    prompt = f"""
    Evaluate this interview answer.
    Question: "{question}"
    Answer: "{transcript}"

    CRITICAL INSTRUCTION: If the candidate explicitly says they don't know, want to skip, or are unable to answer (or if the Answer is blank), output a score of 0, give brief feedback noting the skip, and make the acknowledgement a natural pivot (e.g., "No problem, let's move on.").

    Provide a JSON response with exactly:
    "score": Integer 0-100 representing quality (0 if skipped).
    "feedback": 1-2 sentence constructive critique (or note that it was skipped).
    "acknowledgement": A brief conversational transition to be spoken aloud.
    
    Output ONLY valid JSON.
    """

    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.4,
            response_format={ "type": "json_object" }
        )
        result = json.loads(response.choices[0].message.content)
        result["word_count"] = word_count
        return result
    except Exception as e:
        logger.error(f"Groq LLaMA Evaluation Error: {e}")
        return {"score": 50, "feedback": f"Evaluation failed: {str(e)}", "acknowledgement": "Okay, thank you for that.", "word_count": word_count}