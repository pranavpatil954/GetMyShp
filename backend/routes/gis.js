// ============================================================
// GIS Routes — /api/gis
// Filter GeoJSON + convert to Shapefile ZIP for download
// ============================================================

const express = require("express");
const archiver = require("archiver");
const { verifyToken } = require("./auth");
const path = require("path");
const os = require("os");
const fs = require("fs");
const geojson2shp = require("geojson2shp");
const AdmZip = require("adm-zip");
const db = require("../db"); // Use local JSON db

const router = express.Router();

// ── Helper: Convert GeoJSON to Shapefile components ────────
async function convertGeojsonToShapefiles(geojson, tempDir, label) {
  try {
    console.log(`🔄 Converting GeoJSON to shapefile using geojson2shp...`);
    const zipPath = path.join(tempDir, `${label}-shp-zip`);
    await geojson2shp.convert(geojson, zipPath);
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    const fileMap = new Map();
    for (const entry of entries) {
      const originalName = entry.name;
      const ext = path.extname(originalName);
      const newName = `${label}${ext}`;
      const newPath = path.join(tempDir, newName);
      zip.extractEntryTo(entry, tempDir, true);
      const originalPath = path.join(tempDir, originalName);
      if (fs.existsSync(originalPath)) {
        fs.renameSync(originalPath, newPath);
        fileMap.set(ext, newPath);
      }
    }
    fs.unlinkSync(zipPath);
    return fileMap;
  } catch (err) {
    console.error("❌ Shapefile conversion error:", err.message);
    throw err;
  }
}


// ── Helper: get mapped property value ─────────────────────────
function getPropValue(props, semanticKey) {
  const map = {
    STATE: ["STATE", "NAME_1"],
    DISTRICT: ["DISTRICT", "NAME_2"],
    TALUKA: ["TALUKA", "NAME_3"],
    VILLAGE: ["VILLAGE", "NAME_4"]
  };
  const keys = map[semanticKey] || [semanticKey];
  for (const k of keys) {
    if (props[k] !== undefined && props[k] !== null) return props[k];
  }
  return undefined;
}

// ── Helper: get unique values from a property across all levels ──
function getUnique(cache, property, filters = {}) {
  const results = new Set();

  for (const level of Object.values(cache)) {
    const features = level.features || [];
    for (const f of features) {
      const props = f.properties || {};

      // Apply all active filters
      let match = true;
      for (const [key, val] of Object.entries(filters)) {
        if (val && getPropValue(props, key) !== val) {
          match = false;
          break;
        }
      }

      if (match) {
        const propVal = getPropValue(props, property);
        if (propVal) {
          results.add(propVal);
        }
      }
    }
  }

  return [...results].sort();
}

// ── Helper: filter features across all levels ─────────────────
function filterFeatures(cache, filters = {}) {
  const results = [];

  for (const level of Object.values(cache)) {
    const features = level.features || [];
    for (const f of features) {
      const props = f.properties || {};
      let match = true;
      for (const [key, val] of Object.entries(filters)) {
        if (val && getPropValue(props, key) !== val) {
          match = false;
          break;
        }
      }
      if (match) results.push(f);
    }
  }

  return results;
}

// ── Helper: GeoJSON → Shapefile-like structure for shp-write ──
function geojsonToShpInput(features) {
  return {
    type: "FeatureCollection",
    features: features,
  };
}

// ── GET /api/gis/states ───────────────────────────────────────
router.get("/states", verifyToken, (req, res) => {
  const cache = req.app.locals.cache;
  const searchCache = cache.admin1 ? { admin1: cache.admin1 } : cache;
  const states = getUnique(searchCache, "STATE");
  res.json({ states });
});

// ── GET /api/gis/districts/:state ────────────────────────────
router.get("/districts/:state", verifyToken, (req, res) => {
  const cache = req.app.locals.cache;
  const searchCache = cache.admin2 ? { admin2: cache.admin2 } : cache;
  const districts = getUnique(searchCache, "DISTRICT", { STATE: req.params.state });
  res.json({ districts });
});

// ── GET /api/gis/talukas/:district ───────────────────────────
router.get("/talukas/:district", verifyToken, (req, res) => {
  const cache = req.app.locals.cache;
  const searchCache = cache.admin3 ? { admin3: cache.admin3 } : cache;
  const talukas = getUnique(searchCache, "TALUKA", { DISTRICT: req.params.district });
  res.json({ talukas });
});

// ── GET /api/gis/villages/:taluka ────────────────────────────
router.get("/villages/:taluka", verifyToken, (req, res) => {
  const cache = req.app.locals.cache;
  const searchCache = cache.admin4 ? { admin4: cache.admin4 } : cache;
  const villages = getUnique(searchCache, "VILLAGE", { TALUKA: req.params.taluka });
  res.json({ villages });
});

// ── POST /api/gis/preview ─────────────────────────────────────
// Returns filtered GeoJSON for Leaflet map preview
router.post("/preview", verifyToken, (req, res) => {
  const cache = req.app.locals.cache;
  const { state, district, taluka, village } = req.body;

  const filters = {};
  if (state) filters.STATE = state;
  if (district) filters.DISTRICT = district;
  if (taluka) filters.TALUKA = taluka;
  if (village) filters.VILLAGE = village;

  let features = [];
  if (village) {
    features = filterFeatures({ admin4: cache.admin4 }, filters);
  } else if (taluka) {
    features = filterFeatures({ admin4: cache.admin4 }, filters);
    if (!features.length) features = filterFeatures({ admin3: cache.admin3 }, filters);
  } else if (district) {
    features = filterFeatures({ admin3: cache.admin3 }, filters);
    if (!features.length) features = filterFeatures({ admin2: cache.admin2 }, filters);
  } else if (state) {
    features = filterFeatures({ admin2: cache.admin2 }, filters);
    if (!features.length) features = filterFeatures({ admin1: cache.admin1 }, filters);
  } else {
    features = filterFeatures({ admin1: cache.admin1 }, filters);
  }

  if (features.length === 0) {
    return res.status(404).json({ error: "No features found for the selected area." });
  }

  res.json({
    type: "FeatureCollection",
    features,
  });
});

// ── POST /api/gis/download ────────────────────────────────────
// Filters GeoJSON and returns a ZIP with actual Shapefile (.shp, .shx, .dbf)
router.post("/download", verifyToken, async (req, res) => {
  const cache = req.app.locals.cache;
  const { state, district, taluka, village, mode } = req.body;
  // mode: "boundary" | "subunits" | "full"

  const filters = {};
  if (state) filters.STATE = state;
  if (district) filters.DISTRICT = district;
  if (taluka) filters.TALUKA = taluka;
  if (village) filters.VILLAGE = village;

  let targetCache = {};
  if (mode === "boundary") {
    // Exact level of selection
    if (village) targetCache = { admin4: cache.admin4 };
    else if (taluka) targetCache = { admin3: cache.admin3 };
    else if (district) targetCache = { admin2: cache.admin2 };
    else if (state) targetCache = { admin1: cache.admin1 };
    else targetCache = { admin0: cache.admin0 };
  } else if (mode === "subunits") {
    // One level down
    if (village) targetCache = { admin4: cache.admin4 }; // Can't go below village
    else if (taluka) targetCache = { admin4: cache.admin4 };
    else if (district) targetCache = { admin3: cache.admin3 };
    else if (state) targetCache = { admin2: cache.admin2 };
    else targetCache = { admin1: cache.admin1 };
  } else {
    // "full" -> search all levels
    targetCache = cache;
  }

  let features = filterFeatures(targetCache, filters);

  // If subunits requested but none exist, fallback to boundary
  if (features.length === 0 && mode === "subunits") {
    if (taluka) targetCache = { admin3: cache.admin3 };
    else if (district) targetCache = { admin2: cache.admin2 };
    else if (state) targetCache = { admin1: cache.admin1 };
    features = filterFeatures(targetCache, filters);
  }

  // Ensure 'boundary' mode strictly limits to one outermost matching polygon
  // (Prevents multipart overlaps if properties matched multiple independent chunks)
  if (mode === "boundary" && features.length > 0) {
    // Try to merge if they are the same entity, or just take the first largest one.
    // For simplicity, we keep the original behavior of grabbing the first feature, 
    // but now it is guaranteed to be from the CORRECT admin level.
    features = [features[0]];
  }

  if (features.length === 0) {
    return res.status(404).json({ error: "No data found for selection." });
  }

  // Build filename
  const label = [village, taluka, district, state].filter(Boolean).join("_").replace(/\s+/g, "-");
  const tempDir = path.join(os.tmpdir(), `gis-export-${Date.now()}`);
  const geojson = { type: "FeatureCollection", features };

  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const geojsonFile = path.join(tempDir, `${label}.geojson`);

    // Step 1: Write GeoJSON to temp file
    fs.writeFileSync(geojsonFile, JSON.stringify(geojson));
    console.log(`📝 GeoJSON written: ${geojsonFile}`);

    // Step 2: Convert GeoJSON to Shapefile
    let shapefileMap = null;
    try {
      shapefileMap = await convertGeojsonToShapefiles(geojson, tempDir, label);
    } catch (err) {
      console.error("❌ Shapefile conversion failed:", err.message);
      console.warn("⚠️  Will provide GeoJSON only");
    }

    // Step 3: Create ZIP archive to send to client
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${label || "india_admin"}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      res.status(500).end();
    });

    archive.pipe(res);

    // Step 4: Add shapefile components to ZIP
    const shpFile = path.join(tempDir, `${label}.shp`);
    const shxFile = path.join(tempDir, `${label}.shx`);
    const dbfFile = path.join(tempDir, `${label}.dbf`);
    const prjFile = path.join(tempDir, `${label}.prj`);
    
    let hasShapefile = false;
    let filesAdded = [];
    
    if (fs.existsSync(shpFile)) {
      archive.file(shpFile, { name: `${label}.shp` });
      filesAdded.push(`${label}.shp`);
    }
    if (fs.existsSync(shxFile)) {
      archive.file(shxFile, { name: `${label}.shx` });
      filesAdded.push(`${label}.shx`);
    }
    if (fs.existsSync(dbfFile)) {
      archive.file(dbfFile, { name: `${label}.dbf` });
      filesAdded.push(`${label}.dbf`);
    }
    if (fs.existsSync(prjFile)) {
      archive.file(prjFile, { name: `${label}.prj` });
      filesAdded.push(`${label}.prj`);
    }
    
    if (filesAdded.length >= 3) {
      hasShapefile = true;
    }

    // Step 5: Add PRJ (projection) file if not already added
    if (!filesAdded.includes(`${label}.prj`)) {
      const prj = `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`;
      archive.append(prj, { name: `${label}.prj` });
    }
    
    // Step 6: Add CPG (character encoding) file
    archive.append("UTF-8", { name: `${label}.cpg` });

    // Step 7: Add GeoJSON file
    archive.append(JSON.stringify(geojson, null, 2), { name: `${label}.geojson` });

    // Step 8: Add README
    const readme = `🗺️  GetMySHP - DATA DOWNLOAD
${hasShapefile ? '=' : '='}====================================

${hasShapefile ? '✅ SHAPEFILE FORMAT - READY IN QGIS/ARCGIS!' : '⚠️  GEOJSON FORMAT (Shapefile generation unavailable)'}

Selection: ${JSON.stringify({ state, district, taluka, village }, null, 2)}
Mode: ${mode}
Features: ${features.length}
CRS: WGS84 (EPSG:4326)
Generated: ${new Date().toISOString()}

📦 FILES IN THIS ZIP
====================
${hasShapefile ? `✓ ${label}.shp  — Geometry file
✓ ${label}.shx  — Shape index
✓ ${label}.dbf  — Attribute database
✓ ${label}.prj  — Projection (WGS84)
✓ ${label}.cpg  — Character encoding
✓ ${label}.geojson — GeoJSON copy` : `✓ ${label}.geojson — GeoJSON data
✓ ${label}.prj  — Projection (WGS84)
✓ ${label}.cpg  — Character encoding`}

⚠️  IMPORTANT: KEEP FILES TOGETHER
===================================
These files MUST stay in the SAME FOLDER:
  .shp + .shx + .dbf + .prj + .cpg

Do NOT split them into different folders!`;
    archive.append(readme, { name: "README.txt" });

    // Finalize archive
    await archive.finalize();

    // ── Log this download to local JSON store ─────────────────
    // Determine which admin level was primarily targeted
    let adminLevel = "admin0";
    if (village) adminLevel = "admin4";
    else if (taluka) adminLevel = "admin3";
    else if (district) adminLevel = "admin2";
    else if (state) adminLevel = "admin1";

    try {
      db.insert("downloads", {
        userId: req.user.id,
        email: req.user.email,
        dataset: label || "india_admin",
        adminLevel,
        mode: mode || "boundary",
        state: state || null,
        district: district || null,
        taluka: taluka || null,
        village: village || null,
        featureCount: features.length,
        timestamp: new Date().toISOString()
      });
      console.log(`📊 Download logged: ${req.user.email} → ${label}`);
    } catch (logErr) {
      console.error("⚠️  Failed to log download:", logErr.message);
    }

  } catch (err) {
    console.error("❌ Download error:", err.message);
    res.status(500).json({ error: `Download failed: ${err.message}` });
  } finally {
    // Cleanup temp directory
    setTimeout(() => {
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (err) {}
    }, 1500);
  }
});

module.exports = router;
