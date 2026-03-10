import { useState, useRef } from 'react'
import { resumeAPI } from '../api/axios'
import MessageAlert from '../components/MessageAlert'
import html2pdf from 'html2pdf.js'
import { useNavigate } from 'react-router-dom'

const TEMPLATES = [
  { value: 'classic', label: '📄 Classic', desc: 'Traditional single-column' },
  { value: 'modern', label: '🎨 Modern', desc: 'Two-column with sidebar' },
  { value: 'minimal', label: '✨ Minimal', desc: 'Clean and simple' },
  { value: 'executive', label: '👔 Executive', desc: 'Bold and professional' },
]

const COLORS = [
  { value: 'blue', label: 'Blue', hex: '#2563eb' },
  { value: 'green', label: 'Green', hex: '#059669' },
  { value: 'red', label: 'Red', hex: '#dc2626' },
  { value: 'purple', label: 'Purple', hex: '#7c3aed' },
  { value: 'dark', label: 'Dark', hex: '#1f2937' },
  { value: 'teal', label: 'Teal', hex: '#0d9488' },
]

const FONTS = [
  { value: 'inter', label: 'Inter' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'merriweather', label: 'Merriweather' },
]

const LINK_ICONS = {
  email: '📧', phone: '📱', location: '📍',
  linkedin: '🔗', github: '💻', website: '🌐',
  portfolio: '🎨', twitter: '🐦', medium: '✍️',
  youtube: '▶️', stackoverflow: '📚', default: '🔗',
}

const getLinkIcon = (type) => {
  const key = (type || '').toLowerCase()
  return LINK_ICONS[key] || LINK_ICONS.default
}

export default function GenerateResume() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    job_description: '',
    customization: '',
    template: 'modern',
    color_scheme: 'blue',
    font_style: 'inter',
  })
  const [resumeData, setResumeData] = useState(null)
  const [style, setStyle] = useState({ template: 'modern', color_scheme: 'blue', font_style: 'inter' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [showPhoto, setShowPhoto] = useState(true)
  const [matchError, setMatchError] = useState(null) // NEW: match rejection details
  const resumeRef = useRef(null)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleStyleChange = (key, value) => {
    setStyle({ ...style, [key]: value })
    setForm({ ...form, [key]: value })
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg({ text: '', type: '' })
    setMatchError(null)

    try {
      const res = await resumeAPI.generate(form)

      setResumeData(res.data.resume_data)
      setStyle(res.data.style)
      setStep(3)

      // Show match score if available
      const matchData = res.data.match_data
      if (matchData?.match_score) {
        setMsg({
          text: `✅ Resume generated! Job match score: ${matchData.match_score}%`,
          type: 'success'
        })
      } else {
        setMsg({ text: '✅ Resume generated successfully!', type: 'success' })
      }

    } catch (err) {
      const errData = err.response?.data

      // Check if it's a job match rejection
      if (errData?.match_data?.match === 'NO') {
        const md = errData.match_data
        setMatchError(md)
        setMsg({
          text: errData.message || 'This job does not match your profile.',
          type: 'error'
        })
      } else {
        const reason = errData?.reason
        const message = errData?.message || 'Generation failed. Please try again.'
        setMsg({
          text: reason ? `${message}\n\nReason: ${reason}` : message,
          type: 'error'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    const element = resumeRef.current
    if (!element) return

    const name = resumeData?.personal_info?.name || 'Resume'

    const opt = {
      margin: 0,
      filename: `${name.replace(/\s+/g, '_')}_Resume.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }

    html2pdf().set(opt).from(element).save()
  }

  const getColor = () => COLORS.find(c => c.value === style.color_scheme)?.hex || '#2563eb'
  const getFont = () => {
    const fonts = {
      inter: "'Inter', sans-serif",
      georgia: "'Georgia', serif",
      roboto: "'Roboto', sans-serif",
      merriweather: "'Merriweather', serif",
    }
    return fonts[style.font_style] || fonts.inter
  }

  return (
    <div>
      <div className="page-header">
        <h2><span className="header-icon">📄</span> Generate Resume</h2>
      </div>

      <MessageAlert message={msg.text} type={msg.type} onClose={() => setMsg({ text: '', type: '' })} />

      {/* ═══ Match Rejection Details ═══ */}
      {matchError && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}>
          <h3 style={{ color: '#dc2626', margin: '0 0 12px', fontSize: 16 }}>
            ❌ Job Match Failed
          </h3>

          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: '#991b1b' }}>Reason:</strong>
            <p style={{ margin: '4px 0 0', color: '#7f1d1d' }}>{matchError.reason}</p>
          </div>

          {matchError.match_score !== undefined && (
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: '#991b1b' }}>Match Score:</strong>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
              }}>
                <div style={{
                  width: 200, height: 8, background: '#fee2e2', borderRadius: 4, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${matchError.match_score}%`, height: '100%',
                    background: matchError.match_score > 30 ? '#f59e0b' : '#ef4444',
                    borderRadius: 4,
                  }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>
                  {matchError.match_score}%
                </span>
              </div>
            </div>
          )}

          {matchError.matching_skills?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: '#166534' }}>✅ Matching Skills:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {matchError.matching_skills.map((skill, i) => (
                  <span key={i} style={{
                    background: '#dcfce7', color: '#166534', padding: '2px 8px',
                    borderRadius: 12, fontSize: 12, border: '1px solid #bbf7d0',
                  }}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {matchError.missing_skills?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: '#991b1b' }}>❌ Missing Skills:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {matchError.missing_skills.map((skill, i) => (
                  <span key={i} style={{
                    background: '#fee2e2', color: '#991b1b', padding: '2px 8px',
                    borderRadius: 12, fontSize: 12, border: '1px solid #fecaca',
                  }}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {matchError.recommendation && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
              padding: 12, marginTop: 12,
            }}>
              <strong style={{ color: '#92400e' }}>💡 Recommendation:</strong>
              <p style={{ margin: '4px 0 0', color: '#78350f', fontSize: 13 }}>
                {matchError.recommendation}
              </p>
            </div>
          )}

          <button
            className="btn btn-secondary"
            style={{ marginTop: 16 }}
            onClick={() => { setMatchError(null); setStep(1) }}
          >
            ← Try a Different Job Description
          </button>
        </div>
      )}

      {/* Step Indicator */}
      <div className="steps-bar">
        <div className={`step-item ${step >= 1 ? 'active' : ''}`} onClick={() => { if (!loading) setStep(1) }}>
          <div className="step-num">1</div>
          <span>Job Details</span>
        </div>
        <div className="step-line" />
        <div className={`step-item ${step >= 2 ? 'active' : ''}`} onClick={() => { if (!loading) setStep(2) }}>
          <div className="step-num">2</div>
          <span>Style</span>
        </div>
        <div className="step-line" />
        <div className={`step-item ${step >= 3 ? 'active' : ''}`}>
          <div className="step-num">3</div>
          <span>Preview & Download</span>
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="form-section">
          <h3>📋 Enter Job Details</h3>
          <form onSubmit={(e) => { e.preventDefault(); setStep(2) }}>
            <div className="form-group">
              <label>Job Description *</label>
              <textarea
                name="job_description"
                value={form.job_description}
                onChange={handleChange}
                placeholder="Paste the full job description here... The AI will tailor your resume to match the required skills, experience, and keywords."
                required
                style={{ minHeight: 200 }}
              />
            </div>
            <div className="form-group">
              <label>Customization Instructions (Optional)</label>
              <textarea
                name="customization"
                value={form.customization}
                onChange={handleChange}
                placeholder="E.g.: Focus more on leadership skills, emphasize Python experience, keep it to 1 page..."
                style={{ minHeight: 100 }}
              />
            </div>
            <div className="btn-group">
              <button type="submit" className="btn btn-primary" disabled={!form.job_description.trim()}>
                Next: Choose Style →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="form-section">
          <h3>🎨 Customize Resume Style</h3>

          <div className="form-group">
            <label>Template</label>
            <div className="template-grid">
              {TEMPLATES.map(t => (
                <div key={t.value}
                  className={`template-option ${style.template === t.value ? 'selected' : ''}`}
                  onClick={() => handleStyleChange('template', t.value)}>
                  <div className="template-label">{t.label}</div>
                  <div className="template-desc">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Color Scheme</label>
            <div className="color-grid">
              {COLORS.map(c => (
                <div key={c.value}
                  className={`color-option ${style.color_scheme === c.value ? 'selected' : ''}`}
                  onClick={() => handleStyleChange('color_scheme', c.value)}>
                  <div className="color-swatch" style={{ background: c.hex }} />
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Font Style</label>
            <div className="font-grid">
              {FONTS.map(f => (
                <div key={f.value}
                  className={`font-option ${style.font_style === f.value ? 'selected' : ''}`}
                  onClick={() => handleStyleChange('font_style', f.value)}
                  style={{
                    fontFamily: f.value === 'georgia' ? 'Georgia' :
                      f.value === 'merriweather' ? 'Merriweather, serif' :
                      f.value === 'roboto' ? 'Roboto, sans-serif' : 'Inter, sans-serif'
                  }}>
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          <div className="btn-group">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <><div className="spinner" style={{ width: 18, height: 18, marginRight: 8 }} /> Generating with AI...</>
              ) : '🤖 Generate Resume'}
            </button>
          </div>

          {loading && (
            <div className="generating-status">
              <div className="generating-animation">
                <div className="dot" /><div className="dot" /><div className="dot" />
              </div>
              <p>AI is checking job match & crafting your resume...</p>
              <p className="generating-sub">This may take 30-60 seconds</p>
            </div>
          )}
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && resumeData && (
        <div>
          <div className="resume-controls">
            <div className="controls-left">
              <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back to Style</button>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>✏️ Edit Details</button>
              <button className="btn btn-secondary" onClick={() => navigate('/resume-editor', { state: { resumeData, style } })}>
                ✏️ Edit in Editor
              </button>
            </div>
            <div className="controls-right">
              {resumeData?.personal_info?.profile_image_url && (
                <label className="photo-toggle">
                  <input type="checkbox" checked={showPhoto} onChange={(e) => setShowPhoto(e.target.checked)} />
                  <span>📷 Show Photo</span>
                </label>
              )}
              <select value={style.template} onChange={(e) => setStyle({ ...style, template: e.target.value })} className="control-select">
                {TEMPLATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={style.color_scheme} onChange={(e) => setStyle({ ...style, color_scheme: e.target.value })} className="control-select">
                {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <select value={style.font_style} onChange={(e) => setStyle({ ...style, font_style: e.target.value })} className="control-select">
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <button className="btn btn-primary" onClick={handleDownload}>📥 Download PDF</button>
            </div>
          </div>

          <div className="resume-preview-container">
            <div ref={resumeRef}>
              {style.template === 'modern' && <ModernTemplate data={resumeData} color={getColor()} font={getFont()} showPhoto={showPhoto} />}
              {style.template === 'classic' && <ClassicTemplate data={resumeData} color={getColor()} font={getFont()} showPhoto={showPhoto} />}
              {style.template === 'minimal' && <MinimalTemplate data={resumeData} color={getColor()} font={getFont()} showPhoto={showPhoto} />}
              {style.template === 'executive' && <ExecutiveTemplate data={resumeData} color={getColor()} font={getFont()} showPhoto={showPhoto} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   PROFILE PHOTO
   ══════════════════════════════════════════ */

function ProfilePhoto({ url, size = 80, borderColor = '#fff', style: customStyle = {} }) {
  if (!url) return null
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      border: `3px solid ${borderColor}`, flexShrink: 0, background: '#f0f0f0',
      ...customStyle,
    }}>
      <img src={url} alt="Profile" crossOrigin="anonymous"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  )
}

/* ══════════════════════════════════════════
   SHARED: CONTACT RENDERERS
   ══════════════════════════════════════════ */

// Vertical list with icons (for sidebars)
function ContactList({ pi, links = [], fontSize = 10, color = '#fff' }) {
  const fields = [
    { key: 'email', icon: '📧' },
    { key: 'phone', icon: '📱' },
    { key: 'location', icon: '📍' },
    { key: 'linkedin', icon: '🔗' },
    { key: 'github', icon: '💻' },
    { key: 'website', icon: '🌐' },
  ]

  return (
    <div style={{ fontSize, marginBottom: 20, opacity: 0.9 }}>
      {fields.map(f => pi[f.key] ? (
        <div key={f.key} style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: fontSize - 1 }}>{f.icon}</span>
          <span style={{ color }}>{pi[f.key]}</span>
        </div>
      ) : null)}
      {links.map((link, i) => (
        <div key={`al-${i}`} style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: fontSize - 1 }}>{getLinkIcon(link.link_type)}</span>
          <span style={{ color }}>{link.title || link.link_type || link.url}</span>
        </div>
      ))}
    </div>
  )
}

// Horizontal row with icons (for headers)
function ContactRow({ pi, links = [], fontSize = 10, color = '#666' }) {
  const fields = [
    { key: 'email', icon: '📧' },
    { key: 'phone', icon: '📱' },
    { key: 'location', icon: '📍' },
    { key: 'linkedin', icon: '🔗' },
    { key: 'github', icon: '💻' },
    { key: 'website', icon: '🌐' },
  ]

  return (
    <div style={{ fontSize, color, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {fields.map(f => pi[f.key] ? (
        <span key={f.key}>{f.icon} {pi[f.key]}</span>
      ) : null)}
      {links.map((link, i) => (
        <span key={`al-${i}`}>
          {getLinkIcon(link.link_type)} {link.title || link.link_type || link.url}
        </span>
      ))}
    </div>
  )
}

// Clean row without icons (for minimal)
function ContactMinimal({ pi, links = [], fontSize = 10 }) {
  const fields = ['email', 'phone', 'location', 'linkedin', 'github', 'website']

  return (
    <div style={{ fontSize, color: '#888', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {fields.map(f => pi[f] ? <span key={f}>{pi[f]}</span> : null)}
      {links.map((link, i) => (
        <span key={`al-${i}`}>{link.title || link.link_type || link.url}</span>
      ))}
    </div>
  )
}

// Right-aligned vertical (for executive header)
function ContactRight({ pi, links = [], fontSize = 9, color = '#fff' }) {
  const fields = [
    { key: 'email', icon: '📧' },
    { key: 'phone', icon: '📱' },
    { key: 'location', icon: '📍' },
    { key: 'linkedin', icon: '🔗' },
    { key: 'github', icon: '💻' },
    { key: 'website', icon: '🌐' },
  ]

  return (
    <div style={{ fontSize, textAlign: 'right', opacity: 0.9 }}>
      {fields.map(f => pi[f.key] ? (
        <div key={f.key} style={{ marginBottom: 1, color }}>{pi[f.key]} {f.icon}</div>
      ) : null)}
      {links.map((link, i) => (
        <div key={`al-${i}`} style={{ marginBottom: 1, color }}>
          {link.title || link.link_type || link.url} {getLinkIcon(link.link_type)}
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════
   TEMPLATE: MODERN
   ══════════════════════════════════════════ */

function ModernTemplate({ data, color, font, showPhoto }) {
  const pi = data.personal_info || {}
  const c = data.content || data || {}
  const links = data.additional_links || []

  return (
    <div className="resume-page" style={{ fontFamily: font, display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: '35%', background: color, color: '#fff', padding: '30px 20px' }}>
        {showPhoto && pi.profile_image_url && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <ProfilePhoto url={pi.profile_image_url} size={100} borderColor="rgba(255,255,255,0.8)" />
          </div>
        )}

        <h1 style={{
          fontSize: 22, fontWeight: 700, marginBottom: 4, lineHeight: 1.3,
          textAlign: showPhoto && pi.profile_image_url ? 'center' : 'left'
        }}>
          {pi.name || 'Your Name'}
        </h1>

        {/* ALL contact + links */}
        <ContactList pi={pi} links={links} fontSize={10} color="#fff" />

        {/* Skills */}
        {c.skills_grouped && Object.keys(c.skills_grouped).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 4, marginBottom: 8 }}>SKILLS</h3>
            {Object.entries(c.skills_grouped).map(([cat, skills]) => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, marginBottom: 3 }}>{cat}</div>
                <div style={{ fontSize: 9, lineHeight: 1.6 }}>{Array.isArray(skills) ? skills.join(' • ') : skills}</div>
              </div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {c.certifications?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 4, marginBottom: 8 }}>CERTIFICATIONS</h3>
            {c.certifications.map((cert, i) => (
              <div key={i} style={{ fontSize: 9, marginBottom: 6 }}>
                <div style={{ fontWeight: 600 }}>{cert.title}</div>
                <div style={{ opacity: 0.8 }}>{cert.organization} • {cert.year}</div>
              </div>
            ))}
          </div>
        )}

        {/* Additional Links section */}
        {links.length > 0 && (
          <div>
            <h3 style={{ fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 4, marginBottom: 8 }}>LINKS</h3>
            {links.map((link, i) => (
              <div key={i} style={{ fontSize: 9, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{getLinkIcon(link.link_type)}</span>
                <span>{link.title || link.link_type || link.url}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ width: '65%', padding: '30px 24px' }}>
        {c.professional_summary && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, color, borderBottom: `2px solid ${color}`, paddingBottom: 4, marginBottom: 8 }}>PROFESSIONAL SUMMARY</h2>
            <p style={{ fontSize: 10, lineHeight: 1.6, color: '#444' }}>{c.professional_summary}</p>
          </div>
        )}

        {c.experience?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, color, borderBottom: `2px solid ${color}`, paddingBottom: 4, marginBottom: 8 }}>EXPERIENCE</h2>
            {c.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{exp.role}</div>
                  <div style={{ fontSize: 9, color: '#888' }}>{exp.start_date} — {exp.end_date}</div>
                </div>
                <div style={{ fontSize: 10, color, fontWeight: 600, marginBottom: 4 }}>{exp.company}</div>
                <ul style={{ fontSize: 9, lineHeight: 1.6, color: '#444', paddingLeft: 14, margin: 0 }}>
                  {exp.bullets?.map((b, j) => <li key={j} style={{ marginBottom: 2 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {c.education?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, color, borderBottom: `2px solid ${color}`, paddingBottom: 4, marginBottom: 8 }}>EDUCATION</h2>
            {c.education.map((edu, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{edu.degree}</div>
                <div style={{ fontSize: 10, color: '#666' }}>{edu.institution} • {edu.date}</div>
                {edu.gpa && <div style={{ fontSize: 9, color: '#888' }}>GPA: {edu.gpa}</div>}
                {edu.highlights && <div style={{ fontSize: 9, color: '#888' }}>{edu.highlights}</div>}
              </div>
            ))}
          </div>
        )}

        {c.projects?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, color, borderBottom: `2px solid ${color}`, paddingBottom: 4, marginBottom: 8 }}>PROJECTS</h2>
            {c.projects.map((proj, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{proj.title}</div>
                <div style={{ fontSize: 9, color: '#444', lineHeight: 1.5 }}>{proj.description}</div>
                {proj.technologies && <div style={{ fontSize: 8, color, marginTop: 2 }}>Tech: {proj.technologies}</div>}
              </div>
            ))}
          </div>
        )}

        {c.achievements?.length > 0 && (
          <div>
            <h2 style={{ fontSize: 14, color, borderBottom: `2px solid ${color}`, paddingBottom: 4, marginBottom: 8 }}>ACHIEVEMENTS</h2>
            {c.achievements.map((a, i) => (
              <div key={i} style={{ fontSize: 9, marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{a.title}</span>
                {a.description && <span style={{ color: '#666' }}> — {a.description}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   TEMPLATE: CLASSIC
   ══════════════════════════════════════════ */

function ClassicTemplate({ data, color, font, showPhoto }) {
  const pi = data.personal_info || {}
  const c = data.content || data || {}
  const links = data.additional_links || []

  const hStyle = { fontSize: 13, color, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${color}`, paddingBottom: 3, marginBottom: 6 }

  return (
    <div className="resume-page" style={{ fontFamily: font, padding: '30px 36px' }}>
      {/* Header */}
      <div style={{ borderBottom: `3px solid ${color}`, paddingBottom: 14, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 20 }}>
        {showPhoto && pi.profile_image_url && (
          <ProfilePhoto url={pi.profile_image_url} size={70} borderColor={color} />
        )}
        <div style={{ flex: 1, textAlign: showPhoto && pi.profile_image_url ? 'left' : 'center' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color, marginBottom: 6 }}>{pi.name || 'Your Name'}</h1>
          {/* ALL LINKS */}
          <ContactRow pi={pi} links={links} fontSize={10} color="#666" />
        </div>
      </div>

      {c.professional_summary && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={hStyle}>Professional Summary</h2>
          <p style={{ fontSize: 10, lineHeight: 1.7, color: '#444' }}>{c.professional_summary}</p>
        </div>
      )}

      {c.experience?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={hStyle}>Experience</h2>
          {c.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{exp.role} — {exp.company}</span>
                <span style={{ fontSize: 9, color: '#888' }}>{exp.start_date} – {exp.end_date}</span>
              </div>
              <ul style={{ fontSize: 9, lineHeight: 1.7, color: '#444', paddingLeft: 16, margin: '4px 0 0' }}>
                {exp.bullets?.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {c.education?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={hStyle}>Education</h2>
          {c.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{edu.degree}</span>
                <span style={{ fontSize: 10, color: '#666' }}> — {edu.institution}</span>
                {edu.gpa && <span style={{ fontSize: 9, color: '#888' }}> | GPA: {edu.gpa}</span>}
              </div>
              <span style={{ fontSize: 9, color: '#888' }}>{edu.date}</span>
            </div>
          ))}
        </div>
      )}

      {c.skills_grouped && Object.keys(c.skills_grouped).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={hStyle}>Skills</h2>
          {Object.entries(c.skills_grouped).map(([cat, skills]) => (
            <div key={cat} style={{ fontSize: 10, marginBottom: 3 }}>
              <strong>{cat}:</strong> {Array.isArray(skills) ? skills.join(', ') : skills}
            </div>
          ))}
        </div>
      )}

      {c.projects?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={hStyle}>Projects</h2>
          {c.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{p.title}</span>
              <span style={{ fontSize: 9, color: '#666' }}> — {p.description}</span>
              {p.technologies && <div style={{ fontSize: 8, color }}>{p.technologies}</div>}
            </div>
          ))}
        </div>
      )}

      {c.certifications?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={hStyle}>Certifications</h2>
          {c.certifications.map((cert, i) => (
            <div key={i} style={{ fontSize: 10, marginBottom: 3 }}>{cert.title} — {cert.organization} ({cert.year})</div>
          ))}
        </div>
      )}

      {c.achievements?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={hStyle}>Achievements</h2>
          {c.achievements.map((a, i) => (
            <div key={i} style={{ fontSize: 9, marginBottom: 4 }}>
              <span style={{ fontWeight: 700 }}>{a.title}</span>
              {a.description && <span style={{ color: '#666' }}> — {a.description}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   TEMPLATE: MINIMAL
   ══════════════════════════════════════════ */

function MinimalTemplate({ data, color, font, showPhoto }) {
  const pi = data.personal_info || {}
  const c = data.content || data || {}
  const links = data.additional_links || []

  const hStyle = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color, marginBottom: 10, fontWeight: 600 }

  return (
    <div className="resume-page" style={{ fontFamily: font, padding: '40px 44px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, borderBottom: '1px solid #eee', paddingBottom: 14, marginBottom: 20 }}>
        {showPhoto && pi.profile_image_url && (
          <ProfilePhoto url={pi.profile_image_url} size={70} borderColor="#ddd" />
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: '#222', marginBottom: 4, letterSpacing: 1 }}>
            {pi.name || 'Your Name'}
          </h1>
          {/* ALL LINKS - clean minimal */}
          <ContactMinimal pi={pi} links={links} fontSize={10} />
        </div>
      </div>

      {c.professional_summary && (
        <p style={{ fontSize: 10, lineHeight: 1.8, color: '#555', marginBottom: 22 }}>{c.professional_summary}</p>
      )}

      {c.experience?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={hStyle}>Experience</h2>
          {c.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#222' }}>{exp.role}</div>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>{exp.company} | {exp.start_date} – {exp.end_date}</div>
              <ul style={{ fontSize: 9, lineHeight: 1.7, color: '#555', paddingLeft: 14, margin: 0 }}>
                {exp.bullets?.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {c.education?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={hStyle}>Education</h2>
          {c.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{edu.degree}</span>
              <span style={{ fontSize: 10, color: '#888' }}> — {edu.institution} ({edu.date})</span>
            </div>
          ))}
        </div>
      )}

      {c.skills_grouped && Object.keys(c.skills_grouped).length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={hStyle}>Skills</h2>
          <div style={{ fontSize: 10, lineHeight: 2, color: '#444' }}>
            {Object.values(c.skills_grouped).flat().join(' · ')}
          </div>
        </div>
      )}

      {c.projects?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={hStyle}>Projects</h2>
          {c.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 6, fontSize: 10 }}>
              <strong>{p.title}</strong> — <span style={{ color: '#666' }}>{p.description}</span>
            </div>
          ))}
        </div>
      )}

      {c.certifications?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={hStyle}>Certifications</h2>
          {c.certifications.map((cert, i) => (
            <div key={i} style={{ fontSize: 10, marginBottom: 3 }}>{cert.title} — {cert.organization} ({cert.year})</div>
          ))}
        </div>
      )}

      {c.achievements?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={hStyle}>Achievements</h2>
          {c.achievements.map((a, i) => (
            <div key={i} style={{ fontSize: 9, marginBottom: 4 }}>
              <span style={{ fontWeight: 700 }}>{a.title}</span>
              {a.description && <span style={{ color: '#666' }}> — {a.description}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   TEMPLATE: EXECUTIVE
   ══════════════════════════════════════════ */

function ExecutiveTemplate({ data, color, font, showPhoto }) {
  const pi = data.personal_info || {}
  const c = data.content || data || {}
  const links = data.additional_links || []

  const hStyle = { fontSize: 13, fontWeight: 700, color, marginBottom: 8, textTransform: 'uppercase' }

  return (
    <div className="resume-page" style={{ fontFamily: font, padding: 0 }}>
      {/* Banner */}
      <div style={{ background: color, color: '#fff', padding: '28px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
        {showPhoto && pi.profile_image_url && (
          <ProfilePhoto url={pi.profile_image_url} size={80} borderColor="rgba(255,255,255,0.9)" />
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 2 }}>{pi.name || 'Your Name'}</h1>
          {c.professional_summary && (
            <p style={{ fontSize: 9, opacity: 0.9, maxWidth: 420, lineHeight: 1.5 }}>
              {c.professional_summary.substring(0, 150)}...
            </p>
          )}
        </div>
        {/* ALL LINKS - right aligned */}
        <ContactRight pi={pi} links={links} fontSize={9} color="#fff" />
      </div>

      <div style={{ padding: '20px 36px' }}>
        {c.professional_summary && (
          <div style={{ marginBottom: 16, padding: 14, background: '#f8f9fa', borderLeft: `3px solid ${color}`, borderRadius: 4 }}>
            <p style={{ fontSize: 10, lineHeight: 1.7, color: '#444', margin: 0 }}>{c.professional_summary}</p>
          </div>
        )}

        {c.experience?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 10, textTransform: 'uppercase' }}>Professional Experience</h2>
            {c.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 14, paddingLeft: 12, borderLeft: `2px solid ${color}20` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#222' }}>{exp.role}</div>
                <div style={{ fontSize: 10, color, fontWeight: 600 }}>
                  {exp.company} <span style={{ color: '#888', fontWeight: 400 }}>| {exp.start_date} – {exp.end_date}</span>
                </div>
                <ul style={{ fontSize: 9, lineHeight: 1.7, color: '#444', paddingLeft: 14, margin: '4px 0 0' }}>
                  {exp.bullets?.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>
            {c.education?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h2 style={hStyle}>Education</h2>
                {c.education.map((edu, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700 }}>{edu.degree}</div>
                    <div style={{ fontSize: 9, color: '#666' }}>{edu.institution} • {edu.date}</div>
                  </div>
                ))}
              </div>
            )}

            {c.projects?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h2 style={hStyle}>Key Projects</h2>
                {c.projects.map((p, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700 }}>{p.title}</div>
                    <div style={{ fontSize: 9, color: '#666' }}>{p.description}</div>
                  </div>
                ))}
              </div>
            )}

            {c.achievements?.length > 0 && (
              <div>
                <h2 style={hStyle}>Achievements</h2>
                {c.achievements.map((a, i) => (
                  <div key={i} style={{ fontSize: 9, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{a.title}</span>
                    {a.description && <span style={{ color: '#666' }}> — {a.description}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: 200 }}>
            {c.skills_grouped && Object.keys(c.skills_grouped).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h2 style={hStyle}>Skills</h2>
                {Object.entries(c.skills_grouped).map(([cat, skills]) => (
                  <div key={cat} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color }}>{cat}</div>
                    <div style={{ fontSize: 9, color: '#444' }}>{Array.isArray(skills) ? skills.join(', ') : skills}</div>
                  </div>
                ))}
              </div>
            )}

            {c.certifications?.length > 0 && (
              <div>
                <h2 style={hStyle}>Certifications</h2>
                {c.certifications.map((cert, i) => (
                  <div key={i} style={{ fontSize: 9, marginBottom: 4, color: '#444' }}>
                    <div style={{ fontWeight: 600 }}>{cert.title}</div>
                    <div>{cert.organization}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}