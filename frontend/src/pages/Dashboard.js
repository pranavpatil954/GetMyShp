// ============================================================
// Dashboard — Main GIS Portal UI
// ============================================================
import React, { useState, useEffect } from "react";
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
            <p style={styles.sideInfoTitle}>DATA SOURCE</p>
            <p style={{ ...styles.sideInfoText, color: '#253D2C', fontWeight: '600', marginBottom: '8px' }}>GADM v2.8 (2015)</p>
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
                        style={{ accentColor: "#2E6F40" }} />
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
                  CRS: WGS84 (EPSG:4326)<br />
                  Data Source: GADM 2015
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
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; CartoDB'
                    />
                    {previewGeoJSON && (
                      <>
                        <GeoJSON key={JSON.stringify(previewGeoJSON)}
                          data={previewGeoJSON}
                          style={{
                            color: "#2E6F40",
                            weight: 2.5,
                            opacity: 0.9,
                            fillColor: "#68BA7F",
                            fillOpacity: 0.25,
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
      <div style={styles.dataSourceBanner}>
        <span style={{ fontSize: '16px' }}>📊</span>
        <div>
          <p style={{ margin: 0, fontSize: '13px', color: '#253D2C', fontWeight: '600', fontFamily: "'Space Mono', monospace" }}>Data Source: GADM 2015</p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#2E6F40', lineHeight: '1.5' }}>
            All administrative boundary data is sourced from GADM (Global Administrative Areas) v2.8 for educational and non-commercial research purposes.
            Visit <a href="https://gadm.org/license.html" target="_blank" rel="noopener noreferrer" style={{ color: '#253D2C', textDecoration: 'underline' }}>gadm.org/license</a> for licensing details.
          </p>
        </div>
      </div>
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
          {["React", "Node.js", "Express", "Leaflet", "shp-write", "JWT", "GeoJSON", "WGS84", "GADM"].map((t) => (
            <span key={t} style={styles.techTag}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
// Lush Forest palette: #2E6F40, #CFFFDC, #68BA7F, #253D2C
const styles = {
  shell: {
    display: "flex", flexDirection: "column", height: "100vh",
    background: "#CFFFDC", fontFamily: "'DM Sans', sans-serif", color: "#253D2C", overflow: "hidden",
  },
  navbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 24px", height: "56px",
    background: "#ffffff", borderBottom: "1px solid #68BA7F",
    flexShrink: 0, boxShadow: "0 1px 4px rgba(37, 61, 44, 0.08)",
  },
  navLeft: { display: "flex", alignItems: "center", gap: "10px" },
  navLogo: { fontFamily: "'Space Mono', monospace", fontSize: "18px", fontWeight: "700", color: "#2E6F40" },
  navBadge: {
    fontFamily: "'Space Mono', monospace", fontSize: "9px", letterSpacing: "2px",
    border: "1px solid #2E6F40", color: "#2E6F40", padding: "2px 6px", borderRadius: "3px",
  },
  navCenter: { flex: 1, display: "flex", justifyContent: "center" },
  selectionPill: {
    fontSize: "12px", color: "#2E6F40", background: "#e6ffed",
    padding: "5px 14px", borderRadius: "20px", border: "1px solid #68BA7F",
    fontFamily: "'Space Mono', monospace", letterSpacing: "0.3px",
  },
  navRight: { display: "flex", alignItems: "center", gap: "14px" },
  navUser: { fontSize: "13px", color: "#2E6F40" },
  logoutBtn: {
    background: "transparent", border: "1px solid #68BA7F", borderRadius: "6px",
    color: "#2E6F40", padding: "6px 14px", cursor: "pointer", fontSize: "12px",
    fontFamily: "'Space Mono', monospace", transition: "all 0.2s",
  },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: {
    width: "200px", background: "#ffffff", borderRight: "1px solid #68BA7F",
    display: "flex", flexDirection: "column", padding: "16px 8px", gap: "4px", flexShrink: 0,
  },
  sideItem: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 12px", borderRadius: "8px", border: "none",
    background: "transparent", color: "#2E6F40", cursor: "pointer",
    fontSize: "13px", fontFamily: "'DM Sans', sans-serif", textAlign: "left",
    transition: "all 0.15s",
  },
  sideItemActive: { background: "#2E6F40", color: "#ffffff" },
  sideIcon: { fontSize: "16px", width: "20px", textAlign: "center" },
  sideLabel: { fontWeight: "500" },
  sideInfo: { marginTop: "auto", padding: "12px 12px 4px", borderTop: "1px solid #68BA7F" },
  sideInfoTitle: { fontSize: "9px", letterSpacing: "2px", color: "#68BA7F", fontFamily: "'Space Mono', monospace", marginBottom: "8px" },
  sideInfoText: { fontSize: "11px", color: "#2E6F40", fontFamily: "'Space Mono', monospace", lineHeight: "1.8" },
  main: { flex: 1, overflow: "auto", padding: "24px" },
  mainInner: { display: "flex", gap: "24px", height: "100%", minHeight: "calc(100vh - 104px)" },
  controls: {
    width: "320px", flexShrink: 0, background: "#ffffff",
    border: "1px solid #68BA7F", borderRadius: "12px",
    padding: "24px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto",
    boxShadow: "0 2px 8px rgba(37, 61, 44, 0.06)",
  },
  controlsTitle: { fontFamily: "'Space Mono', monospace", fontSize: "16px", color: "#253D2C", margin: 0 },
  controlsSubtitle: { fontSize: "12px", color: "#68BA7F", margin: 0, marginTop: "-8px" },
  searchInput: {
    background: "#e6ffed", border: "1px solid #68BA7F", borderRadius: "8px",
    padding: "10px 12px", color: "#253D2C", fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif", outline: "none",
  },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "5px" },
  fieldLabel: { fontSize: "10px", fontFamily: "'Space Mono', monospace", color: "#2E6F40", letterSpacing: "1px", textTransform: "uppercase" },
  select: {
    background: "#e6ffed", border: "1px solid #68BA7F", borderRadius: "8px",
    padding: "10px 12px", color: "#253D2C", fontSize: "13px",
    fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer",
  },
  selectDisabled: { opacity: 0.4, cursor: "not-allowed" },
  modeSection: { display: "flex", flexDirection: "column", gap: "8px" },
  modeTitle: { fontSize: "10px", fontFamily: "'Space Mono', monospace", color: "#2E6F40", letterSpacing: "1px", textTransform: "uppercase", margin: 0 },
  modeOption: { display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", padding: "8px", background: "#e6ffed", borderRadius: "7px", border: "1px solid #68BA7F" },
  modeLabel: { display: "block", fontSize: "13px", color: "#253D2C", fontWeight: "500" },
  modeDesc: { display: "block", fontSize: "11px", color: "#68BA7F", marginTop: "2px" },
  errorBox: { background: "#fff0f0", border: "1px solid #e06060", borderRadius: "7px", padding: "10px 12px", color: "#c03030", fontSize: "12px" },
  successBox: { background: "#e6ffed", border: "1px solid #2E6F40", borderRadius: "7px", padding: "10px 12px", color: "#2E6F40", fontSize: "12px" },
  dlBtn: {
    background: "linear-gradient(135deg, #253D2C, #2E6F40)", border: "none",
    borderRadius: "8px", padding: "14px", color: "#ffffff",
    fontFamily: "'Space Mono', monospace", fontSize: "13px", fontWeight: "700",
    cursor: "pointer", transition: "opacity 0.2s",
  },
  dlBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  hint: { fontSize: "10px", color: "#68BA7F", fontFamily: "'Space Mono', monospace", lineHeight: "1.7", margin: 0 },
  mapPanel: { flex: 1, display: "flex", flexDirection: "column", background: "#ffffff", border: "1px solid #68BA7F", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(37, 61, 44, 0.06)" },
  mapHeader: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 18px", borderBottom: "1px solid #68BA7F" },
  mapTitle: { fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#2E6F40", letterSpacing: "1px" },
  mapLoading: { fontSize: "11px", color: "#2E6F40", animation: "pulse 1s infinite" },
  mapCount: { marginLeft: "auto", fontSize: "11px", color: "#68BA7F", fontFamily: "'Space Mono', monospace" },
  mapWrapper: { flex: 1, position: "relative" },
  mapContainer: { width: "100%", height: "100%", minHeight: "500px" },
  mapOverlay: {
    position: "absolute", inset: 0, display: "flex", alignItems: "center",
    justifyContent: "center", pointerEvents: "none", zIndex: 999,
  },
  mapOverlayText: { background: "#ffffffee", border: "1px solid #68BA7F", borderRadius: "8px", padding: "10px 20px", fontSize: "13px", color: "#2E6F40", fontFamily: "'Space Mono', monospace" },
  placeholder: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: "12px" },
  placeholderIcon: { fontSize: "48px", opacity: 0.3 },
  placeholderText: { fontSize: "18px", color: "#2E6F40", fontFamily: "'Space Mono', monospace" },
  placeholderSub: { fontSize: "12px", color: "#68BA7F" },
  aboutPanel: { maxWidth: "800px", padding: "8px" },
  dataSourceBanner: {
    display: "flex", alignItems: "flex-start", gap: "12px",
    background: "#e6ffed", border: "1px solid #2E6F40", borderRadius: "10px",
    padding: "16px 20px", marginBottom: "24px",
  },
  aboutTitle: { fontFamily: "'Space Mono', monospace", fontSize: "22px", color: "#2E6F40", marginBottom: "8px" },
  aboutQuote: { fontStyle: "italic", color: "#68BA7F", borderLeft: "3px solid #2E6F40", paddingLeft: "16px", marginBottom: "28px", fontSize: "14px" },
  aboutGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" },
  aboutCard: { background: "#ffffff", border: "1px solid #68BA7F", borderRadius: "10px", padding: "20px" },
  aboutCardIcon: { fontSize: "24px", display: "block", marginBottom: "10px" },
  aboutCardTitle: { fontFamily: "'Space Mono', monospace", fontSize: "13px", color: "#2E6F40", marginBottom: "6px" },
  aboutCardDesc: { fontSize: "12px", color: "#253D2C", lineHeight: "1.6" },
  techStack: { background: "#ffffff", border: "1px solid #68BA7F", borderRadius: "10px", padding: "20px" },
  techTitle: { fontSize: "9px", letterSpacing: "2px", color: "#68BA7F", fontFamily: "'Space Mono', monospace", marginBottom: "12px" },
  techTags: { display: "flex", flexWrap: "wrap", gap: "8px" },
  techTag: { background: "#2E6F40", color: "#CFFFDC", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontFamily: "'Space Mono', monospace" },
};
