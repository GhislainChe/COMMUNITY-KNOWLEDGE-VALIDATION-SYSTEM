const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/practices
 * Creates a new practice.
 * Protected: user must be logged in.
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, description, steps } = req.body;

    // Validate input (basic)
    if (!title || !description || !steps) {
      return res.status(400).json({ message: "title, description, and steps are required" });
    }

    // req.user comes from JWT payload (set by requireAuth)
    const userId = req.user.userId;

    const [result] = await pool.query(
      "INSERT INTO practices (userId, title, description, steps) VALUES (?, ?, ?, ?)",
      [userId, title, description, steps]
    );

    return res.status(201).json({
      message: "Practice created",
      practiceId: result.insertId,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET /api/practices
 * Public: lists practices.
 * Supports a simple search with ?q=
 */
router.get("/", async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q}%` : null;

    let sql =
      "SELECT practiceId, title, effectivenessScore, confidenceLevel, createdAt FROM practices WHERE status='ACTIVE' ORDER BY createdAt DESC";
    let params = [];

    if (q) {
      sql =
        "SELECT practiceId, title, effectivenessScore, confidenceLevel, createdAt FROM practices WHERE status='ACTIVE' AND title LIKE ? ORDER BY createdAt DESC";
      params = [q];
    }

    const [rows] = await pool.query(sql, params);
    return res.json({ practices: rows });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
