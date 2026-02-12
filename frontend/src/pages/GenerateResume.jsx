import { useState, useRef } from 'react'
import { resumeAPI } from '../api/axios'
import MessageAlert from '../components/MessageAlert'
import html2pdf from 'html2pdf.js'

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

export default function GenerateResume() {
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

    try {
      const res = await resumeAPI.generate(form)
      setResumeData(res.data.resume_data)
      setStyle(res.data.style)
      setStep(3)
      setMsg({ text: 'Resume generated successfully!', type: 'success' })
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Generation failed. Is Ollama running?'
      setMsg({ text: errMsg, type: 'error' })
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
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }

    html2pdf().set(opt).from(element).save()
  }

  const getColor = () => COLORS.find(c => c.value === style.color_scheme)?.hex || '#2563eb'
  const getFont = () => {
    const fonts = { inter: "'Inter', sans-serif", georgia: "'Georgia', serif", roboto: "'Roboto', sans-serif", merriweather: "'Merriweather', serif" }
    return fonts[style.font_style] || fonts.inter
  }

  return (
    <div>
      <div className="page-header">
        <h2><span className="header-icon">📄</span> Generate Resume</h2>
      </div>

      <MessageAlert message={msg.text} type={msg.type} onClose={() => setMsg({ text: '', type: '' })} />

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

      {/* Step 1: Job Description */}
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
                placeholder="E.g.: Focus more on leadership skills, emphasize Python experience, keep it to 1 page, highlight cloud computing projects..."
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

      {/* Step 2: Style Customization */}
      {step === 2 && (
        <div className="form-section">
          <h3>🎨 Customize Resume Style</h3>

          {/* Template Selection */}
          <div className="form-group">
            <label>Template</label>
            <div className="template-grid">
              {TEMPLATES.map(t => (
                <div
                  key={t.value}
                  className={`template-option ${style.template === t.value ? 'selected' : ''}`}
                  onClick={() => handleStyleChange('template', t.value)}
                >
                  <div className="template-label">{t.label}</div>
                  <div className="template-desc">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Color Scheme */}
          <div className="form-group">
            <label>Color Scheme</label>
            <div className="color-grid">
              {COLORS.map(c => (
                <div
                  key={c.value}
                  className={`color-option ${style.color_scheme === c.value ? 'selected' : ''}`}
                  onClick={() => handleStyleChange('color_scheme', c.value)}
                >
                  <div className="color-swatch" style={{ background: c.hex }} />
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Font Style */}
          <div className="form-group">
            <label>Font Style</label>
            <div className="font-grid">
              {FONTS.map(f => (
                <div
                  key={f.value}
                  className={`font-option ${style.font_style === f.value ? 'selected' : ''}`}
                  onClick={() => handleStyleChange('font_style', f.value)}
                  style={{ fontFamily: f.value === 'georgia' ? 'Georgia' : f.value === 'merriweather' ? 'Merriweather, serif' : f.value === 'roboto' ? 'Roboto, sans-serif' : 'Inter, sans-serif' }}
                >
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
              <p>AI is crafting your ATS-optimized resume...</p>
              <p className="generating-sub">This may take 30-60 seconds</p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Preview & Download */}
      {step === 3 && resumeData && (
        <div>
          {/* Controls */}
          <div className="resume-controls">
            <div className="controls-left">
              <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back to Style</button>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>✏️ Edit Details</button>
            </div>
            <div className="controls-right">
              {/* Live style changers */}
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

          {/* Resume Preview */}
          <div className="resume-preview-container">
            <div ref={resumeRef}>
              {style.template === 'modern' && <ModernTemplate data={resumeData} color={getColor()} font={getFont()} />}
              {style.template === 'classic' && <ClassicTemplate data={resumeData} color={getColor()} font={getFont()} />}
              {style.template === 'minimal' && <MinimalTemplate data={resumeData} color={getColor()} font={getFont()} />}
              {style.template === 'executive' && <ExecutiveTemplate data={resumeData} color={getColor()} font={getFont()} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


/* ══════════════════════════════════════════
   RESUME TEMPLATES
   ══════════════════════════════════════════ */

function ModernTemplate({ data, color, font }) {
  const pi = data.personal_info || {}
  const c = data.content || {}

  return (
    <div className="resume-page" style={{ fontFamily: font, display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: '35%', background: color, color: '#fff', padding: '30px 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{pi.name || 'Your Name'}</h1>
        <div style={{ fontSize: 10, marginBottom: 20, opacity: 0.9 }}>
          {pi.email && <div>📧 {pi.email}</div>}
          {pi.phone && <div>📱 {pi.phone}</div>}
          {pi.location && <div>📍 {pi.location}</div>}
          {pi.linkedin && <div>🔗 LinkedIn</div>}
          {pi.github && <div>💻 GitHub</div>}
          {pi.website && <div>🌐 Website</div>}
        </div>

        {/* Skills */}
        {c.skills_grouped && Object.keys(c.skills_grouped).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 4, marginBottom: 8 }}>SKILLS</h3>
            {Object.entries(c.skills_grouped).map(([cat, skills]) => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, marginBottom: 3 }}>{cat}</div>
                <div style={{ fontSize: 9, lineHeight: 1.6 }}>{skills.join(' • ')}</div>
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

        {/* Links */}
        {data.additional_links?.length > 0 && (
          <div>
            <h3 style={{ fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 4, marginBottom: 8 }}>LINKS</h3>
            {data.additional_links.map((link, i) => (
              <div key={i} style={{ fontSize: 9, marginBottom: 4 }}>
                <div style={{ fontWeight: 600 }}>{link.link_type}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ width: '65%', padding: '30px 24px' }}>
        {/* Summary */}
        {c.professional_summary && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, color, borderBottom: `2px solid ${color}`, paddingBottom: 4, marginBottom: 8 }}>PROFESSIONAL SUMMARY</h2>
            <p style={{ fontSize: 10, lineHeight: 1.6, color: '#444' }}>{c.professional_summary}</p>
          </div>
        )}

        {/* Experience */}
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

        {/* Education */}
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

        {/* Projects */}
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

        {/* Achievements */}
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


function ClassicTemplate({ data, color, font }) {
  const pi = data.personal_info || {}
  const c = data.content || {}

  return (
    <div className="resume-page" style={{ fontFamily: font, padding: '30px 36px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: `3px solid ${color}`, paddingBottom: 14, marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color, marginBottom: 6 }}>{pi.name || 'Your Name'}</h1>
        <div style={{ fontSize: 10, color: '#666', display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {pi.email && <span>📧 {pi.email}</span>}
          {pi.phone && <span>📱 {pi.phone}</span>}
          {pi.location && <span>📍 {pi.location}</span>}
          {pi.linkedin && <span>🔗 LinkedIn</span>}
          {pi.github && <span>💻 GitHub</span>}
        </div>
      </div>

      {c.professional_summary && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 13, color, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${color}`, paddingBottom: 3, marginBottom: 6 }}>Professional Summary</h2>
          <p style={{ fontSize: 10, lineHeight: 1.7, color: '#444' }}>{c.professional_summary}</p>
        </div>
      )}

      {c.experience?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 13, color, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${color}`, paddingBottom: 3, marginBottom: 6 }}>Experience</h2>
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
          <h2 style={{ fontSize: 13, color, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${color}`, paddingBottom: 3, marginBottom: 6 }}>Education</h2>
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
          <h2 style={{ fontSize: 13, color, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${color}`, paddingBottom: 3, marginBottom: 6 }}>Skills</h2>
          {Object.entries(c.skills_grouped).map(([cat, skills]) => (
            <div key={cat} style={{ fontSize: 10, marginBottom: 3 }}>
              <strong>{cat}:</strong> {skills.join(', ')}
            </div>
          ))}
        </div>
      )}

      {c.projects?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 13, color, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${color}`, paddingBottom: 3, marginBottom: 6 }}>Projects</h2>
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
          <h2 style={{ fontSize: 13, color, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${color}`, paddingBottom: 3, marginBottom: 6 }}>Certifications</h2>
          {c.certifications.map((cert, i) => (
            <div key={i} style={{ fontSize: 10, marginBottom: 3 }}>{cert.title} — {cert.organization} ({cert.year})</div>
          ))}
        </div>
      )}
    </div>
  )
}


function MinimalTemplate({ data, color, font }) {
  const pi = data.personal_info || {}
  const c = data.content || {}

  return (
    <div className="resume-page" style={{ fontFamily: font, padding: '40px 44px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 300, color: '#222', marginBottom: 4, letterSpacing: 1 }}>{pi.name || 'Your Name'}</h1>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', borderBottom: `1px solid #eee`, paddingBottom: 14 }}>
        {pi.email && <span>{pi.email}</span>}
        {pi.phone && <span>{pi.phone}</span>}
        {pi.location && <span>{pi.location}</span>}
      </div>

      {c.professional_summary && (
        <p style={{ fontSize: 10, lineHeight: 1.8, color: '#555', marginBottom: 22 }}>{c.professional_summary}</p>
      )}

      {c.experience?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color, marginBottom: 10, fontWeight: 600 }}>Experience</h2>
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
          <h2 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color, marginBottom: 10, fontWeight: 600 }}>Education</h2>
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
          <h2 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color, marginBottom: 10, fontWeight: 600 }}>Skills</h2>
          <div style={{ fontSize: 10, lineHeight: 2, color: '#444' }}>
            {Object.values(c.skills_grouped).flat().join(' · ')}
          </div>
        </div>
      )}

      {c.projects?.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color, marginBottom: 10, fontWeight: 600 }}>Projects</h2>
          {c.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 6, fontSize: 10 }}>
              <strong>{p.title}</strong> — <span style={{ color: '#666' }}>{p.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


function ExecutiveTemplate({ data, color, font }) {
  const pi = data.personal_info || {}
  const c = data.content || {}

  return (
    <div className="resume-page" style={{ fontFamily: font, padding: 0 }}>
      {/* Header Banner */}
      <div style={{ background: color, color: '#fff', padding: '28px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 2 }}>{pi.name || 'Your Name'}</h1>
          {c.professional_summary && <p style={{ fontSize: 9, opacity: 0.9, maxWidth: 420, lineHeight: 1.5 }}>{c.professional_summary.substring(0, 200)}...</p>}
        </div>
        <div style={{ fontSize: 9, textAlign: 'right', opacity: 0.9 }}>
          {pi.email && <div>{pi.email}</div>}
          {pi.phone && <div>{pi.phone}</div>}
          {pi.location && <div>{pi.location}</div>}
        </div>
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
                <div style={{ fontSize: 10, color, fontWeight: 600 }}>{exp.company} <span style={{ color: '#888', fontWeight: 400 }}>| {exp.start_date} – {exp.end_date}</span></div>
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
                <h2 style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8, textTransform: 'uppercase' }}>Education</h2>
                {c.education.map((edu, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700 }}>{edu.degree}</div>
                    <div style={{ fontSize: 9, color: '#666' }}>{edu.institution} • {edu.date}</div>
                  </div>
                ))}
              </div>
            )}

            {c.projects?.length > 0 && (
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8, textTransform: 'uppercase' }}>Key Projects</h2>
                {c.projects.map((p, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700 }}>{p.title}</div>
                    <div style={{ fontSize: 9, color: '#666' }}>{p.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: 200 }}>
            {c.skills_grouped && Object.keys(c.skills_grouped).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8, textTransform: 'uppercase' }}>Skills</h2>
                {Object.entries(c.skills_grouped).map(([cat, skills]) => (
                  <div key={cat} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color }}>{cat}</div>
                    <div style={{ fontSize: 9, color: '#444' }}>{skills.join(', ')}</div>
                  </div>
                ))}
              </div>
            )}

            {c.certifications?.length > 0 && (
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8, textTransform: 'uppercase' }}>Certifications</h2>
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