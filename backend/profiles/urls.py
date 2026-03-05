from django.urls import path
from . import views
from . import resume_views
from . import email_views
from . import interview_views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.dashboard, name='dashboard'),

    # Personal Info
    path('personal-info/', views.personal_info, name='personal_info'),

    # Additional Links
    path('additional-links/', views.additional_link_list, name='additional_link_list'),
    path('additional-links/<int:pk>/', views.additional_link_detail, name='additional_link_detail'),

    # Education
    path('education/', views.education_list, name='education_list'),
    path('education/<int:pk>/', views.education_detail, name='education_detail'),

    # Experience
    path('experience/', views.experience_list, name='experience_list'),
    path('experience/<int:pk>/', views.experience_detail, name='experience_detail'),

    # Skills
    path('skills/', views.skill_list, name='skill_list'),
    path('skills/<int:pk>/', views.skill_detail, name='skill_detail'),

    # Projects
    path('projects/', views.project_list, name='project_list'),
    path('projects/<int:pk>/', views.project_detail, name='project_detail'),

    # Certifications
    path('certifications/', views.certification_list, name='certification_list'),
    path('certifications/<int:pk>/', views.certification_detail, name='certification_detail'),

    # Achievements
    path('achievements/', views.achievement_list, name='achievement_list'),
    path('achievements/<int:pk>/', views.achievement_detail, name='achievement_detail'),

    # Resume
    # ✅ CORRECT
    path('resume/generate/', resume_views.generate_resume_view, name='generate_resume'),
    path('resume/preview/', resume_views.resume_preview_data, name='resume_preview'),

    # Cold Email
    path('email/generate/', email_views.generate_email, name='generate_email'),

    # Interview Prep
    path('interview/generate/', interview_views.generate_questions, name='generate_questions'),
    path('interview/check-answers/', interview_views.check_answers, name='check_answers'),
]