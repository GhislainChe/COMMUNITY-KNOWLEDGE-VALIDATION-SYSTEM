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
      "SELECT p.practiceId, p.title, p.description, p.steps, p.effectivenessScore, p.confidenceLevel, p.createdAt, u.fullName AS authorName FROM practices p JOIN users u ON u.userId = p.userId WHERE p.status='ACTIVE' ORDER BY p.createdAt DESC";
    let params = [];

    if (q) {
      sql =
        "SELECT p.practiceId, p.title, p.description, p.steps, p.effectivenessScore, p.confidenceLevel, p.createdAt, u.fullName AS authorName FROM practices p JOIN users u ON u.userId = p.userId WHERE p.status='ACTIVE' ORDER BY createdAt DESC";
      params = [q];
    }

    const [rows] = await pool.query(sql, params);
    return res.json({ practices: rows });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET /api/practices/:practiceId
 * Public: returns a single practice detail + stats.
 */
router.get("/:practiceId", async (req, res) => {
  try {
    const practiceId = Number(req.params.practiceId);
    if (!Number.isInteger(practiceId) || practiceId <= 0) {
      return res.status(400).json({ message: "Invalid practiceId" });
    }

    // 1) Get the practice + author info
    const [rows] = await pool.query(
      `SELECT 
         p.practiceId, p.userId, p.title, p.description, p.steps,
         p.status, p.effectivenessScore, p.confidenceLevel, p.createdAt,
         u.fullName AS authorName, u.credibilityScore AS authorCredibility, u.userRole AS authorRole
       FROM practices p
       JOIN users u ON u.userId = p.userId
       WHERE p.practiceId = ?`,
      [practiceId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Practice not found" });
    }

    const practice = rows[0];

    // Optional: hide removed practices from public users
    // If you want removed practices to be visible only to moderators/admin later, we can modify this.
    if (practice.status !== "ACTIVE") {
      return res.status(403).json({ message: "Practice is not available" });
    }

    // 2) Get outcome counts (valid vs total)
    const [outcomeStats] = await pool.query(
      `SELECT
         COUNT(*) AS totalReports,
         SUM(CASE WHEN status='VALID' THEN 1 ELSE 0 END) AS validReports
       FROM outcomeReports
       WHERE practiceId = ?`,
      [practiceId]
    );

    const totalReports = Number(outcomeStats[0].totalReports || 0);
    const validReports = Number(outcomeStats[0].validReports || 0);

    // 3) Get visible comments count (includes replies)
    const [commentStats] = await pool.query(
      `SELECT COUNT(*) AS visibleComments
       FROM comments
       WHERE practiceId = ? AND status='VISIBLE'`,
      [practiceId]
    );

    const visibleComments = Number(commentStats[0].visibleComments || 0);

    // 4) Return one clean response
    return res.json({
      practice: {
        practiceId: practice.practiceId,
        title: practice.title,
        description: practice.description,
        steps: practice.steps,
        effectivenessScore: Number(practice.effectivenessScore),
        confidenceLevel: practice.confidenceLevel,
        createdAt: practice.createdAt,
        author: {
          userId: practice.userId,
          fullName: practice.authorName,
          credibilityScore: Number(practice.authorCredibility),
          role: practice.authorRole,
        },
        stats: {
          outcomes: { totalReports, validReports },
          comments: { visibleComments },
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});


module.exports = router;
