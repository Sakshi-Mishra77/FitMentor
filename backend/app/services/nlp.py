# backend/app/services/nlp.py
import re
from typing import Dict, List, Set, Any

# Engineering, design, and product competencies dictionary
SKILL_DICTIONARY = [
    "python", "javascript", "typescript", "java", "c\\+\\+", "c#", "ruby", "golang", "rust", "php", "sql", "html", "css",
    "react", "next\\.js", "vue", "angular", "node\\.js", "express", "fastapi", "django", "flask", "spring boot", 
    "tailwindcss", "redux", "zustand", "transformers", "bert", "gpt", "opencv", "pytorch", "tensorflow", "scikit-learn",
    "mongodb", "postgresql", "mysql", "redis", "sqlite", "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "jenkins",
    "git", "github", "graphql", "rest api", "microservices", "system design", "agile", "scrum", "data structures", "algorithms",
    "machine learning", "deep learning", "artificial intelligence", "natural language processing", "nlp", 
    "computer vision", "site reliability engineering", "sre", "human activity recognition", "har", "yolov8"
]

def clean_text(text: str) -> str:
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text.lower())

def extract_skills(text: str) -> List[str]:
    cleaned = clean_text(text)
    found_skills: Set[str] = set()
    for skill in SKILL_DICTIONARY:
        pattern = r'(?:^|\s|\b)' + skill + r'(?:\b|\s|$)'
        if re.search(pattern, cleaned):
            display_name = skill.replace("\\", "")
            display_name = " ".join([w.capitalize() if w not in ["js", "api", "nlp", "sre", "har", "gpt", "bert"] else w.upper() for w in display_name.split()])
            found_skills.add(display_name)
    return sorted(list(found_skills))

def generate_optimized_resume_content(original_text: str, missing_skills: List[str]) -> str:
    lines = [l.strip() for l in original_text.split('\n') if l.strip()]
    name_heading = lines[0] if lines else "Professional Candidate"
    missing_str = ", ".join(missing_skills) if missing_skills else ""
    
    optimized_text = f"========================================================================\n"
    optimized_text += f"{name_heading.upper()}\n"
    optimized_text += f"ATS-OPTIMIZED PROFILE & TARGET ALIGNMENT MANIFEST\n"
    optimized_text += f"========================================================================\n\n"
    
    optimized_text += f"PROFESSIONAL SUMMARY (TAILORED)\n"
    optimized_text += f"------------------------------------------------------------------------\n"
    if missing_skills:
        optimized_text += f"Results-driven software engineering professional with a strong foundation in core development systems.\n"
        optimized_text += f"Actively leveraging expertise to drive performance with focused application of {missing_str}.\n"
        optimized_text += f"Demonstrated track record of problem-solving, architectural scaling, and robust implementation pipelines.\n\n"
    else:
        optimized_text += f"Highly qualified professional with comprehensive domain matching metrics across core competencies.\n"
        optimized_text += f"Expert at translating product frameworks into high-availability production architecture systems.\n\n"
        
    optimized_text += f"CORE COMPETENCIES & TECHNICAL SKILLS\n"
    optimized_text += f"------------------------------------------------------------------------\n"
    all_skills = sorted(list(set(extract_skills(original_text) + missing_skills)))
    for i in range(0, len(all_skills), 4):
        optimized_text += " • " + "  • ".join(all_skills[i:i+4]) + "\n"
    optimized_text += "\n"
    
    optimized_text += f"TARGET ALIGNMENT IMPACT SUGGESTIONS\n"
    optimized_text += f"------------------------------------------------------------------------\n"
    if missing_skills:
        for skill in missing_skills:
            optimized_text += f" • [Recommended Experience Update]: 'Successfully deployed and integrated {skill} patterns,\n"
            optimized_text += f"   optimizing contextual feature accuracy and accelerating overall deployment efficiency by 15%.'\n"
    else:
        optimized_text += f" • Your structural background alignment is pristine. No further keyword padding is required to pass initial tracking screenings.\n"
    
    optimized_text += f"\n\n--- ORIGINAL REFERENCE CONTEXT ARCHITECTURE ---\n"
    start_idx = min(3, len(lines))
    optimized_text += "\n".join(lines[start_idx:start_idx+25])
    
    return optimized_text

def evaluate_resume_and_ats(resume_text: str, jd_text: str) -> Dict[str, Any]:
    resume_skills = set(extract_skills(resume_text))
    
    if not jd_text.strip():
        return {
            "extracted_skills": list(resume_skills),
            "missing_skills": [],
            "match_percentage": 100,
            "ats_suggestions": ["Provide a specific Job Description to unlock targeted keyword matching arrays."],
            "modified_resume_text": generate_optimized_resume_content(resume_text, [])
        }
        
    jd_skills = set(extract_skills(jd_text))
    matching_skills = resume_skills.intersection(jd_skills)
    missing_skills = sorted(list(jd_skills.difference(resume_skills)))
    
    total_jd_skills_count = len(jd_skills)
    match_percentage = int((len(matching_skills) / total_jd_skills_count) * 100) if total_jd_skills_count > 0 else 100
    
    suggestions = []
    if match_percentage < 40:
        suggestions.append("Critical Alignment Risk: Low contextual overlap with this Job Description.")
    elif match_percentage < 75:
        suggestions.append("Mid-Tier Match: Missing core technology keywords requested by the employer.")
    else:
        suggestions.append("Excellent Match Profile: Your resume accurately targets this position.")

    if missing_skills:
        suggestions.append(f"Actionable Tailoring: Integrate missing tags into active descriptions: {', '.join(missing_skills)}.")
    
    return {
        "extracted_skills": sorted(list(resume_skills)),
        "missing_skills": missing_skills,
        "match_percentage": match_percentage,
        "ats_suggestions": suggestions,
        "modified_resume_text": generate_optimized_resume_content(resume_text, missing_skills)
    }