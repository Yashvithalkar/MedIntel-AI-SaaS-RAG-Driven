// ==============================================================
// src/pages/Register.jsx — Modern Registration Page (Bootstrap 5.3)
// ==============================================================

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Live password validation state
  const passwordCriteria = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleRoleSelect = (role) => {
    setFormData((prev) => ({ ...prev, role }));
    if (fieldErrors.role) {
      setFieldErrors((prev) => ({ ...prev, role: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await register(
        formData.name,
        formData.email,
        formData.password,
        formData.role
      );

      setSuccess(true);
      setTimeout(() => {
        navigate("/login", {
          state: { message: "Account created! Please log in with your credentials." },
        });
      }, 2000);
    } catch (err) {
      const responseData = err.response?.data;

      if (err.response?.status === 422 && responseData?.errors) {
        const fieldErrs = {};
        responseData.errors.forEach((e) => {
          fieldErrs[e.field] = e.message;
        });
        setFieldErrors(fieldErrs);
      } else {
        setError(
          responseData?.message ||
            err.message ||
            "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 w-100 d-flex align-items-center justify-content-center bg-light py-5">
      <div className="container d-flex justify-content-center px-3">
        
        {/* Main Form Card */}
        <div className="card border-0 shadow-lg rounded-4 overflow-hidden w-100" style={{ maxWidth: "520px" }}>
          
          {/* Header */}
          <div className="card-header bg-primary text-white text-center py-4 border-0">
            <div className="d-inline-flex align-items-center justify-content-center bg-white bg-opacity-20 rounded-circle p-3 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-heart-pulse-fill" viewBox="0 0 16 16">
                <path d="M1.475 9C2.7 11.37 5.262 14 8 14s5.3-2.63 6.525-5H11a.5.5 0 0 1-.464-.314l-1.457-3.642-1.188 6.531a.5.5 0 0 1-.973.08L5.41 8.243l-.428.856A.5.5 0 0 1 4.5 9z"/>
                <path d="M10.854 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L13.293 4.5 10.854 2.061a.5.5 0 0 1 0-.708"/>
              </svg>
            </div>
            <h3 className="fw-bold mb-1">Create Account</h3>
            <p className="text-white-50 mb-0 small">Join the MediAI Care Platform</p>
          </div>

          <div className="card-body p-4 p-md-5">

            {/* Success Alert */}
            {success && (
              <div className="alert alert-success d-flex align-items-center gap-2 rounded-3 border-0 shadow-sm mb-4" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-check-circle-fill flex-shrink-0" viewBox="0 0 16 16">
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l4.992-5.99a.75.75 0 0 0-.018-1.042z"/>
                </svg>
                <div className="small">Account created successfully! Redirecting to login...</div>
              </div>
            )}

            {/* General Error Alert */}
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 rounded-3 border-0 shadow-sm mb-4" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-exclamation-triangle-fill flex-shrink-0" viewBox="0 0 16 16">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
                <div className="small">{error}</div>
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit} noValidate>

                {/* Role Selection Segmented Control */}
                <div className="mb-4">
                  <label className="form-label text-secondary fw-semibold small mb-2">I AM A...</label>
                  <div className="row g-2">
                    <div className="col-6">
                      <button
                        type="button"
                        className={`btn w-100 p-3 text-start rounded-3 border transition-all ${
                          formData.role === "patient"
                            ? "btn-primary text-white border-primary shadow-sm"
                            : "btn-outline-light text-dark border-secondary-subtle"
                        }`}
                        onClick={() => handleRoleSelect("patient")}
                        disabled={loading}
                      >
                        <div className="fw-bold fs-6">Patient</div>
                        <div className="small opacity-75">Seeking care & review</div>
                      </button>
                    </div>

                    <div className="col-6">
                      <button
                        type="button"
                        className={`btn w-100 p-3 text-start rounded-3 border transition-all ${
                          formData.role === "doctor"
                            ? "btn-primary text-white border-primary shadow-sm"
                            : "btn-outline-light text-dark border-secondary-subtle"
                        }`}
                        onClick={() => handleRoleSelect("doctor")}
                        disabled={loading}
                      >
                        <div className="fw-bold fs-6">Doctor</div>
                        <div className="small opacity-75">Medical practitioner</div>
                      </button>
                    </div>
                  </div>
                  {fieldErrors.role && <div className="text-danger small mt-1">{fieldErrors.role}</div>}
                </div>

                {/* Full Name */}
                <div className="mb-3">
                  <label htmlFor="name" className="form-label text-secondary fw-semibold small mb-1">FULL NAME</label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    className={`form-control form-control-lg rounded-3 fs-6 ${fieldErrors.name ? "is-invalid" : ""}`}
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Priya Patel"
                    autoComplete="name"
                    disabled={loading}
                  />
                  {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
                </div>

                {/* Email Address */}
                <div className="mb-3">
                  <label htmlFor="email" className="form-label text-secondary fw-semibold small mb-1">EMAIL ADDRESS</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    className={`form-control form-control-lg rounded-3 fs-6 ${fieldErrors.email ? "is-invalid" : ""}`}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={loading}
                  />
                  {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
                </div>

                {/* Password Input with Visibility Toggle */}
                <div className="mb-3">
                  <label htmlFor="password" className="form-label text-secondary fw-semibold small mb-1">PASSWORD</label>
                  <div className="input-group">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className={`form-control form-control-lg rounded-start-3 fs-6 ${fieldErrors.password ? "is-invalid" : ""}`}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      className="btn btn-outline-secondary rounded-end-3 px-3"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                    {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
                  </div>

                  {/* Password Checklist indicator */}
                  {formData.password.length > 0 && (
                    <div className="mt-2 p-2 bg-light rounded-3 border border-secondary-subtle small">
                      <div className="d-flex flex-wrap gap-2 text-muted" style={{ fontSize: "0.8rem" }}>
                        <span className={passwordCriteria.length ? "text-success fw-semibold" : ""}>
                          ✓ 8+ chars
                        </span>
                        <span className={passwordCriteria.uppercase ? "text-success fw-semibold" : ""}>
                          ✓ Uppercase
                        </span>
                        <span className={passwordCriteria.lowercase ? "text-success fw-semibold" : ""}>
                          ✓ Lowercase
                        </span>
                        <span className={passwordCriteria.number ? "text-success fw-semibold" : ""}>
                          ✓ Number
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100 rounded-3 fw-bold my-3 shadow-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="d-flex align-items-center justify-content-center gap-2">
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            )}

            {/* Footer Navigation Link */}
            <div className="text-center mt-3">
              <span className="text-secondary small">Already have an account? </span>
              <Link to="/login" className="text-primary text-decoration-none fw-semibold small">
                Sign in
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;