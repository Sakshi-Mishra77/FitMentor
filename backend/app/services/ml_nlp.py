# backend/app/services/ml_nlp.py
import re
import spacy
from typing import Dict, List, Any
from sentence_transformers import SentenceTransformer, util

# Load pre-trained AI models into memory once at application startup
print("⏳ Initializing Deep Learning Vector Space for Custom ATS Advice...")
ml_model = SentenceTransformer('all-MiniLM-L6-v2')
nlp = spacy.load("en_core_web_sm")
print("✅ Deep Learning Vector Matrix ready.")

# Supported technical competency framework pool
SKILL_POOL = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "SQL",
    "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "FastAPI", "Django",
    "MongoDB", "PostgreSQL", "Redis", "Docker", "Kubernetes", "CI/CD", "Jenkins",
    "Git", "GitHub", "GraphQL", "REST API", "Microservices", "System Design", "Agile", 
    "Scrum", "Data Structures", "Algorithms", "Machine Learning", "Deep Learning", 
    "Artificial Intelligence", "Natural Language Processing", "NLP", "Computer Vision", 
    "Site Reliability Engineering", "SRE", "Human Activity Recognition", "HAR", "YOLOv8"
]

SKILL_EMBEDDINGS = ml_model.encode(SKILL_POOL, convert_to_tensor=True)

def extract_skills_semantically(text: str, threshold: float = 0.55) -> List[str]:
    if not text:
        return []
    doc = nlp(text)
    phrases = list(set([chunk.text.strip().lower() for chunk in doc.noun_chunks if len(chunk.text.split()) <= 3]))
    
    if not phrases:
        return []
        
    phrase_embeddings = ml_model.encode(phrases, convert_to_tensor=True)
    detected_skills = set()
    cos_scores = util.cos_sim(phrase_embeddings, SKILL_EMBEDDINGS)
    
    for i in range(len(phrases)):
        for j in range(len(SKILL_POOL)):
            if cos_scores[i][j] > threshold:
                detected_skills.add(SKILL_POOL[j])
                
    return sorted(list(detected_skills))

def generate_tailored_guidelines(extracted_skills: List[str], missing_skills: List[str], match_percentage: int) -> List[str]:
    """
    Generates entirely custom, programmatically tailored optimization advice 
    by mapping specific missing skills to actionable, code-level bullet points.
    """
    guidelines = []
    
    # 1. Provide an high-level diagnostic of the overlap ratio
    if match_percentage == 100:
        guidelines.append(f"Perfect Alignment Match: Your active resume successfully checks off all tech targets extracted from the job criteria.")
        return guidelines
        
    guidelines.append(f"Matrix Diagnostics: Your file covers {len(extracted_skills)} core competencies but drops {len(missing_skills)} key parameters requested by the tracking algorithms.")

    # 2. Programmatically generate specific, bespoke bullet point corrections for missing stacks
    tech_counter = 0
    for skill in missing_skills:
        if tech_counter >= 3: # Limit to top 3 critical gaps to prevent layout text clutter
            break
            
        # Context-aware recommendations generated programmatically based on the keyword category
        if skill in ["FastAPI", "Node.js", "Express", "Django", "REST API", "Microservices"]:
            guidelines.append(f"Missing Backend Asset ({skill}): Integrate a targeted impact line such as: 'Architected scalable, high-throughput {skill} endpoints, reducing service layout response latency by 20%.'")
        elif skill in ["React", "Next.js", "TypeScript", "JavaScript", "TailwindCSS"]:
            guidelines.append(f"Missing Frontend Asset ({skill}): We recommend adding a bullet point describing modern reactive interfaces: 'Engineered high-fidelity responsive modular user components leveraging {skill} for optimal server-side rendering performance.'")
        elif skill in ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Jenkins"]:
            guidelines.append(f"Missing Devops/Cloud Asset ({skill}): Embed this operational keyword: 'Configured automated deployment workflows and containerized services using {skill}, ensuring high availability across dev/prod matrix clusters.'")
        elif skill in ["Machine Learning", "Deep Learning", "NLP", "Computer Vision", "YOLOv8"]:
            guidelines.append(f"Missing AI/ML Core Asset ({skill}): Add this vector matching string: 'Trained and optimized high-accuracy neural frameworks utilizing {skill}, accelerating feature inference throughput speed by 15%.'")
        else:
            guidelines.append(f"Missing Core Asset ({skill}): Strengthen your profile hierarchy by adding an explicit accomplishment mentioning your utilization of {skill} inside your recent professional timeline.")
        
        tech_counter += 1

    # 3. Add dynamic structural action commands based on formatting density heuristics
    if len(extracted_skills) < 4:
        guidelines.append("Vocabulary Density Warning: The text parser extracted very few technical anchors. Group your specialized domain tools into a dedicated, clean 'Technical Skills' section right under your profile summary.")
    else:
        guidelines.append("Layout Verification: Your structural skill density distribution is high, allowing parsing spiders to catalog your technical anchors effectively.")

    return guidelines

def execute_ai_ats_analysis(resume_text: str, jd_text: str) -> Dict[str, Any]:
    resume_skills = set(extract_skills_semantically(resume_text))
    
    if not jd_text.strip():
        return {
            "extracted_skills": list(resume_skills),
            "missing_skills": [],
            "match_percentage": 100,
            "ats_suggestions": ["General mode active. Provide a target Job Description paste-block to initialize automated custom keyword guidance algorithms."]
        }
        
    jd_skills = set(extract_skills_semantically(jd_text))
    matching_skills = resume_skills.intersection(jd_skills)
    missing_skills = sorted(list(jd_skills.difference(resume_skills)))
    
    match_percentage = int((len(matching_skills) / len(jd_skills)) * 100) if jd_skills else 100
    
    # Generate entirely dynamic customized recommendations array
    custom_guidelines = generate_tailored_guidelines(list(resume_skills), missing_skills, match_percentage)
    
    return {
        "extracted_skills": sorted(list(resume_skills)),
        "missing_skills": missing_skills,
        "match_percentage": match_percentage,
        "ats_suggestions": custom_guidelines
    }