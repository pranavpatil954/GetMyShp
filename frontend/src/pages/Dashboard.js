// ============================================================
// Dashboard — Main GIS Portal UI
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "leaflet/dist/leaflet.css";

// ── Helper: fly map to geojson bounds ──────────────────────────
function FitBounds({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson || !geojson.features?.length) return;
    try {
      const L = require("leaflet");
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.flyToBounds(bounds, { padding: [30, 30] });
    } catch {}
  }, [geojson, map]);
  return null;
}

// ── Sidebar items ─────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "download", icon: "⬇", label: "Download Data" },
  { id: "favorites", icon: "★", label: "Favorites" },
  { id: "about", icon: "◎", label: "About" },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeNav, setActiveNav] = useState("download");

  // Cascading selection state
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selState, setSelState] = useState("");
  const [selDistrict, setSelDistrict] = useState("");
  const [selTaluka, setSelTaluka] = useState("");
  const [selVillage, setSelVillage] = useState("");

  const [downloadMode, setDownloadMode] = useState("boundary");
  const [previewGeoJSON, setPreviewGeoJSON] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Load states on mount ──────────────────────────────────
  useEffect(() => {
    axios.get("/api/gis/states").then((r) => setStates(r.data.states)).catch(() => {});
  }, []);

  // ── Cascading dropdown handlers ───────────────────────────
  const handleStateChange = async (val) => {
    setSelState(val); setSelDistrict(""); setSelTaluka(""); setSelVillage("");
    setDistricts([]); setTalukas([]); setVillages([]);
    if (!val) return;
    const r = await axios.get(`/api/gis/districts/${encodeURIComponent(val)}`);
    setDistricts(r.data.districts);
    await loadPreview({ state: val });
  };

  const handleDistrictChange = async (val) => {
    setSelDistrict(val); setSelTaluka(""); setSelVillage("");
    setTalukas([]); setVillages([]);
    if (!val) return;
    const r = await axios.get(`/api/gis/talukas/${encodeURIComponent(val)}`);
    setTalukas(r.data.talukas);
    await loadPreview({ state: selState, district: val });
  };

  const handleTalukaChange = async (val) => {
    setSelTaluka(val); setSelVillage(""); setVillages([]);
    if (!val) return;
    const r = await axios.get(`/api/gis/villages/${encodeURIComponent(val)}`);
    setVillages(r.data.villages);
    await loadPreview({ state: selState, district: selDistrict, taluka: val });
  };

  const handleVillageChange = async (val) => {
    setSelVillage(val);
    if (!val) return;
    await loadPreview({ state: selState, district: selDistrict, taluka: selTaluka, village: val });
  };

  // ── Preview ───────────────────────────────────────────────
  const loadPreview = async (filters) => {
    setLoading(true); setError("");
    try {
      const r = await axios.post("/api/gis/preview", filters);
      setPreviewGeoJSON(r.data);
    } catch (err) {
      setError(err.response?.data?.error || "Preview failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Download ──────────────────────────────────────────────
  const handleDownload = async () => {
    if (!selState) { setError("Please select at least a state."); return; }
    setDlLoading(true); setError(""); setSuccessMsg("");
    try {
      const res = await axios.post("/api/gis/download",
        { state: selState, district: selDistrict, taluka: selTaluka, village: selVillage, mode: downloadMode },
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${[selVillage, selTaluka, selDistrict, selState].filter(Boolean).join("_") || "india_admin"}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      setSuccessMsg("✅ Download started!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError("Download failed. Check your selection.");
    } finally {
      setDlLoading(false);
    }
  };

  // ── Filter dropdowns by search ────────────────────────────
  const filteredStates = states.filter((s) =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectionLabel = [selVillage, selTaluka, selDistrict, selState].filter(Boolean).join(", ") || "No selection";

  return (
    <div style={styles.shell}>
      {/* ── Top Navbar ─────────────────────────────────────── */}
      <header style={styles.navbar}>
        <div style={styles.navLeft}>
          <img src="/logo.png" alt="GetMySHP Logo" style={{ height: '24px', marginRight: '8px', objectFit: 'contain' }} />
          <span style={styles.navLogo}>GetMySHP</span>
        </div>
        <div style={styles.navCenter}>
          <span style={styles.selectionPill}>📍 {selectionLabel}</span>
        </div>
        <div style={styles.navRight}>
          <span style={styles.navUser}>👤 {user?.name}</span>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <div style={styles.body}>
        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside style={styles.sidebar}>
          {NAV_ITEMS.map((item) => (
            <button key={item.id}
              style={{ ...styles.sideItem, ...(activeNav === item.id ? styles.sideItemActive : {}) }}
              onClick={() => setActiveNav(item.id)}>
              <span style={styles.sideIcon}>{item.icon}</span>
              <span style={styles.sideLabel}>{item.label}</span>
            </button>
          ))}

          {/* Data info */}
          <div style={styles.sideInfo}>
            <p style={styles.sideInfoTitle}>DATA LEVELS</p>
            <p style={styles.sideInfoText}>admin0 · Country</p>
            <p style={styles.sideInfoText}>admin1 · State</p>
            <p style={styles.sideInfoText}>admin2 · District</p>
            <p style={styles.sideInfoText}>admin3 · Taluka</p>
            <p style={styles.sideInfoText}>admin4 · Village</p>
          </div>
        </aside>

        {/* ── Main Panel ───────────────────────────────────── */}
        <main style={styles.main}>

          {activeNav === "download" && (
            <div style={styles.mainInner}>
              {/* Left — controls */}
              <div style={styles.controls}>
                <h2 style={styles.controlsTitle}>Select Boundary</h2>
                <p style={styles.controlsSubtitle}>Choose a region to preview and download</p>

                {/* Search */}
                <input style={styles.searchInput} type="text"
                  placeholder="🔍  Search state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} />

                {/* Cascading dropdowns */}
                <DropdownField label="State" value={selState}
                  options={filteredStates} onChange={handleStateChange}
                  placeholder="— Select State —" />

                <DropdownField label="District" value={selDistrict}
                  options={districts} onChange={handleDistrictChange}
                  placeholder="— Select District —" disabled={!selState} />

                <DropdownField label="Taluka" value={selTaluka}
                  options={talukas} onChange={handleTalukaChange}
                  placeholder="— Select Taluka —" disabled={!selDistrict} />

                <DropdownField label="Village" value={selVillage}
                  options={villages} onChange={handleVillageChange}
                  placeholder="— Select Village —" disabled={!selTaluka} />

                {/* Download mode */}
                <div style={styles.modeSection}>
                  <p style={styles.modeTitle}>Download Mode</p>
                  {[
                    { val: "boundary", label: "Boundary Only", desc: "Outer boundary of selection" },
                    { val: "subunits", label: "Include Sub-units", desc: "Selection + child boundaries" },
                    { val: "full", label: "Full Hierarchy", desc: "All levels within selection" },
                  ].map((m) => (
                    <label key={m.val} style={styles.modeOption}>
                      <input type="radio" name="mode" value={m.val}
                        checked={downloadMode === m.val}
                        onChange={() => setDownloadMode(m.val)}
                        style={{ accentColor: "#2ecc71" }} />
                      <div>
                        <span style={styles.modeLabel}>{m.label}</span>
                        <span style={styles.modeDesc}>{m.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Messages */}
                {error && <div style={styles.errorBox}>⚠ {error}</div>}
                {successMsg && <div style={styles.successBox}>{successMsg}</div>}

                {/* Download button */}
                <button style={{ ...styles.dlBtn, ...((!selState || dlLoading) ? styles.dlBtnDisabled : {}) }}
                  onClick={handleDownload} disabled={!selState || dlLoading}>
                  {dlLoading ? "⏳ Preparing ZIP..." : "⬇ Download SHP"}
                </button>

                <p style={styles.hint}>
                  Output: .shp · .shx · .dbf · .prj · .geojson<br />
                  CRS: WGS84 (EPSG:4326)
                </p>
              </div>

              {/* Right — map */}
              <div style={styles.mapPanel}>
                <div style={styles.mapHeader}>
                  <span style={styles.mapTitle}>Live Preview</span>
                  {loading && <span style={styles.mapLoading}>⟳ Loading...</span>}
                  {previewGeoJSON && (
                    <span style={styles.mapCount}>
                      {previewGeoJSON.features?.length} feature(s)
                    </span>
                  )}
                </div>
                <div style={styles.mapWrapper}>
                  <MapContainer center={[20.5, 78.9]} zoom={5} style={styles.mapContainer}
                    zoomControl={true}>
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; CartoDB'
                    />
                    {previewGeoJSON && (
                      <>
                        <GeoJSON key={JSON.stringify(previewGeoJSON)}
                          data={previewGeoJSON}
                          style={{
                            color: "#2ecc71",
                            weight: 2,
                            opacity: 0.9,
                            fillColor: "#2ecc71",
                            fillOpacity: 0.15,
                          }} />
                        <FitBounds geojson={previewGeoJSON} />
                      </>
                    )}
                  </MapContainer>
                  {!previewGeoJSON && (
                    <div style={styles.mapOverlay}>
                      <p style={styles.mapOverlayText}>Select a region to preview boundary</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeNav === "favorites" && (
            <div style={styles.placeholder}>
              <span style={styles.placeholderIcon}>★</span>
              <p style={styles.placeholderText}>Saved regions will appear here.</p>
              <p style={styles.placeholderSub}>Feature coming soon.</p>
            </div>
          )}

          {activeNav === "about" && <AboutPanel />}
        </main>
      </div>
    </div>
  );
}

// ── Dropdown component ─────────────────────────────────────────
function DropdownField({ label, value, options, onChange, placeholder, disabled }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.fieldLabel}>{label}</label>
      <select style={{ ...styles.select, ...(disabled ? styles.selectDisabled : {}) }}
        value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

// ── About panel ───────────────────────────────────────────────
function AboutPanel() {
  return (
    <div style={styles.aboutPanel}>
      <h2 style={styles.aboutTitle}>GetMySHP</h2>
      <p style={styles.aboutQuote}>
        Get the shapefile you need—fast, simple, and precise.
      </p>
      <div style={styles.aboutGrid}>
        {[
          { icon: "🗺", title: "Administrative Data", desc: "Country → State → District → Taluka → Village boundary data for India" },
          { icon: "📦", title: "Shapefile Export", desc: "Download as .shp, .shx, .dbf, .prj ready for ArcGIS and QGIS" },
          { icon: "🌐", title: "GeoJSON Preview", desc: "Instant Leaflet map preview before download" },
          { icon: "🔒", title: "Secure Access", desc: "JWT-based auth ensures data integrity and access control" },
        ].map((card) => (
          <div key={card.title} style={styles.aboutCard}>
            <span style={styles.aboutCardIcon}>{card.icon}</span>
            <h3 style={styles.aboutCardTitle}>{card.title}</h3>
            <p style={styles.aboutCardDesc}>{card.desc}</p>
          </div>
        ))}
      </div>
      <div style={styles.techStack}>
        <p style={styles.techTitle}>TECH STACK</p>
        <div style={styles.techTags}>
          {["React", "Node.js", "Express", "Leaflet", "shp-write", "JWT", "GeoJSON", "WGS84"].map((t) => (
            <span key={t} style={styles.techTag}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = {
  shell: {
    display: "flex", flexDirection: "column", height: "100vh",
    background: "#070f0b", fontFamily: "'DM Sans', sans-serif", color: "#e8f5e9", overflow: "hidden",
  },
  navbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 24px", height: "56px",
    background: "#0a1a0f", borderBottom: "1px solid #1e4a30",
    flexShrink: 0,
  },
  navLeft: { display: "flex", alignItems: "center", gap: "10px" },
  navLogo: { fontFamily: "'Space Mono', monospace", fontSize: "18px", fontWeight: "700", color: "#7ddb9b" },
  navBadge: {
    fontFamily: "'Space Mono', monospace", fontSize: "9px", letterSpacing: "2px",
    border: "1px solid #2ecc71", color: "#2ecc71", padding: "2px 6px", borderRadius: "3px",
  },
  navCenter: { flex: 1, display: "flex", justifyContent: "center" },
  selectionPill: {
    fontSize: "12px", color: "#5a8a6a", background: "#0d1f14",
    padding: "5px 14px", borderRadius: "20px", border: "1px solid #1e4a30",
    fontFamily: "'Space Mono', monospace", letterSpacing: "0.3px",
  },
  navRight: { display: "flex", alignItems: "center", gap: "14px" },
  navUser: { fontSize: "13px", color: "#5a8a6a" },
  logoutBtn: {
    background: "transparent", border: "1px solid #1e4a30", borderRadius: "6px",
    color: "#5a8a6a", padding: "6px 14px", cursor: "pointer", fontSize: "12px",
    fontFamily: "'Space Mono', monospace",
  },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: {
    width: "200px", background: "#0a1a0f", borderRight: "1px solid #1e4a30",
    display: "flex", flexDirection: "column", padding: "16px 8px", gap: "4px", flexShrink: 0,
  },
  sideItem: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 12px", borderRadius: "8px", border: "none",
    background: "transparent", color: "#4a7a5a", cursor: "pointer",
    fontSize: "13px", fontFamily: "'DM Sans', sans-serif", textAlign: "left",
    transition: "all 0.15s",
  },
  sideItemActive: { background: "#1e4a30", color: "#7ddb9b" },
  sideIcon: { fontSize: "16px", width: "20px", textAlign: "center" },
  sideLabel: { fontWeight: "500" },
  sideInfo: { marginTop: "auto", padding: "12px 12px 4px", borderTop: "1px solid #1e4a30" },
  sideInfoTitle: { fontSize: "9px", letterSpacing: "2px", color: "#2a4a34", fontFamily: "'Space Mono', monospace", marginBottom: "8px" },
  sideInfoText: { fontSize: "11px", color: "#2e5a3e", fontFamily: "'Space Mono', monospace", lineHeight: "1.8" },
  main: { flex: 1, overflow: "auto", padding: "24px" },
  mainInner: { display: "flex", gap: "24px", height: "100%", minHeight: "calc(100vh - 104px)" },
  controls: {
    width: "320px", flexShrink: 0, background: "#0a1a0f",
    border: "1px solid #1e4a30", borderRadius: "12px",
    padding: "24px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto",
  },
  controlsTitle: { fontFamily: "'Space Mono', monospace", fontSize: "16px", color: "#e8f5e9", margin: 0 },
  controlsSubtitle: { fontSize: "12px", color: "#4a7a5a", margin: 0, marginTop: "-8px" },
  searchInput: {
    background: "#0d1f14", border: "1px solid #1e4a30", borderRadius: "8px",
    padding: "10px 12px", color: "#e8f5e9", fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif", outline: "none",
  },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "5px" },
  fieldLabel: { fontSize: "10px", fontFamily: "'Space Mono', monospace", color: "#4a7a5a", letterSpacing: "1px", textTransform: "uppercase" },
  select: {
    background: "#0d1f14", border: "1px solid #1e4a30", borderRadius: "8px",
    padding: "10px 12px", color: "#e8f5e9", fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer",
  },
  selectDisabled: { opacity: 0.4, cursor: "not-allowed" },
  modeSection: { display: "flex", flexDirection: "column", gap: "8px" },
  modeTitle: { fontSize: "10px", fontFamily: "'Space Mono', monospace", color: "#4a7a5a", letterSpacing: "1px", textTransform: "uppercase", margin: 0 },
  modeOption: { display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", padding: "8px", background: "#0d1f14", borderRadius: "7px", border: "1px solid #1a3a24" },
  modeLabel: { display: "block", fontSize: "13px", color: "#c8e6c9", fontWeight: "500" },
  modeDesc: { display: "block", fontSize: "11px", color: "#4a7a5a", marginTop: "2px" },
  errorBox: { background: "#1a0a0a", border: "1px solid #5a2020", borderRadius: "7px", padding: "10px 12px", color: "#f08080", fontSize: "12px" },
  successBox: { background: "#0a1a0f", border: "1px solid #2ecc71", borderRadius: "7px", padding: "10px 12px", color: "#2ecc71", fontSize: "12px" },
  dlBtn: {
    background: "linear-gradient(135deg, #1e7a44, #2ecc71)", border: "none",
    borderRadius: "8px", padding: "14px", color: "#000",
    fontFamily: "'Space Mono', monospace", fontSize: "13px", fontWeight: "700",
    cursor: "pointer", transition: "opacity 0.2s",
  },
  dlBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  hint: { fontSize: "10px", color: "#2a4a34", fontFamily: "'Space Mono', monospace", lineHeight: "1.7", margin: 0 },
  mapPanel: { flex: 1, display: "flex", flexDirection: "column", background: "#0a1a0f", border: "1px solid #1e4a30", borderRadius: "12px", overflow: "hidden" },
  mapHeader: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 18px", borderBottom: "1px solid #1e4a30" },
  mapTitle: { fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#5a8a6a", letterSpacing: "1px" },
  mapLoading: { fontSize: "11px", color: "#2ecc71", animation: "pulse 1s infinite" },
  mapCount: { marginLeft: "auto", fontSize: "11px", color: "#4a7a5a", fontFamily: "'Space Mono', monospace" },
  mapWrapper: { flex: 1, position: "relative" },
  mapContainer: { width: "100%", height: "100%", minHeight: "500px" },
  mapOverlay: {
    position: "absolute", inset: 0, display: "flex", alignItems: "center",
    justifyContent: "center", pointerEvents: "none", zIndex: 999,
  },
  mapOverlayText: { background: "#0a1a0fee", border: "1px solid #1e4a30", borderRadius: "8px", padding: "10px 20px", fontSize: "13px", color: "#4a7a5a", fontFamily: "'Space Mono', monospace" },
  placeholder: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: "12px" },
  placeholderIcon: { fontSize: "48px", opacity: 0.3 },
  placeholderText: { fontSize: "18px", color: "#4a7a5a", fontFamily: "'Space Mono', monospace" },
  placeholderSub: { fontSize: "12px", color: "#2a4a34" },
  aboutPanel: { maxWidth: "800px", padding: "8px" },
  aboutTitle: { fontFamily: "'Space Mono', monospace", fontSize: "22px", color: "#7ddb9b", marginBottom: "8px" },
  aboutQuote: { fontStyle: "italic", color: "#4a7a5a", borderLeft: "3px solid #2ecc71", paddingLeft: "16px", marginBottom: "28px", fontSize: "14px" },
  aboutGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" },
  aboutCard: { background: "#0a1a0f", border: "1px solid #1e4a30", borderRadius: "10px", padding: "20px" },
  aboutCardIcon: { fontSize: "24px", display: "block", marginBottom: "10px" },
  aboutCardTitle: { fontFamily: "'Space Mono', monospace", fontSize: "13px", color: "#7ddb9b", marginBottom: "6px" },
  aboutCardDesc: { fontSize: "12px", color: "#5a8a6a", lineHeight: "1.6" },
  techStack: { background: "#0a1a0f", border: "1px solid #1e4a30", borderRadius: "10px", padding: "20px" },
  techTitle: { fontSize: "9px", letterSpacing: "2px", color: "#2a4a34", fontFamily: "'Space Mono', monospace", marginBottom: "12px" },
  techTags: { display: "flex", flexWrap: "wrap", gap: "8px" },
  techTag: { background: "#1e4a30", color: "#7ddb9b", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontFamily: "'Space Mono', monospace" },
};
