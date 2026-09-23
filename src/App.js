// src/App.js
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthPage from "./AuthPage";
import SignalGuard from "./SignalGuard";
import { logOut } from "./firebase";

export default function App() {
  const { user, kicked } = useAuth();

  // Still loading auth state
  if (user === undefined) {
    return (
      <div style={{
        minHeight:      "100vh",
        background:     "#0a0a0f",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontFamily:     "Space Mono, monospace",
        color:          "rgba(240,240,245,0.45)",
        fontSize:       13,
      }}>
        Loading...
      </div>
    );
  }

  // Kicked out — another device logged in
  if (kicked) {
    return (
      <div style={{
        minHeight:      "100vh",
        background:     "#0a0a0f",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        fontFamily:     "Syne, sans-serif",
        gap:            16,
        padding:        20,
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ color: "#ff3b3b", fontSize: 18, fontWeight: 700 }}>
          Session ended
        </div>
        <div style={{
          color:      "rgba(240,240,245,0.6)",
          fontSize:   13,
          textAlign:  "center",
          fontFamily: "Space Mono, monospace",
          maxWidth:   320,
        }}>
          Your account was logged in on another device.<br />
          Only one active session is allowed at a time.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop:   8,
            background:  "#ff3b3b",
            border:      "none",
            borderRadius: 10,
            padding:     "12px 28px",
            color:       "#fff",
            fontFamily:  "Syne, sans-serif",
            fontSize:    14,
            fontWeight:  700,
            cursor:      "pointer",
          }}
        >
          Sign in again
        </button>
      </div>
    );
  }

  // Not logged in — show auth page
  if (!user) {
    return <AuthPage />;
  }

  // Logged in — show main app
  return <SignalGuard user={user} onLogout={logOut} />;
}