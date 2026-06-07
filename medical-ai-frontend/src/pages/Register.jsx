// ==============================================================
// src/pages/Register.jsx — Registration Page
// ==============================================================
//
// FORM STATE MANAGEMENT:
//   We use controlled inputs — React controls every input's value.
//   onChange updates the formData state → input re-renders with new value.
//   On submit, we have all values in formData ready to send.
//
// ERROR HANDLING:
//   Two types of errors:
//   a) Validation errors from server (422):
//      { errors: [{ field: 'email', message: 'Invalid email' }] }
//      We show them next to each field (fieldErrors state).
//   b) General errors (409 Conflict, 500 Server Error):
//      We show at top of form (error state).
//
// FORM STATES:
//   idle      → waiting for user input
//   loading   → API call in progress (button disabled)
//   success   → account created (show success, redirect to login)
//   error     → something went wrong (show error message)
// ==============================================================

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  // All form fields in one state object
  // This is cleaner than separate useState for each field
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient", // default role
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // general error
  const [fieldErrors, setFieldErrors] = useState({}); // per-field errors
  const [success, setSuccess] = useState(false); // success state

  // ==============================================================
  // handleChange — updates formData when any input changes
  // ==============================================================
  // e.target.name  = the input's name attribute (must match formData key)
  // e.target.value = current value typed by user
  //
  // Spread operator (...formData) keeps existing fields unchanged,
  // then [name]: value updates only the changed field.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error when user starts typing in that field
    // Good UX: errors disappear as user corrects them
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // ==============================================================
  // handleSubmit — called when form is submitted
  // ==============================================================
  const handleSubmit = async (e) => {
    // e.preventDefault() stops the form from doing a full page reload
    // (default browser behaviour for form submit)
    e.preventDefault();

    // Clear previous errors
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      // Call register() from AuthContext → calls POST /api/auth/register
      await register(
        formData.name,
        formData.email,
        formData.password,
        formData.role,
      );

      // Success! Show success message then redirect to login
      setSuccess(true);

      // Wait 2 seconds so user can see the success message, then navigate
      setTimeout(() => {
        navigate("/login", {
          // Pass state to login page — it can show "Registration successful, please login"
          state: { message: "Account created! Please log in." },
        });
      }, 2000);
    } catch (err) {
      // err.response = the axios error response object
      // err.response.data = our backend JSON body
      const responseData = err.response?.data;

      // Handle 422 Validation errors (per-field)
      if (err.response?.status === 422 && responseData?.errors) {
        // Convert array of errors to an object keyed by field name
        // [{ field: 'email', message: '...' }] → { email: '...' }
        const fieldErrs = {};
        responseData.errors.forEach((e) => {
          fieldErrs[e.field] = e.message;
        });
        setFieldErrors(fieldErrs);
      } else {
        // General error (409 duplicate, 500 server error, network error)
        setError(
          responseData?.message ||
            err.message ||
            "Registration failed. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==============================================================
  // Render
  // ==============================================================
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="subtitle">Join the Medical AI platform</p>

        {/* ── Success state ── */}
        {success && (
          <div className="alert alert-success">
            ✅ Account created successfully! Redirecting to login...
          </div>
        )}

        {/* ── General error ── */}
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {/* ── Form ── */}
        {!success && (
          <form onSubmit={handleSubmit} noValidate>
            {/* noValidate: disable browser's built-in validation UI
                We handle validation ourselves for better control */}

            {/* Name */}
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                name="name" // must match formData key
                value={formData.name}
                onChange={handleChange}
                placeholder="Dr. Priya Patel"
                autoComplete="name"
                disabled={loading}
              />
              {/* Show field-specific error if server returned one */}
              {fieldErrors.name && (
                <span style={{ color: "#e53e3e", fontSize: "0.8rem" }}>
                  {fieldErrors.name}
                </span>
              )}
            </div>

            {/* Email */}
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
                disabled={loading}
              />
              {fieldErrors.email && (
                <span style={{ color: "#e53e3e", fontSize: "0.8rem" }}>
                  {fieldErrors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 8 chars, uppercase + number"
                autoComplete="new-password"
                disabled={loading}
              />
              {fieldErrors.password && (
                <span style={{ color: "#e53e3e", fontSize: "0.8rem" }}>
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {/* Role */}
            <div className="form-group">
              <label htmlFor="role">I am a...</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
              </select>
              {fieldErrors.role && (
                <span style={{ color: "#e53e3e", fontSize: "0.8rem" }}>
                  {fieldErrors.role}
                </span>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        {/* ── Link to login ── */}
        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
