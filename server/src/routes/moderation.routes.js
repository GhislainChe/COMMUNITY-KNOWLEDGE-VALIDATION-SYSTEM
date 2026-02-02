const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/moderation/flags
 * Moderator dashboard - view pending reports
 */
router.get("/moderation/flags", requireAuth, requireRole("MODERATOR", "ADMIN"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT flagId, reporterUserId, targetType, targetId, reason, details, status, createdAt
       FROM flags
       WHERE status='PENDING'
       ORDER BY createdAt DESC`
    );

    return res.json({ flags: rows });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * PATCH /api/moderation/flags/:flagId
 * Moderator reviews a report and takes action.
 */
router.patch("/moderation/flags/:flagId", requireAuth, requireRole("MODERATOR", "ADMIN"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const flagId = Number(req.params.flagId);
    if (!Number.isInteger(flagId) || flagId <= 0) {
      conn.release();
      return res.status(400).json({ message: "Invalid flagId" });
    }

    const { actionTaken, reviewNote } = req.body;

    if (!["NO_ACTION", "HIDE_COMMENT", "REMOVE_PRACTICE", "REJECT_OUTCOME"].includes(actionTaken)) {
      conn.release();
      return res.status(400).json({ message: "Invalid actionTaken" });
    }

    await conn.beginTransaction();

    const [flagRows] = await conn.query("SELECT * FROM flags WHERE flagId=? AND status='PENDING'", [flagId]);
    if (flagRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Flag not found or already resolved" });
    }

    const flag = flagRows[0];

    // Take action based on type
    if (actionTaken === "HIDE_COMMENT") {
      if (flag.targetType !== "COMMENT") {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "This action can only be used for COMMENT reports" });
      }
      await conn.query("UPDATE comments SET status='HIDDEN' WHERE commentId=?", [flag.targetId]);
    }

    if (actionTaken === "REMOVE_PRACTICE") {
      if (flag.targetType !== "PRACTICE") {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "This action can only be used for PRACTICE reports" });
      }
      await conn.query("UPDATE practices SET status='REMOVED' WHERE practiceId=?", [flag.targetId]);
    }

    if (actionTaken === "REJECT_OUTCOME") {
      if (flag.targetType !== "OUTCOME") {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "This action can only be used for OUTCOME reports" });
      }
      await conn.query("UPDATE outcomeReports SET status='REJECTED' WHERE reportId=?", [flag.targetId]);

      // Recalculate practice score after rejecting an outcome
      const [prRows] = await conn.query(
        "SELECT practiceId FROM outcomeReports WHERE reportId=?",
        [flag.targetId]
      );
      if (prRows.length > 0) {
        const practiceId = prRows[0].practiceId;

        const [avgRows] = await conn.query(
          "SELECT AVG(outcomeScore) AS avgScore, COUNT(*) AS countReports FROM outcomeReports WHERE practiceId=? AND status='VALID'",
          [practiceId]
        );

        const avgScore = avgRows[0].avgScore === null ? 0 : Number(avgRows[0].avgScore);
        const countReports = Number(avgRows[0].countReports);
        const confidenceLevel = countReports >= 10 ? "HIGH" : countReports >= 3 ? "MEDIUM" : "LOW";

        await conn.query(
          "UPDATE practices SET effectivenessScore=?, confidenceLevel=? WHERE practiceId=?",
          [avgScore, confidenceLevel, practiceId]
        );
      }
    }

    // Mark flag resolved
    await conn.query(
      `UPDATE flags
       SET status='RESOLVED', reviewedBy=?, actionTaken=?, reviewNote=?, reviewedAt=NOW()
       WHERE flagId=?`,
      [req.user.userId, actionTaken, reviewNote || null, flagId]
    );

    await conn.commit();
    conn.release();

    return res.json({ message: "Flag reviewed and resolved", flagId, actionTaken });
  } catch (err) {
    await conn.rollback();
    conn.release();
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
