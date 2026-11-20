// ==============================================================
// src/services/api.js — Base Axios Instance
// ==============================================================
// withCredentials: true is CRITICAL — tells browser to send
// the httpOnly JWT cookie with every request automatically.
// Without it: every API call returns 401 (no cookie sent).
// ==============================================================

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',          // Vite proxy forwards to http://localhost:5000/api
  withCredentials: true,    // MUST be true for httpOnly cookie auth
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// Response interceptor — global 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthPage = ['/login', '/register'].includes(window.location.pathname);
      if (!isAuthPage) window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;