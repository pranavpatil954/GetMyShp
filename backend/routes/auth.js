// ============================================================
// Auth Routes — /api/auth
// JWT-based auth with JSON file storage (no external DB needed!)
// ============================================================

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db"); // Using the custom JSON DB

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "gis_portal_secret_key_2024";

// ── POST /api/auth/register ───────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields required." });

    const existing = db.findOne("users", (u) => u.email === email.toLowerCase());
    if (existing)
      return res.status(409).json({ error: "Email already registered." });

    const hashed = await bcrypt.hash(password, 10);

    const user = db.insert("users", {
      name,
      email: email.toLowerCase(),
      password: hashed,
      createdAt: new Date().toISOString(),
      lastLogin: null
    });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required." });

    const user = db.findOne("users", (u) => u.email === email.toLowerCase());
    if (!user) return res.status(401).json({ error: "Invalid credentials." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials." });

    // Update lastLogin
    db.update("users", user._id, { lastLogin: new Date().toISOString() });

    // Log login activity
    db.insert("logins", {
      userId: user._id,
      email: user.email,
      ip: req.ip || req.connection?.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      timestamp: new Date().toISOString()
    });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided." });

  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = router;
module.exports.verifyToken = verifyToken;
