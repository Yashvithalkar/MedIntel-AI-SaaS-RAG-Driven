// ==============================================================
// src/App.jsx — Root Component: Router + Auth Provider
// ==============================================================
//
// STRUCTURE:
//   AuthProvider       → provides auth state to entire app
//     BrowserRouter    → enables React Router navigation
//       Routes         → matches current URL to a component
//         /            → redirect to /login
//         /login       → Login page (public)
//         /register    → Register page (public)
//         /patient/portal   → PatientPortal (protected: patient only)
//         /doctor/dashboard → DoctorDashboard (protected: doctor only)
//         *            → 404 Not Found
//
// HOW ROUTING WORKS:
//   User visits /patient/portal
//   → Routes checks each <Route path> top to bottom
//   → Matches /patient/portal
//   → Renders the element (ProtectedRoute wrapping PatientPortal)
//   → ProtectedRoute checks auth: logged in? correct role?
//   → Yes: renders PatientPortal
//   → No: redirects to /login or /doctor/dashboard
//
// PUBLIC vs PROTECTED ROUTES:
//   Public:    No auth check. Anyone can visit.
//              /login, /register
//
//   Protected: Wrapped in <ProtectedRoute>.
//              Checks auth state before rendering.
//              /patient/portal, /doctor/dashboard
//
// REDIRECT FOR LOGGED-IN USERS ON PUBLIC ROUTES:
//   If a logged-in patient visits /login, we redirect them to /patient/portal.
//   This is handled in PublicRoute component below.
// ==============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Pages
import Login          from './pages/Login'
import Register       from './pages/Register'
import PatientPortal  from './pages/PatientPortal'
import DoctorDashboard from './pages/DoctorDashboard'

// Components
import ProtectedRoute from './components/ProtectedRoute'

// ================================================================
// PublicRoute — Redirect logged-in users away from auth pages
// ================================================================
// If a user is already logged in and tries to visit /login or /register,
// redirect them to their dashboard instead of showing the login form.
//
// Without this: logged-in users can navigate to /login which is confusing
// With this: they're automatically sent to their correct dashboard
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()

  // Still checking session — show nothing (brief flicker if we show login)
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  // Already logged in → redirect to their dashboard
  if (user) {
    const dashboards = {
      patient: '/patient/portal',
      doctor:  '/doctor/dashboard',
      admin:   '/admin/dashboard',
    }
    return <Navigate to={dashboards[user.role] || '/'} replace />
  }

  // Not logged in → show the login/register page
  return children
}

// ================================================================
// App — Root component
// ================================================================
const App = () => {
  return (
    // AuthProvider MUST wrap BrowserRouter so that ProtectedRoute
    // and PublicRoute can access auth state via useAuth()
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Root redirect ── */}
          {/* Visiting / redirects to /login */}
          {/* ProtectedRoute or PublicRoute then handles login → dashboard */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ── Public routes ── */}
          {/* Redirect to dashboard if already logged in */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* ── Protected: Patient only ── */}
          {/* allowedRole="patient" means only patients can access */}
          {/* Doctors get redirected to /doctor/dashboard */}
          {/* Unauthenticated users get redirected to /login */}
          <Route
            path="/patient/portal"
            element={
              <ProtectedRoute allowedRole="patient">
                <PatientPortal />
              </ProtectedRoute>
            }
          />

          {/* ── Protected: Doctor only ── */}
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRole="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          {/* ── 404 Not Found ── */}
          {/* Catches any URL not matched above */}
          <Route
            path="*"
            element={
              <div className="loading-screen" style={{ flexDirection: 'column', gap: '1rem' }}>
                <h1 style={{ fontSize: '3rem', color: '#667eea' }}>404</h1>
                <p style={{ color: '#718096' }}>Page not found</p>
                <a href="/login" style={{ color: '#667eea' }}>← Go to login</a>
              </div>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
