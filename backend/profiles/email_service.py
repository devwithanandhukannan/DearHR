import json
import logging
import re
import time
from typing import Any

import requests
from django.conf import settings

from .ollama_service import (
    collect_user_data,
    API_URL,
    API_KEY,
    API_MODEL,
    API_TIMEOUT,
    API_MAX_RETRIES,
    API_RETRY_DELAY,
    LLMAuthError,
    LLMConnectionError,
    LLMTimeoutError,
    LLMRateLimitError,
    LLMGenerationError,
)

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
#  Response Parsing
# ──────────────────────────────────────────────────────────────────────────────

_JSON_PATTERNS = [
    re.compile(r'```json\s*(.*?)\s*```', re.DOTALL),
    re.compile(r'```\s*(\{.*?\})\s*```', re.DOTALL),
    re.compile(r'(\{.*\})', re.DOTALL),
]


def _clean_json_string(text: str) -> str:
    """Remove common LLM artefacts that break JSON parsing."""
    text = re.sub(r',\s*([\]}])', r'\1', text)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    return text


def _parse_json_response(raw_text: str) -> dict[str, Any]:
    """Parse JSON from AI response with multiple fallback strategies."""
    text = raw_text.strip()

    # Strategy 1: direct parse
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
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
                    return data
            except (json.JSONDecodeError, IndexError):
                continue

    # Strategy 3: clean entire text
    try:
        cleaned = _clean_json_string(text)
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    # Fallback — return raw text in expected structure
    logger.error(
        "Failed to parse JSON from email response (length=%d). "
        "First 300 chars: %s",
        len(text),
        text[:300],
    )
    return {
        'subject_line': 'Application for Position',
        'greeting': 'Dear Hiring Manager,',
        'body_paragraphs': [text[:500]],
        'sign_off': 'Best regards,',
        'sender_name': '',
        'alternative_subjects': [],
        'tips': [],
        'raw_response': text,
        'parse_warning': 'Could not parse structured response. Raw text included.',
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

    logger.info("Sending email generation request to %s", API_URL)

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
            "API rate limit hit. Free tier allows 1 request every 25 seconds."
        )

    response.raise_for_status()

    result = response.json()

    # Try common response fields
    raw_text = (
        result.get('response')
        or result.get('message')
        or result.get('content')
        or result.get('result')
        or result.get('text')
        or result.get('choices', [{}])[0].get('message', {}).get('content')
        or ''
    )

    # If result is a dict with a single long string value, use that
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


# ──────────────────────────────────────────────────────────────────────────────
#  Email Generation
# ──────────────────────────────────────────────────────────────────────────────

def generate_cold_email(
    user,
    job_description: str,
    company_name: str = '',
    recipient_name: str = '',
    tone: str = 'professional',
    email_type: str = 'application',
) -> dict[str, Any]:
    """Generate a cold email based on user data and job description.

    Parameters
    ----------
    user : Django User instance
    job_description : str
        The target job posting.
    company_name : str, optional
        Name of the target company.
    recipient_name : str, optional
        Name of the email recipient.
    tone : str, optional
        Email tone: professional, friendly, formal, enthusiastic.
    email_type : str, optional
        Type of email: application, networking, referral, followup.

    Returns
    -------
    dict
        Structured email data with subject, body paragraphs, tips, etc.

    Raises
    ------
    ValueError
        If personal info is missing.
    LLMAuthError
        If the API key is invalid or missing.
    LLMConnectionError
        If the API cannot be reached.
    LLMTimeoutError
        If the request times out.
    LLMRateLimitError
        If rate limit is exceeded after retries.
    LLMGenerationError
        For any other generation failure.
    """
    # Collect user data
    user_data = collect_user_data(user)

    if not user_data.get('personal_info'):
        raise ValueError(
            "Please complete your personal information before generating an email."
        )

    # Build prompt
    prompt = _build_email_prompt(
        user_data=user_data,
        job_description=job_description,
        company_name=company_name,
        recipient_name=recipient_name,
        tone=tone,
        email_type=email_type,
    )

    # Call API with retries
    last_exception: Exception | None = None

    for attempt in range(1, API_MAX_RETRIES + 1):
        try:
            logger.info(
                "Email generation attempt %d/%d",
                attempt, API_MAX_RETRIES,
            )

            raw_text = _post_to_api(prompt)
            email_data = _parse_json_response(raw_text)

            # Retry on parse failure if we have attempts left
            if 'parse_warning' in email_data and attempt < API_MAX_RETRIES:
                logger.warning(
                    "Parse warning on attempt %d — retrying.", attempt
                )
                time.sleep(API_RETRY_DELAY)
                continue

            # Fill in sender name if missing
            if not email_data.get('sender_name'):
                email_data['sender_name'] = (
                    user_data.get('personal_info', {}).get('name', '')
                )

            logger.info(
                "Successfully generated email on attempt %d.", attempt
            )
            return email_data

        except LLMAuthError:
            raise  # Don't retry auth errors

        except LLMRateLimitError as exc:
            last_exception = exc
            if attempt < API_MAX_RETRIES:
                logger.warning(
                    "Rate limited on attempt %d. Waiting %ds...",
                    attempt, API_RETRY_DELAY,
                )
                time.sleep(API_RETRY_DELAY)
                continue

        except requests.exceptions.ConnectionError as exc:
            last_exception = LLMConnectionError(
                f"Cannot connect to the AI API at {API_URL}. "
                "Check your internet connection."
            )
            logger.error("Connection failed (attempt %d): %s", attempt, exc)
            if attempt < API_MAX_RETRIES:
                time.sleep(5)

        except requests.exceptions.Timeout as exc:
            last_exception = LLMTimeoutError(
                f"AI API request timed out after {API_TIMEOUT}s."
            )
            logger.error("Timeout (attempt %d): %s", attempt, exc)
            if attempt < API_MAX_RETRIES:
                time.sleep(5)

        except requests.exceptions.HTTPError as exc:
            status = getattr(exc.response, 'status_code', None)
            body = getattr(exc.response, 'text', '')[:300]
            last_exception = LLMGenerationError(
                f"AI API returned HTTP {status}: {body}"
            )
            logger.error("HTTP error (attempt %d): %s", attempt, exc)
            if status and 400 <= status < 500:
                break  # Don't retry 4xx
            if attempt < API_MAX_RETRIES:
                time.sleep(5)

        except LLMGenerationError as exc:
            last_exception = exc
            logger.error("Generation error (attempt %d): %s", attempt, exc)
            if attempt < API_MAX_RETRIES:
                time.sleep(API_RETRY_DELAY)

        except Exception as exc:
            last_exception = LLMGenerationError(f"Unexpected error: {exc}")
            logger.exception("Unexpected error on attempt %d", attempt)
            if attempt < API_MAX_RETRIES:
                time.sleep(5)

    raise last_exception or LLMGenerationError("Email generation failed.")


def _build_email_prompt(
    user_data: dict[str, Any],
    job_description: str,
    company_name: str,
    recipient_name: str,
    tone: str,
    email_type: str,
) -> str:
    """Build the prompt for cold email generation."""

    prompt = f"""You are an expert career coach and professional email writer.

TASK: Write a compelling cold email for a job opportunity.

CANDIDATE INFORMATION:
{json.dumps(user_data, indent=2, default=str)}

JOB DESCRIPTION:
{job_description}

EMAIL DETAILS:
- Company: {company_name or 'the company from job description'}
- Recipient: {recipient_name or 'Hiring Manager'}
- Tone: {tone}
- Type: {email_type}

EMAIL TYPE DESCRIPTIONS:
- application: Direct job application email
- networking: Networking/informational interview request
- referral: Asking for a referral
- followup: Follow-up after application/interview

INSTRUCTIONS:
1. Write a concise, impactful email (150-250 words body)
2. Include a compelling subject line
3. Open with a hook that grabs attention
4. Highlight 2-3 most relevant achievements matching the job
5. Show genuine interest in the company
6. Include a clear call-to-action
7. Keep it professional but personable
8. Make it ATS-keyword rich naturally
9. Do NOT fabricate any achievements or experiences

RESPOND IN THIS EXACT JSON FORMAT ONLY.
No markdown, no code fences, no explanation — ONLY pure valid JSON:
{{
    "subject_line": "Compelling subject line",
    "greeting": "Dear [Name/Hiring Manager],",
    "body_paragraphs": [
        "Opening paragraph with hook...",
        "Middle paragraph highlighting relevant skills/experience...",
        "Closing paragraph with call-to-action..."
    ],
    "sign_off": "Best regards,",
    "sender_name": "Candidate Name",
    "alternative_subjects": [
        "Alternative subject 1",
        "Alternative subject 2"
    ],
    "tips": [
        "Tip for personalizing this email further",
        "Another tip"
    ]
}}
"""
    return prompt