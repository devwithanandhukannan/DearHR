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


def _parse_response(raw_text: str) -> dict[str, Any]:
    """Extract JSON from AI response with multiple fallback strategies."""
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

    # Fallback
    logger.error(
        "Failed to parse JSON from interview response (length=%d). "
        "First 300 chars: %s",
        len(text),
        text[:300],
    )
    return {
        'raw_response': text,
        'parse_error': True,
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

    logger.info("Sending interview question request to %s", API_URL)

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


def _call_llm(prompt: str) -> dict[str, Any]:
    """Call APIFreeLLM with retries and return parsed response.

    Handles rate limiting, timeouts, and connection errors with
    automatic retry logic.
    """
    last_exception: Exception | None = None

    for attempt in range(1, API_MAX_RETRIES + 1):
        try:
            logger.info(
                "Interview question generation attempt %d/%d",
                attempt, API_MAX_RETRIES,
            )

            raw_text = _post_to_api(prompt)
            parsed_data = _parse_response(raw_text)

            # Retry on parse failure if attempts remain
            if parsed_data.get('parse_error') and attempt < API_MAX_RETRIES:
                logger.warning(
                    "Parse error on attempt %d — retrying.", attempt
                )
                time.sleep(API_RETRY_DELAY)
                continue

            logger.info(
                "Successfully generated interview data on attempt %d.", attempt
            )
            return parsed_data

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
                f"AI API request timed out after {API_TIMEOUT}s. "
                "Try fewer questions or try again later."
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

    raise last_exception or LLMGenerationError(
        "Interview question generation failed."
    )


# ──────────────────────────────────────────────────────────────────────────────
#  Public API — Main Entry Point
# ──────────────────────────────────────────────────────────────────────────────

def generate_interview_questions(
    user,
    job_description: str,
    question_type: str,
    count: int = 10,
    difficulty: str = 'medium',
) -> dict[str, Any]:
    """Generate interview questions based on type.

    Parameters
    ----------
    user : Django User instance
    job_description : str
        The target job posting.
    question_type : str
        One of: aptitude, hr, technical, behavioral, mock.
    count : int
        Number of questions to generate.
    difficulty : str
        Difficulty level: easy, medium, hard.

    Returns
    -------
    dict
        Structured question data matching the requested type.

    Raises
    ------
    ValueError
        If question_type is unknown or personal info is missing.
    LLMAuthError, LLMConnectionError, LLMTimeoutError,
    LLMRateLimitError, LLMGenerationError
        For various API failures.
    """
    user_data = collect_user_data(user)

    valid_types = {'aptitude', 'hr', 'technical', 'behavioral', 'mock'}
    if question_type not in valid_types:
        raise ValueError(
            f"Unknown question type: '{question_type}'. "
            f"Must be one of: {', '.join(sorted(valid_types))}"
        )

    # Aptitude doesn't need user data, but all others do
    if question_type != 'aptitude' and not user_data.get('personal_info'):
        raise ValueError(
            "Please complete your personal information before generating "
            "interview questions."
        )

    generators = {
        'aptitude': lambda: _generate_aptitude_questions(
            job_description, count, difficulty
        ),
        'hr': lambda: _generate_hr_questions(
            user_data, job_description, count
        ),
        'technical': lambda: _generate_technical_questions(
            user_data, job_description, count, difficulty
        ),
        'behavioral': lambda: _generate_behavioral_questions(
            user_data, job_description, count
        ),
        'mock': lambda: _generate_mock_interview(
            user_data, job_description, count
        ),
    }

    return generators[question_type]()


# ──────────────────────────────────────────────────────────────────────────────
#  Question Type Generators
# ──────────────────────────────────────────────────────────────────────────────

def _generate_aptitude_questions(
    job_description: str,
    count: int,
    difficulty: str,
) -> dict[str, Any]:
    """Generate MCQ aptitude questions with correct answers."""

    prompt = f"""You are an aptitude test question generator for job interviews.

JOB CONTEXT:
{job_description}

TASK: Generate {count} multiple-choice aptitude questions.
Difficulty: {difficulty}

Include a mix of:
- Quantitative/Mathematical reasoning
- Logical reasoning
- Verbal reasoning
- Data interpretation
- Pattern recognition

RESPOND IN THIS EXACT JSON FORMAT ONLY.
No markdown, no code fences, no explanation — ONLY pure valid JSON:
{{
    "questions": [
        {{
            "id": 1,
            "question": "Clear question text here?",
            "options": {{
                "A": "Option A text",
                "B": "Option B text",
                "C": "Option C text",
                "D": "Option D text"
            }},
            "correct_answer": "B",
            "explanation": "Detailed explanation of why B is correct...",
            "category": "Quantitative",
            "difficulty": "medium"
        }}
    ]
}}

RULES:
- Each question must have exactly 4 options (A, B, C, D)
- Only ONE correct answer per question
- Include clear explanations
- Mix different aptitude categories
- Make distractors plausible but clearly wrong
"""

    return _call_llm(prompt)


def _generate_hr_questions(
    user_data: dict[str, Any],
    job_description: str,
    count: int,
) -> dict[str, Any]:
    """Generate HR interview questions with suggested answers."""

    prompt = f"""You are an HR interview preparation expert.

CANDIDATE:
{json.dumps(user_data, indent=2, default=str)}

JOB DESCRIPTION:
{job_description}

TASK: Generate {count} HR interview questions with ideal answers tailored to this candidate.

Include questions about:
- Self introduction
- Strengths and weaknesses
- Career goals
- Why this company/role
- Salary expectations
- Work culture fit
- Conflict resolution
- Leadership experience
- Team collaboration

RESPOND IN THIS EXACT JSON FORMAT ONLY.
No markdown, no code fences, no explanation — ONLY pure valid JSON:
{{
    "questions": [
        {{
            "id": 1,
            "question": "Tell me about yourself",
            "category": "Introduction",
            "suggested_answer": "A detailed, personalized answer using the candidate's actual experience...",
            "tips": ["Tip 1 for answering this well", "Tip 2"],
            "what_they_look_for": "What the interviewer is really assessing",
            "common_mistakes": "What to avoid when answering"
        }}
    ]
}}
"""

    return _call_llm(prompt)


def _generate_technical_questions(
    user_data: dict[str, Any],
    job_description: str,
    count: int,
    difficulty: str,
) -> dict[str, Any]:
    """Generate technical interview questions based on skills."""

    prompt = f"""You are a senior technical interviewer.

CANDIDATE SKILLS:
{json.dumps(user_data.get('skills', []), indent=2, default=str)}

CANDIDATE EXPERIENCE:
{json.dumps(user_data.get('experience', []), indent=2, default=str)}

JOB DESCRIPTION:
{job_description}

TASK: Generate {count} technical interview questions.
Difficulty: {difficulty}

Include questions about:
- Core technical concepts related to the job
- Problem-solving scenarios
- System design (if senior role)
- Coding/logic questions
- Technology-specific questions matching candidate's skills

RESPOND IN THIS EXACT JSON FORMAT ONLY.
No markdown, no code fences, no explanation — ONLY pure valid JSON:
{{
    "questions": [
        {{
            "id": 1,
            "question": "Technical question here?",
            "category": "Data Structures",
            "difficulty": "{difficulty}",
            "suggested_answer": "Detailed model answer...",
            "follow_up": "A likely follow-up question the interviewer might ask",
            "key_points": ["Key point 1 to mention", "Key point 2"]
        }}
    ]
}}
"""

    return _call_llm(prompt)


def _generate_behavioral_questions(
    user_data: dict[str, Any],
    job_description: str,
    count: int,
) -> dict[str, Any]:
    """Generate behavioral (STAR method) questions."""

    prompt = f"""You are a behavioral interview expert using the STAR method.

CANDIDATE:
{json.dumps(user_data, indent=2, default=str)}

JOB DESCRIPTION:
{job_description}

TASK: Generate {count} behavioral interview questions with STAR-method answers.

RESPOND IN THIS EXACT JSON FORMAT ONLY.
No markdown, no code fences, no explanation — ONLY pure valid JSON:
{{
    "questions": [
        {{
            "id": 1,
            "question": "Tell me about a time when you...",
            "category": "Leadership",
            "star_answer": {{
                "situation": "Describe the context using candidate's actual experience...",
                "task": "What was the specific challenge...",
                "action": "What steps were taken...",
                "result": "What was the measurable outcome..."
            }},
            "tips": ["Tip 1", "Tip 2"],
            "variations": ["Similar question phrased differently"]
        }}
    ]
}}
"""

    return _call_llm(prompt)


def _generate_mock_interview(
    user_data: dict[str, Any],
    job_description: str,
    count: int,
) -> dict[str, Any]:
    """Generate a full mock interview simulation."""

    prompt = f"""You are a senior hiring manager conducting a mock interview.

CANDIDATE:
{json.dumps(user_data, indent=2, default=str)}

JOB DESCRIPTION:
{job_description}

TASK: Create a {count}-question mock interview simulation with a mix of HR,
technical, and behavioral questions in the order they'd typically appear
in a real interview.

RESPOND IN THIS EXACT JSON FORMAT ONLY.
No markdown, no code fences, no explanation — ONLY pure valid JSON:
{{
    "interview_flow": [
        {{
            "id": 1,
            "phase": "Opening",
            "question": "Question text",
            "type": "HR",
            "ideal_answer": "Model answer personalized to candidate...",
            "scoring_criteria": "What makes a great vs good vs poor answer",
            "time_suggested": "2-3 minutes"
        }}
    ],
    "overall_tips": [
        "General interview tip 1",
        "General interview tip 2"
    ]
}}
"""

    return _call_llm(prompt)


# ──────────────────────────────────────────────────────────────────────────────
#  Aptitude Answer Checker
# ──────────────────────────────────────────────────────────────────────────────

def check_aptitude_answers(
    questions_data: list[dict[str, Any]],
    user_answers: dict[str, str],
) -> dict[str, Any]:
    """Check user's aptitude answers against correct answers.

    Parameters
    ----------
    questions_data : list[dict]
        List of question dicts, each containing 'id', 'correct_answer', etc.
    user_answers : dict[str, str]
        Mapping of question ID (as string) to user's selected answer letter.

    Returns
    -------
    dict
        Results with score, percentage, grade, and per-question breakdown.
    """
    results = []
    correct_count = 0
    total = len(questions_data)

    for q in questions_data:
        qid = q.get('id', 0)
        correct = q.get('correct_answer', '')
        user_ans = user_answers.get(str(qid), '')
        is_correct = user_ans.upper() == correct.upper() if user_ans else False

        if is_correct:
            correct_count += 1

        results.append({
            'id': qid,
            'question': q.get('question', ''),
            'your_answer': user_ans,
            'correct_answer': correct,
            'is_correct': is_correct,
            'explanation': q.get('explanation', ''),
            'category': q.get('category', ''),
        })

    return {
        'results': results,
        'score': correct_count,
        'total': total,
        'percentage': round((correct_count / total) * 100, 1) if total > 0 else 0,
        'grade': _get_grade(correct_count, total),
    }


def _get_grade(correct: int, total: int) -> str:
    """Return a human-readable grade based on score percentage."""
    if total == 0:
        return 'N/A'
    pct = (correct / total) * 100
    if pct >= 90:
        return 'Excellent'
    elif pct >= 75:
        return 'Good'
    elif pct >= 60:
        return 'Average'
    elif pct >= 40:
        return 'Below Average'
    else:
        return 'Needs Improvement'