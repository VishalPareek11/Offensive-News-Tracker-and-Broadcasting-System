// src/AuthPage.jsx
import { useState } from "react";
import { signIn, signUp } from "./firebase";
import "./AuthPage.css";

export default function AuthPage() {
  const [mode,        setMode]        = useState("login"); // "login" | "signup"
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (mode === "signup" && !displayName) { setError("Please enter a display name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
    } catch (err) {
      // Map Firebase error codes to friendly messages
      const msgs = {
        "auth/user-not-found":       "No account found with this email.",
        "auth/wrong-password":       "Incorrect password.",
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/invalid-email":        "Please enter a valid email address.",
        "auth/too-many-requests":    "Too many attempts. Please try again later.",
        "auth/invalid-credential":   "Invalid email or password.",
      };
      setError(msgs[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">⚠</div>
          <div className="auth-logo-text">SIGNAL<span>GUARD</span></div>
        </div>

        <div className="auth-subtitle">
          {mode === "login" ? "Sign in to your account" : "Create a new account"}
        </div>

        {/* Form */}
        <div className="auth-form">

          {mode === "signup" && (
            <div className="auth-field">
              <label className="auth-label">Display Name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKey}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKey}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <div className="auth-error">
              ⚠ {error}
            </div>
          )}

          <button
            className={"auth-btn" + (loading ? " loading" : "")}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        {/* Toggle */}
        <div className="auth-toggle">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button className="auth-link" onClick={() => { setMode("signup"); setError(""); }}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button className="auth-link" onClick={() => { setMode("login"); setError(""); }}>
                Sign in
              </button>
            </>
          )}
        </div>

        {/* Single session note */}
        <div className="auth-note">
          🔒 Only one active session allowed per account
        </div>

      </div>
    </div>
  );
}
