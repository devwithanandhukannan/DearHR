import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import PersonalInfo from './pages/PersonalInfo'
import Education from './pages/Education'
import Experience from './pages/Experience'
import Skills from './pages/Skills'
import Projects from './pages/Projects'
import Certifications from './pages/Certifications'
import Achievements from './pages/Achievements'
import AdditionalLinks from './pages/AdditionalLinks'
import GenerateResume from './pages/GenerateResume'
import ColdEmail from './pages/ColdEmail'
import InterviewPrep from './pages/InterviewPrep'
import ResumeEditor from './pages/ResumeEditor'

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>
  if (user) return <Navigate to="/" replace />
  return children
}

function P({ children }) {
  return <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/" element={<P><Dashboard /></P>} />
      <Route path="/personal-info" element={<P><PersonalInfo /></P>} />
      <Route path="/education" element={<P><Education /></P>} />
      <Route path="/experience" element={<P><Experience /></P>} />
      <Route path="/skills" element={<P><Skills /></P>} />
      <Route path="/projects" element={<P><Projects /></P>} />
      <Route path="/certifications" element={<P><Certifications /></P>} />
      <Route path="/achievements" element={<P><Achievements /></P>} />
      <Route path="/additional-links" element={<P><AdditionalLinks /></P>} />
      <Route path="/generate-resume" element={<P><GenerateResume /></P>} />
      <Route path="/resume-editor" element={<ResumeEditor />} />
      <Route path="/cold-email" element={<P><ColdEmail /></P>} />
      <Route path="/interview-prep" element={<P><InterviewPrep /></P>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}