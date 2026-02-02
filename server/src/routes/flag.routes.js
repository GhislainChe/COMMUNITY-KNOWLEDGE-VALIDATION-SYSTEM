const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/flags
 * User reports a practice / outcome / comment.
 */
router.post("/flags", requireAuth, async (req, res) => {
  try {
    const reporterUserId = req.user.userId;
    const { targetType, targetId, reason, details } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ message: "targetType, targetId and reason are required" });
    }

    if (!["PRACTICE", "OUTCOME", "COMMENT"].includes(targetType)) {
      return res.status(400).json({ message: "Invalid targetType" });
    }

    if (!["SPAM", "FALSE_INFO", "ABUSIVE", "OTHER"].includes(reason)) {
      return res.status(400).json({ message: "Invalid reason" });
    }

    const id = Number(targetId);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid targetId" });
    }

    // Optional: prevent reporting same item multiple times by same user
    const [existing] = await pool.query(
      "SELECT flagId FROM flags WHERE reporterUserId=? AND targetType=? AND targetId=? AND status='PENDING'",
      [reporterUserId, targetType, id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "You already reported this item (pending review)" });
    }

    const [result] = await pool.query(
      `INSERT INTO flags (reporterUserId, targetType, targetId, reason, details)
       VALUES (?, ?, ?, ?, ?)`,
      [reporterUserId, targetType, id, reason, details || null]
    );

    return res.status(201).json({ message: "Report submitted", flagId: result.insertId });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
