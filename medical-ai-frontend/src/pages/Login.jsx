// ==============================================================
// src/pages/Login.jsx — Modern Login Page (Bootstrap 5.3)
// ==============================================================

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Map role → home page redirect
const ROLE_REDIRECTS = {
  patient: '/patient/portal',
  doctor:  '/doctor/dashboard',
  admin:   '/admin/dashboard',
}

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  // Message passed from Register component (if redirected)
  const successMessage = location.state?.message || ''

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(formData.email, formData.password)
      const redirectPath = ROLE_REDIRECTS[user.role] || '/'
      navigate(redirectPath, { replace: true })
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 w-100 d-flex align-items-center justify-content-center bg-light py-5">
      <div className="container d-flex justify-content-center px-3">
        
        {/* Main Card */}
        <div className="card border-0 shadow-lg rounded-4 overflow-hidden w-100" style={{ maxWidth: '480px' }}>
          
          {/* Header */}
          <div className="card-header bg-primary text-white text-center py-4 border-0">
            <div className="d-inline-flex align-items-center justify-content-center bg-white bg-opacity-20 rounded-circle p-3 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-person-fill-lock" viewBox="0 0 16 16">
                <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 5.996V14H3s-1 0-1-1 1-4 6-4c.564 0 1.077.038 1.544.107a4.524 4.524 0 0 0-.803.918A10.46 10.46 0 0 0 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664z"/>
                <path d="M9 13a1 1 0 0 1 1-1v-1a2 2 0 1 1 4 0v1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zm3-3a1 1 0 0 0-1 1v1h2v-1a1 1 0 0 0-1-1"/>
              </svg>
            </div>
            <h3 className="fw-bold mb-1">Welcome Back</h3>
            <p className="text-white-50 mb-0 small">Sign in to your MediAI Care account</p>
          </div>

          <div className="card-body p-4 p-md-5">

            {/* Success Alert */}
            {successMessage && (
              <div className="alert alert-success d-flex align-items-center gap-2 rounded-3 border-0 shadow-sm mb-4" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-check-circle-fill flex-shrink-0" viewBox="0 0 16 16">
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l4.992-5.99a.75.75 0 0 0-.018-1.042z"/>
                </svg>
                <div className="small">{successMessage}</div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 rounded-3 border-0 shadow-sm mb-4" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-exclamation-triangle-fill flex-shrink-0" viewBox="0 0 16 16">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
                <div className="small">{error}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>

              {/* Email Address */}
              <div className="mb-3">
                <label htmlFor="email" className="form-label text-secondary fw-semibold small mb-1">EMAIL ADDRESS</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="form-control form-control-lg rounded-3 fs-6"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
              </div>

              {/* Password Input */}
              <div className="mb-4">
                <label htmlFor="password" className="form-label text-secondary fw-semibold small mb-1">PASSWORD</label>
                <div className="input-group">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="form-control form-control-lg rounded-start-3 fs-6"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Your password"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    className="btn btn-outline-secondary rounded-end-3 px-3"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary btn-lg w-100 rounded-3 fw-bold mb-3 shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Quick Test Accounts for Development */}
            {import.meta.env.DEV && (
              <div className="mt-4 pt-3 border-top">
                <div className="text-center mb-2">
                  <span className="badge text-bg-light text-secondary border px-2 py-1">Dev Tools: Fill Credentials</span>
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <button
                      className="btn btn-outline-primary btn-sm w-100 rounded-3 py-2 text-start"
                      onClick={() => setFormData({ email: 'patient@test.com', password: 'Test@1234' })}
                      type="button"
                    >
                      <div className="fw-semibold small">👤 Patient</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>patient@test.com</div>
                    </button>
                  </div>
                  <div className="col-6">
                    <button
                      className="btn btn-outline-success btn-sm w-100 rounded-3 py-2 text-start"
                      onClick={() => setFormData({ email: 'doctor@test.com', password: 'Test@1234' })}
                      type="button"
                    >
                      <div className="fw-semibold small">🩺 Doctor</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>doctor@test.com</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Link to Register */}
            <div className="text-center mt-4">
              <span className="text-secondary small">Don't have an account? </span>
              <Link to="/register" className="text-primary text-decoration-none fw-semibold small">
                Create one
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

export default Login