import { useState, useEffect, useCallback, useRef } from 'react'
import { profileAPI } from '../api/axios'
import MessageAlert from '../components/MessageAlert'

const EMPTY = {
  name: '', email: '', phone: '', location: '',
  linkedin: '', github: '', website: '',
}

// Validation helper function
const validateForm = (form) => {
  const newErrors = {}

  // Name validation
  if (!form.name.trim()) {
    newErrors.name = 'Full name is required.'
  } else if (form.name.trim().length < 2) {
    newErrors.name = 'Name must be at least 2 characters.'
  } else if (form.name.length > 100) {
    newErrors.name = 'Name must not exceed 100 characters.'
  }

  // Email validation
  if (!form.email.trim()) {
    newErrors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    newErrors.email = 'Please enter a valid email address.'
  }

  // Phone validation (optional, but if provided must be valid)
  if (form.phone.trim()) {
    if (!/^[\d\s\-\+\(\)]+$/.test(form.phone)) {
      newErrors.phone = 'Phone must contain only numbers, spaces, dashes, and parentheses.'
    } else if (form.phone.replace(/\D/g, '').length < 7) {
      newErrors.phone = 'Phone must have at least 7 digits.'
    }
  }

  // Location validation (optional)
  if (form.location.length > 100) {
    newErrors.location = 'Location must not exceed 100 characters.'
  }

  // LinkedIn validation (optional, but if provided must be valid URL)
  if (form.linkedin.trim()) {
    if (!/^https?:\/\/.+/.test(form.linkedin)) {
      newErrors.linkedin = 'LinkedIn must be a valid URL starting with http:// or https://'
    } else if (form.linkedin.length > 255) {
      newErrors.linkedin = 'LinkedIn URL must not exceed 255 characters.'
    }
  }

  // GitHub validation (optional, but if provided must be valid URL)
  if (form.github.trim()) {
    if (!/^https?:\/\/.+/.test(form.github)) {
      newErrors.github = 'GitHub must be a valid URL starting with http:// or https://'
    } else if (form.github.length > 255) {
      newErrors.github = 'GitHub URL must not exceed 255 characters.'
    }
  }

  // Website validation (optional, but if provided must be valid URL)
  if (form.website.trim()) {
    if (!/^https?:\/\/.+/.test(form.website)) {
      newErrors.website = 'Website must be a valid URL starting with http:// or https://'
    } else if (form.website.length > 255) {
      newErrors.website = 'Website URL must not exceed 255 characters.'
    }
  }

  return newErrors
}

export default function PersonalInfo() {
  const [form, setForm] = useState(EMPTY)
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [errors, setErrors] = useState({})

  // Image State
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [deletingImage, setDeletingImage] = useState(false)
  const fileInputRef = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await profileAPI.getPersonalInfo()
      if (res.data.data) {
        setForm({
          name: res.data.data.name || '',
          email: res.data.data.email || '',
          phone: res.data.data.phone || '',
          location: res.data.data.location || '',
          linkedin: res.data.data.linkedin || '',
          github: res.data.data.github || '',
          website: res.data.data.website || '',
        })
        setExists(true)
        if (res.data.data.profile_image_url) {
          setImagePreview(res.data.data.profile_image_url)
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Form Handlers
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    
    // Validate individual field on change
    const fieldErrors = validateForm({ ...form, [name]: value })
    setErrors(prev => ({
      ...prev,
      [name]: fieldErrors[name] || ''
    }))
  }

  // Image Handlers
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate on client side
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setMsg({ text: 'Image must be under 5MB.', type: 'error' })
      return
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMsg({ text: 'Only JPG, PNG, and WebP images are allowed.', type: 'error' })
      return
    }

    setImageFile(file)
    setErrors({ ...errors, profile_image: '' })

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleImageRemove = async () => {
    // If image exists on server (and we haven't just selected a new file)
    if (exists && imagePreview && !imageFile) {
      setDeletingImage(true)
      try {
        await profileAPI.deleteProfileImage()
        setImagePreview(null)
        setImageFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setMsg({ text: 'Profile image removed.', type: 'success' })
      } catch {
        setMsg({ text: 'Failed to remove image.', type: 'error' })
      } finally {
        setDeletingImage(false)
      }
      return
    }

    // If it's just a local preview (not yet saved), clear it
    setImagePreview(null)
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate entire form
    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setMsg({
        text: 'Please fix the errors below before submitting.',
        type: 'error',
      })
      return
    }

    setSaving(true)
    setErrors({})

    try {
      // Always use FormData for consistency
      const formData = new FormData()
      
      // Append all text fields
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value || '')
      })

      // Append image file if selected
      if (imageFile) {
        formData.append('profile_image', imageFile)
      }

      let res
      if (exists) {
        res = await profileAPI.updatePersonalInfo(formData)
        setMsg({ text: 'Personal info updated!', type: 'success' })
      } else {
        res = await profileAPI.createPersonalInfo(formData)
        setExists(true)
        setMsg({ text: 'Personal info saved!', type: 'success' })
      }

      // Update form with response data
      if (res.data.data) {
        setForm({
          name: res.data.data.name || '',
          email: res.data.data.email || '',
          phone: res.data.data.phone || '',
          location: res.data.data.location || '',
          linkedin: res.data.data.linkedin || '',
          github: res.data.data.github || '',
          website: res.data.data.website || '',
        })
        if (res.data.data.profile_image_url) {
          setImagePreview(res.data.data.profile_image_url)
        }
      }
      
      setImageFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      window.dispatchEvent(new Event('refreshCounts'))

    } catch (err) {
      console.error('Submit error:', err.response?.data)
      const data = err.response?.data
      if (typeof data === 'object') {
        const fe = {}
        Object.keys(data).forEach((k) => {
          if (Array.isArray(data[k])) fe[k] = data[k].join(' ')
        })
        setErrors(fe)
      }
      setMsg({
        text: err.response?.data?.message || 'Save failed.',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  // Loading State
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>Loading...
      </div>
    )
  }

  // Render
  return (
    <div>
      <div className="page-header">
        <h2>
          <span className="header-icon">👤</span> Personal Information
        </h2>
      </div>

      <MessageAlert
        message={msg.text}
        type={msg.type}
        onClose={() => setMsg({ text: '', type: '' })}
      />

      <div className="form-section">
        <h3>📋 {exists ? 'Update' : 'Add'} Your Details</h3>

        <form onSubmit={handleSubmit}>
          {/* Profile Image Upload */}
          <div className="profile-image-section">
            <label className="section-label">Profile Photo</label>

            <div className="image-upload-container">
              {/* Preview */}
              <div className="image-preview-wrapper">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile preview"
                    className="image-preview"
                  />
                ) : (
                  <div className="image-placeholder">
                    <span className="placeholder-icon">📷</span>
                    <span className="placeholder-text">No photo</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="image-controls">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="file-input-hidden"
                  id="profile-image-input"
                />

                <label
                  htmlFor="profile-image-input"
                  className="btn btn-secondary btn-sm"
                >
                  📁 {imagePreview ? 'Change Photo' : 'Upload Photo'}
                </label>

                {imagePreview && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleImageRemove}
                    disabled={deletingImage}
                  >
                    {deletingImage ? 'Removing...' : '🗑️ Remove'}
                  </button>
                )}

                <p className="image-help-text">
                  JPG, PNG, or WebP. Max 5MB.
                </p>

                {errors.profile_image && (
                  <div className="field-error">{errors.profile_image}</div>
                )}
              </div>
            </div>
          </div>

          {/* Name & Email */}
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                required
              />
              {errors.email && <div className="field-error">{errors.email}</div>}
            </div>
          </div>

          {/* Phone & Location */}
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1-555-0100"
              />
              {errors.phone && <div className="field-error">{errors.phone}</div>}
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="San Francisco, CA"
              />
              {errors.location && <div className="field-error">{errors.location}</div>}
            </div>
          </div>

          {/* LinkedIn */}
          <div className="form-group">
            <label>LinkedIn</label>
            <input
              type="url"
              name="linkedin"
              value={form.linkedin}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/johndoe"
            />
            {errors.linkedin && (
              <div className="field-error">{errors.linkedin}</div>
            )}
          </div>

          {/* GitHub & Website */}
          <div className="form-row">
            <div className="form-group">
              <label>GitHub</label>
              <input
                type="url"
                name="github"
                value={form.github}
                onChange={handleChange}
                placeholder="https://github.com/johndoe"
              />
              {errors.github && (
                <div className="field-error">{errors.github}</div>
              )}
            </div>
            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://johndoe.dev"
              />
              {errors.website && (
                <div className="field-error">{errors.website}</div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="btn-group">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : exists
                  ? '💾 Update Info'
                  : '💾 Save Info'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}