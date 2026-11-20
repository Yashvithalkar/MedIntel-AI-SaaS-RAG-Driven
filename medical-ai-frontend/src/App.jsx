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
// ==============================================================

import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import PatientPortal from './pages/PatientPortal';
import DoctorDashboard from './pages/DoctorDashboard';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// ================================================================
// PublicRoute — Redirect logged-in users away from auth pages
// ================================================================
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Still checking session — show Bootstrap spinner centered
  if (loading) {
    return (
      <div className="min-vh-100 w-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-3 fw-semibold">Loading MediAI Care...</p>
        </div>
      </div>
    );
  }

  // Already logged in → redirect to their respective dashboard
  if (user) {
    const dashboards = {
      patient: '/patient/portal',
      doctor: '/doctor/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={dashboards[user.role] || '/'} replace />;
  }

  // Not logged in → show the public login/register page
  return children;
};

// ================================================================
// App — Root Component
// ================================================================
const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Root redirect ── */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ── Public routes ── */}
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
          <Route
            path="*"
            element={
              <div className="min-vh-100 w-100 d-flex align-items-center justify-content-center bg-light p-4">
                <div className="text-center bg-white p-5 rounded-4 shadow-lg border-0" style={{ maxWidth: '450px' }}>
                  <h1 className="display-1 fw-bold text-primary mb-0">404</h1>
                  <h4 className="fw-bold text-dark mt-2 mb-3">Page Not Found</h4>
                  <p className="text-secondary mb-4">
                    The page you are looking for doesn't exist or has been moved.
                  </p>
                  <Link to="/login" className="btn btn-primary btn-lg rounded-3 fw-semibold px-4 shadow-sm">
                    ← Back to Login
                  </Link>
                </div>
              </div>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;