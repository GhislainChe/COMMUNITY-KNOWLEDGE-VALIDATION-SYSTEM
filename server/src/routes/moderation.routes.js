const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/moderation/flags?status=PENDING|RESOLVED|ALL
 * Moderator dashboard - view reports
 */
router.get(
  "/moderation/flags",
  requireAuth,
  requireRole("MODERATOR", "ADMIN"),
  async (req, res) => {
    try {
      const status = (req.query.status || "PENDING").toUpperCase();
      const allowed = ["PENDING", "RESOLVED", "ALL"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status filter" });
      }

      let where = "";
      const params = [];

      if (status !== "ALL") {
        where = "WHERE f.status=?";
        params.push(status);
      }

      // Pull reporter name + quick preview depending on type
      const sql = `
        SELECT
          f.flagId,
          f.reporterUserId,
          ru.fullName AS reporterName,
          f.targetType,
          f.targetId,
          f.reason,
          f.details,
          f.status,
          f.createdAt,

          f.reviewedBy,
          mu.fullName AS moderatorName,
          f.actionTaken,
          f.reviewNote,
          f.reviewedAt,

          -- Preview fields
          p.title AS practiceTitle,
          LEFT(c.content, 120) AS commentPreview
        FROM flags f
        LEFT JOIN users ru ON ru.userId = f.reporterUserId
        LEFT JOIN users mu ON mu.userId = f.reviewedBy

        -- Join practice/comment only when applicable (safe with LEFT JOIN)
        LEFT JOIN practices p ON (f.targetType='PRACTICE' AND p.practiceId = f.targetId)
        LEFT JOIN comments c ON (f.targetType='COMMENT' AND c.commentId = f.targetId)

        ${where}
        ORDER BY f.createdAt DESC
      `;

      const [rows] = await pool.query(sql, params);
      return res.json({ flags: rows });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * GET /api/moderation/audit
 * Moderator action history (uses resolved flags as audit trail)
 */
router.get(
  "/moderation/audit",
  requireAuth,
  requireRole("MODERATOR", "ADMIN"),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT
          f.flagId,
          f.targetType,
          f.targetId,
          f.reason,
          f.status,
          f.actionTaken,
          f.reviewNote,
          f.reviewedAt,
          mu.fullName AS moderatorName,
          ru.fullName AS reporterName
        FROM flags f
        LEFT JOIN users mu ON mu.userId = f.reviewedBy
        LEFT JOIN users ru ON ru.userId = f.reporterUserId
        WHERE f.status='RESOLVED'
        ORDER BY f.reviewedAt DESC
        LIMIT 200
        `,
      );

      return res.json({ audit: rows });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * PATCH /api/moderation/flags/:flagId
 * Moderator reviews a report and takes action.
 *
 * body: { actionTaken: "NO_ACTION"|"HIDE_COMMENT"|"HIDE_PRACTICE"|"REJECT_OUTCOME", reviewNote?: string }
 */
router.patch(
  "/moderation/flags/:flagId",
  requireAuth,
  requireRole("MODERATOR", "ADMIN"),
  async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const flagId = Number(req.params.flagId);
      if (!Number.isInteger(flagId) || flagId <= 0) {
        conn.release();
        return res.status(400).json({ message: "Invalid flagId" });
      }

      const { actionTaken, reviewNote } = req.body;

      const allowedActions = [
        "NO_ACTION",
        "HIDE_COMMENT",
        "HIDE_PRACTICE",
        "REJECT_OUTCOME",
      ];
      if (!allowedActions.includes(actionTaken)) {
        conn.release();
        return res.status(400).json({ message: "Invalid actionTaken" });
      }

      await conn.beginTransaction();

      const [flagRows] = await conn.query(
        "SELECT * FROM flags WHERE flagId=? AND status='PENDING'",
        [flagId],
      );

      if (flagRows.length === 0) {
        await conn.rollback();
        conn.release();
        return res
          .status(404)
          .json({ message: "Flag not found or already resolved" });
      }

      const flag = flagRows[0];

      // Take action based on type
      if (actionTaken === "HIDE_COMMENT") {
        if (flag.targetType !== "COMMENT") {
          await conn.rollback();
          conn.release();
          return res
            .status(400)
            .json({
              message: "This action can only be used for COMMENT reports",
            });
        }
        await conn.query(
          "UPDATE comments SET status='HIDDEN' WHERE commentId=?",
          [flag.targetId],
        );
      }

      if (actionTaken === "HIDE_PRACTICE") {
        if (flag.targetType !== "PRACTICE") {
          await conn.rollback();
          conn.release();
          return res
            .status(400)
            .json({
              message: "This action can only be used for PRACTICE reports",
            });
        }

        // ✅ IMPORTANT: your practices.status is ACTIVE/...
        // Use HIDDEN instead of REMOVED to avoid enum issues.
        await conn.query(
          "UPDATE practices SET status='HIDDEN' WHERE practiceId=?",
          [flag.targetId],
        );
      }

      if (actionTaken === "REJECT_OUTCOME") {
        if (flag.targetType !== "OUTCOME") {
          await conn.rollback();
          conn.release();
          return res
            .status(400)
            .json({
              message: "This action can only be used for OUTCOME reports",
            });
        }

        // Assumes table outcomeReports exists
        await conn.query(
          "UPDATE outcomeReports SET status='REJECTED' WHERE reportId=?",
          [flag.targetId],
        );

        // Recalculate practice score after rejecting an outcome
        const [prRows] = await conn.query(
          "SELECT practiceId FROM outcomeReports WHERE reportId=?",
          [flag.targetId],
        );

        if (prRows.length > 0) {
          const practiceId = prRows[0].practiceId;

          const [avgRows] = await conn.query(
            `SELECT AVG(outcomeScore) AS avgScore, COUNT(*) AS countReports
             FROM outcomeReports
             WHERE practiceId=? AND status='VALID'`,
            [practiceId],
          );

          const avgScore =
            avgRows[0].avgScore === null ? 0 : Number(avgRows[0].avgScore);
          const countReports = Number(avgRows[0].countReports);
          const confidenceLevel =
            countReports >= 10 ? "HIGH" : countReports >= 3 ? "MEDIUM" : "LOW";

          await conn.query(
            "UPDATE practices SET effectivenessScore=?, confidenceLevel=? WHERE practiceId=?",
            [avgScore, confidenceLevel, practiceId],
          );
        }
      }

      // Mark flag resolved (this becomes your audit log)
      await conn.query(
        `UPDATE flags
         SET status='RESOLVED',
             reviewedBy=?,
             actionTaken=?,
             reviewNote=?,
             reviewedAt=NOW()
         WHERE flagId=?`,
        [req.user.userId, actionTaken, reviewNote || null, flagId],
      );

      await conn.commit();
      conn.release();

      return res.json({
        message: "Flag reviewed and resolved",
        flagId,
        actionTaken,
      });
    } catch (err) {
      await conn.rollback();
      conn.release();
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  },
);

router.get(
  "/moderation/flags/:flagId/details",
  requireAuth,
  requireRole("MODERATOR", "ADMIN"),
  async (req, res) => {
    try {
      const flagId = Number(req.params.flagId);
      if (!Number.isInteger(flagId) || flagId <= 0) {
        return res.status(400).json({ message: "Invalid flagId" });
      }

      const [flagRows] = await pool.query(
        "SELECT * FROM flags WHERE flagId=?",
        [flagId],
      );

      if (flagRows.length === 0) {
        return res.status(404).json({ message: "Flag not found" });
      }

      const flag = flagRows[0];

      // PRACTICE preview
      if (flag.targetType === "PRACTICE") {
        const [pRows] = await pool.query(
          `SELECT practiceId, title, description, status, userId
           FROM practices WHERE practiceId=?`,
          [flag.targetId],
        );

        const p = pRows[0] || null;
        return res.json({
          targetType: "PRACTICE",
          flagId: flag.flagId,
          targetId: flag.targetId,
          reason: flag.reason,
          details: flag.details,
          practice: p,
        });
      }

      // COMMENT preview
      if (flag.targetType === "COMMENT") {
        const [cRows] = await pool.query(
          `SELECT c.commentId, c.practiceId, c.userId, c.content, c.status, c.createdAt,
                  u.fullName AS authorName,
                  p.title AS practiceTitle
           FROM comments c
           JOIN users u ON u.userId = c.userId
           JOIN practices p ON p.practiceId = c.practiceId
           WHERE c.commentId=?`,
          [flag.targetId],
        );

        const c = cRows[0] || null;
        return res.json({
          targetType: "COMMENT",
          flagId: flag.flagId,
          targetId: flag.targetId,
          reason: flag.reason,
          details: flag.details,
          comment: c,
        });
      }

      // OUTCOME preview (if you want)
      if (flag.targetType === "OUTCOME") {
        const [oRows] = await pool.query(
          `SELECT o.reportId, o.practiceId, o.userId, o.comment, o.status, o.createdAt,
                  u.fullName AS authorName,
                  p.title AS practiceTitle
           FROM outcomeReports o
           JOIN users u ON u.userId = o.userId
           JOIN practices p ON p.practiceId = o.practiceId
           WHERE o.reportId=?`,
          [flag.targetId],
        );

        const o = oRows[0] || null;
        return res.json({
          targetType: "OUTCOME",
          flagId: flag.flagId,
          targetId: flag.targetId,
          reason: flag.reason,
          details: flag.details,
          outcome: o,
        });
      }

      return res.json({
        targetType: flag.targetType,
        flagId: flag.flagId,
        targetId: flag.targetId,
        reason: flag.reason,
        details: flag.details,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  },
);

module.exports = router;
