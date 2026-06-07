// ==============================================================
// src/pages/PatientPortal.jsx — Patient Dashboard
// ==============================================================
// Week 1: Shows user info + confirms auth/RBAC works
// Week 2: Will add patient records, diagnosis history
// Week 3: Will add "Submit Symptoms" form with AI response
// ==============================================================

import { useAuth } from '../context/AuthContext'

const PatientPortal = () => {
  const { user, logout } = useAuth()

  return (
    <div className="dashboard">

      {/* ── Top Nav ── */}
      <nav className="dashboard-nav">
        <span className="brand">🏥 Medical AI</span>
        <div className="user-info">
          <span>Hello, <strong>{user?.name}</strong></span>
          <span className="role-badge patient">{user?.role}</span>
          <button className="btn btn-danger" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="dashboard-content">
        <h2>Patient Portal</h2>
        <p>Welcome back! Your AI diagnosis assistant is ready.</p>

        {/* User info cards */}
        <div className="card-grid">
          <div className="info-card">
            <h3>Name</h3>
            <p>{user?.name}</p>
          </div>
          <div className="info-card">
            <h3>Email</h3>
            <p>{user?.email}</p>
          </div>
          <div className="info-card">
            <h3>Role</h3>
            <p style={{ textTransform: 'capitalize' }}>{user?.role}</p>
          </div>
          <div className="info-card">
            <h3>User ID</h3>
            {/* Slice UUID to first 8 chars for display */}
            <p style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              {user?.id?.slice(0, 8)}...
            </p>
          </div>
        </div>

        {/* Auth proof box */}
        <div style={{
          marginTop: '2rem',
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #c6f6d5'
        }}>
          <h3 style={{ color: '#276749', marginBottom: '0.75rem' }}>
            ✅ Week 1 Complete — Auth + RBAC Working
          </h3>
          <ul style={{ color: '#4a5568', lineHeight: '2', paddingLeft: '1.25rem' }}>
            <li>JWT httpOnly cookie set on login ✅</li>
            <li>Cookie sent automatically with every API request ✅</li>
            <li>Page refresh — still logged in (cookie persists) ✅</li>
            <li>RBAC: Patient can access Patient Portal ✅</li>
            <li>RBAC: Patient CANNOT access Doctor Dashboard ✅</li>
            <li>Logout clears cookie → redirects to login ✅</li>
          </ul>
        </div>

        {/* Coming soon */}
        <div style={{
          marginTop: '1.25rem',
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px dashed #e2e8f0'
        }}>
          <h3 style={{ color: '#a0aec0', marginBottom: '0.5rem' }}>
            🔜 Coming Next
          </h3>
          <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
            Week 2: Patient profile CRUD, Medical history records<br/>
            Week 3: Submit symptoms → AI diagnosis powered by Gemini + RAG
          </p>
        </div>
      </div>
    </div>
  )
}

export default PatientPortal
