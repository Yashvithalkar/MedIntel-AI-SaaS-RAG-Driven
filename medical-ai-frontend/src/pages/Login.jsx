// ==============================================================
// src/pages/Login.jsx — Login Page
// ==============================================================
//
// ROLE-BASED REDIRECT AFTER LOGIN:
//   Patient logs in → navigate('/patient/portal')
//   Doctor logs in  → navigate('/doctor/dashboard')
//   Admin logs in   → navigate('/admin/dashboard')
//
//   The role is in the user object returned by login().
//   We switch on user.role to pick the right path.
//
// SUCCESS MESSAGE FROM REGISTER PAGE:
//   When Register.jsx redirects here after successful registration,
//   it passes state: { message: 'Account created! Please log in.' }
//   We read it with useLocation() and show it at the top.
//   This is React Router's way to pass data between pages without URL params.
// ==============================================================

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Map role → their home page
const ROLE_REDIRECTS = {
  patient: '/patient/portal',
  doctor:  '/doctor/dashboard',
  admin:   '/admin/dashboard',
}

const Login = () => {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { login } = useAuth()

  // Read message passed from Register page (if any)
  // location.state = { message: '...' } or null
  const successMessage = location.state?.message || ''

  const [formData, setFormData] = useState({
    email:    '',
    password: '',
  })

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('') // clear error as user types
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // login() → POST /api/auth/login → cookie set → returns user object
      const user = await login(formData.email, formData.password)

      // Decide where to send the user based on their role
      // Fallback to '/' if role is unknown
      const redirectPath = ROLE_REDIRECTS[user.role] || '/'

      // navigate() changes the URL without a full page reload
      // replace: true removes /login from history (can't go "back" to login)
      navigate(redirectPath, { replace: true })

    } catch (err) {
      // 401 = wrong email or password
      // 422 = invalid email format (shouldn't happen with our form but handle it)
      const message = err.response?.data?.message || 'Login failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to Medical AI</p>

        {/* ── Success message from registration ── */}
        {successMessage && (
          <div className="alert alert-success">
            ✅ {successMessage}
          </div>
        )}

        {/* ── Login error ── */}
        {error && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        {/* ── Login form ── */}
        <form onSubmit={handleSubmit} noValidate>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus   // focus this field when page loads
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Your password"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* ── Test credentials hint (dev only) ── */}
        {import.meta.env.DEV && (
          <>
            <div className="divider"><span>Quick test accounts</span></div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <button
                className="btn"
                style={{ background: '#e9d8fd', color: '#6b46c1', fontSize: '0.8rem', padding: '0.5rem' }}
                onClick={() => setFormData({ email: 'patient@test.com', password: 'Test@1234' })}
                type="button"
              >
                👤 Fill Patient credentials
              </button>
              <button
                className="btn"
                style={{ background: '#c6f6d5', color: '#276749', fontSize: '0.8rem', padding: '0.5rem' }}
                onClick={() => setFormData({ email: 'doctor@test.com', password: 'Test@1234' })}
                type="button"
              >
                🩺 Fill Doctor credentials
              </button>
            </div>
          </>
        )}

        <div className="auth-link">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>

      </div>
    </div>
  )
}

export default Login
