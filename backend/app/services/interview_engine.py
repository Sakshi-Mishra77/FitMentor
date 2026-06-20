# backend/app/services/interview_engine.py
import os
import json
from typing import Dict, Any
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI Async Client
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

async def generate_next_question(session_data: Dict[str, Any], history_count: int) -> str:
    """Uses GPT to generate a highly contextual interview question."""
    
    interview_type = session_data.get("interview_type", "technical")
    extracted_skills = ", ".join(session_data.get("extracted_skills", []))
    missing_skills = ", ".join(session_data.get("missing_skills", []))
    job_description = session_data.get("job_description", "General Software Engineering Role")

    if history_count == 0:
        return "Welcome to your mock interview. Let's begin. Could you please introduce yourself and give a brief overview of your background?"

    prompt = f"""
    You are an expert technical recruiter and senior engineering manager conducting a {interview_type} mock interview.
    
    Candidate Profile:
    - Known Skills: {extracted_skills}
    - Identified Skill Gaps: {missing_skills}
    
    Target Job Description/Role: 
    {job_description}

    This is question number {history_count + 1} of the interview. 
    Based on the candidate's profile and the role, ask ONE highly relevant, challenging interview question.
    If this is a technical interview, ask a question that tests their problem-solving or system design capabilities related to their skills.
    If it is an HR interview, ask a behavioral question using the STAR method format.
    
    CRITICAL: Output ONLY the question itself. Do not include any introductory text, pleasantries, or formatting.
    """

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini", # Fast, cost-effective model perfect for real-time loops
            messages=[{"role": "system", "content": prompt}],
            temperature=0.7,
            max_tokens=150
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"GPT Generation Error: {e}")
        return "Could you tell me more about a complex challenge you recently faced and how you overcame it?"

async def evaluate_response(question: str, transcript: str) -> Dict[str, Any]:
    """Uses GPT to score the answer and generate a conversational acknowledgement."""
    word_count = len(transcript.split())
    
    prompt = f"""
    You are an expert technical interviewer evaluating a candidate's spoken response.
    
    Question Asked: "{question}"
    Candidate's Answer: "{transcript}"

    Provide a JSON response with the following keys exactly:
    "score": An integer from 0 to 100 representing the quality, clarity, and technical accuracy of the answer.
    "feedback": A 1-2 sentence constructive critique of their answer.
    "acknowledgement": A very brief, natural conversational transition to be spoken aloud BEFORE asking the next question (e.g., "Great point.", "I see, thanks.", "Understood. Let's move on.").
    
    Output ONLY valid JSON.
    """

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
            temperature=0.4,
            response_format={ "type": "json_object" } # Enforces strict JSON output
        )
        
        result = json.loads(response.choices[0].message.content)
        result["word_count"] = word_count
        return result
    except Exception as e:
        print(f"GPT Evaluation Error: {e}")
        return {
            "score": 50,
            "feedback": "The system could not fully parse your response context.",
            "acknowledgement": "Okay, thank you for that.",
            "word_count": word_count
        }