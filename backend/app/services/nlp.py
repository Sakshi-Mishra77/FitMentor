# backend/app/services/nlp.py
import re
from typing import Dict, List, Set

# Comprehensive, production-grade technical and soft skill dictionary mapping clusters
SKILL_DICTIONARY = [
    # Languages
    "python", "javascript", "typescript", "java", "c\\+\\+", "c#", "ruby", "golang", "rust", "php", "sql", "html", "css",
    # Frameworks & Libraries
    "react", "next\\.js", "vue", "angular", "node\\.js", "express", "fastapi", "django", "flask", "spring boot", 
    "laravel", "tailwindcss", "redux", "zustand", "transformers", "bert", "gpt", "opencv", "pytorch", "tensorflow", "scikit-learn",
    # Databases & Cloud
    "mongodb", "postgresql", "mysql", "redis", "sqlite", "oracle", "firebase", "aws", "azure", "gcp", "docker", "kubernetes",
    # Architecture & Tools
    "git", "github", "ci/cd", "jenkins", "graphql", "rest api", "microservices", "system design", "agile", "scrum",
    # Concepts / Specializations
    "machine learning", "deep learning", "artificial intelligence", "natural language processing", "nlp", 
    "computer vision", "site reliability engineering", "sre", "human activity recognition", "har", "yolov8", "data structures", "algorithms",
    # Soft Skills / HR
    "leadership", "communication", "teamwork", "problem solving", "critical thinking", "time management", "adaptability", "project management"
]

def clean_text(text: str) -> str:
    """Standardizes text to lowercase and collapses whitespace for accurate matching."""
    if not text:
        return ""
    text = text.lower()
    # Normalize spaces, tabs, and newlines
    text = re.sub(r'\s+', ' ', text)
    return text

def extract_skills_from_text(text: str) -> List[str]:
    """Matches text against the dictionary using boundary-aware regex matching."""
    cleaned = clean_text(text)
    found_skills: Set[str] = set()

    for skill in SKILL_DICTIONARY:
        # Use word boundaries, handling special characters like c++ and next.js safely
        pattern = r'(?:^|\s|\b)' + skill + r'(?:\b|\s|$)'
        if re.search(pattern, cleaned):
            # Clean up the regex escaping for human-readable output
            display_name = skill.replace("\\", "")
            # Capitalize standard tags nicely
            display_name = " ".join([w.capitalize() if w not in ["js", "api", "nlp", "sre", "har", "gpt", "bert"] else w.upper() for w in display_name.split()])
            found_skills.add(display_name)

    return sorted(list(found_skills))

def analyze_skill_gap(resume_text: str, jd_text: str) -> Dict[str, List[str]]:
    """Compares resume skills against job description requirements to map overlaps and missing gaps."""
    resume_skills = set(extract_skills_from_text(resume_text))
    
    if not jd_text.strip():
        # General mode (No JD provided)
        return {
            "extracted_skills": list(resume_skills),
            "missing_skills": []
        }
        
    jd_skills = set(extract_skills_from_text(jd_text))
    
    # Overlap: Skills present in both the JD and the Resume
    matching_skills = resume_skills.intersection(jd_skills)
    # Missing: Skills demanded by the JD but absent from the Resume
    missing_skills = jd_skills.difference(resume_skills)
    
    # We still display all valid resume skills found as user assets
    return {
        "extracted_skills": list(resume_skills),
        "missing_skills": sorted(list(missing_skills))
    }