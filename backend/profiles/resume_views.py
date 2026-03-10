import json
import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .ollama_service import (
    collect_user_data,
    generate_resume,
    generate_simple_llm_response,
    parse_simple_json,
    LLMAuthError,
    LLMConnectionError,
    LLMTimeoutError,
    LLMRateLimitError,
    LLMGenerationError,
)

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════
# JOB MATCH PROMPT BUILDER
# ══════════════════════════════════════════════════════════════════════

def build_match_prompt(user_data: dict, job_description: str) -> str:
    """Build a prompt to check if a job matches the user's profile."""

    # Extract key info for comparison
    personal = user_data.get('personal_info', {})
    skills = user_data.get('skills', [])
    experience = user_data.get('experience', [])
    education = user_data.get('education', [])
    projects = user_data.get('projects', [])
    certifications = user_data.get('certifications', [])

    # Format skills
    skill_names = [s.get('name', '') for s in skills if s.get('name')]
    skill_categories = list(set(s.get('category', '') for s in skills if s.get('category')))

    # Format experience
    exp_summary = []
    for exp in experience:
        role = exp.get('role', '')
        company = exp.get('company', '')
        desc = exp.get('description', '')
        if role:
            exp_summary.append(f"- {role} at {company}: {desc[:200]}")

    # Format education
    edu_summary = []
    for edu in education:
        degree = edu.get('degree', '')
        institution = edu.get('institution', '')
        if degree:
            edu_summary.append(f"- {degree} from {institution}")

    # Format projects
    proj_summary = []
    for proj in projects:
        title = proj.get('title', '')
        tech = proj.get('technologies', '')
        if title:
            proj_summary.append(f"- {title} (Tech: {tech})")

    prompt = f"""You are an AI career advisor. Your job is to determine if a job description is a reasonable match for the candidate's profile.

CANDIDATE PROFILE:
==================
Name: {personal.get('name', 'N/A')}

Skills: {', '.join(skill_names) if skill_names else 'None listed'}
Skill Categories: {', '.join(skill_categories) if skill_categories else 'None'}

Experience:
{chr(10).join(exp_summary) if exp_summary else 'No experience listed'}

Education:
{chr(10).join(edu_summary) if edu_summary else 'No education listed'}

Projects:
{chr(10).join(proj_summary) if proj_summary else 'No projects listed'}

Certifications: {', '.join(c.get('title', '') for c in certifications if c.get('title')) or 'None'}

JOB DESCRIPTION:
================
{job_description}

EVALUATION RULES:
=================
1. Compare the candidate's skills, experience, education, and projects against the job requirements.
2. The match does NOT need to be perfect — partial matches count.
3. If the candidate has at least 40% of the required skills OR relevant experience in a similar domain, respond YES.
4. If the job is in a completely different field with zero overlap, respond NO.
5. Consider transferable skills (e.g., a Python developer can apply for Django jobs).
6. Be generous — career transitions and growth opportunities should lean toward YES.
7. Consider projects and education as valid experience for entry-level positions.

RESPOND WITH THIS EXACT JSON FORMAT ONLY (no markdown, no explanation, no code fences):
{{"match": "YES", "reason": "Brief explanation of why it matches", "match_score": 75, "matching_skills": ["skill1", "skill2"], "missing_skills": ["skill3", "skill4"], "recommendation": "Brief tip for the candidate"}}

OR if no match:
{{"match": "NO", "reason": "Brief explanation of why it does not match", "match_score": 15, "matching_skills": [], "missing_skills": ["skill1", "skill2"], "recommendation": "Suggestion for what jobs would be better"}}
"""
    return prompt


# ══════════════════════════════════════════════════════════════════════
# GENERATE RESUME VIEW
# ══════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_resume_view(request):
    """Generate an ATS-optimized resume only if the job matches the user's profile."""
    try:
        body = request.data

        job_description = body.get('job_description', '')
        customization = body.get('customization', '')
        template = body.get('template', 'modern')
        color_scheme = body.get('color_scheme', 'blue')
        font_style = body.get('font_style', 'inter')

        if not job_description.strip():
            return Response(
                {'status': 'error', 'message': 'Job description is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ─── Collect user profile data ───
        user_data = collect_user_data(request.user)

        if not user_data.get('personal_info'):
            return Response(
                {
                    'status': 'error',
                    'message': 'Please complete your personal information before generating a resume.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ─── Check if user has enough data ───
        has_skills = bool(user_data.get('skills'))
        has_experience = bool(user_data.get('experience'))
        has_education = bool(user_data.get('education'))
        has_projects = bool(user_data.get('projects'))

        if not (has_skills or has_experience or has_education or has_projects):
            return Response(
                {
                    'status': 'error',
                    'message': 'Please add at least some skills, experience, education, or projects to your profile before generating a resume.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ═══════════════════════════════════════════════
        # STEP 1: AI JOB MATCH CHECK
        # ═══════════════════════════════════════════════

        logger.info("Starting job match check for user %s", request.user.pk)

        match_prompt = build_match_prompt(user_data, job_description)

        try:
            # Use simple LLM call (not resume parser)
            raw_response = generate_simple_llm_response(match_prompt)
            match_result = parse_simple_json(raw_response)

        except LLMAuthError as e:
            logger.error("LLM Auth error during match check: %s", e)
            return Response(
                {
                    'status': 'error',
                    'message': 'AI service authentication failed. Please contact support.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except (LLMConnectionError, LLMTimeoutError) as e:
            logger.warning("LLM connection issue during match check: %s", e)
            # If match check fails due to connection, skip it and proceed
            logger.info("Skipping match check due to connection issue, proceeding with generation.")
            match_result = {"match": "YES", "reason": "Match check skipped due to connection issue."}

        except (LLMRateLimitError, LLMGenerationError) as e:
            logger.warning("LLM error during match check: %s", e)
            # Skip match check on rate limit/generation errors
            match_result = {"match": "YES", "reason": "Match check skipped."}

        except Exception as e:
            logger.exception("Unexpected error during match check")
            # Don't block resume generation if match check fails
            match_result = {"match": "YES", "reason": "Match check unavailable."}

        # ─── Validate match result ───
        if not match_result or not isinstance(match_result, dict):
            logger.warning("Invalid match result, proceeding with generation.")
            match_result = {"match": "YES", "reason": "Could not verify match."}

        match_status = match_result.get('match', '').upper().strip()

        # ─── Handle NO match ───
        if match_status == 'NO':
            logger.info(
                "Job match rejected for user %s. Reason: %s",
                request.user.pk,
                match_result.get('reason', 'No reason provided'),
            )
            return Response(
                {
                    'status': 'error',
                    'message': 'This job description does not match your profile.',
                    'match_data': {
                        'match': 'NO',
                        'reason': match_result.get('reason', 'The job requirements do not align with your current skills and experience.'),
                        'match_score': match_result.get('match_score', 0),
                        'matching_skills': match_result.get('matching_skills', []),
                        'missing_skills': match_result.get('missing_skills', []),
                        'recommendation': match_result.get('recommendation', 'Consider applying for roles that better match your skill set.'),
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(
            "Job match approved for user %s (score: %s). Proceeding with generation.",
            request.user.pk,
            match_result.get('match_score', 'N/A'),
        )

        # ═══════════════════════════════════════════════
        # STEP 2: GENERATE RESUME
        # ═══════════════════════════════════════════════

        resume_data = generate_resume(
            user=request.user,
            job_description=job_description,
            customization=customization,
        )

        # ─── Attach profile image ───
        profile_image_url = user_data.get('personal_info', {}).get('profile_image_url')

        if profile_image_url:
            profile_image_url = request.build_absolute_uri(profile_image_url)

        if 'personal_info' not in resume_data:
            resume_data['personal_info'] = user_data.get('personal_info', {})

        resume_data['personal_info']['profile_image_url'] = profile_image_url

        # ─── Attach additional links ───
        if 'additional_links' not in resume_data:
            resume_data['additional_links'] = user_data.get('additional_links', [])

        return Response({
            'status': 'success',
            'message': 'Resume generated successfully!',
            'resume_data': resume_data,
            'style': {
                'template': template,
                'color_scheme': color_scheme,
                'font_style': font_style,
            },
            'match_data': {
                'match': 'YES',
                'reason': match_result.get('reason', ''),
                'match_score': match_result.get('match_score', 0),
                'matching_skills': match_result.get('matching_skills', []),
            },
        })

    except ValueError as e:
        return Response(
            {'status': 'error', 'message': str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    except LLMAuthError as e:
        return Response(
            {'status': 'error', 'message': 'AI service authentication failed. Please contact support.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    except (LLMConnectionError, LLMTimeoutError) as e:
        return Response(
            {'status': 'error', 'message': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    except LLMRateLimitError as e:
        return Response(
            {'status': 'error', 'message': 'AI service is busy. Please wait 30 seconds and try again.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    except LLMGenerationError as e:
        return Response(
            {'status': 'error', 'message': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    except Exception as e:
        logger.exception("Resume generation error")
        return Response(
            {'status': 'error', 'message': 'An unexpected error occurred. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ══════════════════════════════════════════════════════════════════════
# PREVIEW DATA VIEW
# ══════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resume_preview_data(request):
    """
    GET /api/resume/preview/
    Returns all user data for preview without AI generation.
    """
    user_data = collect_user_data(request.user)
    has_data = bool(user_data.get('personal_info'))

    return Response({
        'status': 'success',
        'has_data': has_data,
        'data': user_data,
    })


# ══════════════════════════════════════════════════════════════════════
# JOB MATCH CHECK VIEW (standalone - optional)
# ══════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_job_match(request):
    """
    POST /api/resume/check-match/
    Check if a job description matches the user's profile without generating a resume.
    Useful for pre-validation before the user commits to generating.
    """
    try:
        job_description = request.data.get('job_description', '')

        if not job_description.strip():
            return Response(
                {'status': 'error', 'message': 'Job description is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_data = collect_user_data(request.user)

        if not user_data.get('personal_info'):
            return Response(
                {'status': 'error', 'message': 'Please complete your profile first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        match_prompt = build_match_prompt(user_data, job_description)
        raw_response = generate_simple_llm_response(match_prompt)
        match_result = parse_simple_json(raw_response)

        if not match_result:
            return Response(
                {'status': 'error', 'message': 'Unable to analyze job match. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        match_status = match_result.get('match', '').upper().strip()

        return Response({
            'status': 'success',
            'match_data': {
                'match': match_status,
                'reason': match_result.get('reason', ''),
                'match_score': match_result.get('match_score', 0),
                'matching_skills': match_result.get('matching_skills', []),
                'missing_skills': match_result.get('missing_skills', []),
                'recommendation': match_result.get('recommendation', ''),
            }
        })

    except Exception as e:
        logger.exception("Job match check error")
        return Response(
            {'status': 'error', 'message': 'Failed to check job match. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )