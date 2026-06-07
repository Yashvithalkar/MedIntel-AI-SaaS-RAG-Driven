// ==============================================================
// src/components/ProtectedRoute.jsx — Route Guard Component
// ==============================================================
//
// PURPOSE:
//   Wraps routes that require authentication (and optionally a role).
//   If user is not logged in → redirect to /login
//   If user has wrong role  → redirect to their correct dashboard
//   If user is valid         → render the wrapped component
//
// THREE STATES TO HANDLE:
//   1. loading = true   → Still checking if user is logged in (checkAuth running)
//                         Show a spinner — don't redirect yet
//                         (If we redirect while loading, logged-in users
//                          get kicked to /login on page refresh)
//
//   2. user = null      → Not logged in
//                         Redirect to /login
//
//   3. user exists      → Logged in
//      a. No role required → render children
//      b. Role required + matches → render children
//      c. Role required + mismatch → redirect to correct dashboard
//
// USAGE IN App.jsx:
//
//   // Just needs to be logged in (any role):
//   <Route path="/dashboard" element={
//     <ProtectedRoute>
//       <SomePage />
//     </ProtectedRoute>
//   } />
//
//   // Must be logged in AND be a patient:
//   <Route path="/patient/portal" element={
//     <ProtectedRoute allowedRole="patient">
//       <PatientPortal />
//     </ProtectedRoute>
//   } />
//
//   // Must be logged in AND be a doctor:
//   <Route path="/doctor/dashboard" element={
//     <ProtectedRoute allowedRole="doctor">
//       <DoctorDashboard />
//     </ProtectedRoute>
//   } />
// ==============================================================

import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Helper: map role to their correct dashboard path
// Used when a user tries to access the wrong role's page
const getRoleDashboard = (role) => {
  const dashboards = {
    patient: '/patient/portal',
    doctor:  '/doctor/dashboard',
    admin:   '/admin/dashboard',
  }
  return dashboards[role] || '/login'
}

// ==============================================================
// ProtectedRoute Component
//
// Props:
//   children    — the component to render if access is granted
//   allowedRole — (optional) required role string: 'patient'|'doctor'|'admin'
//                 If omitted, any logged-in user can access
// ==============================================================
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth()

  // ─────────────────────────────────────────────────────────
  // STATE 1: Still loading (checking session)
  // ─────────────────────────────────────────────────────────
  // checkAuth() in AuthContext is running — we don't know if
  // user is logged in yet. Show a spinner.
  //
  // CRITICAL: Don't redirect here. If user IS logged in,
  // their httpOnly cookie is being validated server-side.
  // Redirecting to /login while loading = wrong-fully kicking
  // logged-in users on every page refresh.
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" aria-label="Checking session..." />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────
  // STATE 2: Not logged in
  // ─────────────────────────────────────────────────────────
  // user is null — either first visit, or session expired.
  // Redirect to /login.
  //
  // replace: true replaces the current history entry.
  // So after login, pressing "back" doesn't return to the
  // protected page (which would immediately redirect again).
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // ─────────────────────────────────────────────────────────
  // STATE 3a: Logged in, no specific role required
  // ─────────────────────────────────────────────────────────
  if (!allowedRole) {
    return children
  }

  // ─────────────────────────────────────────────────────────
  // STATE 3b: Logged in, correct role
  // ─────────────────────────────────────────────────────────
  if (user.role === allowedRole) {
    return children
  }

  // ─────────────────────────────────────────────────────────
  // STATE 3c: Logged in, WRONG role
  // ─────────────────────────────────────────────────────────
  // e.g. Doctor tries to go to /patient/portal
  // Don't show a "403 page" — just silently redirect them
  // to their own correct dashboard. Better UX.
  //
  // Example: doctor tries /patient/portal
  //   user.role = 'doctor'
  //   allowedRole = 'patient'
  //   → redirect to /doctor/dashboard
  console.warn(
    `Role mismatch: user is '${user.role}', route requires '${allowedRole}'. ` +
    `Redirecting to ${getRoleDashboard(user.role)}`
  )
  return <Navigate to={getRoleDashboard(user.role)} replace />
}

export default ProtectedRoute 
