import { useState, useEffect } from 'react'
import './Homepage.css'
import { Link } from 'react-router-dom'
const features = [
  {
    icon: '👤',
    title: 'Professional Profile',
    desc: 'Build a comprehensive profile with education, experience, skills, and achievements.',
    items: ['Personal Information', 'Work Experience', 'Education History', 'Skills & Projects']
  },
  {
    icon: '✉️',
    title: 'Smart Cold Emails',
    desc: 'Generate personalized cold emails with AI in multiple styles and tones.',
    items: ['Application Emails', 'Networking Outreach', 'Follow-up Messages', 'Referral Requests']
  },
  {
    icon: '🎯',
    title: 'Interview Prep',
    desc: 'Practice aptitude tests and prepare for HR, technical, and behavioral interviews.',
    items: ['Aptitude Tests', 'HR Questions', 'Technical Prep', 'STAR Method']
  },
  {
    icon: '📄',
    title: 'Resume Builder',
    desc: 'Create professional resumes from your profile with multiple templates.',
    items: ['Auto-Generate', 'Multiple Templates', 'PDF Export', 'Real-time Preview']
  }
]

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Software Engineer at Google',
    text: 'DearHR helped me land my dream job! The cold email generator got me responses from 5 different companies.',
    initials: 'SC'
  },
  {
    name: 'Michael Roberts',
    role: 'Product Manager at Meta',
    text: 'The interview prep module was a game-changer. I felt so confident going into my interviews.',
    initials: 'MR'
  },
  {
    name: 'Emily Watson',
    role: 'UX Designer at Apple',
    text: 'Creating my resume was so easy with DearHR. The templates are professional and modern.',
    initials: 'EW'
  }
]

const Homepage = () => {
  const [scrolled, setScrolled] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="dhr-homepage">
      {/* Navigation */}
      <nav className={`dhr-nav ${scrolled ? 'dhr-nav-scrolled' : ''}`}>
        <a href="#" className="dhr-logo">
          <div className="dhr-logo-icon">💼</div>
          DearHR
        </a>
        
        <div className="dhr-nav-links">
          <a href="#features" className="dhr-nav-link">Features</a>
          <a href="#how-it-works" className="dhr-nav-link">How It Works</a>
          <a href="#testimonials" className="dhr-nav-link">Testimonials</a>
        </div>
        
        <div className="dhr-nav-actions">
          <Link className="dhr-btn-ghost" to={'/dashboard'}>Sign In</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="dhr-hero">
        <div className="dhr-hero-bg-circle dhr-hero-bg-circle-1"></div>
        <div className="dhr-hero-bg-circle dhr-hero-bg-circle-2"></div>
        
        <div className="dhr-hero-container">
          <div className="dhr-hero-content">
            <div className="dhr-badge">
              <span className="dhr-badge-dot"></span>
              AI-Powered Career Platform
            </div>
            
            <h1 className="dhr-hero-title">
              Your Career,<br />
              <span className="dhr-hero-title-gradient">Supercharged</span>
            </h1>
            
            <p className="dhr-hero-subtitle">
              Build professional profiles, generate smart cold emails, prepare for interviews, 
              and create impressive resumes — all in one powerful platform.
            </p>
            
            <div className="dhr-hero-buttons">
              <Link to={'/dashboard'} className="dhr-btn-primary dhr-btn-large">
                Try Now — It's Free →
              </Link>
            </div>
            
            <div className="dhr-trust-bar">
              <div className="dhr-avatars">
                <div className="dhr-avatar">JD</div>
                <div className="dhr-avatar">AK</div>
                <div className="dhr-avatar">SM</div>
                <div className="dhr-avatar">+</div>
              </div>
              <div className="dhr-trust-info">
                <div className="dhr-stars">★★★★★</div>
                <span>Trusted by <strong>10,000+</strong> professionals</span>
              </div>
            </div>
          </div>
          
          <div className="dhr-hero-visual">
            <div className="dhr-feature-card">
              <div className="dhr-floating-badge">
                <span>✨</span> AI Powered
              </div>
              
              <div className="dhr-feature-card-header">
                <div className="dhr-feature-card-label">Currently Exploring</div>
                <h3 className="dhr-feature-card-title">{features[activeFeature].title}</h3>
              </div>
              
              <div className="dhr-feature-card-body">
                <ul className="dhr-feature-list">
                  {features[activeFeature].items.map((item, idx) => (
                    <li key={idx} className="dhr-feature-list-item">
                      <div className="dhr-feature-icon">✓</div>
                      {item}
                    </li>
                  ))}
                </ul>
                
                <div className="dhr-card-tabs">
                  {features.map((f, idx) => (
                    <button
                      key={idx}
                      className={`dhr-card-tab ${idx === activeFeature ? 'dhr-card-tab-active' : ''}`}
                      onClick={() => setActiveFeature(idx)}
                    >
                      {f.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="dhr-stats">
        <div className="dhr-stats-container">
          <div className="dhr-stat-item">
            <div className="dhr-stat-value">10K+</div>
            <div className="dhr-stat-label">Active Users</div>
          </div>
          <div className="dhr-stat-item">
            <div className="dhr-stat-value">50K+</div>
            <div className="dhr-stat-label">Emails Generated</div>
          </div>
          <div className="dhr-stat-item">
            <div className="dhr-stat-value">95%</div>
            <div className="dhr-stat-label">Success Rate</div>
          </div>
          <div className="dhr-stat-item">
            <div className="dhr-stat-value">4.9</div>
            <div className="dhr-stat-label">User Rating</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="dhr-features">
        <div className="dhr-section-header">
          <div className="dhr-section-badge">Features</div>
          <h2 className="dhr-section-title">Everything You Need to Succeed</h2>
          <p className="dhr-section-subtitle">
            Comprehensive tools designed to help you stand out in competitive hiring processes.
          </p>
        </div>
        
        <div className="dhr-features-grid">
          {features.map((feature, idx) => (
            <div key={idx} className="dhr-feature-box">
              <div className="dhr-feature-box-icon">{feature.icon}</div>
              <h3 className="dhr-feature-box-title">{feature.title}</h3>
              <p className="dhr-feature-box-desc">{feature.desc}</p>
              <a href="#" className="dhr-feature-link">
                Learn more <span>→</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="dhr-how-it-works">
        <div className="dhr-section-header">
          <div className="dhr-section-badge">How It Works</div>
          <h2 className="dhr-section-title">Three Steps to Your Dream Job</h2>
          <p className="dhr-section-subtitle">
            Get started in minutes and accelerate your career journey.
          </p>
        </div>
        
        <div className="dhr-steps-container">
          <div className="dhr-step-card">
            <div className="dhr-step-num">1</div>
            <h3 className="dhr-step-title">Create Your Profile</h3>
            <p className="dhr-step-desc">
              Add your education, experience, skills, and achievements to build a comprehensive professional profile.
            </p>
            <span className="dhr-step-arrow">→</span>
          </div>
          
          <div className="dhr-step-card">
            <div className="dhr-step-num">2</div>
            <h3 className="dhr-step-title">Use AI-Powered Tools</h3>
            <p className="dhr-step-desc">
              Generate cold emails, prepare for interviews, and create professional resumes with our smart tools.
            </p>
            <span className="dhr-step-arrow">→</span>
          </div>
          
          <div className="dhr-step-card">
            <div className="dhr-step-num">3</div>
            <h3 className="dhr-step-title">Land Your Dream Job</h3>
            <p className="dhr-step-desc">
              Apply with confidence and ace your interviews to secure the position you've always wanted.
            </p>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="dhr-cta">
        <div className="dhr-cta-pattern"></div>
        <div className="dhr-cta-content">
          <h2 className="dhr-cta-title">Ready to Supercharge Your Career?</h2>
          <p className="dhr-cta-subtitle">
            Join thousands of professionals who have already transformed their job search with DearHR.
          </p>
          <Link to={'/dashboard'} className="dhr-btn-white">
            Try Now — It's Free
          </Link>
          <p className="dhr-cta-note">No credit card required • Free forever plan available</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="dhr-footer">
        <div className="dhr-footer-container">
          <div className="dhr-footer-top">
            <div className="dhr-footer-brand">
              <a href="#" className="dhr-logo">
                <div className="dhr-logo-icon">💼</div>
                DearHR
              </a>
              <p>
                Your all-in-one career development platform. Build profiles, generate emails, 
                prep for interviews, and create resumes.
              </p>
              <div className="dhr-footer-social">
                <a href="#" className="dhr-social-link">𝕏</a>
                <a href="#" className="dhr-social-link">in</a>
                <a href="#" className="dhr-social-link">▶</a>
              </div>
            </div>
            
            <div className="dhr-footer-column">
              <h4>Product</h4>
              <ul className="dhr-footer-links">
                <li><a href="#">Features</a></li>
                <li><a href="#">Pricing</a></li>
                <li><a href="#">Templates</a></li>
                <li><a href="#">API</a></li>
              </ul>
            </div>
            
            <div className="dhr-footer-column">
              <h4>Company</h4>
              <ul className="dhr-footer-links">
                <li><a href="#">About</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            
            <div className="dhr-footer-column">
              <h4>Support</h4>
              <ul className="dhr-footer-links">
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Documentation</a></li>
                <li><a href="#">Community</a></li>
                <li><a href="#">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="dhr-footer-bottom">
            <p>© 2026 DearHR. All rights reserved.</p>
            <div className="dhr-footer-bottom-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Homepage
