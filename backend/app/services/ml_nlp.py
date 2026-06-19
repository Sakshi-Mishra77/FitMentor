import re
import logging
from typing import Dict, List, Any
import spacy
from sentence_transformers import SentenceTransformer, util

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Internal state for lazy loading
_ml_model = None
_nlp = None
_skill_embeddings = None

SKILL_POOL = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "SQL",
    "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "FastAPI", "Django",
    "MongoDB", "PostgreSQL", "Redis", "Docker", "Kubernetes", "CI/CD", "Jenkins",
    "Git", "GitHub", "GraphQL", "REST API", "Microservices", "System Design", "Agile", 
    "Scrum", "Data Structures", "Algorithms", "Machine Learning", "Deep Learning", 
    "Artificial Intelligence", "Natural Language Processing", "NLP", "Computer Vision", 
    "Site Reliability Engineering", "SRE", "Human Activity Recognition", "HAR", "YOLOv8"
]

def _ensure_models_loaded():
    """Initializes machine learning models into memory only on first invocation."""
    global _ml_model, _nlp, _skill_embeddings
    
    if _ml_model is None or _nlp is None:
        logger.info("Initializing NLP models for semantic extraction...")
        _ml_model = SentenceTransformer('all-MiniLM-L6-v2')
        _nlp = spacy.load("en_core_web_sm")
        _skill_embeddings = _ml_model.encode(SKILL_POOL, convert_to_tensor=True)
        logger.info("NLP models initialized successfully.")

def extract_skills_semantically(text: str, threshold: float = 0.55) -> List[str]:
    if not text:
        return []
        
    _ensure_models_loaded()
    
    doc = _nlp(text)
    phrases = list(set([chunk.text.strip().lower() for chunk in doc.noun_chunks if len(chunk.text.split()) <= 3]))
    
    if not phrases:
        return []
        
    phrase_embeddings = _ml_model.encode(phrases, convert_to_tensor=True)
    detected_skills = set()
    cos_scores = util.cos_sim(phrase_embeddings, _skill_embeddings)
    
    for i in range(len(phrases)):
        for j in range(len(SKILL_POOL)):
            if cos_scores[i][j] > threshold:
                detected_skills.add(SKILL_POOL[j])
                
    return sorted(list(detected_skills))

def generate_tailored_guidelines(extracted_skills: List[str], missing_skills: List[str], match_percentage: int) -> List[str]:
    guidelines = []
    
    if match_percentage == 100:
        guidelines.append("Optimal alignment achieved. The resume successfully maps to all required technical competencies.")
        return guidelines
        
    guidelines.append(f"Diagnostic overview: Profile covers {len(extracted_skills)} technical requirements but lacks {len(missing_skills)} parameters specified in the job description.")

    for i, skill in enumerate(missing_skills):
        if i >= 3:
            break
            
        if skill in ["FastAPI", "Node.js", "Express", "Django", "REST API", "Microservices"]:
            guidelines.append(f"Backend requirement ({skill}): Consider adding a metric-driven bullet point demonstrating experience with {skill} architecture.")
        elif skill in ["React", "Next.js", "TypeScript", "JavaScript", "TailwindCSS"]:
            guidelines.append(f"Frontend requirement ({skill}): Incorporate examples of client-side implementations leveraging {skill}.")
        elif skill in ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Jenkins"]:
            guidelines.append(f"Infrastructure requirement ({skill}): Detail specific deployment or containerization workflows utilizing {skill}.")
        elif skill in ["Machine Learning", "Deep Learning", "NLP", "Computer Vision", "YOLOv8"]:
            guidelines.append(f"AI/ML requirement ({skill}): Specify model training, optimization, or inference tasks involving {skill}.")
        else:
            guidelines.append(f"Core competency ({skill}): Ensure {skill} is explicitly mentioned within the professional experience section.")

    if len(extracted_skills) < 4:
        guidelines.append("Structural recommendation: Technical keyword density is low. Group specialized tools into a dedicated technical skills section to improve parser visibility.")
    else:
        guidelines.append("Structural verification: Keyword distribution is adequate for standard ATS parsing algorithms.")

    return guidelines

def execute_ai_ats_analysis(resume_text: str, jd_text: str) -> Dict[str, Any]:
    resume_skills = set(extract_skills_semantically(resume_text))
    
    if not jd_text.strip():
        return {
            "extracted_skills": list(resume_skills),
            "missing_skills": [],
            "match_percentage": 100,
            "ats_suggestions": ["General mode evaluation. Provide a target job description to initialize automated gap analysis."]
        }
        
    jd_skills = set(extract_skills_semantically(jd_text))
    matching_skills = resume_skills.intersection(jd_skills)
    missing_skills = sorted(list(jd_skills.difference(resume_skills)))
    
    match_percentage = int((len(matching_skills) / len(jd_skills)) * 100) if jd_skills else 100
    custom_guidelines = generate_tailored_guidelines(list(resume_skills), missing_skills, match_percentage)
    
    return {
        "extracted_skills": sorted(list(resume_skills)),
        "missing_skills": missing_skills,
        "match_percentage": match_percentage,
        "ats_suggestions": custom_guidelines
    }