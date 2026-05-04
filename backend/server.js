// ============================================================
// GIS Portal — Backend Server
// Node.js + Express + MongoDB (Mongoose)
// ============================================================

// Load environment variables FIRST (before anything else uses them)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const connectDB = require("./db");           // MongoDB connection helper
const authRoutes = require("./routes/auth");
const gisRoutes = require("./routes/gis");
const adminRoutes = require("./routes/admin"); // Admin stats endpoints

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store in memory
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow GeoJSON files
    if (file.originalname.endsWith(".geojson") || file.mimetype === "application/geo+json") {
      cb(null, true);
    } else {
      cb(new Error("Only .geojson files are allowed"), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// ── In-Memory GeoJSON Cache ───────────────────────────────────
// Loaded ONCE at startup — never re-read from disk per request
const DATA_DIR = path.join(__dirname, "data");
const cache = {};

const levels = ["admin0", "admin1", "admin2", "admin3", "admin4"];

console.log("📂 Loading GeoJSON data into memory...");
for (const level of levels) {
  const filePath = path.join(DATA_DIR, `${level}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      cache[level] = JSON.parse(raw);
      console.log(`  ✅ ${level}.json — ${cache[level].features?.length ?? 0} features`);
    } catch (e) {
      console.error(`  ❌ Failed to parse ${level}.json:`, e.message);
      cache[level] = { type: "FeatureCollection", features: [] };
    }
  } else {
    console.warn(`  ⚠️  ${level}.json not found — using empty placeholder`);
    cache[level] = { type: "FeatureCollection", features: [] };
  }
}
console.log("✅ All data loaded.\n");

// Make cache accessible to routes
app.locals.cache = cache;

// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);          // Admin stats routes

// Use multer for specified endpoint, then route to gis routes
app.use("/api/gis/upload-convert", upload.single("file"));
app.use("/api/gis", gisRoutes);

// ── Health check ─────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "GetMySHP API running 🌍" }));

// ── Start the server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
