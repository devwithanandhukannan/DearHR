import { useState, useRef, useEffect, useCallback } from 'react'
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

  // Get initial data from navigation state (from GenerateResume) or start fresh
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
  
  // Style settings
  const [style, setStyle] = useState(initialStyle)
  const [showPhoto, setShowPhoto] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  
  // Resume data (editable)
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

  // Section visibility & order
  const [sections, setSections] = useState([
    { id: 'summary', visible: true },
    { id: 'experience', visible: true },
    { id: 'education', visible: true },
    { id: 'skills', visible: true },
    { id: 'projects', visible: true },
    { id: 'certifications', visible: true },
    { id: 'achievements', visible: true },
  ])

  // Active editing
  const [activeSection, setActiveSection] = useState(null)
  const [editingField, setEditingField] = useState(null)
  const [zoom, setZoom] = useState(100)
  
  // Sidebar panel
  const [activePanel, setActivePanel] = useState('style') // style, sections, elements

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
      
      // Load all sections
      const [eduRes, expRes, skillRes, projRes, certRes, achRes, linkRes] = await Promise.all([
        profileAPI.list('education'),
        profileAPI.list('experience'),
        profileAPI.list('skills'),
        profileAPI.list('projects'),
        profileAPI.list('certifications'),
        profileAPI.list('achievements'),
        profileAPI.list('additional-links'),
      ])

      // Group skills by category
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

  // ─── Update Handlers ───
  const updatePersonalInfo = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      personal_info: { ...prev.personal_info, [field]: value }
    }))
  }

  const updateSummary = (value) => {
    setResumeData(prev => ({ ...prev, professional_summary: value }))
  }

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

  // ─── Section Reorder (Drag & Drop) ───
  const [draggedSection, setDraggedSection] = useState(null)

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

  // ─── Download PDF ───
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

  // ─── Download as PNG ───
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

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="editor-loading">
        <div className="spinner-large" />
        <p>Loading your profile data...</p>
      </div>
    )
  }

  // ─── Main Render ───
  return (
    <div className="resume-editor">
      {/* Top Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="editor-title">📝 Resume Editor</h1>
        </div>
        
        <div className="toolbar-center">
          {/* Zoom Controls */}
          <div className="zoom-controls">
            <button onClick={() => setZoom(z => Math.max(50, z - 10))}>−</button>
            <span>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(150, z + 10))}>+</button>
            <button onClick={() => setZoom(100)}>Reset</button>
          </div>
        </div>

        <div className="toolbar-right">
          <button 
            className="btn btn-secondary"
            onClick={handleDownloadPNG}
            disabled={saving}
          >
            🖼️ PNG
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={saving}
          >
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
        {/* Left Sidebar - Tools & Settings */}
        <div className={`editor-sidebar ${showSidebar ? '' : 'collapsed'}`}>
          <button 
            className="sidebar-toggle"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? '◀' : '▶'}
          </button>

          {showSidebar && (
            <>
              {/* Panel Tabs */}
              <div className="sidebar-tabs">
                <button 
                  className={activePanel === 'style' ? 'active' : ''} 
                  onClick={() => setActivePanel('style')}
                >
                  🎨 Style
                </button>
                <button 
                  className={activePanel === 'sections' ? 'active' : ''} 
                  onClick={() => setActivePanel('sections')}
                >
                  📑 Sections
                </button>
                <button 
                  className={activePanel === 'elements' ? 'active' : ''} 
                  onClick={() => setActivePanel('elements')}
                >
                  ➕ Add
                </button>
              </div>

              {/* Style Panel */}
              {activePanel === 'style' && (
                <div className="sidebar-panel">
                  {/* Template Selection */}
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

                  {/* Color Scheme */}
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

                  {/* Font Selection */}
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

                  {/* Font Size */}
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

                  {/* Photo Toggle */}
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

              {/* Sections Panel */}
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

              {/* Add Elements Panel */}
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
                    <button onClick={() => {
                      if (!sections.find(s => s.id === 'languages')) {
                        setSections([...sections, { id: 'languages', visible: true }])
                      }
                    }}>
                      <span>🌍</span> Add Languages
                    </button>
                    <button onClick={() => {
                      if (!sections.find(s => s.id === 'interests')) {
                        setSections([...sections, { id: 'interests', visible: true }])
                      }
                    }}>
                      <span>❤️</span> Add Interests
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Center - Resume Preview (Editable) */}
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
                editingField={editingField}
                setEditingField={setEditingField}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Quick Edit Panel */}
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
          </div>
        </div>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
//  EDITABLE RESUME COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// EDITABLE RESUME COMPONENT - ALL TEMPLATES
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
  editingField,
  setEditingField,
}) {
  const pi = data.personal_info || {}
  const c = data

  // ─── Editable Text Component ───
  const EditableText = ({ 
    value, 
    onChange, 
    className, 
    style: textStyle, 
    multiline = false, 
    placeholder = 'Click to edit' 
  }) => {
    const [editing, setEditing] = useState(false)
    const [tempValue, setTempValue] = useState(value)
    const inputRef = useRef(null)

    useEffect(() => {
      setTempValue(value)
    }, [value])

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
            onBlur={() => {
              setEditing(false)
              onChange(tempValue)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditing(false)
                setTempValue(value)
              }
            }}
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
          onBlur={() => {
            setEditing(false)
            onChange(tempValue)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setEditing(false)
              onChange(tempValue)
            }
            if (e.key === 'Escape') {
              setEditing(false)
              setTempValue(value)
            }
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
        onClick={() => {
          setTempValue(value || '')
          setEditing(true)
        }}
      >
        {value || placeholder}
      </span>
    )
  }

  // ─── Shared Section Renderers ───
  const visibleSections = sections.filter(s => s.visible)

  const renderSummary = (headerStyle, textColor = '#444') => {
    const section = visibleSections.find(s => s.id === 'summary')
    if (!section) return null
    if (!c.professional_summary && editingField !== 'summary') return null

    return (
      <div style={{ marginBottom: 18 }}>
        <h2 style={headerStyle}>
          {style.template === 'executive' ? 'PROFESSIONAL SUMMARY' : 'Professional Summary'}
        </h2>
        <EditableText
          value={c.professional_summary}
          onChange={onUpdateSummary}
          multiline
          placeholder="Write your professional summary..."
          style={{ 
            fontSize: 10, 
            lineHeight: 1.7, 
            color: textColor, 
            display: 'block', 
            width: '100%' 
          }}
        />
      </div>
    )
  }

  const renderExperience = (headerStyle, dateColor = '#888') => {
    const section = visibleSections.find(s => s.id === 'experience')
    if (!section || !c.experience?.length) return null

    return (
      <div style={{ marginBottom: 18 }}>
        <h2 style={headerStyle}>
          {style.template === 'executive' ? 'PROFESSIONAL EXPERIENCE' : 'Experience'}
        </h2>
        {c.experience.map((exp, i) => (
          <div 
            key={i} 
            style={{ 
              marginBottom: 12, 
              position: 'relative',
              ...(style.template === 'executive' 
                ? { paddingLeft: 12, borderLeft: `2px solid ${color}20` } 
                : {}
              )
            }} 
            className="editable-section"
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'baseline' 
            }}>
              <div style={{ fontSize: 11, fontWeight: 700 }}>
                <EditableText
                  value={exp.role}
                  onChange={(val) => onUpdateExperience(i, 'role', val)}
                  placeholder="Job Title"
                />
                {style.template === 'classic' && (
                  <>
                    {' — '}
                    <EditableText
                      value={exp.company}
                      onChange={(val) => onUpdateExperience(i, 'company', val)}
                      placeholder="Company"
                    />
                  </>
                )}
              </div>
              <span style={{ fontSize: 9, color: dateColor, whiteSpace: 'nowrap' }}>
                <EditableText
                  value={exp.start_date}
                  onChange={(val) => onUpdateExperience(i, 'start_date', val)}
                  placeholder="Start"
                />
                {' – '}
                <EditableText
                  value={exp.end_date}
                  onChange={(val) => onUpdateExperience(i, 'end_date', val)}
                  placeholder="End"
                />
              </span>
            </div>

            {style.template !== 'classic' && (
              <EditableText
                value={exp.company}
                onChange={(val) => onUpdateExperience(i, 'company', val)}
                placeholder="Company Name"
                style={{ 
                  fontSize: 10, 
                  color: style.template === 'minimal' ? '#888' : color, 
                  fontWeight: 600, 
                  marginBottom: 4, 
                  display: 'block' 
                }}
              />
            )}

            <ul style={{ 
              fontSize: 9, 
              lineHeight: 1.7, 
              color: '#444', 
              paddingLeft: 14, 
              margin: '4px 0 0' 
            }}>
              {exp.bullets?.map((b, j) => (
                <li key={j} style={{ marginBottom: 2 }}>
                  <EditableText
                    value={b}
                    onChange={(val) => {
                      const newBullets = [...exp.bullets]
                      newBullets[j] = val
                      onUpdateExperience(i, 'bullets', newBullets)
                    }}
                    placeholder="Describe achievement..."
                  />
                </li>
              ))}
            </ul>

            <button
              className="remove-btn"
              onClick={() => onRemoveExperience(i)}
              title="Remove experience"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )
  }

  const renderEducation = (headerStyle, dateColor = '#888') => {
    const section = visibleSections.find(s => s.id === 'education')
    if (!section || !c.education?.length) return null

    return (
      <div style={{ marginBottom: 18 }}>
        <h2 style={headerStyle}>Education</h2>
        {c.education.map((edu, i) => (
          <div 
            key={i} 
            style={{ marginBottom: 8, position: 'relative' }} 
            className="editable-section"
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'baseline' 
            }}>
              <div>
                <EditableText
                  value={edu.degree}
                  onChange={(val) => onUpdateEducation(i, 'degree', val)}
                  style={{ fontSize: 11, fontWeight: 700 }}
                  placeholder="Degree"
                />
                <span style={{ fontSize: 10, color: '#666' }}>
                  {' — '}
                  <EditableText
                    value={edu.institution}
                    onChange={(val) => onUpdateEducation(i, 'institution', val)}
                    placeholder="Institution"
                  />
                </span>
              </div>
              <span style={{ fontSize: 9, color: dateColor }}>
                <EditableText
                  value={edu.date}
                  onChange={(val) => onUpdateEducation(i, 'date', val)}
                  placeholder="Date"
                />
              </span>
            </div>

            {edu.gpa && (
              <div style={{ fontSize: 9, color: '#888' }}>
                GPA:{' '}
                <EditableText
                  value={edu.gpa}
                  onChange={(val) => onUpdateEducation(i, 'gpa', val)}
                  placeholder="GPA"
                />
              </div>
            )}

            {edu.highlights && (
              <div style={{ fontSize: 9, color: '#888' }}>
                <EditableText
                  value={edu.highlights}
                  onChange={(val) => onUpdateEducation(i, 'highlights', val)}
                  placeholder="Highlights"
                />
              </div>
            )}

            <button
              className="remove-btn"
              onClick={() => onRemoveEducation(i)}
              title="Remove education"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )
  }

  const renderSkills = (headerStyle, isInline = false) => {
    const section = visibleSections.find(s => s.id === 'skills')
    if (!section || !c.skills_grouped || !Object.keys(c.skills_grouped).length) return null

    if (isInline) {
      return (
        <div style={{ marginBottom: 18 }}>
          <h2 style={headerStyle}>Skills</h2>
          <div style={{ fontSize: 10, lineHeight: 2, color: '#444' }}>
            {Object.entries(c.skills_grouped).map(([cat, skills], idx) => (
              <span key={cat} className="editable-section" style={{ position: 'relative' }}>
                <EditableText
                  value={Array.isArray(skills) ? skills.join(' · ') : skills}
                  onChange={(val) => onUpdateSkills(cat, val.split(' · ').map(s => s.trim()).filter(Boolean))}
                />
                {idx < Object.keys(c.skills_grouped).length - 1 && ' · '}
                <button
                  className="remove-btn"
                  onClick={() => onRemoveSkillCategory(cat)}
                  style={{ position: 'relative', display: 'inline' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div style={{ marginBottom: 18 }}>
        <h2 style={headerStyle}>Skills</h2>
        {Object.entries(c.skills_grouped).map(([cat, skills]) => (
          <div 
            key={cat} 
            style={{ fontSize: 10, marginBottom: 4, position: 'relative' }} 
            className="editable-section"
          >
            <strong>
              <EditableText
                value={cat}
                onChange={(val) => onUpdateSkillCategory(cat, val)}
                placeholder="Category"
              />
              :
            </strong>{' '}
            <EditableText
              value={Array.isArray(skills) ? skills.join(', ') : skills}
              onChange={(val) => onUpdateSkills(cat, val.split(', ').map(s => s.trim()).filter(Boolean))}
              placeholder="Skills..."
            />
            <button
              className="remove-btn"
              onClick={() => onRemoveSkillCategory(cat)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )
  }

  const renderProjects = (headerStyle) => {
    const section = visibleSections.find(s => s.id === 'projects')
    if (!section || !c.projects?.length) return null

    return (
      <div style={{ marginBottom: 18 }}>
        <h2 style={headerStyle}>
          {style.template === 'executive' ? 'Key Projects' : 'Projects'}
        </h2>
        {c.projects.map((proj, i) => (
          <div 
            key={i} 
            style={{ marginBottom: 8, position: 'relative' }} 
            className="editable-section"
          >
            <EditableText
              value={proj.title}
              onChange={(val) => onUpdateProject(i, 'title', val)}
              style={{ fontSize: 11, fontWeight: 700, display: 'block' }}
              placeholder="Project Name"
            />
            <EditableText
              value={proj.description}
              onChange={(val) => onUpdateProject(i, 'description', val)}
              style={{ fontSize: 9, color: '#444', lineHeight: 1.5, display: 'block' }}
              placeholder="Description..."
            />
            {proj.technologies && (
              <div style={{ fontSize: 8, color, marginTop: 2 }}>
                Tech:{' '}
                <EditableText
                  value={proj.technologies}
                  onChange={(val) => onUpdateProject(i, 'technologies', val)}
                  placeholder="Technologies"
                />
              </div>
            )}
            <button
              className="remove-btn"
              onClick={() => onRemoveProject(i)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )
  }

  const renderAchievements = (headerStyle) => {
    const section = visibleSections.find(s => s.id === 'achievements')
    if (!section || !c.achievements?.length) return null

    return (
      <div style={{ marginBottom: 18 }}>
        <h2 style={headerStyle}>Achievements</h2>
        {c.achievements.map((a, i) => (
          <div key={i} style={{ fontSize: 9, marginBottom: 4 }}>
            <span style={{ fontWeight: 700 }}>{a.title}</span>
            {a.description && (
              <span style={{ color: '#666' }}> — {a.description}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderCertifications = (headerStyle) => {
    const section = visibleSections.find(s => s.id === 'certifications')
    if (!section || !c.certifications?.length) return null

    return (
      <div style={{ marginBottom: 18 }}>
        <h2 style={headerStyle}>Certifications</h2>
        {c.certifications.map((cert, i) => (
          <div key={i} style={{ fontSize: 10, marginBottom: 4 }}>
            {cert.title} — {cert.organization} ({cert.year})
          </div>
        ))}
      </div>
    )
  }

  // ─── Sidebar Skills & Certs (for modern template sidebar) ───
  const renderSidebarSkills = () => {
    if (!c.skills_grouped || !Object.keys(c.skills_grouped).length) return null

    return (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ 
          fontSize: 13, 
          borderBottom: '1px solid rgba(255,255,255,0.3)', 
          paddingBottom: 4, 
          marginBottom: 8 
        }}>
          SKILLS
        </h3>
        {Object.entries(c.skills_grouped).map(([cat, skills]) => (
          <div 
            key={cat} 
            style={{ marginBottom: 8, position: 'relative' }} 
            className="editable-section"
          >
            <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, marginBottom: 3 }}>
              <EditableText
                value={cat}
                onChange={(val) => onUpdateSkillCategory(cat, val)}
                style={{ color: '#fff' }}
              />
            </div>
            <div style={{ fontSize: 9, lineHeight: 1.6 }}>
              <EditableText
                value={Array.isArray(skills) ? skills.join(' • ') : skills}
                onChange={(val) => onUpdateSkills(
                  cat, 
                  val.split(' • ').map(s => s.trim()).filter(Boolean)
                )}
                style={{ color: '#fff' }}
              />
            </div>
            <button
              className="remove-btn remove-btn-light"
              onClick={() => onRemoveSkillCategory(cat)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )
  }

  const renderSidebarCerts = () => {
    if (!c.certifications?.length) return null

    return (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ 
          fontSize: 13, 
          borderBottom: '1px solid rgba(255,255,255,0.3)', 
          paddingBottom: 4, 
          marginBottom: 8 
        }}>
          CERTIFICATIONS
        </h3>
        {c.certifications.map((cert, i) => (
          <div key={i} style={{ fontSize: 9, marginBottom: 6 }}>
            <div style={{ fontWeight: 600 }}>{cert.title}</div>
            <div style={{ opacity: 0.8 }}>
              {cert.organization} • {cert.year}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // TEMPLATE: MODERN (Two-column sidebar)
  // ═══════════════════════════════════════════════════════════════════
  if (style.template === 'modern') {
    const mainHeaderStyle = {
      fontSize: 14,
      color,
      borderBottom: `2px solid ${color}`,
      paddingBottom: 4,
      marginBottom: 8,
    }

    return (
      <div 
        className="resume-page editable" 
        style={{ fontFamily: font, display: 'flex', fontSize: `${fontScale}em` }}
      >
        {/* Sidebar */}
        <div style={{ 
          width: '35%', 
          background: color, 
          color: '#fff', 
          padding: '30px 20px' 
        }}>
          {/* Photo */}
          {showPhoto && pi.profile_image_url && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginBottom: 20 
            }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
                border: '3px solid rgba(255,255,255,0.8)'
              }}>
                <img 
                  src={pi.profile_image_url} 
                  alt="Profile" 
                  crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
            </div>
          )}

          {/* Name */}
          <h1 style={{ 
            fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: 'center' 
          }}>
            <EditableText
              value={pi.name}
              onChange={(val) => onUpdatePersonalInfo('name', val)}
              placeholder="Your Name"
              style={{ color: '#fff' }}
            />
          </h1>

          {/* Contact */}
          <div style={{ fontSize: 10, marginBottom: 20, opacity: 0.9 }}>
            {['email', 'phone', 'location', 'linkedin', 'github', 'website'].map(field => (
              <div key={field} style={{ marginBottom: 2 }}>
                <EditableText
                  value={pi[field]}
                  onChange={(val) => onUpdatePersonalInfo(field, val)}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  style={{ color: '#fff' }}
                />
              </div>
            ))}
          </div>

          {renderSidebarSkills()}
          {renderSidebarCerts()}
        </div>

        {/* Main Content */}
        <div style={{ width: '65%', padding: '30px 24px' }}>
          {visibleSections.map(section => {
            switch (section.id) {
              case 'summary':
                return <div key="summary">{renderSummary(mainHeaderStyle)}</div>
              case 'experience':
                return <div key="experience">{renderExperience(mainHeaderStyle)}</div>
              case 'education':
                return <div key="education">{renderEducation(mainHeaderStyle)}</div>
              case 'skills':
                return null // Skills are in sidebar
              case 'projects':
                return <div key="projects">{renderProjects(mainHeaderStyle)}</div>
              case 'certifications':
                return null // Certs are in sidebar
              case 'achievements':
                return <div key="achievements">{renderAchievements(mainHeaderStyle)}</div>
              default:
                return null
            }
          })}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // TEMPLATE: CLASSIC (Traditional single-column)
  // ═══════════════════════════════════════════════════════════════════
  if (style.template === 'classic') {
    const headerStyle = {
      fontSize: 13,
      color,
      textTransform: 'uppercase',
      letterSpacing: 1,
      borderBottom: `1px solid ${color}`,
      paddingBottom: 3,
      marginBottom: 6,
    }

    return (
      <div 
        className="resume-page editable" 
        style={{ fontFamily: font, padding: '30px 36px', fontSize: `${fontScale}em` }}
      >
        {/* Header */}
        <div style={{
          borderBottom: `3px solid ${color}`,
          paddingBottom: 14,
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}>
          {showPhoto && pi.profile_image_url && (
            <div style={{
              width: 70, height: 70, borderRadius: '50%', overflow: 'hidden',
              border: `3px solid ${color}`
            }}>
              <img 
                src={pi.profile_image_url} 
                alt="Profile" 
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color, marginBottom: 6 }}>
              <EditableText
                value={pi.name}
                onChange={(val) => onUpdatePersonalInfo('name', val)}
                placeholder="Your Name"
              />
            </h1>
            <div style={{ 
              fontSize: 10, color: '#666', display: 'flex', gap: 12, flexWrap: 'wrap' 
            }}>
              <span>
                📧{' '}
                <EditableText
                  value={pi.email}
                  onChange={(val) => onUpdatePersonalInfo('email', val)}
                  placeholder="Email"
                />
              </span>
              <span>
                📱{' '}
                <EditableText
                  value={pi.phone}
                  onChange={(val) => onUpdatePersonalInfo('phone', val)}
                  placeholder="Phone"
                />
              </span>
              <span>
                📍{' '}
                <EditableText
                  value={pi.location}
                  onChange={(val) => onUpdatePersonalInfo('location', val)}
                  placeholder="Location"
                />
              </span>
            </div>
          </div>
        </div>

        {/* Sections in order */}
        {visibleSections.map(section => {
          switch (section.id) {
            case 'summary':
              return <div key="summary">{renderSummary(headerStyle)}</div>
            case 'experience':
              return <div key="experience">{renderExperience(headerStyle)}</div>
            case 'education':
              return <div key="education">{renderEducation(headerStyle)}</div>
            case 'skills':
              return <div key="skills">{renderSkills(headerStyle)}</div>
            case 'projects':
              return <div key="projects">{renderProjects(headerStyle)}</div>
            case 'certifications':
              return <div key="certifications">{renderCertifications(headerStyle)}</div>
            case 'achievements':
              return <div key="achievements">{renderAchievements(headerStyle)}</div>
            default:
              return null
          }
        })}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // TEMPLATE: MINIMAL (Clean & simple)
  // ═══════════════════════════════════════════════════════════════════
  if (style.template === 'minimal') {
    const headerStyle = {
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 2,
      color,
      marginBottom: 10,
      fontWeight: 600,
    }

    return (
      <div 
        className="resume-page editable" 
        style={{ fontFamily: font, padding: '40px 44px', fontSize: `${fontScale}em` }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          borderBottom: '1px solid #eee',
          paddingBottom: 14,
          marginBottom: 20,
        }}>
          {showPhoto && pi.profile_image_url && (
            <div style={{
              width: 70, height: 70, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid #ddd'
            }}>
              <img 
                src={pi.profile_image_url} 
                alt="Profile" 
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
          )}

          <div style={{ flex: 1 }}>
            <h1 style={{ 
              fontSize: 28, fontWeight: 300, color: '#222', 
              marginBottom: 4, letterSpacing: 1 
            }}>
              <EditableText
                value={pi.name}
                onChange={(val) => onUpdatePersonalInfo('name', val)}
                placeholder="Your Name"
              />
            </h1>
            <div style={{ 
              fontSize: 10, color: '#888', display: 'flex', gap: 16, flexWrap: 'wrap' 
            }}>
              <EditableText
                value={pi.email}
                onChange={(val) => onUpdatePersonalInfo('email', val)}
                placeholder="Email"
              />
              <EditableText
                value={pi.phone}
                onChange={(val) => onUpdatePersonalInfo('phone', val)}
                placeholder="Phone"
              />
              <EditableText
                value={pi.location}
                onChange={(val) => onUpdatePersonalInfo('location', val)}
                placeholder="Location"
              />
            </div>
          </div>
        </div>

        {/* Sections in order */}
        {visibleSections.map(section => {
          switch (section.id) {
            case 'summary':
              return (
                <div key="summary">
                  {(c.professional_summary || editingField === 'summary') && (
                    <div style={{ marginBottom: 22 }}>
                      <EditableText
                        value={c.professional_summary}
                        onChange={onUpdateSummary}
                        multiline
                        placeholder="Write your professional summary..."
                        style={{ 
                          fontSize: 10, lineHeight: 1.8, color: '#555', 
                          display: 'block', width: '100%' 
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            case 'experience':
              return <div key="experience">{renderExperience(headerStyle)}</div>
            case 'education':
              return <div key="education">{renderEducation(headerStyle)}</div>
            case 'skills':
              return <div key="skills">{renderSkills(headerStyle, true)}</div>
            case 'projects':
              return <div key="projects">{renderProjects(headerStyle)}</div>
            case 'certifications':
              return <div key="certifications">{renderCertifications(headerStyle)}</div>
            case 'achievements':
              return <div key="achievements">{renderAchievements(headerStyle)}</div>
            default:
              return null
          }
        })}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // TEMPLATE: EXECUTIVE (Bold professional)
  // ═══════════════════════════════════════════════════════════════════
  if (style.template === 'executive') {
    const headerStyle = {
      fontSize: 14,
      fontWeight: 700,
      color,
      marginBottom: 10,
      textTransform: 'uppercase',
    }

    return (
      <div 
        className="resume-page editable" 
        style={{ fontFamily: font, padding: 0, fontSize: `${fontScale}em` }}
      >
        {/* Header Banner */}
        <div style={{
          background: color,
          color: '#fff',
          padding: '28px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
        }}>
          {showPhoto && pi.profile_image_url && (
            <div style={{
              width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid rgba(255,255,255,0.9)', flexShrink: 0,
            }}>
              <img 
                src={pi.profile_image_url} 
                alt="Profile" 
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
          )}

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 2 }}>
              <EditableText
                value={pi.name}
                onChange={(val) => onUpdatePersonalInfo('name', val)}
                placeholder="Your Name"
                style={{ color: '#fff' }}
              />
            </h1>
            {c.professional_summary && (
              <p style={{ fontSize: 9, opacity: 0.9, maxWidth: 420, lineHeight: 1.5 }}>
                {c.professional_summary.substring(0, 150)}...
              </p>
            )}
          </div>

          <div style={{ fontSize: 9, textAlign: 'right', opacity: 0.9 }}>
            <div>
              <EditableText
                value={pi.email}
                onChange={(val) => onUpdatePersonalInfo('email', val)}
                placeholder="Email"
                style={{ color: '#fff' }}
              />
            </div>
            <div>
              <EditableText
                value={pi.phone}
                onChange={(val) => onUpdatePersonalInfo('phone', val)}
                placeholder="Phone"
                style={{ color: '#fff' }}
              />
            </div>
            <div>
              <EditableText
                value={pi.location}
                onChange={(val) => onUpdatePersonalInfo('location', val)}
                placeholder="Location"
                style={{ color: '#fff' }}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 36px' }}>
          {/* Summary Box */}
          {visibleSections.find(s => s.id === 'summary') && c.professional_summary && (
            <div style={{
              marginBottom: 16,
              padding: 14,
              background: '#f8f9fa',
              borderLeft: `3px solid ${color}`,
              borderRadius: 4,
            }}>
              <EditableText
                value={c.professional_summary}
                onChange={onUpdateSummary}
                multiline
                placeholder="Professional summary..."
                style={{ 
                  fontSize: 10, lineHeight: 1.7, color: '#444', 
                  display: 'block', width: '100%', margin: 0 
                }}
              />
            </div>
          )}

          {/* Experience */}
          {renderExperience(headerStyle)}

          {/* Two Column: Education+Projects | Skills+Certs */}
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ flex: 1 }}>
              {renderEducation(headerStyle)}
              {renderProjects(headerStyle)}
              {renderAchievements(headerStyle)}
            </div>
            <div style={{ width: 200 }}>
              {visibleSections.find(s => s.id === 'skills') && 
                c.skills_grouped && 
                Object.keys(c.skills_grouped).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h2 style={headerStyle}>Skills</h2>
                  {Object.entries(c.skills_grouped).map(([cat, skills]) => (
                    <div 
                      key={cat} 
                      style={{ marginBottom: 6, position: 'relative' }} 
                      className="editable-section"
                    >
                      <div style={{ fontSize: 9, fontWeight: 700, color }}>
                        <EditableText
                          value={cat}
                          onChange={(val) => onUpdateSkillCategory(cat, val)}
                        />
                      </div>
                      <div style={{ fontSize: 9, color: '#444' }}>
                        <EditableText
                          value={Array.isArray(skills) ? skills.join(', ') : skills}
                          onChange={(val) => onUpdateSkills(
                            cat, 
                            val.split(', ').map(s => s.trim()).filter(Boolean)
                          )}
                        />
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => onRemoveSkillCategory(cat)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {renderCertifications(headerStyle)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // TEMPLATE: CREATIVE (Unique design)
  // ═══════════════════════════════════════════════════════════════════
  if (style.template === 'creative') {
    const headerStyle = {
      fontSize: 14,
      color,
      fontWeight: 700,
      marginBottom: 10,
      paddingBottom: 4,
      borderBottom: `3px double ${color}`,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    }

    return (
      <div 
        className="resume-page editable" 
        style={{ fontFamily: font, padding: 0, fontSize: `${fontScale}em` }}
      >
        {/* Creative Header - Full width with gradient */}
        <div style={{
          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
          color: '#fff',
          padding: '30px 36px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }} />
          <div style={{
            position: 'absolute', bottom: -20, right: 60,
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }} />

          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 24, 
            position: 'relative', zIndex: 1 
          }}>
            {showPhoto && pi.profile_image_url && (
              <div style={{
                width: 90, height: 90, borderRadius: '50%', overflow: 'hidden',
                border: '4px solid rgba(255,255,255,0.9)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              }}>
                <img 
                  src={pi.profile_image_url} 
                  alt="Profile" 
                  crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
            )}

            <div style={{ flex: 1 }}>
              <h1 style={{ 
                fontSize: 28, fontWeight: 700, marginBottom: 4, letterSpacing: 2 
              }}>
                <EditableText
                  value={pi.name}
                  onChange={(val) => onUpdatePersonalInfo('name', val)}
                  placeholder="Your Name"
                  style={{ color: '#fff' }}
                />
              </h1>
              <div style={{ 
                fontSize: 10, opacity: 0.9, display: 'flex', 
                gap: 16, flexWrap: 'wrap' 
              }}>
                {['email', 'phone', 'location'].map(field => (
                  <span key={field}>
                    <EditableText
                      value={pi[field]}
                      onChange={(val) => onUpdatePersonalInfo(field, val)}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      style={{ color: '#fff' }}
                    />
                  </span>
                ))}
              </div>
              {(pi.linkedin || pi.github || pi.website) && (
                <div style={{ 
                  fontSize: 9, opacity: 0.8, display: 'flex', 
                  gap: 12, marginTop: 4 
                }}>
                  {['linkedin', 'github', 'website'].map(field => 
                    pi[field] ? (
                      <span key={field}>
                        <EditableText
                          value={pi[field]}
                          onChange={(val) => onUpdatePersonalInfo(field, val)}
                          placeholder={field}
                          style={{ color: '#fff' }}
                        />
                      </span>
                    ) : null
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body with left accent stripe */}
        <div style={{ 
          padding: '24px 36px', 
          borderLeft: `4px solid ${color}`, 
          margin: '0 0 0 20px' 
        }}>
          {/* Summary as styled quote */}
          {visibleSections.find(s => s.id === 'summary') && (
            <div style={{ 
              marginBottom: 20, 
              padding: '12px 16px',
              background: `${color}08`,
              borderRadius: 8,
              borderLeft: `3px solid ${color}`,
            }}>
              <EditableText
                value={c.professional_summary}
                onChange={onUpdateSummary}
                multiline
                placeholder="Write your professional summary..."
                style={{ 
                  fontSize: 10, lineHeight: 1.7, color: '#444', 
                  fontStyle: 'italic', display: 'block', width: '100%' 
                }}
              />
            </div>
          )}

          {/* Two column layout */}
          <div style={{ display: 'flex', gap: 28 }}>
            {/* Left - Main content */}
            <div style={{ flex: 1 }}>
              {visibleSections.map(section => {
                switch (section.id) {
                  case 'experience':
                    return <div key="experience">{renderExperience(headerStyle)}</div>
                  case 'projects':
                    return <div key="projects">{renderProjects(headerStyle)}</div>
                  case 'achievements':
                    return <div key="achievements">{renderAchievements(headerStyle)}</div>
                  default:
                    return null
                }
              })}
            </div>

            {/* Right - Side content */}
            <div style={{ width: 180 }}>
              {visibleSections.find(s => s.id === 'education') && renderEducation({
                ...headerStyle, fontSize: 12,
              })}

              {visibleSections.find(s => s.id === 'skills') && 
                c.skills_grouped && 
                Object.keys(c.skills_grouped).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ ...headerStyle, fontSize: 12 }}>Skills</h2>
                  {Object.entries(c.skills_grouped).map(([cat, skills]) => (
                    <div 
                      key={cat} 
                      style={{ marginBottom: 8, position: 'relative' }} 
                      className="editable-section"
                    >
                      <div style={{ 
                        fontSize: 9, fontWeight: 700, color, 
                        marginBottom: 2, textTransform: 'uppercase' 
                      }}>
                        <EditableText
                          value={cat}
                          onChange={(val) => onUpdateSkillCategory(cat, val)}
                        />
                      </div>
                      <div style={{ fontSize: 9, color: '#555', lineHeight: 1.6 }}>
                        <EditableText
                          value={Array.isArray(skills) ? skills.join(' • ') : skills}
                          onChange={(val) => onUpdateSkills(
                            cat, 
                            val.split(' • ').map(s => s.trim()).filter(Boolean)
                          )}
                        />
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => onRemoveSkillCategory(cat)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {renderCertifications({ ...headerStyle, fontSize: 12 })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // FALLBACK (should never reach here, but just in case)
  // ═══════════════════════════════════════════════════════════════════
  const fallbackHeader = {
    fontSize: 13,
    color,
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: `1px solid ${color}`,
    paddingBottom: 3,
    marginBottom: 6,
  }

  return (
    <div 
      className="resume-page editable" 
      style={{ fontFamily: font, padding: '30px 36px', fontSize: `${fontScale}em` }}
    >
      <h1 style={{ fontSize: 26, fontWeight: 700, color, marginBottom: 10 }}>
        <EditableText
          value={pi.name}
          onChange={(val) => onUpdatePersonalInfo('name', val)}
          placeholder="Your Name"
        />
      </h1>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 18 }}>
        <EditableText value={pi.email} onChange={(val) => onUpdatePersonalInfo('email', val)} placeholder="Email" />
        {' • '}
        <EditableText value={pi.phone} onChange={(val) => onUpdatePersonalInfo('phone', val)} placeholder="Phone" />
        {' • '}
        <EditableText value={pi.location} onChange={(val) => onUpdatePersonalInfo('location', val)} placeholder="Location" />
      </div>

      {visibleSections.map(section => {
        switch (section.id) {
          case 'summary':
            return <div key="summary">{renderSummary(fallbackHeader)}</div>
          case 'experience':
            return <div key="experience">{renderExperience(fallbackHeader)}</div>
          case 'education':
            return <div key="education">{renderEducation(fallbackHeader)}</div>
          case 'skills':
            return <div key="skills">{renderSkills(fallbackHeader)}</div>
          case 'projects':
            return <div key="projects">{renderProjects(fallbackHeader)}</div>
          case 'certifications':
            return <div key="certifications">{renderCertifications(fallbackHeader)}</div>
          case 'achievements':
            return <div key="achievements">{renderAchievements(fallbackHeader)}</div>
          default:
            return null
        }
      })}
    </div>
  )
}