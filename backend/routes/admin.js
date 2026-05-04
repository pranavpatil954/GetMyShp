const express = require("express");
const db = require("../db");
const { verifyToken } = require("./auth");

const router = express.Router();

router.get("/stats", verifyToken, async (req, res) => {
  try {
    const totalUsers = db.read("users").length;
    const totalLogins = db.read("logins").length;
    const totalDownloads = db.read("downloads").length;

    res.json({ totalUsers, totalLogins, totalDownloads });
  } catch (err) {
    console.error("Admin stats error:", err.message);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

router.get("/recent-users", verifyToken, async (req, res) => {
  try {
    const allUsers = db.read("users");
    const users = allUsers.map(u => ({
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);

    res.json({ users });
  } catch (err) {
    console.error("Admin recent-users error:", err.message);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

router.get("/recent-downloads", verifyToken, async (req, res) => {
  try {
    const downloads = db.read("downloads")
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    res.json({ downloads });
  } catch (err) {
    console.error("Admin recent-downloads error:", err.message);
    res.status(500).json({ error: "Failed to fetch downloads." });
  }
});

router.get("/recent-logins", verifyToken, async (req, res) => {
  try {
    const logins = db.read("logins")
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    res.json({ logins });
  } catch (err) {
    console.error("Admin recent-logins error:", err.message);
    res.status(500).json({ error: "Failed to fetch logins." });
  }
});

module.exports = router;
