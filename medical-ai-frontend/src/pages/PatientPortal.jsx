

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import * as patientApi from "../services/patientApi";


const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
];

const STATUS_BADGE = {
  pending: {
    bg: "bg-warning-subtle text-warning-emphasis border-warning",
    label: "PENDING",
  },

  reviewed: {
    bg: "bg-success-subtle text-success-emphasis border-success",
    label: "REVIEWED",
  },

  flagged: {
    bg: "bg-danger-subtle text-danger-emphasis border-danger",
    label: "⚠️ FLAGGED",
  },
};

export default function PatientPortal() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("profile");


  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [form, setForm] = useState({
    name: "",
    date_of_birth: "",
    blood_group: "",
    gender: "",
    allergies: "",
    chronic_conditions: "",
    current_medications: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // ============================================================
  // Diagnosis history state
  // ============================================================

  const [diagnoses, setDiagnoses] = useState([]);
  const [diagTotal, setDiagTotal] = useState(0);
  const [diagLoading, setDiagLoading] = useState(true);


  const [symptoms, setSymptoms] = useState("");
  const [medicalFile, setMedicalFile] = useState(null);

  const [symSubmitting, setSymSubmitting] = useState(false);
  const [symError, setSymError] = useState("");


  const populateForm = useCallback((data) => {
    if (!data) return;

    setForm({
      name: data.name || "",
      date_of_birth: data.date_of_birth || "",
      blood_group: data.blood_group || "",
      gender: data.gender || "",
      allergies: data.allergies || "",
      chronic_conditions: data.chronic_conditions || "",
      current_medications: data.current_medications || "",
      emergency_contact_name:
        data.emergency_contact_name || "",
      emergency_contact_phone:
        data.emergency_contact_phone || "",
    });
  }, []);


  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        setProfileError("");

        const data = await patientApi.getProfile();

        console.log("👤 Patient profile:", data);

        setProfile(data);
        populateForm(data);
      } catch (err) {
        console.error("❌ Failed to load profile:", err);

        setProfileError(
          err.response?.data?.message ||
            "Failed to load profile",
        );
      } finally {
        setProfileLoading(false);
      }
    };

    const loadDiagnoses = async () => {
      try {
        setDiagLoading(true);

        const data = await patientApi.getDiagnoses();

        console.log("🩺 Diagnosis history:", data);

        setDiagnoses(data?.diagnoses || []);
        setDiagTotal(data?.total || 0);
      } catch (err) {
        console.error(
          "❌ Failed to load diagnoses:",
          err,
        );

        setDiagnoses([]);
        setDiagTotal(0);
      } finally {
        setDiagLoading(false);
      }
    };

    loadProfile();
    loadDiagnoses();
  }, [populateForm]);


  const handleStartEdit = () => {
    populateForm(profile);

    setEditMode(true);
    setSaveSuccess("");
    setSaveError("");
    setFieldErrors({});
  };


  const handleCancelEdit = () => {
    populateForm(profile);

    setEditMode(false);
    setSaveError("");
    setFieldErrors({});
  };

  // ============================================================
  // Profile field change
  // ============================================================

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    setFieldErrors({});

    try {
      const payload = {};

      Object.entries(form).forEach(([key, value]) => {
        if (value !== "") {
          payload[key] = value;
        }
      });

      console.log("📤 Updating profile:", payload);

      const updated = await patientApi.updateProfile(payload);

      console.log("✅ Profile updated:", updated);

      setProfile(updated);
      populateForm(updated);

      setEditMode(false);
      setSaveSuccess("Profile saved successfully!");
    } catch (err) {
      console.error("❌ Profile update error:", err);

      if (err.response?.status === 422) {
        const serverErrors = {};

        err.response.data?.errors?.forEach((e) => {
          if (e.field) {
            serverErrors[e.field] = e.message;
          }
        });

        setFieldErrors(serverErrors);
        setSaveError(
          "Please fix the validation errors below.",
        );
      } else {
        setSaveError(
          err.response?.data?.message ||
            "Failed to save profile. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  };


  const handleMedicalFileChange = (e) => {
    const file = e.target.files?.[0] || null;

    setSymError("");

    if (!file) {
      setMedicalFile(null);
      return;
    }

    // Allowed file types
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMedicalFile(null);

      setSymError(
        "Invalid file type. Please upload a PDF, JPG, JPEG, or PNG file.",
      );

      e.target.value = "";
      return;
    }

    // Optional frontend size protection: 10 MB
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setMedicalFile(null);

      setSymError(
        "File is too large. Please upload a file smaller than 10 MB.",
      );

      e.target.value = "";
      return;
    }

    console.log("📎 Medical file selected:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    setMedicalFile(file);
  };


  const handleRemoveMedicalFile = () => {
    setMedicalFile(null);
  };
  const handleSymptomsSubmit = async (e) => {
    e.preventDefault();

    setSymError("");

    // ----------------------------------------------------------
    // At least symptoms OR file is required
    // ----------------------------------------------------------

    const trimmedSymptoms = symptoms.trim();

    if (trimmedSymptoms.length < 10 && !medicalFile) {
      setSymError(
        "Please describe your symptoms using at least 10 characters or upload a medical report.",
      );

      return;
    }


    if (symptoms.length > 5000) {
      setSymError(
        "Symptoms description cannot exceed 5000 characters.",
      );

      return;
    }

    try {
      setSymSubmitting(true);

      console.log("📤 Submitting medical assessment...");

      console.log("📝 Symptoms:", trimmedSymptoms);

      console.log(
        "📎 Medical file:",
        medicalFile
          ? {
              name: medicalFile.name,
              type: medicalFile.type,
              size: medicalFile.size,
            }
          : "No file",
      );


      const newDiagnosis =
        await patientApi.submitSymptoms(
          trimmedSymptoms,
          medicalFile,
        );

      console.log(
        "✅ Diagnosis response received:",
        newDiagnosis,
      );

      // --------------------------------------------------------
      // Defensive response validation
      // --------------------------------------------------------

      if (!newDiagnosis || !newDiagnosis.id) {
        console.error(
          "❌ Invalid diagnosis object received:",
          newDiagnosis,
        );

        throw new Error(
          "Diagnosis was generated, but the response format was invalid.",
        );
      }


      setDiagnoses((prev) => [
        newDiagnosis,
        ...prev,
      ]);


      setDiagTotal((prev) => prev + 1);


      setSymptoms("");
      setMedicalFile(null);

      // --------------------------------------------------------
      // Reset file input
      // --------------------------------------------------------

      const fileInput =
        document.getElementById(
          "medical-report-upload",
        );

      if (fileInput) {
        fileInput.value = "";
      }

      console.log(
        "✅ Diagnosis added to history successfully.",
      );
    } catch (err) {
      console.error(
        "❌ FULL DIAGNOSIS ERROR:",
        err,
      );

      console.error(
        "❌ Error response:",
        err.response,
      );

      console.error(
        "❌ Response data:",
        err.response?.data,
      );

      console.error(
        "❌ Status:",
        err.response?.status,
      );

      console.error(
        "❌ Message:",
        err.message,
      );

      if (err.response?.status === 422) {
        setSymError(
          err.response.data?.errors?.[0]?.message ||
            err.response.data?.message ||
            "Validation failed.",
        );
      } else {
        setSymError(
          err.response?.data?.message ||
            err.message ||
            "Failed to generate diagnostic evaluation.",
        );
      }
    } finally {
      setSymSubmitting(false);
    }
  };


  if (profileLoading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <div
          className="spinner-border text-primary"
          style={{
            width: "3rem",
            height: "3rem",
          }}
          role="status"
        >
          <span className="visually-hidden">
            Loading...
          </span>
        </div>

        <p className="text-muted mt-3 fw-medium">
          Loading your profile...
        </p>
      </div>
    );
  }

  // ============================================================
  // Main UI
  // ============================================================

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">

      {/* ========================================================
          NAVBAR
      ========================================================= */}

      <nav className="navbar navbar-expand-lg navbar-white bg-white border-bottom shadow-sm">
        <div className="container">

          <span className="navbar-brand fw-bold text-primary fs-5 d-flex align-items-center gap-2">
            🏥 MediAI Care
          </span>

          <div className="d-flex align-items-center gap-3">

            <span className="text-secondary small d-none d-sm-inline">
              Hello,{" "}
              <strong className="text-dark">
                {user?.name || profile?.name}
              </strong>
            </span>

            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2 small fw-semibold">
              Patient
            </span>

            <button
              className="btn btn-outline-danger btn-sm rounded-3 px-3"
              onClick={logout}
            >
              Logout
            </button>

          </div>
        </div>
      </nav>

      {/* ========================================================
          MAIN CONTAINER
      ========================================================= */}

      <div
        className="container py-4 flex-grow-1"
        style={{ maxWidth: "960px" }}
      >

        {/* ======================================================
            TABS
        ======================================================= */}

        <ul className="nav nav-tabs mb-4 border-bottom">

          <li className="nav-item">
            <button
              className={`nav-link fw-semibold px-4 py-3 ${
                activeTab === "profile"
                  ? "active"
                  : "text-secondary"
              }`}
              onClick={() =>
                setActiveTab("profile")
              }
            >
              👤 My Profile
            </button>
          </li>

          <li className="nav-item">
            <button
              className={`nav-link fw-semibold px-4 py-3 d-flex align-items-center gap-2 ${
                activeTab === "diagnoses"
                  ? "active"
                  : "text-secondary"
              }`}
              onClick={() =>
                setActiveTab("diagnoses")
              }
            >
              🩺 Diagnoses

              {diagTotal > 0 && (
                <span className="badge bg-primary rounded-pill small">
                  {diagTotal}
                </span>
              )}
            </button>
          </li>

        </ul>

        {/* ======================================================
            PROFILE TAB
        ======================================================= */}

        {activeTab === "profile" && (
          <div>

            {/* Profile incomplete banner */}

            {!profile?.profile_complete && (
              <div
                className="alert alert-info border-0 shadow-sm rounded-3 d-flex align-items-center gap-2 mb-4"
                role="alert"
              >
                <span>
                  ℹ️ Complete your medical profile — it
                  helps doctors give more accurate
                  diagnoses.
                </span>
              </div>
            )}

            {/* Save success */}

            {saveSuccess && (
              <div
                className="alert alert-success border-0 shadow-sm rounded-3 d-flex align-items-center gap-2 mb-4"
                role="alert"
              >
                <span>✅ {saveSuccess}</span>
              </div>
            )}

            {/* Save error */}

            {saveError && (
              <div
                className="alert alert-danger border-0 shadow-sm rounded-3 d-flex align-items-center gap-2 mb-4"
                role="alert"
              >
                <span>⚠️ {saveError}</span>
              </div>
            )}

            {/* Profile error */}

            {profileError && (
              <div
                className="alert alert-danger border-0 shadow-sm rounded-3 d-flex align-items-center gap-2 mb-4"
                role="alert"
              >
                <span>⚠️ {profileError}</span>
              </div>
            )}

            {/* Title */}

            <div className="d-flex justify-content-between align-items-center mb-3">

              <h4 className="fw-bold text-dark mb-0">
                Medical Profile
              </h4>

              {!editMode && (
                <button
                  className="btn btn-primary rounded-3 fw-semibold shadow-sm px-3"
                  onClick={handleStartEdit}
                >
                  {profile?.profile_complete
                    ? "✏️ Edit Profile"
                    : "+ Complete Profile"}
                </button>
              )}

            </div>

            {/* ==================================================
                PROFILE VIEW
            =================================================== */}

            {!editMode && (
              <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">

                <div className="row g-4">

                  <InfoItem
                    label="Full Name"
                    value={profile?.name}
                  />

                  <InfoItem
                    label="Email Address"
                    value={profile?.email}
                  />

                  <InfoItem
                    label="Date of Birth"
                    value={profile?.date_of_birth}
                  />

                  <InfoItem
                    label="Blood Group"
                    value={profile?.blood_group}
                    highlight
                  />

                  <InfoItem
                    label="Gender"
                    value={
                      profile?.gender
                        ? profile.gender
                            .charAt(0)
                            .toUpperCase() +
                          profile.gender.slice(1)
                        : ""
                    }
                  />

                  <InfoItem
                    label="Allergies"
                    value={profile?.allergies}
                    wide
                  />

                  <InfoItem
                    label="Chronic Conditions"
                    value={
                      profile?.chronic_conditions
                    }
                    wide
                  />

                  <InfoItem
                    label="Current Medications"
                    value={
                      profile?.current_medications
                    }
                    wide
                  />

                  <InfoItem
                    label="Emergency Contact Name"
                    value={
                      profile?.emergency_contact_name
                    }
                  />

                  <InfoItem
                    label="Emergency Contact Phone"
                    value={
                      profile?.emergency_contact_phone
                    }
                  />

                </div>
              </div>
            )}

            {/* ==================================================
                PROFILE EDIT
            =================================================== */}

            {editMode && (
              <form
                onSubmit={handleSave}
                className="card border-0 shadow-sm rounded-4 p-4 mb-4"
                noValidate
              >

                <div className="row g-3">

                  {/* Full Name */}

                  <div className="col-md-6">

                    <label className="form-label text-secondary fw-semibold small mb-1">
                      FULL NAME
                    </label>

                    <input
                      type="text"
                      name="name"
                      className={`form-control rounded-3 ${
                        fieldErrors.name
                          ? "is-invalid"
                          : ""
                      }`}
                      value={form.name}
                      onChange={handleFormChange}
                      disabled={saving}
                    />

                    {fieldErrors.name && (
                      <div className="invalid-feedback">
                        {fieldErrors.name}
                      </div>
                    )}

                  </div>

                  {/* Date of Birth */}

                  <div className="col-md-6">

                    <label className="form-label text-secondary fw-semibold small mb-1">
                      DATE OF BIRTH
                    </label>

                    <input
                      type="date"
                      name="date_of_birth"
                      className={`form-control rounded-3 ${
                        fieldErrors.date_of_birth
                          ? "is-invalid"
                          : ""
                      }`}
                      value={form.date_of_birth}
                      onChange={handleFormChange}
                      disabled={saving}
                    />

                    {fieldErrors.date_of_birth && (
                      <div className="invalid-feedback">
                        {fieldErrors.date_of_birth}
                      </div>
                    )}

                  </div>

                  {/* Blood Group */}

                  <div className="col-md-6">

                    <label className="form-label text-secondary fw-semibold small mb-1">
                      BLOOD GROUP
                    </label>

                    <select
                      name="blood_group"
                      className={`form-select rounded-3 ${
                        fieldErrors.blood_group
                          ? "is-invalid"
                          : ""
                      }`}
                      value={form.blood_group}
                      onChange={handleFormChange}
                      disabled={saving}
                    >

                      <option value="">
                        — Select —
                      </option>

                      {BLOOD_GROUPS.map((g) => (
                        <option
                          key={g}
                          value={g}
                        >
                          {g}
                        </option>
                      ))}

                    </select>

                    {fieldErrors.blood_group && (
                      <div className="invalid-feedback">
                        {fieldErrors.blood_group}
                      </div>
                    )}

                  </div>

                  {/* Gender */}

                  <div className="col-md-6">

                    <label className="form-label text-secondary fw-semibold small mb-1">
                      GENDER
                    </label>

                    <select
                      name="gender"
                      className="form-select rounded-3"
                      value={form.gender}
                      onChange={handleFormChange}
                      disabled={saving}
                    >

                      <option value="">
                        — Select —
                      </option>

                      {[
                        "male",
                        "female",
                        "other",
                      ].map((g) => (
                        <option
                          key={g}
                          value={g}
                        >
                          {g.charAt(0).toUpperCase() +
                            g.slice(1)}
                        </option>
                      ))}

                    </select>

                  </div>

                  {/* Allergies */}

                  <div className="col-12">

                    <label className="form-label text-secondary fw-semibold small mb-1">
                      ALLERGIES
                    </label>

                    <input
                      type="text"
                      name="allergies"
                      className="form-control rounded-3"
                      value={form.allergies}
                      onChange={handleFormChange}
                      placeholder="e.g. Penicillin, Shellfish, Peanuts"
                      disabled={saving}
                    />

                  </div>

                  {/* Chronic Conditions */}

                  <div className="col-12">

                    <label className="form-label text-secondary fw-semibold small mb-1">
                      CHRONIC CONDITIONS
                    </label>

                    <input
                      type="text"
                      name="chronic_conditions"
                      className="form-control rounded-3"
                      value={form.chronic_conditions}
                      onChange={handleFormChange}
                      placeholder="e.g. Type 2 Diabetes, Mild Asthma"
                      disabled={saving}
                    />

                  </div>

                  {/* Current Medications */}

                  <div className="col-12">

                    <label className="form-label text-secondary fw-semibold small mb-1">
                      CURRENT MEDICATIONS
                    </label>

                    <input
                      type="text"
                      name="current_medications"
                      className="form-control rounded-3"
                      value={form.current_medications}
                      onChange={handleFormChange}
                      placeholder="e.g. Metformin 500mg twice daily"
                      disabled={saving}
                    />

                  </div>

                  {/* Emergency Contact Name */}

                  <div className="col-md-6">

                    <label className="form-label text-secondary fw-semibold small mb-1">
                      EMERGENCY CONTACT NAME
                    </label>

                    <input
                      type="text"
                      name="emergency_contact_name"
                      className={`form-control rounded-3 ${
                        fieldErrors.emergency_contact_name
                          ? "is-invalid"
                          : ""
                      }`}
                      value={
                        form.emergency_contact_name
                      }
                      onChange={handleFormChange}
                      disabled={saving}
                    />

                    {fieldErrors.emergency_contact_name && (
                      <div className="invalid-feedback">
                        {
                          fieldErrors.emergency_contact_name
                        }
                      </div>
                    )}

                  </div>

                  {/* Emergency Contact Phone */}

                  <div className="col-md-6">

                    <label className="form-label text-secondary fw-semibold small mb-1">
                      EMERGENCY CONTACT PHONE
                    </label>

                    <input
                      type="text"
                      name="emergency_contact_phone"
                      className={`form-control rounded-3 ${
                        fieldErrors.emergency_contact_phone
                          ? "is-invalid"
                          : ""
                      }`}
                      value={
                        form.emergency_contact_phone
                      }
                      onChange={handleFormChange}
                      placeholder="+91-9876543210"
                      disabled={saving}
                    />

                    {fieldErrors.emergency_contact_phone && (
                      <div className="invalid-feedback">
                        {
                          fieldErrors.emergency_contact_phone
                        }
                      </div>
                    )}

                  </div>

                </div>

                {/* Form actions */}

                <div className="d-flex gap-2 mt-4 pt-2 border-top">

                  <button
                    type="submit"
                    className="btn btn-primary rounded-3 fw-bold px-4"
                    disabled={saving}
                  >
                    {saving ? (
                      <div className="d-flex align-items-center gap-2">

                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        ></span>

                        <span>Saving...</span>

                      </div>
                    ) : (
                      "Save Profile"
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-3 px-4"
                    disabled={saving}
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>

                </div>

              </form>
            )}

          </div>
        )}

        {/* ======================================================
            DIAGNOSES TAB
        ======================================================= */}

        {activeTab === "diagnoses" && (
          <div>

            {/* ==================================================
                NEW DIAGNOSIS FORM
            =================================================== */}

            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">

              <h5 className="fw-bold text-dark mb-1">
                Submit New Medical Assessment
              </h5>

              <p className="text-secondary small mb-3">
                Describe your symptoms and optionally upload
                a medical report. The system will use your
                medical profile, RAG knowledge base, and
                AI analysis to generate a structured
                clinical assessment.
              </p>

              <form
                onSubmit={handleSymptomsSubmit}
                encType="multipart/form-data"
              >

                {/* =================================================
                    Symptoms
                ================================================== */}

                <div className="mb-3">

                  <label className="form-label text-secondary fw-semibold small">
                    SYMPTOMS
                  </label>

                  <textarea
                    className="form-control rounded-3 p-3"
                    rows={5}
                    value={symptoms}
                    onChange={(e) => {
                      setSymptoms(e.target.value);
                      setSymError("");
                    }}
                    placeholder="e.g. I have had persistent headache and fever for three days, along with fatigue and mild nausea..."
                    disabled={symSubmitting}
                    maxLength={5000}
                  />

                  <div className="d-flex justify-content-between align-items-center mt-2">

                    <span
                      className={`small ${
                        symptoms.length < 10 &&
                        !medicalFile
                          ? "text-danger"
                          : "text-muted"
                      }`}
                    >
                      {symptoms.length} / 5000 characters
                    </span>

                    {symptoms.length < 10 &&
                      !medicalFile &&
                      symptoms.length > 0 && (
                        <span className="small text-danger">
                          {10 - symptoms.length} more
                          characters needed
                        </span>
                      )}

                  </div>

                </div>

                {/* =================================================
                    Medical File
                ================================================== */}

                <div className="mb-3">

                  <label
                    htmlFor="medical-report-upload"
                    className="form-label text-secondary fw-semibold small"
                  >
                    MEDICAL REPORT / SCAN
                  </label>

                  <input
                    id="medical-report-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleMedicalFileChange}
                    disabled={symSubmitting}
                    className="form-control rounded-3"
                  />

                  <div className="form-text">
                    Supported formats: PDF, JPG, JPEG, PNG.
                    Maximum size: 10 MB.
                  </div>

                  {/* Selected file */}

                  {medicalFile && (
                    <div className="alert alert-success border-0 rounded-3 mt-3 mb-0 py-2">

                      <div className="d-flex justify-content-between align-items-center">

                        <div className="small">

                          <div className="fw-semibold">
                            📎 Medical report attached
                          </div>

                          <div className="text-muted mt-1">
                            {medicalFile.name}
                          </div>

                          <div className="text-muted">
                            {(
                              medicalFile.size /
                              (1024 * 1024)
                            ).toFixed(2)}{" "}
                            MB
                          </div>

                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={
                            handleRemoveMedicalFile
                          }
                          disabled={symSubmitting}
                        >
                          Remove
                        </button>

                      </div>

                    </div>
                  )}

                </div>

                {/* =================================================
                    Error
                ================================================== */}

                {symError && (
                  <div
                    className="alert alert-danger border-0 shadow-sm rounded-3 mt-3"
                    role="alert"
                  >
                    ⚠️ {symError}
                  </div>
                )}

                {/* =================================================
                    Submit
                ================================================== */}

                <button
                  type="submit"
                  className="btn btn-primary rounded-3 fw-bold px-4 mt-2"
                  disabled={
                    symSubmitting ||
                    (symptoms.trim().length < 10 &&
                      !medicalFile) ||
                    symptoms.length > 5000
                  }
                >

                  {symSubmitting ? (
                    <div className="d-flex align-items-center gap-2">

                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      ></span>

                      <span>
                        Analyzing with Multimodal RAG...
                      </span>

                    </div>
                  ) : (
                    "🤖 Submit for AI Analysis"
                  )}

                </button>

              </form>

            </div>

            {/* ==================================================
                HISTORY TITLE
            =================================================== */}

            <div className="d-flex align-items-center gap-2 mb-3">

              <h5 className="fw-bold text-dark mb-0">
                Diagnosis History
              </h5>

              {diagTotal > 0 && (
                <span className="badge bg-primary rounded-pill">
                  {diagTotal}
                </span>
              )}

            </div>

            {/* ==================================================
                Loading
            =================================================== */}

            {diagLoading && (
              <div className="d-flex align-items-center gap-2 text-muted py-3">

                <div
                  className="spinner-border spinner-border-sm text-primary"
                  role="status"
                ></div>

                <span>
                  Loading diagnoses...
                </span>

              </div>
            )}

            {/* ==================================================
                Empty state
            =================================================== */}

            {!diagLoading &&
              diagnoses.length === 0 && (
                <div className="card border-0 shadow-sm rounded-4 text-center py-5 px-3">

                  <div className="fs-1 text-muted mb-2">
                    🩺
                  </div>

                  <h6 className="fw-bold text-dark mb-1">
                    No diagnoses yet
                  </h6>

                  <p className="text-secondary small mb-0">
                    Submit your symptoms or upload a
                    medical report above to get your
                    first AI analysis.
                  </p>

                </div>
              )}

            {/* ==================================================
                Diagnosis history
            =================================================== */}

            {!diagLoading &&
              diagnoses.map((diagnosis) => (
                <DiagnosisCard
                  key={diagnosis.id}
                  diagnosis={diagnosis}
                />
              ))}

          </div>
        )}

      </div>
    </div>
  );
}

// ==============================================================
// Diagnosis Card
// ==============================================================

function DiagnosisCard({ diagnosis: d }) {
  const [expanded, setExpanded] =
    useState(false);

  const statusBadge =
    STATUS_BADGE[d?.status] ||
    STATUS_BADGE.pending;


  let report =
    d?.report ||
    d?.ai_report ||
    null;

  // ============================================================
  // Parse JSON report if needed
  // ============================================================

  if (typeof report === "string") {
    try {
      report = JSON.parse(report);
    } catch {
      // Leave as string
    }
  }

  // ============================================================
  // Render AI report
  // ============================================================

  const renderAiReport = (reportData) => {
    if (!reportData) {
      return (
        <div className="text-muted">
          No AI report available.
        </div>
      );
    }

    // ----------------------------------------------------------
    // Plain string report
    // ----------------------------------------------------------

    if (typeof reportData === "string") {
      return <div>{reportData}</div>;
    }

    return (
      <div className="d-flex flex-column gap-4">

        {/* ======================================================
            Summary
        ======================================================= */}

        {reportData.summary && (
          <div>

            <strong>
              Case Summary
            </strong>

            <div className="mt-2 text-muted">
              {reportData.summary}
            </div>

          </div>
        )}

        {/* ======================================================
            Differential Diagnoses
        ======================================================= */}

        {Array.isArray(
          reportData.differential_diagnoses,
        ) &&
          reportData.differential_diagnoses
            .length > 0 && (
            <div>

              <strong>
                Differential Diagnoses
              </strong>

              <div className="mt-2">

                {reportData.differential_diagnoses.map(
                  (item, idx) => (
                    <div
                      key={`condition-${idx}`}
                      className="border rounded-3 p-3 mb-2 bg-white"
                    >

                      <div className="d-flex justify-content-between align-items-start gap-3">

                        <div className="fw-semibold text-dark">
                          {item?.condition ||
                            "Unknown condition"}
                        </div>

                        {item?.probability && (
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                            {item.probability}
                          </span>
                        )}

                      </div>

                      {item?.rationale && (
                        <div className="small text-muted mt-2">
                          {item.rationale}
                        </div>
                      )}

                    </div>
                  ),
                )}

              </div>
            </div>
          )}

        {/* ======================================================
            Urgency
        ======================================================= */}

        {reportData.urgency_level && (
          <div>

            <strong>
              Urgency Level:
            </strong>{" "}

            <span
              className={`badge rounded-pill ms-1 ${
                getUrgencyBadgeClass(
                  reportData.urgency_level,
                )
              }`}
            >
              {reportData.urgency_level}
            </span>

          </div>
        )}

        {/* ======================================================
            Recommended Tests
        ======================================================= */}

        {Array.isArray(
          reportData.recommended_tests,
        ) &&
          reportData.recommended_tests
            .length > 0 && (
            <div>

              <strong>
                Recommended Tests
              </strong>

              <ul className="mb-0 mt-2 ps-3">

                {reportData.recommended_tests.map(
                  (test, idx) => (
                    <li
                      key={`test-${idx}`}
                      className="mb-1"
                    >
                      {test}
                    </li>
                  ),
                )}

              </ul>

            </div>
          )}

        {/* ======================================================
            Lifestyle Guidance
        ======================================================= */}

        {Array.isArray(
          reportData.lifestyle_guidance,
        ) &&
          reportData.lifestyle_guidance
            .length > 0 && (
            <div>

              <strong>
                Lifestyle Guidance
              </strong>

              <ul className="mb-0 mt-2 ps-3">

                {reportData.lifestyle_guidance.map(
                  (item, idx) => (
                    <li
                      key={`guidance-${idx}`}
                      className="mb-1"
                    >
                      {item}
                    </li>
                  ),
                )}

              </ul>

            </div>
          )}

        {/* ======================================================
            Red Flags
        ======================================================= */}

        {Array.isArray(
          reportData.red_flags_detected,
        ) &&
          reportData.red_flags_detected
            .length > 0 && (
            <div className="alert alert-danger mb-0">

              <strong>
                ⚠️ Red Flags Detected
              </strong>

              <ul className="mb-0 mt-2 ps-3">

                {reportData.red_flags_detected.map(
                  (flag, idx) => (
                    <li
                      key={`flag-${idx}`}
                      className="mb-1"
                    >
                      {flag}
                    </li>
                  ),
                )}

              </ul>

            </div>
          )}

        {/* ======================================================
            Old possible_conditions support
        ======================================================= */}

        {Array.isArray(
          reportData.possible_conditions,
        ) &&
          reportData.possible_conditions
            .length > 0 && (
            <div>

              <strong>
                Possible Conditions
              </strong>

              <ul className="mb-0 mt-2 ps-3">

                {reportData.possible_conditions.map(
                  (item, idx) => (
                    <li
                      key={`possible-${idx}`}
                    >
                      {item}
                    </li>
                  ),
                )}

              </ul>

            </div>
          )}

        {/* ======================================================
            Old recommendation support
        ======================================================= */}

        {reportData.recommendation && (
          <div>

            <strong>
              Recommendations
            </strong>

            <div className="mt-2 text-muted">
              {reportData.recommendation}
            </div>

          </div>
        )}

        {/* ======================================================
            Disclaimer
        ======================================================= */}

        {reportData.disclaimer && (
          <div className="alert alert-secondary small mb-0">

            <strong>
              Disclaimer:
            </strong>{" "}

            {reportData.disclaimer}

          </div>
        )}

      </div>
    );
  };


  return (
    <div className="card border-0 shadow-sm rounded-4 p-4 mb-3">

      {/* ========================================================
          Header
      ========================================================= */}

      <div className="d-flex justify-content-between align-items-start mb-3">

        <span
          className={`badge border ${statusBadge.bg} rounded-pill px-3 py-2 fw-bold`}
        >
          {statusBadge.label}
        </span>

        <span className="text-muted small text-end">
          {d?.created_at
            ? new Date(
                d.created_at,
              ).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Recently"}
        </span>

      </div>

      {/* ========================================================
          Symptoms
      ========================================================= */}

      <div className="mb-3">

        <div className="small fw-bold text-secondary mb-1">
          SYMPTOMS
        </div>

        <div className="text-dark small">
          {d?.symptoms_input ||
            d?.symptoms ||
            "Not available"}
        </div>

      </div>

      {/* ========================================================
          Attached report
      ========================================================= */}

      {d?.report_file_name && (
        <div className="alert alert-info border-0 rounded-3 small">

          📎 <strong>Medical Report:</strong>{" "}
          {d.report_file_name}

        </div>
      )}

      {/* ========================================================
          AI Report
      ========================================================= */}

      {report ? (
        <div className="mb-2">

          <button
            type="button"
            onClick={() =>
              setExpanded((prev) => !prev)
            }
            className="btn btn-link btn-sm text-decoration-none p-0 fw-semibold text-primary mb-2"
          >
            {expanded
              ? "▾ Hide AI Report"
              : "▸ View AI Report"}
          </button>

          {expanded && (
            <div className="bg-light rounded-3 p-3 border small">

              {renderAiReport(report)}

            </div>
          )}

        </div>
      ) : (
        <div className="bg-warning-subtle text-warning-emphasis border border-warning rounded-3 p-3 small mb-2">
          ⏳ AI analysis pending — processing
          symptoms/report...
        </div>
      )}

      {/* ========================================================
          Doctor Notes
      ========================================================= */}

      {d?.doctor_notes && (
        <div className="bg-success-subtle border border-success rounded-3 p-3 mt-2">

          <div className="fw-bold text-success small mb-1">
            🩺 Doctor Review
            {d?.reviewer_name
              ? ` — ${d.reviewer_name}`
              : ""}
          </div>

          <div className="text-dark small">
            {d.doctor_notes}
          </div>

        </div>
      )}

    </div>
  );
}


function getUrgencyBadgeClass(level) {
  switch (level) {
    case "Critical":
      return "bg-danger text-white";

    case "High":
      return "bg-danger text-white";

    case "Medium":
      return "bg-warning text-dark";

    case "Low":
    default:
      return "bg-success text-white";
  }
}


function InfoItem({
  label,
  value,
  highlight,
  wide,
}) {
  return (
    <div
      className={
        wide
          ? "col-12"
          : "col-md-6 col-lg-4"
      }
    >

      <div
        className="text-uppercase text-secondary fw-semibold mb-1"
        style={{
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>

      <div
        className={`fs-6 ${
          highlight
            ? "text-primary fw-bold"
            : "text-dark"
        }`}
      >
        {value || (
          <span className="text-muted fst-italic small">
            Not filled
          </span>
        )}
      </div>

    </div>
  );
}