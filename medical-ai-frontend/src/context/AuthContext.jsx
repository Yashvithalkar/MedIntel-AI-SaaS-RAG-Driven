// ==============================================================
// src/context/AuthContext.jsx — Global Authentication State
// ==============================================================
//
// PURPOSE:
//   Manages authentication state for the entire React app.
//   Any component in the app can access:
//     - user        → current logged-in user object (or null)
//     - loading     → true while checking if user is logged in
//     - login()     → call on login form submit
//     - register()  → call on register form submit
//     - logout()    → call on logout button click
//
// WHY CONTEXT?
//   Without context, you'd have to pass user as a prop through
//   every component: App → Router → Page → Component → Button
//   This is called "prop drilling" and makes code a mess.
//
//   With context: any component just calls useAuth() and gets user.
//   No prop drilling. Clean. Simple.
//
// HOW CONTEXT WORKS:
//   1. AuthProvider wraps the entire app (in App.jsx)
//   2. It holds auth state in useState
//   3. It shares that state through AuthContext.Provider
//   4. Any component wrapped by Provider can useContext(AuthContext)
//   5. useAuth() is a custom hook that wraps useContext — cleaner API
//
// PERSIST LOGIN ACROSS PAGE REFRESH:
//   When user refreshes the page, React state is lost.
//   We call GET /api/auth/me on mount (checkAuth).
//   If the httpOnly cookie is still valid → server returns user data
//   → we restore user state → page loads as if still logged in.
//   If cookie expired → server returns 401 → user = null → login page.
//
// USAGE IN COMPONENTS:
//   import { useAuth } from '../context/AuthContext';
//
//   const MyComponent = () => {
//     const { user, login, logout, loading } = useAuth();
//     if (loading) return <Spinner />;
//     if (!user) return <Redirect to="/login" />;
//     return <div>Hello, {user.name}</div>;
//   };
// ==============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

// ==============================================================
// 1. Create the Context
// ==============================================================
// createContext(defaultValue) creates a context object.
// defaultValue is used only if a component calls useContext
// WITHOUT being wrapped by a Provider (shouldn't happen in our app).
const AuthContext = createContext(null)

// ==============================================================
// 2. AuthProvider Component
// ==============================================================
// Wrap your entire app with this so all children can access auth state.
// In App.jsx: <AuthProvider><RouterProvider .../></AuthProvider>
export const AuthProvider = ({ children }) => {

  // user: null = not logged in | object = logged in user data
  const [user, setUser] = useState(null)

  // loading: true while we're checking if user is already logged in
  // Prevents flash of login page when user is actually logged in
  const [loading, setLoading] = useState(true)

  // ==============================================================
  // checkAuth — Verify session on app load / page refresh
  // ==============================================================
  // Called once when AuthProvider mounts (useEffect below).
  // Hits GET /api/auth/me — if cookie is valid, returns user data.
  // If cookie missing or expired → 401 → user stays null.
  //
  // useCallback: memoizes the function so it doesn't re-create
  // on every render (important since it's in useEffect dependency array)
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true)

      // GET /api/auth/me — protected route
      // Browser automatically sends the httpOnly cookie
      // If cookie is valid: response = { success: true, data: { user } }
      // If cookie invalid/missing: 401 → caught in catch block
      const response = await api.get('/auth/me')

      // Set user state with data from server
      setUser(response.data.data.user)

    } catch (error) {
      // 401 = not logged in (no cookie, or expired)
      // This is the NORMAL case on first visit or after expiry
      // Don't log it as an error — it's expected behaviour
      setUser(null)
    } finally {
      // Always stop loading, whether success or failure
      // The UI should never stay stuck on the loading screen
      setLoading(false)
    }
  }, [])

  // Run checkAuth once when the app first loads
  // This is what makes "stay logged in after refresh" work
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // ==============================================================
  // login() — Submit credentials, receive cookie, update state
  // ==============================================================
  const login = async (email, password) => {
    // POST /api/auth/login → server sets httpOnly cookie in response
    // We don't handle the cookie — browser does that automatically
    const response = await api.post('/auth/login', { email, password })

    // Update React state with the user data from response
    // The JWT is in the cookie — we only store user info in state
    const loggedInUser = response.data.data.user
    setUser(loggedInUser)

    // Return user so the Login page can redirect based on role
    return loggedInUser
    // Caller (Login.jsx) handles navigation after this resolves
  }

  // ==============================================================
  // register() — Create account (does NOT auto-login)
  // ==============================================================
  // After registration, we redirect to login page.
  // Could auto-login here, but explicit login is cleaner UX.
  const register = async (name, email, password, role) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
      role,
    })

    // Return response data so Register.jsx can show success message
    return response.data
    // After this, Register.jsx redirects to /login
  }

  // ==============================================================
  // logout() — Clear cookie, clear state, redirect
  // ==============================================================
  const logout = async () => {
    try {
      // POST /api/auth/logout → server sets cookie maxAge:0 (clears it)
      await api.post('/auth/logout')
    } catch (error) {
      // Even if logout API fails (e.g. network error),
      // we still clear local state and redirect.
      // User should never be stuck in a logged-in state they can't exit.
      console.warn('Logout API failed, clearing local state anyway')
    } finally {
      // Clear user from React state regardless of API response
      setUser(null)
      // Hard redirect to login (clears all component state)
      window.location.href = '/login'
    }
  }

  // ==============================================================
  // The value we share with all child components
  // ==============================================================
  const contextValue = {
    user,        // null | { id, name, email, role, created_at }
    loading,     // boolean — true while checking session on load
    login,       // async (email, password) => user
    register,    // async (name, email, password, role) => responseData
    logout,      // async () => void
    checkAuth,   // async () => void — rarely needed, but exposed
    isPatient: user?.role === 'patient',   // shorthand helpers
    isDoctor:  user?.role === 'doctor',
    isAdmin:   user?.role === 'admin',
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// ==============================================================
// 3. useAuth — Custom hook for consuming auth context
// ==============================================================
// Why a custom hook instead of useContext directly?
//
//   Without hook (verbose):
//     import { useContext } from 'react'
//     import { AuthContext } from '../context/AuthContext'
//     const { user } = useContext(AuthContext)
//
//   With custom hook (clean):
//     import { useAuth } from '../context/AuthContext'
//     const { user } = useAuth()
//
//   Also: the guard clause catches the mistake of using useAuth
//   outside of AuthProvider (gives a clear error message instead
//   of a cryptic "cannot read property of null").
export const useAuth = () => {
  const context = useContext(AuthContext)

  // Guard: if useAuth is called outside of AuthProvider, context is null
  // This gives a helpful error message during development
  if (!context) {
    throw new Error(
      'useAuth must be used inside <AuthProvider>. ' +
      'Make sure AuthProvider wraps your app in App.jsx'
    )
  }

  return context
}
