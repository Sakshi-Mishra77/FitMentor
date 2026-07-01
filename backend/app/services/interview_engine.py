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
    
    return AsyncOpenAI(
        api_key=api_key, 
        base_url="https://api.groq.com/openai/v1",
        timeout=45.0,
        max_retries=3
    )

async def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
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

    if interview_type == "hr":
        persona = "Senior HR Executive and Behavioral Recruiter"
        focus_area = "Focus EXCLUSIVELY on behavioral traits, cultural fit, teamwork, leadership, conflict resolution, and past situational experiences (e.g., the STAR method). DO NOT ask coding, framework, or system architecture questions."
        if history_count == 0:
            return "Welcome to your HR mock interview. Let's begin. Could you please introduce yourself and tell me a bit about your professional journey and what drives you?"
    else:
        persona = "Expert Senior Engineering Interviewer"
        focus_area = "Focus EXCLUSIVELY on deep technical knowledge, system design, problem-solving, and the specific programming languages/frameworks required for the role."
        if history_count == 0:
            return "Welcome to your technical mock interview. Let's begin. Could you please introduce yourself and give a brief overview of your technical background?"

    history_text = ""
    if interactions:
        for idx, interaction in enumerate(interactions):
            history_text += f"\nQ{idx+1}: {interaction.get('question')}\nCandidate Answer: {interaction.get('transcript')}\n"

    prompt = f"""
    You are an {persona} conducting a professional mock interview.
    
    Candidate Profile:
    - Target Role: {job_description}
    - Known Skills: {extracted_skills}
    - Skill Gaps: {missing_skills}

    Interview Type: {interview_type.upper()}
    {focus_area}

    Previous Conversation History:
    {history_text if history_text else "None"}

    This is question number {history_count + 1}. 
    
    CRITICAL INSTRUCTIONS:
    1. Your question MUST align perfectly with your persona and Focus Area.
    2. If the Candidate Answer in the history shows they don't know, skipped, or are unable to answer the previous question, DO NOT ask a similar question. Pivot completely to a different topic within your Focus Area.
    3. If the candidate gave a detailed answer, ask a natural, related follow-up question digging deeper into their response.
    4. Never repeat a previous question.
    5. Output ONLY the next question itself. Do not include introductory text, pleasantries, or feedback.
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
        return "Moving on, could you describe a time you had to adapt to a sudden change in a project?"

async def evaluate_response(question: str, transcript: str) -> Dict[str, Any]:
    word_count = len(transcript.split())
    client = get_groq_client()
    if not client:
        return {"score": 0, "feedback": "Missing GROQ_API_KEY.", "acknowledgement": "Okay.", "word_count": word_count, "is_pause_request": False}

    prompt = f"""
    Evaluate this interview answer.
    Question: "{question}"
    Answer: "{transcript}"

    CRITICAL INSTRUCTIONS:
    1. PAUSE REQUEST: If the candidate explicitly asks for time to think (e.g., "give me a minute", "let me think", "can I take a moment"), output a score of 0, set "is_pause_request" to true, and make the acknowledgement comforting (e.g., "Of course, take your time.").
    2. SKIPPED/UNKNOWN: If the candidate explicitly says they don't know, want to skip, or gives a non-answer/nonsense, output a score of 0, set "is_pause_request" to false, give brief feedback noting the skip, and make the acknowledgement a gentle pivot (e.g., "No problem, let's move on.").
    3. VALID ATTEMPT: If the candidate attempts a real answer, score it normally 0-100, set "is_pause_request" to false, provide feedback, and create a CONTEXTUAL acknowledgement directly related to their answer (e.g., "That's a solid approach to budget management.", "Interesting perspective.", or "Thank you for explaining that process."). DO NOT use "No problem, let's move on" for valid attempts.

    Provide a JSON response with exactly:
    "score": Integer 0-100 representing quality (0 if skipped or pause).
    "feedback": 1-2 sentence constructive critique (or note that it was skipped).
    "acknowledgement": A brief conversational transition to be spoken aloud.
    "is_pause_request": Boolean (true ONLY if they asked for time to think).
    
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
        if "is_pause_request" not in result:
            result["is_pause_request"] = False
        return result
    except Exception as e:
        logger.error(f"Groq LLaMA Evaluation Error: {e}")
        return {"score": 50, "feedback": f"Evaluation failed: {str(e)}", "acknowledgement": "Okay, thank you for that.", "word_count": word_count, "is_pause_request": False}