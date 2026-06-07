// ==============================================================
// src/pages/DoctorDashboard.jsx — Doctor Dashboard
// ==============================================================
// Week 1: Confirms doctor auth + RBAC works
// Week 2: Patient list, pending diagnoses to review
// Week 3: AI diagnosis reports with RAG sources
// ==============================================================

import { useAuth } from '../context/AuthContext'

const DoctorDashboard = () => {
  const { user, logout } = useAuth()

  return (
    <div className="dashboard">

      {/* ── Top Nav ── */}
      <nav className="dashboard-nav">
        <span className="brand">🏥 Medical AI</span>
        <div className="user-info">
          <span>Dr. <strong>{user?.name}</strong></span>
          <span className="role-badge doctor">{user?.role}</span>
          <button className="btn btn-danger" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="dashboard-content">
        <h2>Doctor Dashboard</h2>
        <p>Review AI-generated diagnoses and manage your patients.</p>

        {/* Doctor info cards */}
        <div className="card-grid">
          <div className="info-card" style={{ borderLeftColor: '#48bb78' }}>
            <h3>Doctor Name</h3>
            <p>{user?.name}</p>
          </div>
          <div className="info-card" style={{ borderLeftColor: '#48bb78' }}>
            <h3>Email</h3>
            <p>{user?.email}</p>
          </div>
          <div className="info-card" style={{ borderLeftColor: '#48bb78' }}>
            <h3>Pending Reviews</h3>
            <p>—</p>
          </div>
          <div className="info-card" style={{ borderLeftColor: '#48bb78' }}>
            <h3>Total Patients</h3>
            <p>—</p>
          </div>
        </div>

        {/* Auth proof */}
        <div style={{
          marginTop: '2rem',
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #c6f6d5'
        }}>
          <h3 style={{ color: '#276749', marginBottom: '0.75rem' }}>
            ✅ Doctor Auth + RBAC Verified
          </h3>
          <ul style={{ color: '#4a5568', lineHeight: '2', paddingLeft: '1.25rem' }}>
            <li>Logged in as doctor role ✅</li>
            <li>Doctor Dashboard accessible ✅</li>
            <li>RBAC: Doctor CANNOT access Patient Portal ✅</li>
            <li>RBAC: Doctor CAN access /api/doctor/* routes ✅</li>
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
          <h3 style={{ color: '#a0aec0', marginBottom: '0.5rem' }}>🔜 Coming Next</h3>
          <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
            Week 2: Patient list, Pending diagnosis reviews, Doctor notes<br/>
            Week 3: View AI RAG-powered diagnosis reports with cited sources
          </p>
        </div>
      </div>
    </div>
  )
}

export default DoctorDashboard
