import json
import requests
from django.conf import settings

OLLAMA_URL = getattr(settings, 'OLLAMA_API_URL', 'http://localhost:11434/api/generate')
OLLAMA_MODEL = getattr(settings, 'OLLAMA_MODEL', 'llama3.2')


def build_prompt(user_data, job_description, customization=''):
    """Build the prompt for Ollama to generate ATS-friendly resume content."""

    prompt = f"""You are an expert ATS (Applicant Tracking System) resume writer.

TASK: Generate a highly optimized, ATS-friendly resume using the candidate's information tailored to the target job description.

CANDIDATE INFORMATION:
=======================

PERSONAL INFO:
{json.dumps(user_data.get('personal_info', {}), indent=2)}

EDUCATION:
{json.dumps(user_data.get('education', []), indent=2)}

EXPERIENCE:
{json.dumps(user_data.get('experience', []), indent=2)}

SKILLS:
{json.dumps(user_data.get('skills', []), indent=2)}

PROJECTS:
{json.dumps(user_data.get('projects', []), indent=2)}

CERTIFICATIONS:
{json.dumps(user_data.get('certifications', []), indent=2)}

ACHIEVEMENTS:
{json.dumps(user_data.get('achievements', []), indent=2)}

ADDITIONAL LINKS:
{json.dumps(user_data.get('additional_links', []), indent=2)}

TARGET JOB DESCRIPTION:
========================
{job_description}

{f"CUSTOMIZATION INSTRUCTIONS: {customization}" if customization else ""}

INSTRUCTIONS:
=============
1. Create a professional summary (3-4 lines) tailored to the job description
2. Rewrite experience bullet points using STAR method with quantifiable metrics where possible
3. Prioritize and reorder skills matching the job description keywords
4. Highlight relevant projects and certifications
5. Use strong action verbs: Led, Developed, Implemented, Optimized, Architected, etc.
6. Include ATS keywords from the job description naturally
7. Keep descriptions concise but impactful

RESPOND IN THIS EXACT JSON FORMAT ONLY (no markdown, no extra text):
{{
    "professional_summary": "A 3-4 line professional summary...",
    "experience": [
        {{
            "role": "Job Title",
            "company": "Company Name",
            "start_date": "Month Year",
            "end_date": "Month Year or Present",
            "bullets": [
                "Achievement/responsibility bullet 1 with metrics",
                "Achievement/responsibility bullet 2 with metrics",
                "Achievement/responsibility bullet 3 with metrics"
            ]
        }}
    ],
    "skills_grouped": {{
        "Category Name": ["Skill1", "Skill2", "Skill3"],
        "Another Category": ["Skill4", "Skill5"]
    }},
    "education": [
        {{
            "degree": "Degree Name",
            "institution": "Institution Name",
            "date": "Start - End",
            "gpa": "GPA if available",
            "highlights": "Relevant coursework or honors"
        }}
    ],
    "projects": [
        {{
            "title": "Project Title",
            "description": "Brief ATS-optimized description",
            "technologies": "Tech1, Tech2, Tech3",
            "link": "URL if available"
        }}
    ],
    "certifications": [
        {{
            "title": "Certification Name",
            "organization": "Org Name",
            "year": "Year"
        }}
    ],
    "achievements": [
        {{
            "title": "Achievement Title",
            "description": "Brief description"
        }}
    ],
    "ats_keywords": ["keyword1", "keyword2", "keyword3"]
}}
"""
    return prompt


def collect_user_data(user):
    """Collect all user data from database."""
    from .models import (
        PersonalInfo, AdditionalLink, Education,
        Experience, Skill, Project, Certification, Achievement,
    )

    data = {}

    # Personal Info
    try:
        pi = PersonalInfo.objects.get(user=user)
        data['personal_info'] = {
            'name': pi.name,
            'email': pi.email,
            'phone': pi.phone,
            'location': pi.location,
            'linkedin': pi.linkedin,
            'github': pi.github,
            'website': pi.website,
        }
    except PersonalInfo.DoesNotExist:
        data['personal_info'] = {}

    # Education
    data['education'] = list(
        Education.objects.filter(user=user).values(
            'degree', 'institution', 'start_month', 'start_year',
            'end_month', 'end_year', 'gpa', 'description'
        )
    )

    # Experience
    data['experience'] = list(
        Experience.objects.filter(user=user).values(
            'role', 'company', 'start_month', 'start_year',
            'end_month', 'end_year', 'is_present', 'description'
        )
    )

    # Skills
    data['skills'] = list(
        Skill.objects.filter(user=user).values('name', 'category', 'level')
    )

    # Projects
    data['projects'] = list(
        Project.objects.filter(user=user).values(
            'title', 'description', 'technologies', 'link'
        )
    )

    # Certifications
    data['certifications'] = list(
        Certification.objects.filter(user=user).values(
            'title', 'organization', 'year', 'link'
        )
    )

    # Achievements
    data['achievements'] = list(
        Achievement.objects.filter(user=user).values(
            'title', 'year', 'description'
        )
    )

    # Additional Links
    data['additional_links'] = list(
        AdditionalLink.objects.filter(user=user).values('link_type', 'url')
    )

    return data


def generate_with_ollama(prompt):
    """Send prompt to Ollama and get response."""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                'model': OLLAMA_MODEL,
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': 0.3,
                    'num_predict': 4096,
                },
            },
            timeout=120,
        )
        response.raise_for_status()

        result = response.json()
        raw_text = result.get('response', '')

        # Parse JSON from response
        resume_data = parse_ollama_response(raw_text)
        return resume_data

    except requests.exceptions.ConnectionError:
        raise Exception(
            'Cannot connect to Ollama. Make sure Ollama is running: ollama serve'
        )
    except requests.exceptions.Timeout:
        raise Exception('Ollama request timed out. Try again.')
    except Exception as e:
        raise Exception(f'Ollama error: {str(e)}')


def parse_ollama_response(raw_text):
    """Extract JSON from Ollama response text."""
    text = raw_text.strip()

    # Try direct JSON parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON from markdown code blocks
    import re
    patterns = [
        r'```json\s*(.*?)\s*```',
        r'```\s*(.*?)\s*```',
        r'\{.*\}',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                json_str = match.group(1) if '```' in pattern else match.group(0)
                return json.loads(json_str)
            except (json.JSONDecodeError, IndexError):
                continue

    # If all parsing fails, create structured data from raw text
    return {
        'professional_summary': text[:500],
        'experience': [],
        'skills_grouped': {},
        'education': [],
        'projects': [],
        'certifications': [],
        'achievements': [],
        'ats_keywords': [],
        'raw_response': text,
        'parse_warning': 'Could not parse structured response. Raw text included.',
    }