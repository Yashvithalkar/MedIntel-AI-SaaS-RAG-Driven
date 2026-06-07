// ==============================================================
// src/services/api.js — Axios Instance (Configured for Cookie Auth)
// ==============================================================
//
// WHY A CUSTOM INSTANCE (not raw axios)?
//   If you use axios directly everywhere:
//     axios.get('http://localhost:5000/api/auth/me')
//   You repeat the base URL everywhere, and forget withCredentials.
//
//   With a custom instance:
//     api.get('/auth/me')
//   Base URL + withCredentials set ONCE here, applied everywhere.
//
// THE MOST IMPORTANT LINE: withCredentials: true
//   This tells the browser: "when making requests to this server,
//   include any cookies you have for that domain."
//
//   Without it: browser strips cookies from API requests → auth fails
//   With it:    browser sends the httpOnly token cookie automatically
//
//   On the backend, this is paired with:
//     cors({ credentials: true, origin: 'http://localhost:5173' })
//   BOTH sides need to agree — one side alone won't work.
//
// INTERCEPTORS:
//   Request interceptor  → runs before every request is sent
//   Response interceptor → runs after every response arrives
//
//   We use response interceptor to:
//   - Catch 401 errors globally (session expired → redirect to login)
//   - This prevents writing the same error handling in every component
// ==============================================================

import axios from 'axios'

// Create a custom axios instance
const api = axios.create({
  // In development with Vite proxy (vite.config.js), we can use relative URLs.
  // Vite proxy forwards /api/* to http://localhost:5000/api/*
  // This avoids CORS issues entirely during development.
  //
  // In production (deployed): change this to your EC2 URL
  // baseURL: 'https://your-ec2-ip/api'  ← production
  baseURL: '/api',  // ← development (via Vite proxy)

  // THE KEY LINE — include cookies in every request
  // Without this: httpOnly JWT cookie is never sent → every request returns 401
  withCredentials: true,

  // Default headers for every request
  headers: {
    'Content-Type': 'application/json',
  },

  // Request timeout — if server doesn't respond in 10s, reject
  timeout: 10000,
})

// ==============================================================
// REQUEST INTERCEPTOR
// ==============================================================
// Runs before every request is sent.
// Good place to: add auth headers (if using Bearer token),
// add request IDs, log in development, etc.
//
// Since we use httpOnly cookies, we don't need to manually
// attach tokens here — the browser does it automatically.
// But we keep this for future additions (e.g. request logging).
api.interceptors.request.use(
  (config) => {
    // config = the axios request configuration object
    // You can modify headers, URL, data here before sending

    // Development logging — remove in production
    if (import.meta.env.DEV) {
      console.log(`📤 API Request: [${config.method?.toUpperCase()}] ${config.url}`)
    }

    return config // must return config
  },
  (error) => {
    // Request setup failed (rare — network error before request sent)
    return Promise.reject(error)
  }
)

// ==============================================================
// RESPONSE INTERCEPTOR
// ==============================================================
// Runs after every response arrives.
// Perfect for global error handling — handle 401 once here
// instead of in every single component.
api.interceptors.response.use(

  // SUCCESS: response arrived with 2xx status
  (response) => {
    // Development logging
    if (import.meta.env.DEV) {
      console.log(`📥 API Response: ${response.status} ${response.config.url}`)
    }
    return response // pass through unchanged
  },

  // ERROR: response arrived with 4xx or 5xx, or network error
  (error) => {
    const status = error.response?.status

    // --- Handle 401 Unauthorized globally ---
    // 401 means: session expired or invalid token
    // Redirect to login so user can re-authenticate
    if (status === 401) {
      // Don't redirect if we're already on login/register pages
      // (e.g. failed login attempt should stay on login page)
      const currentPath = window.location.pathname
      const isAuthPage = ['/login', '/register'].includes(currentPath)

      if (!isAuthPage) {
        console.warn('Session expired. Redirecting to login...')
        // Hard redirect — clears all React state
        window.location.href = '/login'
      }
    }

    // --- Handle 403 Forbidden ---
    // User is logged in but tried to access wrong role's route
    // This shouldn't happen in normal flow (UI hides wrong links)
    // But just in case:
    if (status === 403) {
      console.warn('Access denied: insufficient permissions')
    }

    // --- Handle 500 Server Error ---
    if (status >= 500) {
      console.error('Server error:', error.response?.data?.message)
    }

    // Always reject — component's catch block handles specific cases
    return Promise.reject(error)
  }
)

export default api
