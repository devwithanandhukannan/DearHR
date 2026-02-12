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

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>
  if (user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/personal-info" element={<ProtectedRoute><Layout><PersonalInfo /></Layout></ProtectedRoute>} />
      <Route path="/education" element={<ProtectedRoute><Layout><Education /></Layout></ProtectedRoute>} />
      <Route path="/experience" element={<ProtectedRoute><Layout><Experience /></Layout></ProtectedRoute>} />
      <Route path="/skills" element={<ProtectedRoute><Layout><Skills /></Layout></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
      <Route path="/certifications" element={<ProtectedRoute><Layout><Certifications /></Layout></ProtectedRoute>} />
      <Route path="/achievements" element={<ProtectedRoute><Layout><Achievements /></Layout></ProtectedRoute>} />
      <Route path="/additional-links" element={<ProtectedRoute><Layout><AdditionalLinks /></Layout></ProtectedRoute>} />
      <Route path="/generate-resume" element={<ProtectedRoute><Layout><GenerateResume /></Layout></ProtectedRoute>} />

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