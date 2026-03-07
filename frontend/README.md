# DearHR - Career Assistant Platform

> **Professional Career Development Suite**: An all-in-one web application to help you build a professional profile, generate personalized cold emails, prepare for interviews, and create impressive resumes.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Requirements](#system-requirements)
- [Project Structure](#project-structure)
- [Installation Guide](#installation-guide)
- [How to Run](#how-to-run)
- [Available Features & Modules](#available-features--modules)
- [API Endpoints Overview](#api-endpoints-overview)
- [Contributing](#contributing)

---

## 🎯 Project Overview

**DearHR** is a comprehensive career development platform designed to help professionals:

- **Build Professional Profiles**: Create and manage detailed professional profiles with personal information, education, experience, skills, projects, certifications, and achievements
- **Generate Smart Cold Emails**: Craft personalized cold emails with AI assistance in multiple styles and tones
- **Excel in Interview Preparation**: Practice aptitude tests, prepare for HR and technical interviews with AI-powered suggestions
- **Create Professional Resumes**: Generate, edit, and export polished resumes from your profile data
- **AI-Powered Assistance**: Leverage Ollama integration for intelligent suggestions and responses

This platform bridges the gap between profile management and career advancement tools in one unified application.

---

## ✨ Key Features

### 1. **Professional Profile Management**
- **Personal Information**: Name, email, phone, location, social links (LinkedIn, GitHub, Portfolio)
- **Profile Photo**: Upload and manage profile pictures
- **Additional Links**: Add portfolio, blog, Twitter, StackOverflow, Behance, Dribbble, Medium, YouTube links
- **Education History**: Track degrees, institutions, GPA, and descriptions with month/year precision
- **Work Experience**: Document roles, companies, tenure, and job descriptions
- **Skills Management**: Categorize and rate skills (Beginner to Expert)
- **Projects Showcase**: List portfolio projects with descriptions and technology stacks
- **Certifications**: Maintain a record of professional certifications
- **Achievements**: Highlight accomplishments and milestones

### 2. **Cold Email Generator**
- **Multiple Email Types**: Application, Networking, Referral, Follow-up
- **Tone Selection**: Professional, Friendly, Confident, Enthusiastic tones
- **AI-Powered Generation**: Smart email creation based on your profile
- **Alternative Subject Lines**: Generate and swap subject lines for better open rates
- **One-Click Copy**: Easily copy emails to clipboard
- **Personalization Tips**: Get actionable suggestions for customization
- **Regenerate Options**: Create multiple variations of emails

### 3. **Interview Preparation**
- **Aptitude Tests**: MCQ format with auto-grading and detailed explanations
- **HR Interview Module**: Common HR questions with personalized answers
- **Technical Interview Prep**: Technical question preparation with detailed solutions
- **Behavioral Interview Guide**: Tips and common behavioral questions
- **Smart Suggestions**: AI-powered tips on "what interviewers look for"
- **Common Mistakes**: Learn what to avoid in interviews
- **Score Tracking**: Maintain performance history

### 4. **Resume Building & Management**
- **Auto-Generated Resumes**: Create resumes from your profile data
- **Resume Editor**: Edit and customize resume content
- **Multiple Sections**: Personal info, education, experience, skills, projects, certifications, achievements
- **PDF Export**: Download resumes as professional PDF documents
- **Templates**: Clean, professional resume layout
- **Real-time Preview**: See changes instantly

### 5. **User Authentication & Security**
- **Account Management**: Secure signup and login system
- **Password Recovery**: Forgot password functionality
- **User Profiles**: Individual user workspaces
- **JWT Authentication**: Secure API access

---

## 💻 Technology Stack

### **Frontend**
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.4
- **Routing**: React Router DOM 6.28.0
- **HTTP Client**: Axios 1.13.4
- **UI Icons**: React Icons 5.5.0
- **PDF Generation**: html2pdf.js 0.14.0
- **Styling**: CSS3

### **Backend**
- **Framework**: Django 4.2.16
- **API**: Django REST Framework 3.15.2
- **Database**: MySQL (with mysqlclient 2.2.4)
- **CORS**: django-cors-headers
- **Image Processing**: Pillow
- **HTTP Library**: Requests 2.32.3
- **AI Integration**: Ollama (local AI model)

### **Database**
- **Primary Database**: MySQL
- **ORM**: Django ORM

### **Tools & Libraries**
- **AI/ML**: Ollama (Local AI model for intelligent suggestions)
- **Image Processing**: Pillow
- **API Communication**: Requests library

---

## 🖥️ System Requirements

### **Minimum Requirements**
- **Python**: 3.8 or higher
- **Node.js**: 14.0 or higher
- **npm**: 6.0 or higher
- **MySQL**: 5.7 or higher
- **RAM**: 4GB minimum
- **Storage**: 2GB minimum

### **Recommended Requirements**
- **Python**: 3.10+
- **Node.js**: 18.0+
- **MySQL**: 8.0+
- **RAM**: 8GB
- **Storage**: 5GB
- **Ollama**: For AI features (optional but recommended)

---

## 📁 Project Structure

```
DearHR/
├── README.md                          # Project documentation
├── requirements.txt                   # Python dependencies
│
├── backend/                           # Django backend
│   ├── manage.py                      # Django management script
│   ├── backend/                       # Main Django project settings
│   │   ├── settings.py               # Django configuration
│   │   ├── urls.py                   # Main URL routing
│   │   ├── wsgi.py                   # Production server config
│   │   └── asgi.py                   # Async server config
│   │
│   ├── accounts/                      # User authentication app
│   │   ├── models.py                 # User models
│   │   ├── views.py                  # Authentication views
│   │   ├── serializers.py            # API serializers
│   │   ├── urls.py                   # App URL routing
│   │   └── admin.py                  # Django admin config
│   │
│   ├── profiles/                      # Profile & career features app
│   │   ├── models.py                 # Profile models (Personal Info, Experience, Education, Skills, etc.)
│   │   ├── views.py                  # Profile views and API endpoints
│   │   ├── resume_views.py           # Resume generation endpoints
│   │   ├── email_views.py            # Cold email generation endpoints
│   │   ├── interview_views.py        # Interview prep endpoints
│   │   ├── serializers.py            # Profile serializers
│   │   ├── resume_serializers.py     # Resume data serializers
│   │   ├── email_service.py          # Email generation logic
│   │   ├── interview_service.py      # Interview prep logic
│   │   ├── ollama_service.py         # AI integration service
│   │   ├── urls.py                   # App URL routing
│   │   ├── admin.py                  # Django admin config
│   │   └── migrations/               # Database migrations
│   │
│   └── media/                         # User uploads (profile images)
│       └── profile_images/           # Profile picture storage
│
└── frontend/                          # React frontend
    ├── package.json                   # Node dependencies
    ├── vite.config.js                # Vite build configuration
    ├── eslint.config.js              # Linting configuration
    ├── index.html                    # Entry HTML file
    │
    ├── src/
    │   ├── main.jsx                  # React app entry point
    │   ├── App.jsx                   # Main App component
    │   ├── App.css                   # Main styles
    │   ├── index.css                 # Global styles
    │   │
    │   ├── api/
    │   │   └── axios.js              # Axios HTTP client configuration
    │   │
    │   ├── context/
    │   │   └── AuthContext.jsx       # Authentication context
    │   │
    │   ├── components/
    │   │   ├── Layout.jsx            # Main layout wrapper
    │   │   ├── Sidebar.jsx           # Navigation sidebar
    │   │   ├── ProtectedRoute.jsx    # Protected route component
    │   │   └── MessageAlert.jsx      # Alert component
    │   │
    │   ├── assets/                   # Images and static assets
    │   │
    │   └── pages/                    # Page components
    │       ├── Login.jsx             # Login page
    │       ├── Signup.jsx            # Registration page
    │       ├── ForgotPassword.jsx    # Password recovery
    │       ├── Dashboard.jsx         # Main dashboard
    │       ├── PersonalInfo.jsx      # Personal info management
    │       ├── Education.jsx         # Education history
    │       ├── Experience.jsx        # Work experience
    │       ├── Skills.jsx            # Skills management
    │       ├── Projects.jsx          # Projects showcase
    │       ├── Certifications.jsx    # Certifications
    │       ├── Achievements.jsx      # Achievements
    │       ├── AdditionalLinks.jsx   # Social/portfolio links
    │       ├── ColdEmail.jsx         # Cold email generator
    │       ├── InterviewPrep.jsx     # Interview preparation
    │       ├── GenerateResume.jsx    # Resume generation
    │       ├── ResumeEditor.jsx      # Resume editor
    │       └── ResumeEditor.css      # Resume styles
    │
    └── public/                        # Static public assets

```

---

## 🚀 Installation Guide

### **Prerequisites**
Make sure you have installed:
- Python 3.8+
- Node.js 14.0+
- npm 6.0+
- MySQL 5.7+
- Git

### **Step 1: Clone the Repository**
```bash
git clone <repository-url>
cd DearHR
```

### **Step 2: Setup Python Virtual Environment**
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.\.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate
```

### **Step 3: Install Backend Dependencies**
```bash
# Navigate to backend
cd backend

# Install Python packages
pip install -r ../requirements.txt
```

### **Step 4: Configure MySQL Database**

1. Start your MySQL server
2. Create a database and user:

```sql
CREATE DATABASE dearhr_db;
CREATE USER 'dearhr_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON dearhr_db.* TO 'dearhr_user'@'localhost';
FLUSH PRIVILEGES;
```

3. Update `backend/backend/settings.py` with your database credentials:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'dearhr_db',
        'USER': 'dearhr_user',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}
```

### **Step 5: Run Database Migrations**
```bash
# From backend directory
python manage.py migrate
```

### **Step 6: Create Superuser (Admin Account)**
```bash
python manage.py createsuperuser
# Follow prompts to create admin account
```

### **Step 7: Install Frontend Dependencies**
```bash
# Navigate to frontend
cd ../frontend

# Install npm packages
npm install
```

### **Step 8: Setup Ollama (Optional but Recommended)**
For AI-powered features:
1. Download Ollama from https://ollama.ai
2. Install and run: `ollama run llama2` (or your preferred model)

---

## 🎮 How to Run

### **Running the Backend**

```bash
# From DearHR/backend directory (with .venv activated)
python manage.py runserver
```

Backend will be available at: **http://localhost:8000**

Admin panel at: **http://localhost:8000/admin**

### **Running the Frontend**

In a new terminal:

```bash
# From DearHR/frontend directory
npm run dev
```

Frontend will be available at: **http://localhost:5173**

### **Running Both Together (Complete Setup)**

1. **Terminal 1 - Backend:**
```bash
cd backend
.\.venv\Scripts\activate  # On Windows
python manage.py runserver
```

2. **Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

3. **Access the Application:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000
   - Admin: http://localhost:8000/admin

### **Building for Production**

```bash
# Frontend build
cd frontend
npm run build
# Output will be in the dist/ folder

# Backend with gunicorn
pip install gunicorn
gunicorn backend.wsgi:application --bind 0.0.0.0:8000
```

---

## 📚 Available Features & Modules

### **1. Authentication Module** (`accounts/`)
- User registration and login
- Password management
- JWT token authentication
- User profile linking

### **2. Profile Management** (`profiles/`)
- Personal information CRUD
- Education history management
- Work experience tracking
- Skills inventory
- Project portfolio
- Certifications database
- Achievements logging
- Additional links/social profiles
- Profile image upload

### **3. Resume Module** (`profiles/resume_views.py`)
- Auto-generate resume from profile data
- Resume customization and editing
- PDF export functionality
- Multiple resume versions
- Resume preview

### **4. Email Generator Module** (`profiles/email_views.py`)
- Cold email generation
- Multiple email types support
- Tone selection (Professional, Friendly, Confident, Enthusiastic)
- Subject line generation
- Email refresh/regenerate
- Template-based generation

### **5. Interview Preparation Module** (`profiles/interview_views.py`)
- Aptitude test creation and grading
- HR interview question suggestions
- Technical interview resources
- Behavioral interview guidance
- Performance tracking

### **6. AI Integration** (`profiles/ollama_service.py`)
- Ollama model integration
- Smart suggestions for emails
- Interview answer generation
- Personalized recommendations

---

## 🔌 API Endpoints Overview

### **Authentication**
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login user
- `POST /api/auth/logout/` - Logout user
- `POST /api/auth/password-reset/` - Reset password

### **Profile Management**
- `GET/POST /api/profile/personal-info/` - Personal information
- `GET/POST /api/profile/education/` - Education entries
- `GET/POST /api/profile/experience/` - Experience entries
- `GET/POST /api/profile/skills/` - Skills management
- `GET/POST /api/profile/projects/` - Projects
- `GET/POST /api/profile/certifications/` - Certifications
- `GET/POST /api/profile/achievements/` - Achievements
- `GET/POST /api/profile/additional-links/` - Social links

### **Resume**
- `GET /api/resume/generate/` - Generate resume
- `GET /api/resume/preview/` - Preview resume
- `POST /api/resume/export-pdf/` - Export as PDF

### **Email**
- `POST /api/email/generate/` - Generate cold email
- `POST /api/email/generate-subject/` - Generate subject line
- `GET /api/email/preview/` - Preview email

### **Interview**
- `GET /api/interview/aptitude-test/` - Get aptitude questions
- `POST /api/interview/submit-answer/` - Submit answer
- `GET /api/interview/hr-questions/` - HR interview questions
- `GET /api/interview/technical-questions/` - Technical questions

---

## 🛠️ Troubleshooting

### **Port Already in Use**
```bash
# Change Django port
python manage.py runserver 8001

# Change Vite port
npm run dev -- --port 5174
```

### **Database Connection Error**
- Ensure MySQL is running
- Verify database credentials in settings.py
- Check MySQL server status

### **Module Not Found**
```bash
# Reinstall dependencies
pip install -r requirements.txt
npm install
```

### **Ollama Not Working**
- Ensure Ollama is installed and running
- Check Ollama service status
- Fallback: Feature will work with default responses

---

## 👥 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review API documentation

---

**Happy Career Building! 🚀**
  ├── 💻 Technical Interview
  │   ├── Role-specific technical questions
  │   ├── Model answers
  │   ├── Key points to mention
  │   └── Follow-up questions
  │
  ├── 🎯 Behavioral (STAR)
  │   ├── STAR-method structured answers
  │   ├── Situation → Task → Action → Result
  │   ├── Personalized using user's experience
  │   └── Question variations
  │
  └── 🎤 Mock Interview
      ├── Full interview flow simulation
      ├── Mixed HR + Technical + Behavioral
      ├── Time suggestions per question
      ├── Scoring criteria
      └── Overall interview tips
```

### 💡 What You Get

* Practice tests with instant scoring and feedback.
* Structured answers using proven frameworks like STAR.
* Role-specific technical preparation.
* Realistic mock interviews with performance insights.
* Clear guidance on what interviewers actually evaluate.

---

##  Purpose

This platform is designed to:

* Increase your response rate to cold emails
* Boost interview confidence
* Improve answer structure and clarity
* Help you stand out in competitive hiring processes

---

##  Who It's For

* Students preparing for placements
* Job seekers applying off-campus
* Professionals looking to switch roles
* Anyone wanting structured interview preparation