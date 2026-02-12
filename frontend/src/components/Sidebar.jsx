import { useState, useEffect, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { profileAPI } from '../api/axios'
import {
  FiGrid, FiUser, FiBook, FiBriefcase,
  FiSettings, FiFolder, FiAward, FiStar,
  FiLink, FiLogOut, FiFileText
} from 'react-icons/fi'

export default function Sidebar() {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()
  const [counts, setCounts] = useState({})

  const fetchCounts = useCallback(async () => {
    try {
      const res = await profileAPI.dashboard()
      setCounts(res.data.data)
    } catch (err) {
      console.error('Failed to fetch counts')
    }
  }, [])

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [fetchCounts])

  useEffect(() => {
    const handler = () => fetchCounts()
    window.addEventListener('refreshCounts', handler)
    return () => window.removeEventListener('refreshCounts', handler)
  }, [fetchCounts])

  const handleLogout = async () => {
    try {
      await logoutUser()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed')
    }
  }

  const navItems = [
    { to: '/', icon: <FiGrid />, label: 'Dashboard' },
    { to: '/personal-info', icon: <FiUser />, label: 'Personal Info', count: counts.has_personal_info ? '✓' : '—' },
    { to: '/education', icon: <FiBook />, label: 'Education', count: counts.education_count },
    { to: '/experience', icon: <FiBriefcase />, label: 'Experience', count: counts.experience_count },
    { to: '/skills', icon: <FiSettings />, label: 'Skills', count: counts.skills_count },
    { to: '/projects', icon: <FiFolder />, label: 'Projects', count: counts.projects_count },
    { to: '/certifications', icon: <FiAward />, label: 'Certifications', count: counts.certifications_count },
    { to: '/achievements', icon: <FiStar />, label: 'Achievements', count: counts.achievements_count },
    { to: '/additional-links', icon: <FiLink />, label: 'Additional Links', count: counts.additional_links_count },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>📋 Info Manager</h1>
        <div className="user-info">👤 {user?.first_name || user?.username}</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.count !== undefined && <span className="nav-count">{item.count}</span>}
          </NavLink>
        ))}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '12px 0' }} />

        <NavLink
          to="/generate-resume"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon"><FiFileText /></span>
          <span>Generate Resume</span>
          <span className="nav-count" style={{ background: 'rgba(102,126,234,0.3)', color: '#667eea' }}>AI</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <FiLogOut /> Logout
        </button>
      </div>
    </aside>
  )
}