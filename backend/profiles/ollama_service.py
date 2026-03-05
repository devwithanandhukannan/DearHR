import hashlib
import json
import logging
import re
import time
from typing import Any

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
#  Configuration
# ──────────────────────────────────────────────────────────────────────────────

API_URL = getattr(
    settings,
    'LLM_API_URL',
    'https://apifreellm.com/api/v1/chat',
)
API_KEY = getattr(
    settings,
    'LLM_API_KEY',
    '',  # ← Empty string as default — MUST be set in settings.py
)
API_MODEL = getattr(settings, 'LLM_MODEL', 'apifreellm')
API_TIMEOUT = getattr(settings, 'LLM_TIMEOUT', 120)
API_MAX_RETRIES = getattr(settings, 'LLM_MAX_RETRIES', 3)
API_RETRY_DELAY = getattr(settings, 'LLM_RETRY_DELAY', 26)

# ──────────────────────────────────────────────────────────────────────────────
#  Custom Exceptions
# ──────────────────────────────────────────────────────────────────────────────

class LLMConnectionError(Exception):
    """Cannot reach the LLM API."""
    pass


class LLMTimeoutError(Exception):
    """The LLM API request timed out."""
    pass


class LLMRateLimitError(Exception):
    """Hit the API rate limit."""
    pass


class LLMAuthError(Exception):
    """Invalid or missing API key."""
    pass


class LLMParseError(Exception):
    """Could not parse the LLM response into valid JSON."""
    pass


class LLMGenerationError(Exception):
    """General LLM generation failure."""
    pass


# ──────────────────────────────────────────────────────────────────────────────
#  Prompt Construction
# ──────────────────────────────────────────────────────────────────────────────

RESUME_JSON_SCHEMA = """{
    "professional_summary": "A 3-4 line professional summary...",
    "experience": [
        {
            "role": "Job Title",
            "company": "Company Name",
            "start_date": "Month Year",
            "end_date": "Month Year or Present",
            "bullets": [
                "Achievement/responsibility bullet 1 with metrics",
                "Achievement/responsibility bullet 2 with metrics",
                "Achievement/responsibility bullet 3 with metrics"
            ]
        }
    ],
    "skills_grouped": {
        "Category Name": ["Skill1", "Skill2", "Skill3"],
        "Another Category": ["Skill4", "Skill5"]
    },
    "education": [
        {
            "degree": "Degree Name",
            "institution": "Institution Name",
            "date": "Start - End",
            "gpa": "GPA if available",
            "highlights": "Relevant coursework or honors"
        }
    ],
    "projects": [
        {
            "title": "Project Title",
            "description": "Brief ATS-optimized description",
            "technologies": "Tech1, Tech2, Tech3",
            "link": "URL if available"
        }
    ],
    "certifications": [
        {
            "title": "Certification Name",
            "organization": "Org Name",
            "year": "Year"
        }
    ],
    "achievements": [
        {
            "title": "Achievement Title",
            "description": "Brief description"
        }
    ],
    "ats_keywords": ["keyword1", "keyword2", "keyword3"]
}"""


def _format_section(label: str, data: Any) -> str:
    """Format a single resume section for the prompt."""
    serialized = json.dumps(data, indent=2, default=str)
    return f"{label}:\n{serialized}"


def build_prompt(
    user_data: dict[str, Any],
    job_description: str,
    customization: str = '',
) -> str:
    """Build the prompt for the LLM to generate ATS-friendly resume content."""

    sections = [
        ("PERSONAL INFO", user_data.get('personal_info', {})),
        ("EDUCATION", user_data.get('education', [])),
        ("EXPERIENCE", user_data.get('experience', [])),
        ("SKILLS", user_data.get('skills', [])),
        ("PROJECTS", user_data.get('projects', [])),
        ("CERTIFICATIONS", user_data.get('certifications', [])),
        ("ACHIEVEMENTS", user_data.get('achievements', [])),
        ("ADDITIONAL LINKS", user_data.get('additional_links', [])),
    ]

    candidate_block = "\n\n".join(
        _format_section(label, data) for label, data in sections
    )

    customization_line = (
        f"\nCUSTOMIZATION INSTRUCTIONS:\n{customization}\n"
        if customization
        else ""
    )

    prompt = f"""You are an expert ATS (Applicant Tracking System) resume writer.

TASK: Generate a highly optimized, ATS-friendly resume using the candidate's
information tailored to the target job description.

CANDIDATE INFORMATION:
=======================
{candidate_block}

TARGET JOB DESCRIPTION:
========================
{job_description}
{customization_line}
INSTRUCTIONS:
=============
1. Create a professional summary (3-4 lines) tailored to the job description.
2. Rewrite experience bullet points using the STAR method with quantifiable
   metrics where possible.
3. Prioritize and reorder skills matching the job description keywords.
4. Highlight relevant projects and certifications.
5. Use strong action verbs: Led, Developed, Implemented, Optimized,
   Architected, Spearheaded, Streamlined, etc.
6. Include ATS keywords from the job description naturally.
7. Keep descriptions concise but impactful.
8. If candidate data is missing for a section, return an empty list/object for
   that section — do NOT fabricate information.

RESPOND IN THIS EXACT JSON FORMAT ONLY.
No markdown, no code fences, no explanation — ONLY pure valid JSON:
{RESUME_JSON_SCHEMA}
"""
    return prompt


# ──────────────────────────────────────────────────────────────────────────────
#  Data Collection
# ──────────────────────────────────────────────────────────────────────────────

def collect_user_data(user) -> dict[str, Any]:
    """Collect all user data from the database."""
    from .models import (
        Achievement,
        AdditionalLink,
        Certification,
        Education,
        Experience,
        PersonalInfo,
        Project,
        Skill,
    )

    data: dict[str, Any] = {}

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
            # Profile Image URL
            'profile_image_url': pi.profile_image.url if pi.profile_image else None,
        }
    except PersonalInfo.DoesNotExist:
        data['personal_info'] = {}
        logger.warning("No PersonalInfo found for user %s", user.pk)

    # Education
    data['education'] = list(
        Education.objects.filter(user=user)
        .order_by('-end_year', '-end_month')
        .values(
            'degree', 'institution', 'start_month', 'start_year',
            'end_month', 'end_year', 'gpa', 'description',
        )
    )

    # Experience (most recent first)
    data['experience'] = list(
        Experience.objects.filter(user=user)
        .order_by('-is_present', '-end_year', '-end_month')
        .values(
            'role', 'company', 'start_month', 'start_year',
            'end_month', 'end_year', 'is_present', 'description',
        )
    )

    # Skills
    data['skills'] = list(
        Skill.objects.filter(user=user).values('name', 'category', 'level')
    )

    # Projects
    data['projects'] = list(
        Project.objects.filter(user=user).values(
            'title', 'description', 'technologies', 'link',
        )
    )

    # Certifications
    data['certifications'] = list(
        Certification.objects.filter(user=user)
        .order_by('-year')
        .values('title', 'organization', 'year', 'link')
    )

    # Achievements
    data['achievements'] = list(
        Achievement.objects.filter(user=user)
        .order_by('-year')
        .values('title', 'year', 'description')
    )

    # Additional Links
    data['additional_links'] = list(
        AdditionalLink.objects.filter(user=user).values('link_type', 'url')
    )

    return data
# ──────────────────────────────────────────────────────────────────────────────
#  Response Parsing
# ──────────────────────────────────────────────────────────────────────────────

_JSON_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r'```json\s*(.*?)\s*```', re.DOTALL),
    re.compile(r'```\s*(\{.*?\})\s*```', re.DOTALL),
    re.compile(r'(\{.*\})', re.DOTALL),
]


def _clean_json_string(text: str) -> str:
    """Remove common LLM artefacts that break JSON parsing."""
    text = re.sub(r',\s*([\]}])', r'\1', text)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    return text


def _validate_resume_data(data: dict[str, Any]) -> dict[str, Any]:
    """Ensure all expected top-level keys exist with sensible defaults."""
    defaults: dict[str, Any] = {
        'professional_summary': '',
        'experience': [],
        'skills_grouped': {},
        'education': [],
        'projects': [],
        'certifications': [],
        'achievements': [],
        'ats_keywords': [],
    }
    for key, default in defaults.items():
        if key not in data:
            logger.warning("Missing key '%s' in LLM response — using default.", key)
            data[key] = default
    return data


def parse_llm_response(raw_text: str) -> dict[str, Any]:
    """Extract and validate JSON from the LLM's response text."""
    text = raw_text.strip()

    # Strategy 1: direct parse
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return _validate_resume_data(data)
    except json.JSONDecodeError:
        pass

    # Strategy 2: regex extraction
    for pattern in _JSON_PATTERNS:
        match = pattern.search(text)
        if match:
            json_str = _clean_json_string(match.group(1))
            try:
                data = json.loads(json_str)
                if isinstance(data, dict):
                    return _validate_resume_data(data)
            except (json.JSONDecodeError, IndexError):
                continue

    # Strategy 3: clean entire text
    try:
        cleaned = _clean_json_string(text)
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return _validate_resume_data(data)
    except json.JSONDecodeError:
        pass

    # Fallback
    logger.error(
        "Failed to parse JSON from LLM response (length=%d). "
        "First 300 chars: %s",
        len(text),
        text[:300],
    )
    return {
        'professional_summary': '',
        'experience': [],
        'skills_grouped': {},
        'education': [],
        'projects': [],
        'certifications': [],
        'achievements': [],
        'ats_keywords': [],
        'raw_response': text,
        'parse_warning': (
            'Could not parse structured response from the AI model. '
            'The raw text has been included for manual review.'
        ),
    }


# ──────────────────────────────────────────────────────────────────────────────
#  API Interaction
# ──────────────────────────────────────────────────────────────────────────────

def _post_to_api(message: str, *, timeout: int = API_TIMEOUT) -> str:
    """Send a single request to APIFreeLLM and return the raw response text."""
    if not API_KEY:
        raise LLMAuthError(
            "LLM_API_KEY is not configured. "
            "Set it in your Django settings: LLM_API_KEY = 'apf_xxxxxxxx'"
        )

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}',
    }

    payload = {
        'message': message,
        'model': API_MODEL,
    }

    response = requests.post(
        API_URL,
        headers=headers,
        json=payload,
        timeout=timeout,
    )

    # Handle specific HTTP status codes
    if response.status_code == 401:
        raise LLMAuthError(
            "Invalid API key. Check your LLM_API_KEY in Django settings."
        )
    if response.status_code == 429:
        raise LLMRateLimitError(
            "API rate limit hit. Free tier allows 1 request every 25 seconds. "
            "Will retry automatically."
        )

    response.raise_for_status()

    result = response.json()

    # The API may return the text in different fields — try common ones
    raw_text = (
        result.get('response')
        or result.get('message')
        or result.get('content')
        or result.get('result')
        or result.get('text')
        or result.get('choices', [{}])[0].get('message', {}).get('content')
        or ''
    )

    # If result is a dict with a single string value, use that
    if not raw_text and isinstance(result, dict):
        for value in result.values():
            if isinstance(value, str) and len(value) > 50:
                raw_text = value
                break

    if not raw_text.strip():
        logger.error("Empty response from API. Full response: %s", result)
        raise LLMGenerationError(
            "The AI API returned an empty response. Please try again."
        )

    return raw_text


def generate_with_llm(
    prompt: str,
    *,
    max_retries: int = API_MAX_RETRIES,
) -> dict[str, Any]:
    """Send prompt to APIFreeLLM and return parsed resume data.

    Handles rate limiting by waiting between retries (free tier: 1 req / 25s).
    """
    last_exception: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(
                "API request attempt %d/%d (endpoint=%s)",
                attempt, max_retries, API_URL,
            )

            raw_text = _post_to_api(prompt)
            resume_data = parse_llm_response(raw_text)

            # If we got a parse warning, retry for cleaner output
            if 'parse_warning' in resume_data and attempt < max_retries:
                logger.warning(
                    "Parse warning on attempt %d — retrying for cleaner output.",
                    attempt,
                )
                time.sleep(API_RETRY_DELAY)
                continue

            logger.info(
                "Successfully generated resume data on attempt %d.", attempt
            )
            return resume_data

        except LLMAuthError:
            # Auth errors won't fix themselves on retry
            raise

        except LLMRateLimitError as exc:
            last_exception = exc
            if attempt < max_retries:
                wait_time = API_RETRY_DELAY
                logger.warning(
                    "Rate limited on attempt %d. Waiting %ds before retry...",
                    attempt, wait_time,
                )
                time.sleep(wait_time)
                continue
            logger.error("Rate limit exceeded after %d attempts.", max_retries)

        except requests.exceptions.ConnectionError as exc:
            last_exception = LLMConnectionError(
                f"Cannot connect to the AI API at {API_URL}. "
                "Please check your internet connection and try again."
            )
            logger.error("Connection failed (attempt %d): %s", attempt, exc)
            if attempt < max_retries:
                time.sleep(5)

        except requests.exceptions.Timeout as exc:
            last_exception = LLMTimeoutError(
                f"AI API request timed out after {API_TIMEOUT}s. "
                "Try again or increase LLM_TIMEOUT in settings."
            )
            logger.error("Timeout (attempt %d): %s", attempt, exc)
            if attempt < max_retries:
                time.sleep(5)

        except requests.exceptions.HTTPError as exc:
            status = getattr(exc.response, 'status_code', None)
            body = getattr(exc.response, 'text', '')[:300]
            last_exception = LLMGenerationError(
                f"AI API returned HTTP {status}: {body}"
            )
            logger.error("HTTP error (attempt %d): %s", attempt, exc)
            # Don't retry on 4xx client errors (except 429 handled above)
            if status and 400 <= status < 500:
                break
            if attempt < max_retries:
                time.sleep(5)

        except LLMGenerationError as exc:
            last_exception = exc
            logger.error("Generation error (attempt %d): %s", attempt, exc)
            if attempt < max_retries:
                time.sleep(API_RETRY_DELAY)

        except Exception as exc:
            last_exception = LLMGenerationError(f"Unexpected error: {exc}")
            logger.exception("Unexpected error on attempt %d", attempt)
            if attempt < max_retries:
                time.sleep(5)

    raise last_exception or LLMGenerationError("Resume generation failed.")


# ──────────────────────────────────────────────────────────────────────────────
#  High-Level Public API
# ──────────────────────────────────────────────────────────────────────────────

def generate_resume(
    user,
    job_description: str,
    customization: str = '',
    *,
    use_cache: bool = True,
    cache_ttl: int = 3600,
) -> dict[str, Any]:
    """End-to-end resume generation pipeline.

    1. Collect user data from DB
    2. Build an optimized prompt
    3. Call the AI API
    4. Parse and validate the response
    5. Return structured resume data

    Parameters
    ----------
    user : Django User instance
    job_description : str
        The target job posting the resume should be tailored to.
    customization : str, optional
        Extra instructions for the AI (tone, emphasis, etc.).
    use_cache : bool
        If True, cache results to avoid redundant API calls.
    cache_ttl : int
        Cache time-to-live in seconds (default 1 hour).

    Returns
    -------
    dict
        Structured resume data ready for template rendering or PDF generation.

    Raises
    ------
    ValueError
        If personal info is missing.
    LLMAuthError
        If the API key is invalid or not configured.
    LLMConnectionError
        If the API cannot be reached.
    LLMTimeoutError
        If the API request times out.
    LLMRateLimitError
        If the rate limit is exceeded after all retries.
    LLMGenerationError
        For any other generation failure.
    """
    # Optional caching
    if use_cache:
        cache_key = (
            f"resume_gen:{user.pk}:"
            f"{hashlib.md5((job_description + customization).encode()).hexdigest()}"
        )
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info("Returning cached resume for user %s", user.pk)
            return cached

    # Collect data
    user_data = collect_user_data(user)

    if not user_data.get('personal_info'):
        raise ValueError(
            "Please complete your personal information before generating a resume."
        )

    # Build prompt & generate
    prompt = build_prompt(user_data, job_description, customization)
    resume_data = generate_with_llm(prompt)

    # Merge personal info so the caller has everything in one place
    resume_data['personal_info'] = user_data['personal_info']
    resume_data['additional_links'] = user_data.get('additional_links', [])

    # Cache the result
    if use_cache:
        cache.set(cache_key, resume_data, cache_ttl)

    return resume_data