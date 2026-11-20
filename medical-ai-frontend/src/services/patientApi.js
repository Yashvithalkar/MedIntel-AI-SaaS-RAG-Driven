
 // ============================================================
 // src/services/patientApi.js
 // Patient API Service (FastAPI Compatible + Debugging)
 // ============================================================

import api from "./api";

// ============================================================
// SHARED DEBUGGING HELPERS
// ============================================================

const logApiError = (operation, error) => {
  console.error(`❌ ${operation} failed`);

  if (error.response) {
    // Server responded with an error status (4xx / 5xx)
    console.error("📡 HTTP Status:", error.response.status);
    console.error("📦 Response data:", error.response.data);
    console.error("🔗 Request URL:", error.config?.url);
    console.error("📨 Request method:", error.config?.method);
  } else if (error.request) {
    // Request was sent, but no response was received
    console.error("📡 No response received from server");
    console.error("🔗 Request URL:", error.config?.url);
    console.error("⚠️ Network/request details:", error.message);
  } else {
    // Error occurred before the request was sent
    console.error("⚠️ Error:", error.message);
  }
};

const getErrorMessage = (error, fallback) => {
  const data = error.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item) => item.msg || JSON.stringify(item))
      .join(", ");
  }

  return (
    data?.message ||
    data?.error ||
    error.message ||
    fallback
  );
};

// ============================================================
// GET PATIENT PROFILE
// ============================================================

export const getProfile = async () => {
  try {
    console.log("📤 GET /patient/profile");

    const res = await api.get("/patient/profile");
    const data = res.data;

    console.log("📥 GET profile response:", data);

    const profile =
      data?.data?.profile ??
      data?.profile ??
      data?.data ??
      data;

    if (!profile || typeof profile !== "object") {
      console.warn("⚠️ Unexpected profile response:", data);
      return null;
    }

    console.log("✅ Patient profile loaded");
    return profile;
  } catch (error) {
    logApiError("GET patient profile", error);
    throw new Error(
      getErrorMessage(error, "Failed to load patient profile.")
    );
  }
};

// ============================================================
// UPDATE PATIENT PROFILE
// ============================================================

export const updateProfile = async (profileData) => {
  try {
    console.log("📤 PUT /patient/profile");
    console.log("📝 Profile fields:", Object.keys(profileData || {}));

    const res = await api.put("/patient/profile", profileData);
    const data = res.data;

    console.log("📥 UPDATE profile response:", data);

    const profile =
      data?.data?.profile ??
      data?.profile ??
      data?.data ??
      data;

    console.log("✅ Patient profile updated");
    return profile;
  } catch (error) {
    logApiError("UPDATE patient profile", error);
    throw new Error(
      getErrorMessage(error, "Failed to update patient profile.")
    );
  }
};

// ============================================================
// GET ALL DIAGNOSES
// ============================================================

export const getDiagnoses = async () => {
  try {
    console.log("📤 GET /patient/diagnoses");

    const res = await api.get("/patient/diagnoses");
    const data = res.data;

    console.log("📥 GET diagnoses response:", data);

    // Backend returns a direct array.
    if (Array.isArray(data)) {
      console.log(`✅ Loaded ${data.length} diagnoses`);

      return {
        diagnoses: data,
        total: data.length,
      };
    }

    // Backend returns a wrapped array.
    const diagnoses =
      data?.data?.diagnoses ??
      data?.diagnoses ??
      data?.data;

    if (Array.isArray(diagnoses)) {
      const total = data?.total ?? diagnoses.length;

      console.log(`✅ Loaded ${diagnoses.length} diagnoses`);

      return {
        diagnoses,
        total,
      };
    }

    // Handle an empty or unexpected response without crashing.
    console.warn("⚠️ Unexpected diagnoses response:", data);

    return {
      diagnoses: [],
      total: 0,
    };
  } catch (error) {
    logApiError("GET patient diagnoses", error);
    throw new Error(
      getErrorMessage(error, "Failed to load diagnosis history.")
    );
  }
};

// ============================================================
// GET SINGLE DIAGNOSIS
// ============================================================

export const getDiagnosisById = async (id) => {
  try {
    if (!id) {
      throw new Error("Diagnosis ID is required.");
    }

    console.log(`📤 GET /patient/diagnoses/${id}`);

    const res = await api.get(
      `/patient/diagnoses/${encodeURIComponent(id)}`
    );

    const data = res.data;

    console.log("📥 GET diagnosis by ID response:", data);

    const diagnosis =
      data?.data?.diagnosis ??
      data?.diagnosis ??
      data?.data ??
      data;

    if (!diagnosis || typeof diagnosis !== "object") {
      throw new Error("Diagnosis was not found in the API response.");
    }

    console.log("✅ Diagnosis details loaded");
    return diagnosis;
  } catch (error) {
    logApiError("GET diagnosis by ID", error);
    throw new Error(
      getErrorMessage(error, "Failed to load diagnosis details.")
    );
  }
};

// ============================================================
// SUBMIT SYMPTOMS + OPTIONAL MEDICAL REPORT
// ============================================================

export const submitSymptoms = async (
  symptomsInput = "",
  medicalFile = null
) => {
  try {
    const cleanedSymptoms =
      typeof symptomsInput === "string"
        ? symptomsInput.trim()
        : "";

    // Validate input before sending the request.
    if (cleanedSymptoms.length < 3 && !medicalFile) {
      throw new Error(
        "Please describe your symptoms using at least 3 characters or upload a medical report."
      );
    }

    const formData = new FormData();

    if (cleanedSymptoms) {
      formData.append("symptoms_input", cleanedSymptoms);
    }

    if (medicalFile) {
      formData.append("medical_file", medicalFile);
    }

    console.group("🩺 Submit Diagnosis Debug");
    console.log("📤 Endpoint: POST /patient/diagnoses");
    console.log("📝 Symptoms:", cleanedSymptoms || "None");
    console.log("📎 Medical file:", medicalFile?.name || "None");
    console.log("📏 Symptoms length:", cleanedSymptoms.length);
    console.log("📦 Request format: multipart/form-data");
    console.groupEnd();

    // Do not manually set Content-Type here.
    // Axios/browser must add the multipart boundary automatically.
    const res = await api.post(
      "/patient/diagnoses",
      formData,
      {
        timeout: 60000,
      }
    );

    const data = res.data;

    console.log("📥 POST diagnosis response:", data);

    if (data?.success === false) {
      throw new Error(
        data?.message ||
        data?.error ||
        "The backend could not generate the diagnosis."
      );
    }

    const result = data?.data ?? data;

    if (!result || typeof result !== "object") {
      throw new Error("Diagnosis API returned an invalid response.");
    }

    // Standard FastAPI response:
    // { success: true, data: { diagnosis: {...} } }
    if (result.diagnosis) {
      console.log("✅ Diagnosis submitted successfully");
      return result.diagnosis;
    }

    // Support APIs that return the diagnosis object directly.
    if (
      result.id ||
      result.diagnosis_id ||
      result.diagnosisId
    ) {
      console.log("✅ Diagnosis submitted successfully");

      return {
        ...result,
        id:
          result.id ??
          result.diagnosis_id ??
          result.diagnosisId,
        symptoms_input:
          result.symptoms_input ??
          cleanedSymptoms ??
          "",
        ai_report:
          result.ai_report ??
          result.report ??
          null,
        status: result.status ?? "pending",
        doctor_notes: result.doctor_notes ?? null,
        created_at:
          result.created_at ?? new Date().toISOString(),
        updated_at:
          result.updated_at ?? new Date().toISOString(),
      };
    }

    console.warn(
      "⚠️ Diagnosis response did not contain a recognized diagnosis object:",
      data
    );

    throw new Error(
      "The server responded, but no diagnosis record was returned. Check the backend response."
    );
  } catch (error) {
    logApiError("SUBMIT diagnosis", error);

    const message = getErrorMessage(
      error,
      "Failed to submit your symptoms."
    );

    // Preserve useful validation and backend error messages for the UI.
    throw new Error(message);
  }
};
