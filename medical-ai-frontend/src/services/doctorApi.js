// src/services/doctorApi.js — Doctor API Module
import api from './api';

export const getPatients = async () => {
  const res = await api.get('/doctor/patients');
  return res.data.data;
};

export const getPatientRecords = async (patientId) => {
  const res = await api.get(`/doctor/patients/${patientId}/records`);
  return res.data.data;
};

export const getPendingDiagnoses = async () => {
  const res = await api.get('/doctor/diagnoses/pending');
  return res.data.data;
};

export const reviewDiagnosis = async (diagnosisId, { doctor_notes, status }) => {
  const res = await api.put(`/doctor/diagnoses/${diagnosisId}/review`, { doctor_notes, status });
  return res.data.data.diagnosis;
};

/**
 * Upload and ingest medical guideline PDFs into the RAG vector database
 * @param {FileList|File[]} files - Selected PDF files
 */
export const ingestMedicalPdf = async (files) => {
  const formData = new FormData();
  
  // Append files under the field name 'documents' (matching upload.array("documents", 5))
  if (files instanceof FileList || Array.isArray(files)) {
    Array.from(files).forEach((file) => {
      formData.append('documents', file);
    });
  } else {
    formData.append('documents', files);
  }

  const response = await api.post('/knowledge/ingest-pdf', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000, // 2-minute timeout for processing and embedding large PDFs
  });

  return response.data;
};