import random
from typing import Dict, Any

def generate_next_question(session_data: Dict[str, Any], history_count: int) -> str:
    """Generates a contextual interview question based on user skills and track."""
    interview_type = session_data.get("interview_type", "technical")
    extracted_skills = session_data.get("extracted_skills", [])
    missing_skills = session_data.get("missing_skills", [])

    if history_count == 0:
        return "Welcome to your mock interview. Let's begin. Could you please introduce yourself and give a brief overview of your background?"

    if interview_type == "hr":
        hr_prompts = [
            "Can you describe a time when you had to work with a difficult team member? How did you handle it?",
            "Tell me about a project that did not go as planned. What did you learn from that experience?",
            "Describe a situation where you had to meet a tight deadline. How did you prioritize your tasks?",
            "How do you typically approach a situation where you disagree with a manager's technical decision?",
            "What do you consider your greatest professional achievement so far, and why?"
        ]
        return random.choice(hr_prompts)
    else:
        if missing_skills and history_count % 2 == 1:
            skill = random.choice(missing_skills)
            return f"I noticed your background might not heavily feature {skill}, which is important for this role. How would you approach learning or working with {skill} if required?"
        elif extracted_skills:
            skill = random.choice(extracted_skills)
            return f"Your profile highlights experience with {skill}. Could you dive deeper into a complex problem you successfully solved using this technology?"
        else:
            return "Can you walk me through the system architecture of the most challenging technical project you have deployed?"

def evaluate_response(question: str, transcript: str) -> Dict[str, Any]:
    """Evaluates the transcribed answer and generates a conversational transition."""
    words = transcript.strip().split()
    word_count = len(words)
    
    score = min(100, max(0, int((word_count / 50) * 100))) 

    # Generate a conversational transition based on response metrics
    if word_count < 15:
        feedback = "Response was too brief. Try utilizing the STAR method (Situation, Task, Action, Result) to add more structural detail."
        acknowledgement = random.choice(["Noted.", "Alright.", "Okay."])
    elif "um" in transcript.lower() or "uh" in transcript.lower():
        feedback = "Good detail provided, but try to minimize filler words to sound more authoritative and confident."
        acknowledgement = random.choice(["Understood.", "Got it.", "I see, thank you."])
    else:
        feedback = "Excellent structural response. You provided clear context and communicated your points effectively."
        acknowledgement = random.choice(["That is a great approach.", "Excellent response.", "That makes a lot of sense.", "Awesome, thank you for sharing that context."])

    return {
        "score": score,
        "feedback": feedback,
        "word_count": word_count,
        "acknowledgement": acknowledgement
    }