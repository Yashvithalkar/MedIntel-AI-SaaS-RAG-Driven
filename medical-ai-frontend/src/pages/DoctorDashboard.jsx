// ==============================================================
// src/pages/DoctorDashboard.jsx — Doctor Dashboard (Bootstrap 5.3)
// ==============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as doctorApi from '../services/doctorApi';

// Badge styling per diagnosis status
const STATUS_BADGE = {
  pending:  { bg: 'bg-warning-subtle text-warning-emphasis border-warning', label: 'PENDING' },
  reviewed: { bg: 'bg-success-subtle text-success-emphasis border-success', label: 'REVIEWED' },
  flagged:  { bg: 'bg-danger-subtle text-danger-emphasis border-danger', label: '⚠️ FLAGGED' },
};

// ==============================================================
/* API response helpers + debugging
   Supports endpoints returning either raw arrays/objects or
   wrapped responses such as { data: ... } / { success, data }.
*/
// ==============================================================
const debugLog = (label, payload) => {
  console.groupCollapsed(`[DoctorDashboard] ${label}`);
  console.log('Payload:', payload);
  console.log('Type:', Array.isArray(payload) ? 'array' : typeof payload);
  console.groupEnd();
};

const debugError = (label, error) => {
  console.group(`[DoctorDashboard] ERROR: ${label}`);
  console.error('Message:', error?.message);
  console.error('HTTP status:', error?.response?.status);
  console.error('Response body:', error?.response?.data);
  console.error('Full error:', error);
  console.groupEnd();
};

const unwrapPayload = (payload) => {
  // doctorApi methods may return axios response, response.data,
  // or already-unwrapped backend JSON.
  let value = payload?.data ?? payload;
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.data !== undefined &&
    value.patients === undefined &&
    value.diagnoses === undefined &&
    value.patient === undefined
  ) {
    value = value.data;
  }
  return value;
};

const normalizePatientsResponse = (payload) => {
  const value = unwrapPayload(payload);
  const list = Array.isArray(value)
    ? value
    : Array.isArray(value?.patients)
      ? value.patients
      : Array.isArray(value?.data?.patients)
        ? value.data.patients
        : [];

  const patients = list.map((patient) => ({
    ...patient,
    // Current DoctorModel.get_all_patients does not return these
    // two counts, so use 0 rather than rendering undefined.
    diagnosis_count: Number(patient?.diagnosis_count ?? 0),
    pending_count: Number(patient?.pending_count ?? 0),
    needs_review: Boolean(patient?.needs_review),
  }));

  return {
    patients,
    total: Number(value?.total ?? patients.length),
    needs_review_count: Number(
      value?.needs_review_count ??
      patients.filter((patient) => patient.needs_review).length
    ),
  };
};

const normalizePendingResponse = (payload) => {
  const value = unwrapPayload(payload);
  const list = Array.isArray(value)
    ? value
    : Array.isArray(value?.diagnoses)
      ? value.diagnoses
      : Array.isArray(value?.data?.diagnoses)
        ? value.data.diagnoses
        : [];

  const diagnoses = list.map((diagnosis) => ({
    ...diagnosis,
    is_urgent: Boolean(diagnosis?.is_urgent ?? diagnosis?.status === 'flagged'),
  }));

  return {
    diagnoses,
    total: Number(value?.total ?? diagnoses.length),
    urgent_count: Number(
      value?.urgent_count ??
      diagnoses.filter((diagnosis) => diagnosis.is_urgent).length
    ),
  };
};

const normalizePatientDetail = (payload) => {
  const value = unwrapPayload(payload);
  const patient = value?.patient ?? {};
  const diagnoses = Array.isArray(value?.diagnoses) ? value.diagnoses : [];
  const rawStats = value?.stats ?? {};

  // DoctorModel.get_patient_records returns medical fields on
  // `patient`; the dashboard UI reads them from `medicalRecord`.
  const medicalRecord = value?.medicalRecord ?? {
    date_of_birth: patient.date_of_birth ?? null,
    blood_group: patient.blood_group ?? null,
    gender: patient.gender ?? null,
    allergies: patient.allergies ?? null,
    chronic_conditions: patient.chronic_conditions ?? null,
    current_medications: patient.current_medications ?? null,
    emergency_contact_name: patient.emergency_contact_name ?? null,
    emergency_contact_phone: patient.emergency_contact_phone ?? null,
  };

  return {
    ...value,
    patient,
    medicalRecord,
    diagnoses,
    stats: {
      total_diagnoses: Number(rawStats.total_diagnoses ?? diagnoses.length),
      pending_count: Number(
        rawStats.pending_count ??
        diagnoses.filter((diagnosis) => diagnosis.status === 'pending').length
      ),
      reviewed_count: Number(
        rawStats.reviewed_count ??
        diagnoses.filter((diagnosis) => diagnosis.status === 'reviewed').length
      ),
      flagged_count: Number(
        rawStats.flagged_count ??
        diagnoses.filter((diagnosis) => diagnosis.status === 'flagged').length
      ),
    },
  };
};

export default function DoctorDashboard() {
  const { user, logout } = useAuth();

  // Active tab: 'patients' | 'pending' | 'detail' | 'knowledge'
  const [activeTab, setActiveTab] = useState('patients');

  // ── Patient list state ─────────────────────────────────────
  const [patients, setPatients]                 = useState([]);
  const [patientsTotal, setPatientsTotal]       = useState(0);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [patientsLoading, setPatientsLoading]   = useState(true);

  // ── Pending diagnoses state ─────────────────────────────────
  const [pending, setPending]               = useState([]);
  const [pendingTotal, setPendingTotal]     = useState(0);
  const [urgentCount, setUrgentCount]       = useState(0);
  const [pendingLoading, setPendingLoading] = useState(true);

  // ── Patient detail state ────────────────────────────────────
  const [selectedPatient, setSelectedPatient] = useState(null); // { id, name }
  const [patientDetail, setPatientDetail]     = useState(null); // full detail object
  const [detailLoading, setDetailLoading]     = useState(false);

  // ── Review form state ───────────────────────────────────────
  const [reviewingDiag, setReviewingDiag]         = useState(null); // diagnosis being reviewed
  const [reviewNotes, setReviewNotes]             = useState('');
  const [reviewStatus, setReviewStatus]           = useState('reviewed');
  const [reviewSubmitting, setReviewSubmitting]   = useState(false);
  const [reviewError, setReviewError]             = useState('');
  const [reviewSuccess, setReviewSuccess]         = useState('');
  const [reviewNoteError, setReviewNoteError]     = useState(''); // per-field error

  // ── Knowledge Ingestion state ───────────────────────────────
  const [knowledgeFiles, setKnowledgeFiles]       = useState(null);
  const [knowledgeUploading, setKnowledgeUploading] = useState(false);
  const [knowledgeMsg, setKnowledgeMsg]           = useState('');
  const [knowledgeError, setKnowledgeError]       = useState('');
  const [knowledgeDetails, setKnowledgeDetails]   = useState(null);

  // ==============================================================
  // Load data on mount
  // ==============================================================
  useEffect(() => {
    const loadPatients = async () => {
      console.info('[DoctorDashboard] Loading patients...');
      try {
        const raw = await doctorApi.getPatients();
        debugLog('getPatients raw response', raw);
        const data = normalizePatientsResponse(raw);
        debugLog('getPatients normalized response', data);
        setPatients(data.patients);
        setPatientsTotal(data.total);
        setNeedsReviewCount(data.needs_review_count);
      } catch (err) {
        debugError('Loading patients failed', err);
      } finally {
        setPatientsLoading(false);
      }
    };

    const loadPending = async () => {
      console.info('[DoctorDashboard] Loading pending diagnoses...');
      try {
        const raw = await doctorApi.getPendingDiagnoses();
        debugLog('getPendingDiagnoses raw response', raw);
        const data = normalizePendingResponse(raw);
        debugLog('getPendingDiagnoses normalized response', data);
        setPending(data.diagnoses);
        setPendingTotal(data.total);
        setUrgentCount(data.urgent_count);
      } catch (err) {
        debugError('Loading pending diagnoses failed', err);
      } finally {
        setPendingLoading(false);
      }
    };

    loadPatients();
    loadPending();
  }, []);

  // ==============================================================
  // Fetch patient detail on demand
  // ==============================================================
  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setActiveTab('detail');
    setDetailLoading(true);
    setPatientDetail(null);

    console.info('[DoctorDashboard] Loading patient records:', {
      patientId: patient?.id,
      patientName: patient?.name,
    });
    try {
      const raw = await doctorApi.getPatientRecords(patient.id);
      debugLog('getPatientRecords raw response', raw);
      const data = normalizePatientDetail(raw);
      debugLog('getPatientRecords normalized response', data);
      setPatientDetail(data);
    } catch (err) {
      debugError('Loading patient records failed', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ==============================================================
  // Start a review (open inline form)
  // ==============================================================
  const handleStartReview = (diagnosis) => {
    setReviewingDiag(diagnosis);
    setReviewNotes('');
    setReviewStatus('reviewed');
    setReviewError('');
    setReviewNoteError('');
    setReviewSuccess('');
    setActiveTab('pending');
  };

  // ==============================================================
  // Submit review
  // ==============================================================
  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    if (reviewNotes.trim().length < 10) {
      setReviewNoteError('Notes must be at least 10 characters — please provide a meaningful review');
      return;
    }

    setReviewSubmitting(true);
    setReviewError('');
    setReviewNoteError('');
    setReviewSuccess('');

    console.info('[DoctorDashboard] Submitting diagnosis review:', {
      diagnosisId: reviewingDiag?.id,
      status: reviewStatus,
      notesLength: reviewNotes.trim().length,
    });
    try {
      const reviewResult = await doctorApi.reviewDiagnosis(reviewingDiag.id, {
        doctor_notes: reviewNotes,
        status:       reviewStatus,
      });
      debugLog('reviewDiagnosis response', reviewResult);

      const actionLabel = reviewStatus === 'flagged'
        ? '⚠️ Diagnosis flagged as urgent'
        : '✅ Diagnosis reviewed successfully';

      setReviewSuccess(`${actionLabel} — removed from pending queue.`);
      setReviewingDiag(null);

      // Refetch pending list
      const freshRaw = await doctorApi.getPendingDiagnoses();
      debugLog('getPendingDiagnoses after review raw response', freshRaw);
      const fresh = normalizePendingResponse(freshRaw);
      setPending(fresh.diagnoses);
      setPendingTotal(fresh.total);
      setUrgentCount(fresh.urgent_count);

      // Refresh patients list
      const freshPatientsRaw = await doctorApi.getPatients();
      debugLog('getPatients after review raw response', freshPatientsRaw);
      const freshPatients = normalizePatientsResponse(freshPatientsRaw);
      setPatients(freshPatients.patients);
      setPatientsTotal(freshPatients.total);
      setNeedsReviewCount(freshPatients.needs_review_count);

    } catch (err) {
      debugError('Submitting diagnosis review failed', err);
      if (err.response?.status === 422) {
        const serverErrors = err.response.data.errors || [];
        const noteError = serverErrors.find(e => e.field === 'doctor_notes');
        if (noteError) setReviewNoteError(noteError.message);
        else setReviewError('Validation failed. Please check your input.');
      } else if (err.response?.status === 400) {
        setReviewError(err.response.data.message);
      } else {
        setReviewError(err.response?.data?.message || 'Failed to submit review. Please try again.');
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ==============================================================
  // Handle Knowledge Base PDF Ingestion
  // ==============================================================
  const handleKnowledgeUpload = async (e) => {
    e.preventDefault();
    if (!knowledgeFiles || knowledgeFiles.length === 0) {
      setKnowledgeError('Please select at least one PDF file to upload.');
      return;
    }

    try {
      setKnowledgeUploading(true);
      setKnowledgeError('');
      setKnowledgeMsg('');
      setKnowledgeDetails(null);

      console.info('[DoctorDashboard] Uploading knowledge PDFs:', {
        count: knowledgeFiles.length,
        files: Array.from(knowledgeFiles).map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      });
      const res = await doctorApi.ingestMedicalPdf(knowledgeFiles);
      debugLog('ingestMedicalPdf response', res);

      setKnowledgeMsg(res.message || 'Documents successfully ingested into vector store!');
      setKnowledgeDetails(res.details);
      setKnowledgeFiles(null);

      const fileInput = document.getElementById('pdfKnowledgeInput');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      debugError('Knowledge PDF upload failed', err);
      setKnowledgeError(err.response?.data?.message || err.message || 'Failed to ingest PDF documents.');
    } finally {
      setKnowledgeUploading(false);
    }
  };

  if (patientsLoading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted mt-3 fw-medium">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">

      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-white bg-white border-bottom shadow-sm">
        <div className="container">
          <span className="navbar-brand fw-bold text-primary fs-5 d-flex align-items-center gap-2">
            🏥 MediAI Care
          </span>
          <div className="d-flex align-items-center gap-3">
            <span className="text-secondary small d-none d-sm-inline">
              Dr. <strong className="text-dark">{user?.name}</strong>
            </span>
            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-2 small fw-semibold">
              Doctor
            </span>
            <button className="btn btn-outline-danger btn-sm rounded-3 px-3" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container py-4 flex-grow-1" style={{ maxWidth: '1020px' }}>

        {/* Stats Row */}
        <div className="row g-3 mb-4">
          <StatCard label="Total Patients"   value={patientsTotal}     color="border-primary text-primary" />
          <StatCard label="Need Review"    value={needsReviewCount} color="border-warning text-warning-emphasis" />
          <StatCard label="Pending Queue"  value={pendingTotal}     color="border-danger text-danger" />
          <StatCard label="Urgent (>24h)"  value={urgentCount}      color="border-danger text-danger fw-bold" />
        </div>

        {/* Navigation Tabs */}
        <ul className="nav nav-tabs mb-4 border-bottom">
          <li className="nav-item">
            <button
              className={`nav-link fw-semibold px-4 py-3 ${activeTab === 'patients' ? 'active' : 'text-secondary'}`}
              onClick={() => setActiveTab('patients')}
            >
              👥 Patients <span className="badge bg-secondary rounded-pill ms-1">{patientsTotal}</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link fw-semibold px-4 py-3 d-flex align-items-center gap-2 ${activeTab === 'pending' ? 'active' : 'text-secondary'}`}
              onClick={() => setActiveTab('pending')}
            >
              ⏳ Pending
              {pendingTotal > 0 && (
                <span className={`badge rounded-pill ${urgentCount > 0 ? 'bg-danger' : 'bg-primary'}`}>
                  {pendingTotal}
                </span>
              )}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link fw-semibold px-4 py-3 ${activeTab === 'knowledge' ? 'active' : 'text-secondary'}`}
              onClick={() => setActiveTab('knowledge')}
            >
              📚 Knowledge Base
            </button>
          </li>
          {selectedPatient && (
            <li className="nav-item">
              <button
                className={`nav-link fw-semibold px-4 py-3 ${activeTab === 'detail' ? 'active' : 'text-secondary'}`}
                onClick={() => setActiveTab('detail')}
              >
                🔍 {selectedPatient.name.split(' ')[0]}
              </button>
            </li>
          )}
        </ul>

        {/* ═══════════════════ PATIENTS TAB ═══════════════════ */}
        {activeTab === 'patients' && (
          <div>
            <h5 className="fw-bold text-dark mb-3">All Registered Patients</h5>

            {patients.length === 0 ? (
              <div className="card border-0 shadow-sm rounded-4 text-center py-5">
                <p className="text-muted mb-0">No patients registered yet.</p>
              </div>
            ) : (
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-secondary small text-uppercase">
                      <tr>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3">Email</th>
                        <th className="py-3">Blood Group</th>
                        <th className="py-3 text-center">Diagnoses</th>
                        <th className="py-3 text-center">Pending</th>
                        <th className="py-3">Status</th>
                        <th className="py-3 text-end px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map(p => (
                        <tr key={p.id} className={p.needs_review ? 'table-warning' : ''}>
                          <td className="px-4 fw-semibold text-dark">{p.name}</td>
                          <td className="text-secondary small">{p.email}</td>
                          <td>
                            {p.blood_group ? (
                              <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-2 py-1">
                                {p.blood_group}
                              </span>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                          <td className="text-center fw-medium">{p.diagnosis_count ?? 0}</td>
                          <td className="text-center">
                            {(p.pending_count ?? 0) > 0 ? (
                              <strong className="text-warning-emphasis">{p.pending_count ?? 0}</strong>
                            ) : (
                              <span className="text-muted small">0</span>
                            )}
                          </td>
                          <td>
                            {p.needs_review ? (
                              <span className="badge bg-warning text-dark fw-bold rounded-pill">
                                REVIEW NEEDED
                              </span>
                            ) : (
                              <span className="text-muted small">Up to date</span>
                            )}
                          </td>
                          <td className="text-end px-4">
                            <button
                              onClick={() => handleSelectPatient(p)}
                              className="btn btn-sm btn-outline-primary rounded-3 px-3 fw-semibold"
                            >
                              View Records →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ PENDING TAB ═══════════════════ */}
        {activeTab === 'pending' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0">Pending Reviews</h5>
              <button
                className="btn btn-outline-secondary btn-sm rounded-3 px-3"
                onClick={async () => {
                  setPendingLoading(true);
                  const data = await doctorApi.getPendingDiagnoses().catch(() => ({ diagnoses: [], total: 0, urgent_count: 0 }));
                  setPending(data.diagnoses || []);
                  setPendingTotal(data.total || 0);
                  setUrgentCount(data.urgent_count || 0);
                  setPendingLoading(false);
                }}
              >
                ↻ Refresh
              </button>
            </div>

            {/* Success banner */}
            {reviewSuccess && (
              <div className="alert alert-success border-0 shadow-sm rounded-3 d-flex align-items-center gap-2 mb-4">
                <span>{reviewSuccess}</span>
              </div>
            )}

            {/* Inline Review Form */}
            {reviewingDiag && (
              <div className="card border-warning shadow-sm rounded-4 p-4 mb-4 bg-warning-subtle bg-opacity-10">
                <h6 className="fw-bold text-dark mb-2">
                  Reviewing diagnosis for <span className="text-primary">{reviewingDiag.patient_name}</span>
                </h6>

                {/* Patient Symptoms */}
                <div className="p-3 bg-white rounded-3 border mb-3 small text-secondary">
                  <strong className="text-dark">Patient symptoms:</strong> {reviewingDiag.symptoms_input}
                </div>

                {/* AI Report preview */}
                {reviewingDiag.ai_report && (
                  <div className="p-3 bg-light rounded-3 border mb-3 small">
                    <strong className="text-dark">AI Report:</strong>
                    <pre className="mb-0 mt-1 text-secondary" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                      {typeof reviewingDiag.ai_report === 'string' ? reviewingDiag.ai_report : JSON.stringify(reviewingDiag.ai_report, null, 2)}
                    </pre>
                  </div>
                )}

                <form onSubmit={handleReviewSubmit}>
                  {/* Notes textarea */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-secondary small">
                      CLINICAL NOTES <span className="text-danger">*</span> (minimum 10 characters)
                    </label>
                    <textarea
                      className={`form-control rounded-3 p-3 ${reviewNoteError ? 'is-invalid' : ''}`}
                      rows={4}
                      value={reviewNotes}
                      onChange={e => { setReviewNotes(e.target.value); setReviewNoteError(''); }}
                      placeholder="Enter clinical assessment, diagnosis findings, recommended treatment, and follow-up actions..."
                      disabled={reviewSubmitting}
                    />
                    <div className="d-flex justify-content-between mt-1 small">
                      <span className={reviewNoteError ? 'text-danger' : 'text-muted'}>
                        {reviewNoteError || `${reviewNotes.length} characters`}
                      </span>
                      <span className="text-muted">max 5000</span>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-secondary small">REVIEW STATUS</label>
                    <select
                      className="form-select rounded-3"
                      value={reviewStatus}
                      onChange={e => setReviewStatus(e.target.value)}
                      disabled={reviewSubmitting}
                    >
                      <option value="reviewed">✅ Reviewed — normal assessment</option>
                      <option value="flagged">⚠️ Flagged — urgent attention needed</option>
                    </select>
                  </div>

                  {reviewError && (
                    <div className="alert alert-danger border-0 shadow-sm rounded-3 mb-3">
                      ⚠️ {reviewError}
                    </div>
                  )}

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary rounded-3 fw-bold px-4"
                      disabled={reviewSubmitting || reviewNotes.trim().length < 10}
                    >
                      {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-3 px-4"
                      disabled={reviewSubmitting}
                      onClick={() => { setReviewingDiag(null); setReviewError(''); setReviewNoteError(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Pending List Loading */}
            {pendingLoading && (
              <div className="d-flex align-items-center gap-2 text-muted py-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span>Loading pending diagnoses...</span>
              </div>
            )}

            {!pendingLoading && pending.length === 0 && (
              <div className="card border-0 shadow-sm rounded-4 text-center py-5">
                <div className="fs-1 mb-2">🎉</div>
                <h6 className="fw-bold text-dark mb-1">All caught up!</h6>
                <p className="text-secondary small mb-0">No pending diagnoses to review</p>
              </div>
            )}

            {/* Diagnosis Queue Cards */}
            {pending.map(diag => (
              <div
                key={diag.id}
                className={`card border-0 shadow-sm rounded-4 p-4 mb-3 border-start border-4 ${diag.is_urgent ? 'border-danger' : 'border-light-subtle'}`}
              >
                <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h6 className="fw-bold text-dark mb-0">{diag.patient_name}</h6>
                    <span className="text-secondary small">{diag.patient_email}</span>
                    {diag.blood_group && (
                      <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-2">
                        {diag.blood_group}
                      </span>
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {diag.is_urgent && (
                      <span className="badge bg-danger text-white rounded-pill px-2 py-1 small fw-bold">
                        URGENT
                      </span>
                    )}
                    <span className="text-muted small">⏱ {diag.waiting_label}</span>
                  </div>
                </div>

                <p className="text-dark small mb-2">
                  <strong>Symptoms:</strong> {diag.symptoms_input}
                </p>

                {diag.chronic_conditions && (
                  <p className="text-muted small mb-3">
                    <strong>Chronic conditions:</strong> {diag.chronic_conditions}
                  </p>
                )}

                <div>
                  <button
                    onClick={() => handleStartReview(diag)}
                    disabled={!!reviewingDiag}
                    className="btn btn-primary btn-sm rounded-3 px-3 fw-semibold"
                  >
                    {reviewingDiag?.id === diag.id ? 'Reviewing...' : 'Review this diagnosis →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════ KNOWLEDGE BASE TAB ═══════════════════ */}
        {activeTab === 'knowledge' && (
          <div className="card border-0 shadow-sm rounded-4 p-4">
            <h4 className="fw-bold text-dark mb-1">📚 RAG Knowledge Base Management</h4>
            <p className="text-secondary small mb-4">
              Upload medical guidelines, drug manuals, or clinical reference PDFs (max 5 files). The system will extract text, chunk, embed via Gemini, and sync them to Pinecone.
            </p>

            <form onSubmit={handleKnowledgeUpload}>
              <div className="mb-3">
                <label htmlFor="pdfKnowledgeInput" className="form-label text-secondary fw-semibold small">
                  SELECT MEDICAL PDF GUIDELINES
                </label>
                <input
                  id="pdfKnowledgeInput"
                  type="file"
                  className="form-control rounded-3"
                  accept=".pdf"
                  multiple
                  onChange={(e) => {
                    setKnowledgeFiles(e.target.files);
                    setKnowledgeMsg('');
                    setKnowledgeError('');
                    setKnowledgeDetails(null);
                  }}
                  disabled={knowledgeUploading}
                />
                <div className="form-text small">Only `.pdf` files are supported.</div>
              </div>

              {knowledgeError && (
                <div className="alert alert-danger border-0 rounded-3 small py-2 mb-3" role="alert">
                  ⚠️ {knowledgeError}
                </div>
              )}

              {knowledgeMsg && (
                <div className="alert alert-success border-0 rounded-3 small py-2 mb-3" role="alert">
                  ✅ {knowledgeMsg}
                </div>
              )}

              {knowledgeDetails && (
                <div className="bg-light p-3 rounded-3 small mb-3 border">
                  <strong>Ingestion Summary:</strong>
                  <ul className="mb-0 ps-3 mt-1">
                    <li>Files Processed: {knowledgeDetails.filesProcessed?.join(', ')}</li>
                    <li>Total Chunks Generated: {knowledgeDetails.totalChunksGenerated}</li>
                    <li>Vectors Upserted to Pinecone: {knowledgeDetails.totalUpserted}</li>
                    <li>Index Target: {knowledgeDetails.indexName}</li>
                  </ul>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary rounded-3 fw-bold px-4"
                disabled={knowledgeUploading || !knowledgeFiles || knowledgeFiles.length === 0}
              >
                {knowledgeUploading ? (
                  <div className="d-flex align-items-center gap-2">
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Processing & Embedding PDFs...</span>
                  </div>
                ) : (
                  '🚀 Ingest PDFs to Knowledge Base'
                )}
              </button>
            </form>
          </div>
        )}

        {/* ═══════════════════ PATIENT DETAIL TAB ═══════════════════ */}
        {activeTab === 'detail' && (
          <div>
            <button
              onClick={() => setActiveTab('patients')}
              className="btn btn-outline-secondary btn-sm rounded-3 px-3 mb-3"
            >
              ← Back to patients
            </button>

            {detailLoading && (
              <div className="d-flex align-items-center gap-2 text-muted py-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span>Loading patient records...</span>
              </div>
            )}

            {patientDetail && (
              <div>
                {/* Identity + Stats Header */}
                <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                  <h4 className="fw-bold text-dark mb-1">{patientDetail.patient?.name || selectedPatient?.name || 'Patient'}</h4>
                  <p className="text-secondary small mb-3">{patientDetail.patient?.email || 'No email available'}</p>

                  <div className="row g-2">
                    {[
                      ['Total',    (patientDetail.stats?.total_diagnoses ?? 0), false],
                      ['Pending',  patientDetail.stats?.pending_count ?? 0,   patientDetail.stats?.pending_count ?? 0 > 0],
                      ['Reviewed', (patientDetail.stats?.reviewed_count ?? 0), false],
                      ['Flagged',  patientDetail.stats?.flagged_count ?? 0,   patientDetail.stats?.flagged_count ?? 0 > 0],
                    ].map(([label, val, warn]) => (
                      <div key={label} className="col-6 col-md-3">
                        <div className={`p-3 text-center rounded-3 ${warn ? 'bg-danger-subtle text-danger' : 'bg-light text-dark'}`}>
                          <div className="fs-3 fw-bold">{val}</div>
                          <div className="small text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>{label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medical Profile Section */}
                <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                  <h5 className="fw-bold text-dark mb-3">Medical Profile</h5>
                  <div className="row g-3">
                    <InfoField label="Date of Birth" value={patientDetail.medicalRecord?.date_of_birth} />
                    <InfoField label="Blood Group" value={patientDetail.medicalRecord?.blood_group} highlight />
                    <InfoField label="Gender" value={patientDetail.medicalRecord?.gender} />
                    <InfoField label="Allergies" value={patientDetail.medicalRecord?.allergies} />
                    <InfoField label="Chronic Conditions" value={patientDetail.medicalRecord?.chronic_conditions} />
                    <InfoField label="Current Medications" value={patientDetail.medicalRecord?.current_medications} />
                  </div>
                </div>

                {/* Diagnosis History Section */}
                <h5 className="fw-bold text-dark mb-3">Diagnosis History</h5>

                {(patientDetail.diagnoses || []).length === 0 ? (
                  <div className="card border-0 shadow-sm rounded-4 text-center py-4">
                    <p className="text-muted mb-0">No diagnoses submitted yet.</p>
                  </div>
                ) : (
                  (patientDetail.diagnoses || []).map(d => {
                    const st = STATUS_BADGE[d.status] || STATUS_BADGE.pending;
                    return (
                      <div key={d.id} className="card border-0 shadow-sm rounded-4 p-4 mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className={`badge border ${st.bg} rounded-pill px-3 py-2 fw-bold`}>
                            {st.label}
                          </span>
                          <span className="text-muted small">
                            {new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <p className="text-dark small mb-2">
                          <strong>Symptoms:</strong> {d.symptoms_input}
                        </p>

                        {d.doctor_notes && (
                          <div className="bg-success-subtle border border-success-subtle rounded-3 p-3 mt-2">
                            <div className="fw-bold text-success small mb-1">
                              🩺 Reviewed by {d.reviewer_name || 'a doctor'}
                            </div>
                            <div className="text-dark small">{d.doctor_notes}</div>
                          </div>
                        )}

                        {d.status === 'pending' && (
                          <div className="mt-3">
                            <button
                              onClick={() => handleStartReview({ ...d, patient_name: patientDetail.patient.name })}
                              disabled={!!reviewingDiag}
                              className="btn btn-primary btn-sm rounded-3 px-3"
                            >
                              Review this →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// Sub-component: KPI Metric Card
function StatCard({ label, value, color }) {
  return (
    <div className="col-6 col-md-3">
      <div className={`card border-0 shadow-sm rounded-4 p-3 border-top border-4 ${color}`}>
        <div className="fs-2 fw-bold">{value}</div>
        <div className="text-secondary small fw-medium">{label}</div>
      </div>
    </div>
  );
}

// Sub-component: Patient Detail Field Item
function InfoField({ label, value, highlight }) {
  return (
    <div className="col-md-6 col-lg-4">
      <div className="text-uppercase text-secondary fw-semibold mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div className={`fs-6 ${highlight ? 'text-primary fw-bold' : 'text-dark'}`}>
        {value || <span className="text-muted italic small">Not filled</span>}
      </div>
    </div>
  );
}