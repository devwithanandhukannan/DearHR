import os
import uuid

from django.db import models
from django.contrib.auth.models import User
from django.conf import settings  # ✅ FIXED — was: from backend.backend import settings


MONTH_CHOICES = [
    ('', ''),
    ('January', 'January'),
    ('February', 'February'),
    ('March', 'March'),
    ('April', 'April'),
    ('May', 'May'),
    ('June', 'June'),
    ('July', 'July'),
    ('August', 'August'),
    ('September', 'September'),
    ('October', 'October'),
    ('November', 'November'),
    ('December', 'December'),
]

SKILL_LEVEL_CHOICES = [
    ('Beginner', 'Beginner'),
    ('Intermediate', 'Intermediate'),
    ('Advanced', 'Advanced'),
    ('Expert', 'Expert'),
]

LINK_TYPE_CHOICES = [
    ('Portfolio', 'Portfolio'),
    ('Blog', 'Blog'),
    ('Twitter', 'Twitter'),
    ('StackOverflow', 'StackOverflow'),
    ('Behance', 'Behance'),
    ('Dribbble', 'Dribbble'),
    ('Medium', 'Medium'),
    ('YouTube', 'YouTube'),
    ('Other', 'Other'),
]


def profile_image_path(instance, filename):
    """Generate unique filename for profile images."""
    ext = filename.split('.')[-1].lower()
    new_filename = f"{uuid.uuid4().hex}.{ext}"
    return os.path.join('profile_images', new_filename)


class PersonalInfo(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='personal_info',
    )
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, default='')
    location = models.CharField(max_length=100, blank=True, default='')
    linkedin = models.URLField(blank=True, default='')
    github = models.URLField(blank=True, default='')
    website = models.URLField(blank=True, default='')

    profile_image = models.ImageField(
        upload_to=profile_image_path,
        blank=True,
        null=True,
        help_text='Profile photo (JPG, PNG). Max 5MB.',
    )

    def __str__(self):
        return self.name

    def delete_old_image(self):
        """Delete the old image file when a new one is uploaded."""
        try:
            old = PersonalInfo.objects.get(pk=self.pk)
            if old.profile_image and old.profile_image != self.profile_image:
                if os.path.isfile(old.profile_image.path):
                    os.remove(old.profile_image.path)
        except PersonalInfo.DoesNotExist:
            pass

    def save(self, *args, **kwargs):
        if self.pk:
            self.delete_old_image()
        super().save(*args, **kwargs)


class AdditionalLink(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='additional_links')
    link_type = models.CharField(max_length=100, choices=LINK_TYPE_CHOICES)
    url = models.URLField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'additional_links'
        ordering = ['link_type']

    def __str__(self):
        return f"{self.link_type}: {self.url}"


class Education(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='education_entries')
    degree = models.CharField(max_length=200)
    institution = models.CharField(max_length=300)
    start_month = models.CharField(max_length=20, choices=MONTH_CHOICES, blank=True, default='')
    start_year = models.PositiveIntegerField()
    end_month = models.CharField(max_length=20, choices=MONTH_CHOICES, blank=True, default='')
    end_year = models.PositiveIntegerField(null=True, blank=True)
    gpa = models.CharField(max_length=20, blank=True, default='')
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'education'
        ordering = ['-start_year']

    def __str__(self):
        return f"{self.degree} at {self.institution}"


class Experience(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='experience_entries')
    role = models.CharField(max_length=200)
    company = models.CharField(max_length=300)
    start_month = models.CharField(max_length=20, choices=MONTH_CHOICES, blank=True, default='')
    start_year = models.PositiveIntegerField()
    end_month = models.CharField(max_length=20, choices=MONTH_CHOICES, blank=True, default='')
    end_year = models.PositiveIntegerField(null=True, blank=True)
    is_present = models.BooleanField(default=False)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'experience'
        ordering = ['-start_year']

    def __str__(self):
        return f"{self.role} at {self.company}"


class Skill(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='skills')
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=100, blank=True, default='')
    level = models.CharField(max_length=20, choices=SKILL_LEVEL_CHOICES, default='Intermediate')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'skills'
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.level})"


class Project(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default='')
    technologies = models.CharField(max_length=500, blank=True, default='')
    link = models.URLField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Certification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certifications')
    title = models.CharField(max_length=300)
    organization = models.CharField(max_length=300)
    year = models.PositiveIntegerField()
    link = models.URLField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'certifications'
        ordering = ['-year']

    def __str__(self):
        return f"{self.title} - {self.organization}"


class Achievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='achievements')
    title = models.CharField(max_length=300)
    year = models.PositiveIntegerField()
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'achievements'
        ordering = ['-year']

    def __str__(self):
        return f"{self.title} ({self.year})"