// ============================================================
// AuthPage — Login & Register
// Aesthetic: Light, fresh Lush Forest palette
// ============================================================
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Topographic SVG background */}
      <svg style={styles.bgSvg} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#68BA7F" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="#CFFFDC" />
        <rect width="1200" height="800" fill="url(#grid)" />
        {/* Topographic contour-like ellipses */}
        {[200, 160, 120, 80, 40].map((r, i) => (
          <ellipse key={i} cx="900" cy="400" rx={r * 3} ry={r * 1.5}
            fill="none" stroke="#68BA7F" strokeWidth="0.8" opacity={0.4 - i * 0.05} />
        ))}
        {[200, 160, 120, 80, 40].map((r, i) => (
          <ellipse key={i + 10} cx="200" cy="600" rx={r * 2} ry={r}
            fill="none" stroke="#68BA7F" strokeWidth="0.8" opacity={0.35 - i * 0.05} />
        ))}
        {/* Meridian lines */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={200 * i} y1="0" x2={200 * i} y2="800"
            stroke="#68BA7F" strokeWidth="0.3" />
        ))}
        {/* Latitude lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1="0" y1={200 * i} x2="1200" y2={200 * i}
            stroke="#68BA7F" strokeWidth="0.3" />
        ))}
      </svg>

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <img src="/logo.png" alt="GetMySHP Logo" style={{ height: '50px', width: 'auto', objectFit: 'contain' }} />
          <span style={styles.logoText}>GetMySHP</span>
        </div>

        {/* Heading & Tagline */}
        <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: '18px', color: '#253D2C', marginBottom: '8px' }}>
          Find. Select. Download. Your SHP in seconds.
        </h2>
        <p style={styles.tagline}>
          Get the shapefile you need—fast, simple, and precise.
        </p>

        {/* Tab switch */}
        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(mode === "login" ? styles.tabActive : {}) }}
            onClick={() => setMode("login")}>Sign In</button>
          <button style={{ ...styles.tab, ...(mode === "register" ? styles.tabActive : {}) }}
            onClick={() => setMode("register")}>Register</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === "register" && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full Name</label>
              <input style={styles.input} type="text" placeholder="Pranav Patil"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                required />
            </div>
          )}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" placeholder="nav@example.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              required />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" placeholder="••••••••"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              required />
          </div>

          {error && <div style={styles.errorBox}>⚠ {error}</div>}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? <span style={styles.spinner}></span> : (mode === "login" ? "Find Your SHP →" : "Create Account →")}
          </button>
        </form>

        <p style={styles.footer}>
          Administrative boundary data · WGS84 · India · GADM 2015
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    position: "relative",
    overflow: "hidden",
    background: "#CFFFDC",
  },
  bgSvg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    zIndex: 0,
  },
  card: {
    position: "relative",
    zIndex: 1,
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid #68BA7F",
    borderRadius: "16px",
    padding: "48px 44px",
    width: "420px",
    boxShadow: "0 0 80px rgba(46, 111, 64, 0.08), 0 20px 60px rgba(37, 61, 44, 0.1)",
    backdropFilter: "blur(12px)",
  },
  logoRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "10px",
    marginBottom: "8px",
  },
  logoSub: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    color: "#2E6F40",
    letterSpacing: "3px",
    fontWeight: "700",
    border: "1px solid #2E6F40",
    padding: "2px 6px",
    borderRadius: "3px",
  },
  logoText: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "24px",
    fontWeight: "700",
    color: "#253D2C",
    letterSpacing: "-0.5px",
  },
  tagline: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px",
    color: "#68BA7F",
    lineHeight: "1.7",
    marginBottom: "28px",
    paddingLeft: "14px",
    borderLeft: "2px solid #2E6F40",
    fontStyle: "italic",
  },
  tabs: {
    display: "flex",
    gap: "4px",
    background: "#e6ffed",
    borderRadius: "8px",
    padding: "4px",
    marginBottom: "24px",
  },
  tab: {
    flex: 1,
    padding: "8px",
    border: "none",
    background: "transparent",
    color: "#68BA7F",
    borderRadius: "6px",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  tabActive: {
    background: "#2E6F40",
    color: "#ffffff",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontFamily: "'Space Mono', monospace",
    color: "#2E6F40",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  input: {
    background: "#e6ffed",
    border: "1px solid #68BA7F",
    borderRadius: "8px",
    padding: "12px 14px",
    color: "#253D2C",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
  },
  errorBox: {
    background: "#fff0f0",
    border: "1px solid #e06060",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#c03030",
    fontSize: "13px",
  },
  submitBtn: {
    background: "linear-gradient(135deg, #253D2C, #2E6F40)",
    border: "none",
    borderRadius: "8px",
    padding: "14px",
    color: "#ffffff",
    fontFamily: "'Space Mono', monospace",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    letterSpacing: "0.5px",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s",
  },
  spinner: {
    width: "18px",
    height: "18px",
    border: "2px solid #ffffff33",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    display: "inline-block",
  },
  footer: {
    marginTop: "24px",
    textAlign: "center",
    fontSize: "11px",
    color: "#68BA7F",
    fontFamily: "'Space Mono', monospace",
    letterSpacing: "0.5px",
  },
};
