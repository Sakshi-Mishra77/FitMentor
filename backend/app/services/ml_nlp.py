# backend/app/services/ml_nlp.py
import logging
from typing import Dict, Any
from sentence_transformers import SentenceTransformer, util

logger = logging.getLogger(__name__)

# 1. GLOBAL INITIALIZATION
# The model loads into memory ONCE during server boot, eliminating the 10-second lag per request.
try:
    logger.info("Mounting BERT Model into memory...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    logger.error(f"Failed to load BERT: {e}")
    model = None

# Standard tech skills for exact and semantic extraction
SKILL_POOL = [
    "Python", "Java", "C++", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", 
    "FastAPI", "MongoDB", "PostgreSQL", "Docker", "Kubernetes", "AWS", "Machine Learning", 
    "Deep Learning", "NLP", "Computer Vision", "TensorFlow", "PyTorch", "SQL", "Git", "Linux", 
    "CI/CD", "REST API", "System Design", "Agile", "YOLOv8"
]

async def execute_ai_ats_analysis(resume_text: str, jd_text: str) -> Dict[str, Any]:
    """Uses BERT for lightning-fast semantic mapping and gap analysis."""
    if not model:
        return {
            "extracted_skills": ["Model Error"],
            "missing_skills": [],
            "match_percentage": 0,
            "ats_suggestions": ["BERT model failed to initialize on the server."]
        }

    try:
        resume_lower = resume_text.lower()
        jd_lower = jd_text.lower() if jd_text else ""

        extracted_skills = [skill for skill in SKILL_POOL if skill.lower() in resume_lower]
        jd_skills = [skill for skill in SKILL_POOL if skill.lower() in jd_lower]

        missing_skills = []
        match_percentage = 85 # Default fallback

        if jd_skills:
            raw_missing = [s for s in jd_skills if s not in extracted_skills]
            
            # Use BERT's 'util' for semantic fallback check
            if raw_missing and extracted_skills:
                missing_embeddings = model.encode(raw_missing, convert_to_tensor=True)
                extracted_embeddings = model.encode(extracted_skills, convert_to_tensor=True)
                
                cosine_scores = util.cos_sim(missing_embeddings, extracted_embeddings)
                
                for i, skill in enumerate(raw_missing):
                    # Only flag as missing if it isn't semantically identical to a known skill
                    if len(cosine_scores[i]) == 0 or cosine_scores[i].max().item() < 0.75:
                        missing_skills.append(skill)
            else:
                missing_skills = raw_missing
            
            match_percentage = max(0, int(((len(jd_skills) - len(missing_skills)) / len(jd_skills)) * 100))

        suggestions = []
        if missing_skills:
            suggestions.append(f" Consider adding explicit mentions of {', '.join(missing_skills[:3])} to bypass initial ATS filters.")
            suggestions.append(" Ensure your technical bullet points quantify the impact of your implementations.")
        else:
            suggestions.append(" Excellent baseline alignment with the target role.")
            suggestions.append(" Focus your interview preparation on deep-diving into your system architectures.")

        return {
            "extracted_skills": extracted_skills,
            "missing_skills": missing_skills[:7],
            "match_percentage": match_percentage,
            "ats_suggestions": suggestions
        }

    except Exception as e:
        logger.error(f"ATS BERT Analysis Error: {e}")
        return {
            "extracted_skills": ["Parsing Error"],
            "missing_skills": [],
            "match_percentage": 0,
            "ats_suggestions": [f"Execution failed: {str(e)}"]
        }