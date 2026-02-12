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
    const {
      title,
      description,
      steps,
      overview,
      materials,
      season,
      location,
      imageUrl,
    } = req.body;

    // Validate input (basic)
    if (!title || !description || !steps) {
      return res
        .status(400)
        .json({ message: "title, description, and steps are required" });
    }

    // req.user comes from JWT payload (set by requireAuth)
    const userId = req.user.userId;

    // Optional cleanup
    const clean = (v) => (typeof v === "string" ? v.trim() : null);

    const [result] = await pool.query(
      `INSERT INTO practices
        (userId, title, description, steps, overview, materials, season, location, imageUrl)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        clean(title),
        clean(description),
        clean(steps),
        clean(overview),
        clean(materials),
        clean(season),
        clean(location),
        clean(imageUrl),
      ]
    );

    return res.status(201).json({
      message: "Practice created",
      practiceId: result.insertId,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
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

    let sql = `
      SELECT
        p.practiceId,
        p.title,
        p.description,
        p.steps,
        p.overview,
        p.materials,
        p.season,
        p.location,
        p.imageUrl,
        p.effectivenessScore,
        p.confidenceLevel,
        p.createdAt,
        u.fullName AS authorName
      FROM practices p
      JOIN users u ON u.userId = p.userId
      WHERE p.status='ACTIVE'
    `;

    const params = [];

    if (q) {
      sql += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.steps LIKE ?)`;
      params.push(q, q, q);
    }

    sql += ` ORDER BY p.createdAt DESC`;

    const [rows] = await pool.query(sql, params);
    return res.json({ practices: rows });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

// GET /api/practices/applied
router.get("/applied", requireAuth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        ap.appliedId,
        ap.status AS appliedStatus,
        ap.appliedAt,
        ap.reportedAt,

        p.practiceId,
        p.title,
        p.description,
        p.steps,
        p.overview,
        p.materials,
        p.season,
        p.location,
        p.imageUrl,
        p.effectivenessScore,
        p.confidenceLevel,
        p.createdAt,

        u.fullName AS authorName
      FROM applied_practices ap
      JOIN practices p ON p.practiceId = ap.practiceId
      JOIN users u ON u.userId = p.userId
      WHERE ap.userId = ?
      ORDER BY ap.appliedAt DESC
      `,
      [userId]
    );

    res.json({ applied: rows });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/:id/stats", requireAuth, async (req, res) => {
  const practiceId = parseInt(req.params.id, 10);
  if (!Number.isInteger(practiceId) || practiceId <= 0) {
    return res.status(400).json({ message: "Invalid practice id" });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT
        COUNT(*) AS totalReports,

        SUM(CASE WHEN outcomeType = 'EFFECTIVE' THEN 1 ELSE 0 END) AS effective,
        SUM(CASE WHEN outcomeType = 'PARTIAL' THEN 1 ELSE 0 END) AS partial,
        SUM(CASE WHEN outcomeType = 'INEFFECTIVE' THEN 1 ELSE 0 END) AS ineffective,

        SUM(CASE WHEN recommendation = 'YES' THEN 1 ELSE 0 END) AS yesCount,
        SUM(CASE WHEN recommendation = 'NO' THEN 1 ELSE 0 END) AS noCount,
        SUM(CASE WHEN recommendation = 'MAYBE' THEN 1 ELSE 0 END) AS maybeCount,

        SUM(CASE WHEN recommendation IS NOT NULL THEN 1 ELSE 0 END) AS totalRecommendationAnswered
      FROM outcomeReports
      WHERE practiceId = ? AND status = 'VALID'
      `,
      [practiceId]
    );

    const s = rows[0] || {};
    const answered = Number(s.totalRecommendationAnswered || 0);
    const yes = Number(s.yesCount || 0);

    const recommendedRate =
      answered === 0 ? 0 : Math.round((yes / answered) * 100);

    return res.json({
      totalReports: Number(s.totalReports || 0),
      effective: Number(s.effective || 0),
      partial: Number(s.partial || 0),
      ineffective: Number(s.ineffective || 0),

      yesCount: Number(s.yesCount || 0),
      noCount: Number(s.noCount || 0),
      maybeCount: Number(s.maybeCount || 0),

      recommendedRate,
    });
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
         p.overview, p.materials, p.season, p.location, p.imageUrl,
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
        overview: practice.overview,
        materials: practice.materials,
        season: practice.season,
        location: practice.location,
        imageUrl: practice.imageUrl,
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
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

router.post("/:id/apply", requireAuth, async (req, res) => {
  const userId = req.user.userId;

  const practiceId = parseInt(req.params.id, 10);
  if (Number.isNaN(practiceId)) {
    return res.status(400).json({ message: "Invalid practice id" });
  }

  try {
    // 1. Check that practice exists
    const [practice] = await pool.query(
      "SELECT practiceId FROM practices WHERE practiceId = ? AND status = 'ACTIVE'",
      [practiceId]
    );

    if (practice.length === 0) {
      return res.status(404).json({ message: "Practice not found" });
    }

    // 2. Apply practice
    await pool.query(
      "INSERT INTO applied_practices (userId, practiceId) VALUES (?, ?)",
      [userId, practiceId]
    );

    return res.json({
      message: "Practice applied successfully",
      practiceId,
    });
  } catch (err) {
    // 3. User already applied
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "You already applied this practice",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

module.exports = router;
