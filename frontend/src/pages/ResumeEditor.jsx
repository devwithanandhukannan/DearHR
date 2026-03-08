import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { profileAPI } from '../api/axios'
import MessageAlert from '../components/MessageAlert'
import html2pdf from 'html2pdf.js'
import './ResumeEditor.css'

// ══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const TEMPLATES = [
  { value: 'modern', label: '🎨 Modern', desc: 'Two-column sidebar' },
  { value: 'classic', label: '📄 Classic', desc: 'Traditional layout' },
  { value: 'minimal', label: '✨ Minimal', desc: 'Clean & simple' },
  { value: 'executive', label: '👔 Executive', desc: 'Bold professional' },
  { value: 'creative', label: '🎭 Creative', desc: 'Unique design' },
]

const COLORS = [
  { value: 'blue', label: 'Blue', hex: '#2563eb' },
  { value: 'green', label: 'Green', hex: '#059669' },
  { value: 'red', label: 'Red', hex: '#dc2626' },
  { value: 'purple', label: 'Purple', hex: '#7c3aed' },
  { value: 'dark', label: 'Dark', hex: '#1f2937' },
  { value: 'teal', label: 'Teal', hex: '#0d9488' },
  { value: 'orange', label: 'Orange', hex: '#ea580c' },
  { value: 'pink', label: 'Pink', hex: '#db2777' },
]

const FONTS = [
  { value: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
  { value: 'georgia', label: 'Georgia', family: "'Georgia', serif" },
  { value: 'roboto', label: 'Roboto', family: "'Roboto', sans-serif" },
  { value: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif" },
  { value: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { value: 'playfair', label: 'Playfair', family: "'Playfair Display', serif" },
]

const FONT_SIZES = [
  { value: 'small', label: 'Small', scale: 0.85 },
  { value: 'medium', label: 'Medium', scale: 1 },
  { value: 'large', label: 'Large', scale: 1.15 },
]

const SECTION_TYPES = [
  { id: 'summary', label: 'Professional Summary', icon: '📝' },
  { id: 'experience', label: 'Experience', icon: '💼' },
  { id: 'education', label: 'Education', icon: '🎓' },
  { id: 'skills', label: 'Skills', icon: '⚡' },
  { id: 'projects', label: 'Projects', icon: '🚀' },
  { id: 'certifications', label: 'Certifications', icon: '🏆' },
  { id: 'achievements', label: 'Achievements', icon: '🌟' },
  { id: 'languages', label: 'Languages', icon: '🌍' },
  { id: 'interests', label: 'Interests', icon: '❤️' },
  { id: 'references', label: 'References', icon: '👥' },
]

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function ResumeEditor() {
  const navigate = useNavigate()
  const location = useLocation()
  const resumeRef = useRef(null)

  const initialData = location.state?.resumeData || null
  const initialStyle = location.state?.style || {
    template: 'modern',
    color_scheme: 'blue',
    font_style: 'inter',
    font_size: 'medium',
  }

  // ─── State ───
  const [loading, setLoading] = useState(!initialData)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const [style, setStyle] = useState(initialStyle)
  const [showPhoto, setShowPhoto] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)

  const [resumeData, setResumeData] = useState(initialData || {
    personal_info: {},
    professional_summary: '',
    experience: [],
    education: [],
    skills_grouped: {},
    projects: [],
    certifications: [],
    achievements: [],
    languages: [],
    interests: [],
    references: [],
    additional_links: [],
  })

  const [sections, setSections] = useState([
    { id: 'summary', visible: true },
    { id: 'experience', visible: true },
    { id: 'education', visible: true },
    { id: 'skills', visible: true },
    { id: 'projects', visible: true },
    { id: 'certifications', visible: true },
    { id: 'achievements', visible: true },
  ])

  const [editingField, setEditingField] = useState(null)
  const [zoom, setZoom] = useState(100)
  const [activePanel, setActivePanel] = useState('style')
  const [draggedSection, setDraggedSection] = useState(null)

  // ─── Load user data if no initial data ───
  useEffect(() => {
    if (!initialData) {
      loadUserData()
    }
  }, [initialData])

  const loadUserData = async () => {
    setLoading(true)
    try {
      const res = await profileAPI.getPersonalInfo()
      const pi = res.data.data || {}

      const [eduRes, expRes, skillRes, projRes, certRes, achRes, linkRes] = await Promise.all([
        profileAPI.list('education'),
        profileAPI.list('experience'),
        profileAPI.list('skills'),
        profileAPI.list('projects'),
        profileAPI.list('certifications'),
        profileAPI.list('achievements'),
        profileAPI.list('additional-links'),
      ])

      const skills = skillRes.data.data || []
      const skillsGrouped = skills.reduce((acc, skill) => {
        const cat = skill.category || 'Other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(skill.name)
        return acc
      }, {})

      setResumeData({
        personal_info: pi,
        professional_summary: '',
        experience: (expRes.data.data || []).map(exp => ({
          ...exp,
          role: exp.role,
          company: exp.company,
          start_date: `${exp.start_month || ''} ${exp.start_year || ''}`.trim(),
          end_date: exp.is_present ? 'Present' : `${exp.end_month || ''} ${exp.end_year || ''}`.trim(),
          bullets: exp.description ? exp.description.split('\n').filter(b => b.trim()) : [],
        })),
        education: (eduRes.data.data || []).map(edu => ({
          ...edu,
          degree: edu.degree,
          institution: edu.institution,
          date: `${edu.start_year || ''} - ${edu.end_year || 'Present'}`,
          gpa: edu.gpa || '',
          highlights: edu.description || '',
        })),
        skills_grouped: skillsGrouped,
        projects: projRes.data.data || [],
        certifications: certRes.data.data || [],
        achievements: achRes.data.data || [],
        additional_links: linkRes.data.data || [],
        languages: [],
        interests: [],
        references: [],
      })
    } catch (err) {
      console.error('Failed to load data:', err)
      setMsg({ text: 'Failed to load profile data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // ─── Style Helpers ───
  const getColor = () => COLORS.find(c => c.value === style.color_scheme)?.hex || '#2563eb'
  const getFont = () => FONTS.find(f => f.value === style.font_style)?.family || "'Inter', sans-serif"
  const getFontScale = () => FONT_SIZES.find(f => f.value === style.font_size)?.scale || 1

  // ══════════════════════════════════════════════════════════════════════
  // UPDATE HANDLERS
  // ══════════════════════════════════════════════════════════════════════

  const updatePersonalInfo = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      personal_info: { ...prev.personal_info, [field]: value }
    }))
  }

  const updateSummary = (value) => {
    setResumeData(prev => ({ ...prev, professional_summary: value }))
  }

  // ─── Experience ───
  const updateExperience = (index, field, value) => {
    setResumeData(prev => {
      const updated = [...prev.experience]
      if (field === 'bullets') {
        updated[index] = { ...updated[index], bullets: value }
      } else {
        updated[index] = { ...updated[index], [field]: value }
      }
      return { ...prev, experience: updated }
    })
  }

  const addExperience = () => {
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, {
        role: 'New Position',
        company: 'Company Name',
        start_date: 'Month Year',
        end_date: 'Present',
        bullets: ['Describe your responsibilities and achievements'],
      }]
    }))
  }

  const removeExperience = (index) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }))
  }

  // ─── Education ───
  const updateEducation = (index, field, value) => {
    setResumeData(prev => {
      const updated = [...prev.education]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, education: updated }
    })
  }

  const addEducation = () => {
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, {
        degree: 'Degree Name',
        institution: 'Institution Name',
        date: '2020 - 2024',
        gpa: '',
        highlights: '',
      }]
    }))
  }

  const removeEducation = (index) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }))
  }

  // ─── Skills ───
  const updateSkillCategory = (oldCat, newCat) => {
    setResumeData(prev => {
      const skills = { ...prev.skills_grouped }
      if (oldCat !== newCat) {
        skills[newCat] = skills[oldCat]
        delete skills[oldCat]
      }
      return { ...prev, skills_grouped: skills }
    })
  }

  const updateSkills = (category, skills) => {
    setResumeData(prev => ({
      ...prev,
      skills_grouped: { ...prev.skills_grouped, [category]: skills }
    }))
  }

  const addSkillCategory = () => {
    setResumeData(prev => ({
      ...prev,
      skills_grouped: { ...prev.skills_grouped, 'New Category': ['Skill 1', 'Skill 2'] }
    }))
  }

  const removeSkillCategory = (category) => {
    setResumeData(prev => {
      const skills = { ...prev.skills_grouped }
      delete skills[category]
      return { ...prev, skills_grouped: skills }
    })
  }

  // ─── Projects ───
  const updateProject = (index, field, value) => {
    setResumeData(prev => {
      const updated = [...prev.projects]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, projects: updated }
    })
  }

  const addProject = () => {
    setResumeData(prev => ({
      ...prev,
      projects: [...prev.projects, {
        title: 'Project Name',
        description: 'Brief description of the project',
        technologies: 'Tech 1, Tech 2',
        link: '',
      }]
    }))
  }

  const removeProject = (index) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }))
  }

  // ─── Languages ───
  const addLanguage = () => {
    setResumeData(prev => ({
      ...prev,
      languages: [...(prev.languages || []), { name: 'English', proficiency: 'Fluent' }]
    }))
    setSections(prev => {
      const exists = prev.find(s => s.id === 'languages')
      if (exists) {
        return prev.map(s => s.id === 'languages' ? { ...s, visible: true } : s)
      }
      return [...prev, { id: 'languages', visible: true }]
    })
  }

  const updateLanguage = (index, field, value) => {
    setResumeData(prev => {
      const updated = [...(prev.languages || [])]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, languages: updated }
    })
  }

  const removeLanguage = (index) => {
    setResumeData(prev => ({
      ...prev,
      languages: (prev.languages || []).filter((_, i) => i !== index)
    }))
  }

  // ─── Interests ───
  const addInterest = () => {
    setResumeData(prev => ({
      ...prev,
      interests: [...(prev.interests || []), 'New Interest']
    }))
    setSections(prev => {
      const exists = prev.find(s => s.id === 'interests')
      if (exists) {
        return prev.map(s => s.id === 'interests' ? { ...s, visible: true } : s)
      }
      return [...prev, { id: 'interests', visible: true }]
    })
  }

  const updateInterest = (index, value) => {
    setResumeData(prev => {
      const updated = [...(prev.interests || [])]
      updated[index] = value
      return { ...prev, interests: updated }
    })
  }

  const removeInterest = (index) => {
    setResumeData(prev => ({
      ...prev,
      interests: (prev.interests || []).filter((_, i) => i !== index)
    }))
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION REORDER (DRAG & DROP)
  // ══════════════════════════════════════════════════════════════════════

  const handleDragStart = (e, index) => {
    setDraggedSection(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedSection === null || draggedSection === index) return

    setSections(prev => {
      const updated = [...prev]
      const [removed] = updated.splice(draggedSection, 1)
      updated.splice(index, 0, removed)
      setDraggedSection(index)
      return updated
    })
  }

  const handleDragEnd = () => {
    setDraggedSection(null)
  }

  const toggleSectionVisibility = (sectionId) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    ))
  }

  // ══════════════════════════════════════════════════════════════════════
  // DOWNLOAD
  // ══════════════════════════════════════════════════════════════════════

  const handleDownload = async () => {
    const element = resumeRef.current
    if (!element) return

    setSaving(true)
    const name = resumeData?.personal_info?.name || 'Resume'

    const opt = {
      margin: 0,
      filename: `${name.replace(/\s+/g, '_')}_Resume.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        letterRendering: true,
        scrollY: 0,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }

    try {
      await html2pdf().set(opt).from(element).save()
      setMsg({ text: 'PDF downloaded successfully!', type: 'success' })
    } catch (error) {
      console.error('PDF generation error:', error)
      setMsg({ text: 'Failed to generate PDF', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPNG = async () => {
    const element = resumeRef.current
    if (!element) return

    setSaving(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      })

      const link = document.createElement('a')
      link.download = `${resumeData?.personal_info?.name || 'Resume'}_Resume.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      setMsg({ text: 'PNG downloaded successfully!', type: 'success' })
    } catch (error) {
      console.error('PNG generation error:', error)
      setMsg({ text: 'Failed to generate PNG', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading ───
  if (loading) {
    return (
      <div className="editor-loading">
        <div className="spinner-large" />
        <p>Loading your profile data...</p>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

  return (
    <div className="resume-editor">
      {/* Top Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="editor-title">📝 Resume Editor</h1>
        </div>

        <div className="toolbar-center">
          <div className="zoom-controls">
            <button onClick={() => setZoom(z => Math.max(50, z - 10))}>−</button>
            <span>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(150, z + 10))}>+</button>
            <button onClick={() => setZoom(100)}>Reset</button>
          </div>
        </div>

        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={handleDownloadPNG} disabled={saving}>
            🖼️ PNG
          </button>
          <button className="btn btn-primary" onClick={handleDownload} disabled={saving}>
            {saving ? '⏳ Saving...' : '📥 Download PDF'}
          </button>
        </div>
      </div>

      <MessageAlert
        message={msg.text}
        type={msg.type}
        onClose={() => setMsg({ text: '', type: '' })}
      />

      <div className="editor-main">
        {/* ════════════════════════════════════════════════
            LEFT SIDEBAR
        ════════════════════════════════════════════════ */}
        <div className={`editor-sidebar ${showSidebar ? '' : 'collapsed'}`}>
          <button className="sidebar-toggle" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? '◀' : '▶'}
          </button>

          {showSidebar && (
            <>
              <div className="sidebar-tabs">
                <button className={activePanel === 'style' ? 'active' : ''} onClick={() => setActivePanel('style')}>
                  🎨 Style
                </button>
                <button className={activePanel === 'sections' ? 'active' : ''} onClick={() => setActivePanel('sections')}>
                  📑 Sections
                </button>
                <button className={activePanel === 'elements' ? 'active' : ''} onClick={() => setActivePanel('elements')}>
                  ➕ Add
                </button>
              </div>

              {/* ─── Style Panel ─── */}
              {activePanel === 'style' && (
                <div className="sidebar-panel">
                  <div className="panel-section">
                    <label className="panel-label">Template</label>
                    <div className="template-selector">
                      {TEMPLATES.map(t => (
                        <div
                          key={t.value}
                          className={`template-thumb ${style.template === t.value ? 'selected' : ''}`}
                          onClick={() => setStyle({ ...style, template: t.value })}
                          title={t.desc}
                        >
                          <span>{t.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel-section">
                    <label className="panel-label">Color</label>
                    <div className="color-selector">
                      {COLORS.map(c => (
                        <div
                          key={c.value}
                          className={`color-dot ${style.color_scheme === c.value ? 'selected' : ''}`}
                          style={{ background: c.hex }}
                          onClick={() => setStyle({ ...style, color_scheme: c.value })}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="panel-section">
                    <label className="panel-label">Font</label>
                    <select
                      value={style.font_style}
                      onChange={(e) => setStyle({ ...style, font_style: e.target.value })}
                      className="panel-select"
                    >
                      {FONTS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="panel-section">
                    <label className="panel-label">Font Size</label>
                    <div className="size-buttons">
                      {FONT_SIZES.map(s => (
                        <button
                          key={s.value}
                          className={style.font_size === s.value ? 'active' : ''}
                          onClick={() => setStyle({ ...style, font_size: s.value })}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="panel-section">
                    <label className="toggle-row">
                      <input
                        type="checkbox"
                        checked={showPhoto}
                        onChange={(e) => setShowPhoto(e.target.checked)}
                      />
                      <span>Show Profile Photo</span>
                    </label>
                  </div>
                </div>
              )}

              {/* ─── Sections Panel ─── */}
              {activePanel === 'sections' && (
                <div className="sidebar-panel">
                  <p className="panel-hint">Drag to reorder • Click eye to toggle</p>
                  <div className="sections-list">
                    {sections.map((section, index) => {
                      const sectionInfo = SECTION_TYPES.find(s => s.id === section.id)
                      return (
                        <div
                          key={section.id}
                          className={`section-item ${draggedSection === index ? 'dragging' : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                        >
                          <span className="drag-handle">⋮⋮</span>
                          <span className="section-icon">{sectionInfo?.icon}</span>
                          <span className="section-name">{sectionInfo?.label}</span>
                          <button
                            className={`visibility-toggle ${section.visible ? 'visible' : 'hidden'}`}
                            onClick={() => toggleSectionVisibility(section.id)}
                          >
                            {section.visible ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ─── Add Elements Panel ─── */}
              {activePanel === 'elements' && (
                <div className="sidebar-panel">
                  <p className="panel-hint">Click to add new items</p>
                  <div className="add-buttons">
                    <button onClick={addExperience}>
                      <span>💼</span> Add Experience
                    </button>
                    <button onClick={addEducation}>
                      <span>🎓</span> Add Education
                    </button>
                    <button onClick={addSkillCategory}>
                      <span>⚡</span> Add Skill Category
                    </button>
                    <button onClick={addProject}>
                      <span>🚀</span> Add Project
                    </button>
                    <button onClick={addLanguage}>
                      <span>🌍</span> Add Language
                    </button>
                    <button onClick={addInterest}>
                      <span>❤️</span> Add Interest
                    </button>
                  </div>

                  {/* Show current languages */}
                  {(resumeData.languages || []).length > 0 && (
                    <div className="panel-added-items">
                      <label className="panel-label" style={{ marginTop: 16 }}>
                        🌍 Languages ({resumeData.languages.length})
                      </label>
                      {resumeData.languages.map((lang, i) => (
                        <div key={i} className="added-item">
                          <span>{lang.name} — {lang.proficiency}</span>
                          <button onClick={() => removeLanguage(i)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show current interests */}
                  {(resumeData.interests || []).length > 0 && (
                    <div className="panel-added-items">
                      <label className="panel-label" style={{ marginTop: 16 }}>
                        ❤️ Interests ({resumeData.interests.length})
                      </label>
                      {resumeData.interests.map((interest, i) => (
                        <div key={i} className="added-item">
                          <span>{typeof interest === 'string' ? interest : interest.name}</span>
                          <button onClick={() => removeInterest(i)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ════════════════════════════════════════════════
            CENTER - RESUME PREVIEW
        ════════════════════════════════════════════════ */}
        <div className="editor-canvas">
          <div
            className="canvas-wrapper"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <div ref={resumeRef} className="resume-document">
              <EditableResume
                data={resumeData}
                style={style}
                sections={sections}
                showPhoto={showPhoto}
                color={getColor()}
                font={getFont()}
                fontScale={getFontScale()}
                onUpdatePersonalInfo={updatePersonalInfo}
                onUpdateSummary={updateSummary}
                onUpdateExperience={updateExperience}
                onRemoveExperience={removeExperience}
                onUpdateEducation={updateEducation}
                onRemoveEducation={removeEducation}
                onUpdateSkillCategory={updateSkillCategory}
                onUpdateSkills={updateSkills}
                onRemoveSkillCategory={removeSkillCategory}
                onUpdateProject={updateProject}
                onRemoveProject={removeProject}
                onUpdateLanguage={updateLanguage}
                onAddLanguage={addLanguage}
                onRemoveLanguage={removeLanguage}
                onUpdateInterest={updateInterest}
                onAddInterest={addInterest}
                onRemoveInterest={removeInterest}
                editingField={editingField}
                setEditingField={setEditingField}
              />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            RIGHT SIDEBAR - QUICK EDIT
        ════════════════════════════════════════════════ */}
        <div className="editor-properties">
          <h3>Quick Edit</h3>
          <div className="properties-content">
            <div className="property-group">
              <label>Name</label>
              <input
                type="text"
                value={resumeData.personal_info?.name || ''}
                onChange={(e) => updatePersonalInfo('name', e.target.value)}
                placeholder="Your Name"
              />
            </div>
            <div className="property-group">
              <label>Email</label>
              <input
                type="email"
                value={resumeData.personal_info?.email || ''}
                onChange={(e) => updatePersonalInfo('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="property-group">
              <label>Phone</label>
              <input
                type="text"
                value={resumeData.personal_info?.phone || ''}
                onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="property-group">
              <label>Location</label>
              <input
                type="text"
                value={resumeData.personal_info?.location || ''}
                onChange={(e) => updatePersonalInfo('location', e.target.value)}
                placeholder="City, Country"
              />
            </div>
            <div className="property-group">
              <label>Professional Summary</label>
              <textarea
                value={resumeData.professional_summary || ''}
                onChange={(e) => updateSummary(e.target.value)}
                placeholder="Write a brief summary..."
                rows={4}
              />
            </div>

            {/* Languages Quick Edit */}
            <div className="property-group">
              <label>Languages</label>
              {(resumeData.languages || []).map((lang, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input
                    type="text"
                    value={lang.name || ''}
                    onChange={(e) => updateLanguage(i, 'name', e.target.value)}
                    placeholder="Language"
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    value={lang.proficiency || ''}
                    onChange={(e) => updateLanguage(i, 'proficiency', e.target.value)}
                    placeholder="Level"
                    style={{ flex: 1 }}
                  />
                  <button onClick={() => removeLanguage(i)} className="prop-remove-btn">×</button>
                </div>
              ))}
              <button onClick={addLanguage} className="prop-add-btn">+ Add Language</button>
            </div>

            {/* Interests Quick Edit */}
            <div className="property-group">
              <label>Interests</label>
              {(resumeData.interests || []).map((interest, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input
                    type="text"
                    value={typeof interest === 'string' ? interest : interest.name || ''}
                    onChange={(e) => updateInterest(i, e.target.value)}
                    placeholder="Interest"
                    style={{ flex: 1 }}
                  />
                  <button onClick={() => removeInterest(i)} className="prop-remove-btn">×</button>
                </div>
              ))}
              <button onClick={addInterest} className="prop-add-btn">+ Add Interest</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EDITABLE RESUME COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

function EditableResume({
  data,
  style,
  sections,
  showPhoto,
  color,
  font,
  fontScale,
  onUpdatePersonalInfo,
  onUpdateSummary,
  onUpdateExperience,
  onRemoveExperience,
  onUpdateEducation,
  onRemoveEducation,
  onUpdateSkillCategory,
  onUpdateSkills,
  onRemoveSkillCategory,
  onUpdateProject,
  onRemoveProject,
  onUpdateLanguage,
  onAddLanguage,
  onRemoveLanguage,
  onUpdateInterest,
  onAddInterest,
  onRemoveInterest,
  editingField,
  setEditingField,
}) {
  const pi = data.personal_info || {}
  const c = data

  const fs = (baseSize) => Math.round(baseSize * fontScale * 10) / 10

  // ─── EditableText ───
  const EditableText = ({
    value,
    onChange,
    className,
    style: textStyle,
    multiline = false,
    placeholder = 'Click to edit',
  }) => {
    const [editing, setEditing] = useState(false)
    const [tempValue, setTempValue] = useState(value)
    const inputRef = useRef(null)

    useEffect(() => { setTempValue(value) }, [value])

    useEffect(() => {
      if (editing && inputRef.current) {
        inputRef.current.focus()
        if (inputRef.current.select) inputRef.current.select()
      }
    }, [editing])

    if (editing) {
      if (multiline) {
        return (
          <textarea
            ref={inputRef}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => { setEditing(false); onChange(tempValue) }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setTempValue(value) } }}
            className={`editable-input ${className || ''}`}
            style={textStyle}
          />
        )
      }
      return (
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={() => { setEditing(false); onChange(tempValue) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { setEditing(false); onChange(tempValue) }
            if (e.key === 'Escape') { setEditing(false); setTempValue(value) }
          }}
          className={`editable-input ${className || ''}`}
          style={textStyle}
        />
      )
    }

    return (
      <span
        className={`editable-text ${className || ''} ${!value ? 'placeholder' : ''}`}
        style={textStyle}
        onClick={() => { setTempValue(value || ''); setEditing(true) }}
      >
        {value || placeholder}
      </span>
    )
  }

  const visibleSections = sections.filter((s) => s.visible)

  // ══════════════════════════════════════════════════════════════════
  // SECTION RENDERERS
  // ══════════════════════════════════════════════════════════════════

  const renderSummary = (headerStyle) => {
    const section = visibleSections.find((s) => s.id === 'summary')
    if (!section) return null
    if (!c.professional_summary && editingField !== 'summary') return null

    return (
      <div style={{ marginBottom: fs(18) }}>
        <h2 style={headerStyle}>Professional Summary</h2>
        <EditableText
          value={c.professional_summary}
          onChange={onUpdateSummary}
          multiline
          placeholder="Write your professional summary..."
          style={{ fontSize: fs(10), lineHeight: 1.7, color: '#444', display: 'block', width: '100%' }}
        />
      </div>
    )
  }

  const renderExperience = (headerStyle) => {
    const section = visibleSections.find((s) => s.id === 'experience')
    if (!section || !c.experience?.length) return null

    return (
      <div style={{ marginBottom: fs(18) }}>
        <h2 style={headerStyle}>
          {style.template === 'executive' ? 'Professional Experience' : 'Experience'}
        </h2>
        {c.experience.map((exp, i) => (
          <div
            key={i}
            style={{
              marginBottom: fs(12),
              position: 'relative',
              ...(style.template === 'executive'
                ? { paddingLeft: fs(12), borderLeft: `2px solid ${color}20` }
                : {}),
            }}
            className="editable-section"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: fs(11), fontWeight: 700 }}>
                <EditableText
                  value={exp.role}
                  onChange={(val) => onUpdateExperience(i, 'role', val)}
                  placeholder="Job Title"
                  style={{ fontSize: fs(11), fontWeight: 700 }}
                />
                {style.template === 'classic' && (
                  <>
                    {' — '}
                    <EditableText
                      value={exp.company}
                      onChange={(val) => onUpdateExperience(i, 'company', val)}
                      placeholder="Company"
                      style={{ fontSize: fs(11), fontWeight: 700 }}
                    />
                  </>
                )}
              </div>
              <span style={{ fontSize: fs(9), color: '#888', whiteSpace: 'nowrap' }}>
                <EditableText value={exp.start_date} onChange={(val) => onUpdateExperience(i, 'start_date', val)} placeholder="Start" style={{ fontSize: fs(9) }} />
                {' – '}
                <EditableText value={exp.end_date} onChange={(val) => onUpdateExperience(i, 'end_date', val)} placeholder="End" style={{ fontSize: fs(9) }} />
              </span>
            </div>
            {style.template !== 'classic' && (
              <EditableText
                value={exp.company}
                onChange={(val) => onUpdateExperience(i, 'company', val)}
                placeholder="Company Name"
                style={{ fontSize: fs(10), color: style.template === 'minimal' ? '#888' : color, fontWeight: 600, display: 'block', marginBottom: fs(4) }}
              />
            )}
            <ul style={{ fontSize: fs(9), lineHeight: 1.7, color: '#444', paddingLeft: fs(14), margin: `${fs(4)}px 0 0` }}>
              {exp.bullets?.map((b, j) => (
                <li key={j} style={{ marginBottom: fs(2) }}>
                  <EditableText
                    value={b}
                    onChange={(val) => { const nb = [...exp.bullets]; nb[j] = val; onUpdateExperience(i, 'bullets', nb) }}
                    placeholder="Achievement..."
                    style={{ fontSize: fs(9) }}
                  />
                </li>
              ))}
            </ul>
            <button className="remove-btn" onClick={() => onRemoveExperience(i)}>×</button>
          </div>
        ))}
      </div>
    )
  }

  const renderEducation = (headerStyle) => {
    const section = visibleSections.find((s) => s.id === 'education')
    if (!section || !c.education?.length) return null

    return (
      <div style={{ marginBottom: fs(18) }}>
        <h2 style={headerStyle}>Education</h2>
        {c.education.map((edu, i) => (
          <div key={i} style={{ marginBottom: fs(8), position: 'relative' }} className="editable-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <EditableText value={edu.degree} onChange={(val) => onUpdateEducation(i, 'degree', val)} style={{ fontSize: fs(11), fontWeight: 700 }} placeholder="Degree" />
                <span style={{ fontSize: fs(10), color: '#666' }}>
                  {' — '}<EditableText value={edu.institution} onChange={(val) => onUpdateEducation(i, 'institution', val)} placeholder="Institution" style={{ fontSize: fs(10) }} />
                </span>
              </div>
              <span style={{ fontSize: fs(9), color: '#888' }}>
                <EditableText value={edu.date} onChange={(val) => onUpdateEducation(i, 'date', val)} placeholder="Date" style={{ fontSize: fs(9) }} />
              </span>
            </div>
            {edu.gpa && (
              <div style={{ fontSize: fs(9), color: '#888' }}>GPA: <EditableText value={edu.gpa} onChange={(val) => onUpdateEducation(i, 'gpa', val)} style={{ fontSize: fs(9) }} /></div>
            )}
            <button className="remove-btn" onClick={() => onRemoveEducation(i)}>×</button>
          </div>
        ))}
      </div>
    )
  }

  const renderSkills = (headerStyle, isInline = false) => {
    const section = visibleSections.find((s) => s.id === 'skills')
    if (!section || !c.skills_grouped || !Object.keys(c.skills_grouped).length) return null

    return (
      <div style={{ marginBottom: fs(18) }}>
        <h2 style={headerStyle}>Skills</h2>
        {isInline ? (
          <div style={{ fontSize: fs(10), lineHeight: 2, color: '#444' }}>
            {Object.values(c.skills_grouped).flat().join(' · ')}
          </div>
        ) : (
          Object.entries(c.skills_grouped).map(([cat, skills]) => (
            <div key={cat} style={{ fontSize: fs(10), marginBottom: fs(4), position: 'relative' }} className="editable-section">
              <strong><EditableText value={cat} onChange={(val) => onUpdateSkillCategory(cat, val)} placeholder="Category" style={{ fontSize: fs(10), fontWeight: 700 }} />:</strong>{' '}
              <EditableText value={Array.isArray(skills) ? skills.join(', ') : skills} onChange={(val) => onUpdateSkills(cat, val.split(', ').map(s => s.trim()).filter(Boolean))} placeholder="Skills..." style={{ fontSize: fs(10) }} />
              <button className="remove-btn" onClick={() => onRemoveSkillCategory(cat)}>×</button>
            </div>
          ))
        )}
      </div>
    )
  }

  const renderProjects = (headerStyle) => {
    const section = visibleSections.find((s) => s.id === 'projects')
    if (!section || !c.projects?.length) return null

    return (
      <div style={{ marginBottom: fs(18) }}>
        <h2 style={headerStyle}>{style.template === 'executive' ? 'Key Projects' : 'Projects'}</h2>
        {c.projects.map((proj, i) => (
          <div key={i} style={{ marginBottom: fs(8), position: 'relative' }} className="editable-section">
            <EditableText value={proj.title} onChange={(val) => onUpdateProject(i, 'title', val)} style={{ fontSize: fs(11), fontWeight: 700, display: 'block' }} placeholder="Project Name" />
            <EditableText value={proj.description} onChange={(val) => onUpdateProject(i, 'description', val)} style={{ fontSize: fs(9), color: '#444', display: 'block' }} placeholder="Description..." />
            {proj.technologies && (
              <div style={{ fontSize: fs(8), color, marginTop: fs(2) }}>Tech: <EditableText value={proj.technologies} onChange={(val) => onUpdateProject(i, 'technologies', val)} style={{ fontSize: fs(8) }} /></div>
            )}
            <button className="remove-btn" onClick={() => onRemoveProject(i)}>×</button>
          </div>
        ))}
      </div>
    )
  }

  const renderAchievements = (headerStyle) => {
    const section = visibleSections.find((s) => s.id === 'achievements')
    if (!section || !c.achievements?.length) return null

    return (
      <div style={{ marginBottom: fs(18) }}>
        <h2 style={headerStyle}>Achievements</h2>
        {c.achievements.map((a, i) => (
          <div key={i} style={{ fontSize: fs(9), marginBottom: fs(4) }}>
            <span style={{ fontWeight: 700 }}>{a.title}</span>
            {a.description && <span style={{ color: '#666' }}> — {a.description}</span>}
          </div>
        ))}
      </div>
    )
  }

  const renderCertifications = (headerStyle) => {
    const section = visibleSections.find((s) => s.id === 'certifications')
    if (!section || !c.certifications?.length) return null

    return (
      <div style={{ marginBottom: fs(18) }}>
        <h2 style={headerStyle}>Certifications</h2>
        {c.certifications.map((cert, i) => (
          <div key={i} style={{ fontSize: fs(10), marginBottom: fs(4) }}>
            {cert.title} — {cert.organization} ({cert.year})
          </div>
        ))}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // LANGUAGES RENDERER
  // ══════════════════════════════════════════════════════════════════

  const renderLanguages = (headerStyle, isWhiteText = false) => {
    const section = visibleSections.find((s) => s.id === 'languages')
    if (!section) return null

    const languages = c.languages || []
    const txtColor = isWhiteText ? '#fff' : undefined
    const subColor = isWhiteText ? 'rgba(255,255,255,0.7)' : '#888'

    return (
      <div style={{ marginBottom: fs(18) }}>
        <h2 style={headerStyle}>Languages</h2>

        {languages.length === 0 && (
          <p style={{ fontSize: fs(9), color: subColor, fontStyle: 'italic' }}>
            No languages added yet
          </p>
        )}

        {languages.map((lang, i) => {
          const name = typeof lang === 'string' ? lang : lang.name || ''
          const level = typeof lang === 'string' ? '' : lang.proficiency || ''

          const levels = ['beginner', 'elementary', 'intermediate', 'advanced', 'fluent', 'native']
          const levelIndex = levels.findIndex(l => level.toLowerCase().includes(l))
          const filledDots = levelIndex >= 0 ? Math.min(levelIndex + 1, 5) : 3

          return (
            <div
              key={i}
              style={{
                fontSize: fs(10),
                marginBottom: fs(8),
                position: 'relative',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              className="editable-section"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: fs(6), flex: 1 }}>
                <EditableText
                  value={name}
                  onChange={(val) => onUpdateLanguage(i, 'name', val)}
                  placeholder="Language"
                  style={{ fontSize: fs(10), fontWeight: 600, color: txtColor }}
                />
                <span style={{ fontSize: fs(8), color: subColor }}>—</span>
                <EditableText
                  value={level}
                  onChange={(val) => onUpdateLanguage(i, 'proficiency', val)}
                  placeholder="Level (e.g. Fluent)"
                  style={{ fontSize: fs(9), color: subColor }}
                />
              </div>

              <div style={{ display: 'flex', gap: 3, marginLeft: fs(8) }}>
                {[1, 2, 3, 4, 5].map((dot) => (
                  <div
                    key={dot}
                    style={{
                      width: fs(6),
                      height: fs(6),
                      borderRadius: '50%',
                      background: dot <= filledDots
                        ? (isWhiteText ? 'rgba(255,255,255,0.9)' : color)
                        : (isWhiteText ? 'rgba(255,255,255,0.2)' : '#ddd'),
                    }}
                  />
                ))}
              </div>

              <button
                className={`remove-btn ${isWhiteText ? 'remove-btn-light' : ''}`}
                onClick={() => onRemoveLanguage(i)}
              >
                ×
              </button>
            </div>
          )
        })}

        <button
          onClick={onAddLanguage}
          className="add-item-btn"
          style={{
            fontSize: fs(8),
            color: isWhiteText ? 'rgba(255,255,255,0.5)' : '#aaa',
            border: `1px dashed ${isWhiteText ? 'rgba(255,255,255,0.3)' : '#ddd'}`,
            background: 'transparent',
            padding: `${fs(4)}px ${fs(8)}px`,
            borderRadius: 4,
            cursor: 'pointer',
            marginTop: fs(4),
            width: '100%',
            textAlign: 'center',
          }}
        >
          + Add Language
        </button>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // INTERESTS RENDERER
  // ══════════════════════════════════════════════════════════════════

  const renderInterests = (headerStyle, isWhiteText = false) => {
    const section = visibleSections.find((s) => s.id === 'interests')
    if (!section) return null

    const interests = c.interests || []
    const txtColor = isWhiteText ? '#fff' : color

    return (
      <div style={{ marginBottom: fs(18) }}>
        <h2 style={headerStyle}>Interests</h2>

        {interests.length === 0 && (
          <p style={{
            fontSize: fs(9),
            color: isWhiteText ? 'rgba(255,255,255,0.5)' : '#aaa',
            fontStyle: 'italic',
          }}>
            No interests added yet
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: fs(6) }}>
          {interests.map((interest, i) => {
            const name = typeof interest === 'string' ? interest : interest?.name || ''

            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: fs(4),
                  padding: `${fs(3)}px ${fs(10)}px`,
                  background: isWhiteText ? 'rgba(255,255,255,0.15)' : `${color}12`,
                  borderRadius: fs(12),
                  border: `1px solid ${isWhiteText ? 'rgba(255,255,255,0.25)' : `${color}30`}`,
                }}
                className="editable-section"
              >
                <EditableText
                  value={name}
                  onChange={(val) => onUpdateInterest(i, val)}
                  placeholder="Interest"
                  style={{ fontSize: fs(9), color: txtColor, fontWeight: 500 }}
                />
                <button
                  className={`remove-btn ${isWhiteText ? 'remove-btn-light' : ''}`}
                  onClick={() => onRemoveInterest(i)}
                  style={{ position: 'static', width: fs(14), height: fs(14), fontSize: fs(10) }}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>

        <button
          onClick={onAddInterest}
          className="add-item-btn"
          style={{
            fontSize: fs(8),
            color: isWhiteText ? 'rgba(255,255,255,0.5)' : '#aaa',
            border: `1px dashed ${isWhiteText ? 'rgba(255,255,255,0.3)' : '#ddd'}`,
            background: 'transparent',
            padding: `${fs(4)}px ${fs(8)}px`,
            borderRadius: 4,
            cursor: 'pointer',
            marginTop: fs(6),
            width: '100%',
            textAlign: 'center',
          }}
        >
          + Add Interest
        </button>
      </div>
    )
  }

  // ── Sidebar renderers (Modern template) ──

  const renderSidebarSkills = () => {
    if (!c.skills_grouped || !Object.keys(c.skills_grouped).length) return null

    return (
      <div style={{ marginBottom: fs(20) }}>
        <h3 style={{ fontSize: fs(13), borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: fs(4), marginBottom: fs(8) }}>SKILLS</h3>
        {Object.entries(c.skills_grouped).map(([cat, skills]) => (
          <div key={cat} style={{ marginBottom: fs(8), position: 'relative' }} className="editable-section">
            <div style={{ fontSize: fs(10), fontWeight: 600, opacity: 0.8, marginBottom: fs(3) }}>
              <EditableText value={cat} onChange={(val) => onUpdateSkillCategory(cat, val)} style={{ color: '#fff', fontSize: fs(10) }} />
            </div>
            <div style={{ fontSize: fs(9), lineHeight: 1.6 }}>
              <EditableText
                value={Array.isArray(skills) ? skills.join(' • ') : skills}
                onChange={(val) => onUpdateSkills(cat, val.split(' • ').map(s => s.trim()).filter(Boolean))}
                style={{ color: '#fff', fontSize: fs(9) }}
              />
            </div>
            <button className="remove-btn remove-btn-light" onClick={() => onRemoveSkillCategory(cat)}>×</button>
          </div>
        ))}
      </div>
    )
  }

  const renderSidebarCerts = () => {
    if (!c.certifications?.length) return null

    return (
      <div style={{ marginBottom: fs(20) }}>
        <h3 style={{ fontSize: fs(13), borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: fs(4), marginBottom: fs(8) }}>CERTIFICATIONS</h3>
        {c.certifications.map((cert, i) => (
          <div key={i} style={{ fontSize: fs(9), marginBottom: fs(6) }}>
            <div style={{ fontWeight: 600 }}>{cert.title}</div>
            <div style={{ opacity: 0.8 }}>{cert.organization} • {cert.year}</div>
          </div>
        ))}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // TEMPLATE: MODERN
  // ══════════════════════════════════════════════════════════════════

  if (style.template === 'modern') {
    const mainH = { fontSize: fs(14), color, borderBottom: `2px solid ${color}`, paddingBottom: fs(4), marginBottom: fs(8) }
    const sideH = { fontSize: fs(13), borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: fs(4), marginBottom: fs(8), color: '#fff' }
    const sidebarIds = ['skills', 'certifications', 'languages', 'interests']

    return (
      <div className="resume-page editable" style={{ fontFamily: font, display: 'flex' }}>
        <div style={{ width: '35%', background: color, color: '#fff', padding: `${fs(30)}px ${fs(20)}px` }}>
          {showPhoto && pi.profile_image_url && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: fs(20) }}>
              <div style={{ width: fs(100), height: fs(100), borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.8)' }}>
                <img src={pi.profile_image_url} alt="Profile" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          )}
          <h1 style={{ fontSize: fs(22), fontWeight: 700, marginBottom: fs(4), textAlign: 'center' }}>
            <EditableText value={pi.name} onChange={(val) => onUpdatePersonalInfo('name', val)} placeholder="Your Name" style={{ color: '#fff', fontSize: fs(22) }} />
          </h1>
          <div style={{ fontSize: fs(10), marginBottom: fs(20), opacity: 0.9 }}>
            {['email', 'phone', 'location', 'linkedin', 'github', 'website'].map(f => (
              <div key={f} style={{ marginBottom: fs(2) }}>
                <EditableText value={pi[f]} onChange={(val) => onUpdatePersonalInfo(f, val)} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} style={{ color: '#fff', fontSize: fs(10) }} />
              </div>
            ))}
          </div>
          {renderSidebarSkills()}
          {renderSidebarCerts()}
          {renderLanguages(sideH, true)}
          {renderInterests(sideH, true)}
        </div>

        <div style={{ width: '65%', padding: `${fs(30)}px ${fs(24)}px` }}>
          {visibleSections.map(s => {
            if (sidebarIds.includes(s.id)) return null
            switch (s.id) {
              case 'summary': return <div key={s.id}>{renderSummary(mainH)}</div>
              case 'experience': return <div key={s.id}>{renderExperience(mainH)}</div>
              case 'education': return <div key={s.id}>{renderEducation(mainH)}</div>
              case 'projects': return <div key={s.id}>{renderProjects(mainH)}</div>
              case 'achievements': return <div key={s.id}>{renderAchievements(mainH)}</div>
              default: return null
            }
          })}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // TEMPLATE: CLASSIC
  // ══════════════════════════════════════════════════════════════════

  if (style.template === 'classic') {
    const hStyle = { fontSize: fs(13), color, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${color}`, paddingBottom: fs(3), marginBottom: fs(6) }

    return (
      <div className="resume-page editable" style={{ fontFamily: font, padding: `${fs(30)}px ${fs(36)}px` }}>
        <div style={{ borderBottom: `3px solid ${color}`, paddingBottom: fs(14), marginBottom: fs(18), display: 'flex', alignItems: 'center', gap: fs(20) }}>
          {showPhoto && pi.profile_image_url && (
            <div style={{ width: fs(70), height: fs(70), borderRadius: '50%', overflow: 'hidden', border: `3px solid ${color}` }}>
              <img src={pi.profile_image_url} alt="Profile" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: fs(26), fontWeight: 700, color, marginBottom: fs(6) }}>
              <EditableText value={pi.name} onChange={(v) => onUpdatePersonalInfo('name', v)} placeholder="Your Name" style={{ fontSize: fs(26) }} />
            </h1>
            <div style={{ fontSize: fs(10), color: '#666', display: 'flex', gap: fs(12), flexWrap: 'wrap' }}>
             <span>
  📧 <EditableText 
      value={pi.email} 
      onChange={(v) => onUpdatePersonalInfo('email', v)} 
      placeholder="Email" 
      style={{ fontSize: fs(10) }} 
  />
</span>

<span>
  💼 <EditableText 
      value={pi.linkedin} 
      onChange={(v) => onUpdatePersonalInfo('linkedin', v)} 
      placeholder="LinkedIn" 
      style={{ fontSize: fs(10) }} 
  />
</span>

<span>
  💻 <EditableText 
      value={pi.github} 
      onChange={(v) => onUpdatePersonalInfo('github', v)} 
      placeholder="GitHub" 
      style={{ fontSize: fs(10) }} 
  />
</span>

<span>
  🌐 <EditableText 
      value={pi.website} 
      onChange={(v) => onUpdatePersonalInfo('website', v)} 
      placeholder="Website" 
      style={{ fontSize: fs(10) }} 
  />
</span>
              <span>📱 <EditableText value={pi.phone} onChange={(v) => onUpdatePersonalInfo('phone', v)} placeholder="Phone" style={{ fontSize: fs(10) }} /></span>
              <span>📍 <EditableText value={pi.location} onChange={(v) => onUpdatePersonalInfo('location', v)} placeholder="Location" style={{ fontSize: fs(10) }} /></span>
            </div>
          </div>
        </div>
        {visibleSections.map(s => {
          switch (s.id) {
            case 'summary': return <div key={s.id}>{renderSummary(hStyle)}</div>
            case 'experience': return <div key={s.id}>{renderExperience(hStyle)}</div>
            case 'education': return <div key={s.id}>{renderEducation(hStyle)}</div>
            case 'skills': return <div key={s.id}>{renderSkills(hStyle)}</div>
            case 'projects': return <div key={s.id}>{renderProjects(hStyle)}</div>
            case 'certifications': return <div key={s.id}>{renderCertifications(hStyle)}</div>
            case 'achievements': return <div key={s.id}>{renderAchievements(hStyle)}</div>
            case 'languages': return <div key={s.id}>{renderLanguages(hStyle)}</div>
            case 'interests': return <div key={s.id}>{renderInterests(hStyle)}</div>
            default: return null
          }
        })}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // TEMPLATE: MINIMAL
  // ══════════════════════════════════════════════════════════════════

  if (style.template === 'minimal') {
    const hStyle = { fontSize: fs(11), textTransform: 'uppercase', letterSpacing: 2, color, marginBottom: fs(10), fontWeight: 600 }

    return (
      <div className="resume-page editable" style={{ fontFamily: font, padding: `${fs(40)}px ${fs(44)}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: fs(24), borderBottom: '1px solid #eee', paddingBottom: fs(14), marginBottom: fs(20) }}>
          {showPhoto && pi.profile_image_url && (
            <div style={{ width: fs(70), height: fs(70), borderRadius: '50%', overflow: 'hidden', border: '3px solid #ddd' }}>
              <img src={pi.profile_image_url} alt="Profile" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: fs(28), fontWeight: 300, color: '#222', marginBottom: fs(4), letterSpacing: 1 }}>
              <EditableText value={pi.name} onChange={(v) => onUpdatePersonalInfo('name', v)} placeholder="Your Name" style={{ fontSize: fs(28) }} />
            </h1>
            <div style={{ fontSize: fs(10), color: '#888', display: 'flex', gap: fs(16), flexWrap: 'wrap' }}>
              <EditableText value={pi.email} onChange={(v) => onUpdatePersonalInfo('email', v)} placeholder="Email" style={{ fontSize: fs(10) }} />
              <EditableText value={pi.github} onChange={(v) => onUpdatePersonalInfo('github', v)} placeholder="Github" style={{ fontSize: fs(10) }} />
              <EditableText value={pi.linkedin} onChange={(v) => onUpdatePersonalInfo('linkedin', v)} placeholder="Linkedin" style={{ fontSize: fs(10) }} />
              <EditableText value={pi.website} onChange={(v) => onUpdatePersonalInfo('website', v)} placeholder="Website" style={{ fontSize: fs(10) }} />
              <EditableText value={pi.phone} onChange={(v) => onUpdatePersonalInfo('phone', v)} placeholder="Phone" style={{ fontSize: fs(10) }} />
              <EditableText value={pi.location} onChange={(v) => onUpdatePersonalInfo('location', v)} placeholder="Location" style={{ fontSize: fs(10) }} />
            </div>
          </div>
        </div>
        {visibleSections.map(s => {
          switch (s.id) {
            case 'summary': return <div key={s.id}>{renderSummary(hStyle)}</div>
            case 'experience': return <div key={s.id}>{renderExperience(hStyle)}</div>
            case 'education': return <div key={s.id}>{renderEducation(hStyle)}</div>
            case 'skills': return <div key={s.id}>{renderSkills(hStyle, true)}</div>
            case 'projects': return <div key={s.id}>{renderProjects(hStyle)}</div>
            case 'certifications': return <div key={s.id}>{renderCertifications(hStyle)}</div>
            case 'achievements': return <div key={s.id}>{renderAchievements(hStyle)}</div>
            case 'languages': return <div key={s.id}>{renderLanguages(hStyle)}</div>
            case 'interests': return <div key={s.id}>{renderInterests(hStyle)}</div>
            default: return null
          }
        })}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // TEMPLATE: EXECUTIVE
  // ══════════════════════════════════════════════════════════════════

  if (style.template === 'executive') {
    const hStyle = { fontSize: fs(14), fontWeight: 700, color, marginBottom: fs(10), textTransform: 'uppercase' }

    return (
      <div className="resume-page editable" style={{ fontFamily: font, padding: 0 }}>
        <div style={{ background: color, color: '#fff', padding: `${fs(28)}px ${fs(36)}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: fs(20) }}>
          {showPhoto && pi.profile_image_url && (
            <div style={{ width: fs(80), height: fs(80), borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.9)', flexShrink: 0 }}>
              <img src={pi.profile_image_url} alt="Profile" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: fs(26), fontWeight: 700, marginBottom: fs(2) }}>
              <EditableText value={pi.name} onChange={(v) => onUpdatePersonalInfo('name', v)} placeholder="Your Name" style={{ color: '#fff', fontSize: fs(26) }} />
            </h1>
          </div>
          <div style={{ fontSize: fs(9), textAlign: 'right', opacity: 0.9 }}>
              <div><EditableText value={pi.github} onChange={(v) => onUpdatePersonalInfo('github', v)} placeholder="Github" style={{ fontSize: fs(10) }} /></div>
              <div><EditableText value={pi.email} onChange={(v) => onUpdatePersonalInfo('email', v)} placeholder="Email" style={{ fontSize: fs(10) }} /></div>
              <div><EditableText value={pi.linkedin} onChange={(v) => onUpdatePersonalInfo('linkedin', v)} placeholder="Linkedin" style={{ fontSize: fs(10) }} /></div>
              <div><EditableText value={pi.website} onChange={(v) => onUpdatePersonalInfo('website', v)} placeholder="Website" style={{ fontSize: fs(10) }} /></div>
              <div><EditableText value={pi.phone} onChange={(v) => onUpdatePersonalInfo('phone', v)} placeholder="Phone" style={{ fontSize: fs(10) }} /></div>
              <div><EditableText value={pi.location} onChange={(v) => onUpdatePersonalInfo('location', v)} placeholder="Location" style={{ fontSize: fs(10) }} /></div>
          
          </div>
        </div>
        <div style={{ padding: `${fs(20)}px ${fs(36)}px` }}>
          {visibleSections.find(s => s.id === 'summary') && c.professional_summary && (
            <div style={{ marginBottom: fs(16), padding: fs(14), background: '#f8f9fa', borderLeft: `3px solid ${color}`, borderRadius: 4 }}>
              <EditableText value={c.professional_summary} onChange={onUpdateSummary} multiline placeholder="Summary..." style={{ fontSize: fs(10), lineHeight: 1.7, color: '#444', display: 'block', width: '100%' }} />
            </div>
          )}
          {renderExperience(hStyle)}
          <div style={{ display: 'flex', gap: fs(24) }}>
            <div style={{ flex: 1 }}>
              {renderEducation(hStyle)}
              {renderProjects(hStyle)}
              {renderAchievements(hStyle)}
              {renderLanguages(hStyle)}
            </div>
            <div style={{ width: fs(200) }}>
              {renderSkills(hStyle)}
              {renderCertifications(hStyle)}
              {renderInterests(hStyle)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // TEMPLATE: CREATIVE
  // ══════════════════════════════════════════════════════════════════

  if (style.template === 'creative') {
    const hStyle = { fontSize: fs(14), color, fontWeight: 700, marginBottom: fs(10), paddingBottom: fs(4), borderBottom: `3px double ${color}`, textTransform: 'uppercase', letterSpacing: 1.5 }
    const smallH = { ...hStyle, fontSize: fs(12) }

    return (
      <div className="resume-page editable" style={{ fontFamily: font, padding: 0 }}>
        <div style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)`, color: '#fff', padding: `${fs(30)}px ${fs(36)}px`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: fs(120), height: fs(120), borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: fs(24), position: 'relative', zIndex: 1 }}>
            {showPhoto && pi.profile_image_url && (
              <div style={{ width: fs(90), height: fs(90), borderRadius: '50%', overflow: 'hidden', border: '4px solid rgba(255,255,255,0.9)' }}>
                <img src={pi.profile_image_url} alt="Profile" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: fs(28), fontWeight: 700, marginBottom: fs(4), letterSpacing: 2 }}>
                <EditableText value={pi.name} onChange={(v) => onUpdatePersonalInfo('name', v)} placeholder="Your Name" style={{ color: '#fff', fontSize: fs(28) }} />
              </h1>
              <div style={{ fontSize: fs(10), marginBottom: fs(20), opacity: 0.9 }}>
            {['email', 'phone', 'location', 'linkedin', 'github', 'website'].map(f => (
              <div key={f} style={{ marginBottom: fs(2) }}>
                <EditableText value={pi[f]} onChange={(val) => onUpdatePersonalInfo(f, val)} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} style={{ color: '#fff', fontSize: fs(10) }} />
              </div>
            ))}
          </div>
            </div>
          </div>
        </div>
        <div style={{ padding: `${fs(24)}px ${fs(36)}px`, borderLeft: `4px solid ${color}`, margin: `0 0 0 ${fs(20)}px` }}>
          {visibleSections.find(s => s.id === 'summary') && (
            <div style={{ marginBottom: fs(20), padding: `${fs(12)}px ${fs(16)}px`, background: `${color}08`, borderRadius: 8, borderLeft: `3px solid ${color}` }}>
              <EditableText value={c.professional_summary} onChange={onUpdateSummary} multiline placeholder="Summary..." style={{ fontSize: fs(10), lineHeight: 1.7, color: '#444', fontStyle: 'italic', display: 'block', width: '100%' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: fs(28) }}>
            <div style={{ flex: 1 }}>
              {renderExperience(hStyle)}
              {renderProjects(hStyle)}
              {renderAchievements(hStyle)}
            </div>
            <div style={{ width: fs(180) }}>
              {renderEducation(smallH)}
              {renderSkills(smallH)}
              {renderLanguages(smallH)}
              {renderInterests(smallH)}
              {renderCertifications(smallH)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // FALLBACK
  // ══════════════════════════════════════════════════════════════════

  const fH = { fontSize: fs(13), color, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${color}`, paddingBottom: fs(3), marginBottom: fs(6) }

  return (
    <div className="resume-page editable" style={{ fontFamily: font, padding: `${fs(30)}px ${fs(36)}px` }}>
      <h1 style={{ fontSize: fs(26), fontWeight: 700, color, marginBottom: fs(10) }}>
        <EditableText value={pi.name} onChange={(v) => onUpdatePersonalInfo('name', v)} placeholder="Your Name" style={{ fontSize: fs(26) }} />
      </h1>
      <div style={{ fontSize: fs(10), color: '#666', marginBottom: fs(18) }}>
        <EditableText value={pi.email} onChange={(v) => onUpdatePersonalInfo('email', v)} placeholder="Email" style={{ fontSize: fs(10) }} />
        {' • '}
        <EditableText value={pi.phone} onChange={(v) => onUpdatePersonalInfo('phone', v)} placeholder="Phone" style={{ fontSize: fs(10) }} />
        {' • '}
        <EditableText value={pi.location} onChange={(v) => onUpdatePersonalInfo('location', v)} placeholder="Location" style={{ fontSize: fs(10) }} />
      </div>
      {visibleSections.map(s => {
        switch (s.id) {
          case 'summary': return <div key={s.id}>{renderSummary(fH)}</div>
          case 'experience': return <div key={s.id}>{renderExperience(fH)}</div>
          case 'education': return <div key={s.id}>{renderEducation(fH)}</div>
          case 'skills': return <div key={s.id}>{renderSkills(fH)}</div>
          case 'projects': return <div key={s.id}>{renderProjects(fH)}</div>
          case 'certifications': return <div key={s.id}>{renderCertifications(fH)}</div>
          case 'achievements': return <div key={s.id}>{renderAchievements(fH)}</div>
          case 'languages': return <div key={s.id}>{renderLanguages(fH)}</div>
          case 'interests': return <div key={s.id}>{renderInterests(fH)}</div>
          default: return null
        }
      })}
    </div>
  )
}