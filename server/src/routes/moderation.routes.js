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
        "REMOVE_PRACTICE",
        "REJECT_OUTCOME",
      ];

      if (!allowedActions.includes(actionTaken)) {
        conn.release();
        return res.status(400).json({ message: "Invalid actionTaken" });
      }

      await conn.beginTransaction();

      const [flagRows] = await conn.query(
        "SELECT * FROM flags WHERE flagId=? AND status='PENDING'",
        [flagId]
      );

      if (flagRows.length === 0) {
        await conn.rollback();
        conn.release();
        return res
          .status(404)
          .json({ message: "Flag not found or already resolved" });
      }

      const flag = flagRows[0];

      // ACTIONS
      if (actionTaken === "HIDE_COMMENT") {
        if (flag.targetType !== "COMMENT") {
          await conn.rollback();
          conn.release();
          return res.status(400).json({
            message: "This action can only be used for COMMENT reports",
          });
        }

        const [r] = await conn.query(
          "UPDATE comments SET status='HIDDEN' WHERE commentId=?",
          [flag.targetId]
        );

        if (r.affectedRows === 0) {
          await conn.rollback();
          conn.release();
          return res.status(404).json({ message: "Comment not found" });
        }
      }

      if (actionTaken === "REMOVE_PRACTICE") {
        if (flag.targetType !== "PRACTICE") {
          await conn.rollback();
          conn.release();
          return res.status(400).json({
            message: "This action can only be used for PRACTICE reports",
          });
        }

        const [r] = await conn.query(
          "UPDATE practices SET status='REMOVED' WHERE practiceId=?",
          [flag.targetId]
        );

        if (r.affectedRows === 0) {
          await conn.rollback();
          conn.release();
          return res.status(404).json({ message: "Practice not found" });
        }
      }

      if (actionTaken === "REJECT_OUTCOME") {
        if (flag.targetType !== "OUTCOME") {
          await conn.rollback();
          conn.release();
          return res.status(400).json({
            message: "This action can only be used for OUTCOME reports",
          });
        }

        const [r] = await conn.query(
          "UPDATE outcomeReports SET status='REJECTED' WHERE reportId=?",
          [flag.targetId]
        );

        if (r.affectedRows === 0) {
          await conn.rollback();
          conn.release();
          return res.status(404).json({ message: "Outcome report not found" });
        }
      }

      // Resolve flag
      await conn.query(
        `UPDATE flags
         SET status='RESOLVED',
             reviewedBy=?,
             actionTaken=?,
             reviewNote=?,
             reviewedAt=NOW()
         WHERE flagId=?`,
        [req.user.userId, actionTaken, reviewNote || null, flagId]
      );

      await conn.commit();
      conn.release();

      return res.json({ message: "Resolved", flagId, actionTaken });
    } catch (err) {
      await conn.rollback();
      conn.release();
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  }
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

      // 🔹 JOIN reporter info
      const [reporterRows] = await pool.query(
        "SELECT userId, fullName, email FROM users WHERE userId=?",
        [flag.reporterUserId],
      );

      const reporter = reporterRows[0] || null;

      // 🔹 PRACTICE
      if (flag.targetType === "PRACTICE") {
        const [pRows] = await pool.query(
          "SELECT practiceId, title, description, status FROM practices WHERE practiceId=?",
          [flag.targetId],
        );

        return res.json({
          targetType: "PRACTICE",
          flag,
          reporter,
          practice: pRows[0] || null,
        });
      }

      // 🔹 COMMENT
      if (flag.targetType === "COMMENT") {
        const [cRows] = await pool.query(
          `SELECT c.commentId, c.content, c.status, c.createdAt,
                  c.practiceId,
                  u.fullName AS authorName
           FROM comments c
           JOIN users u ON u.userId = c.userId
           WHERE c.commentId=?`,
          [flag.targetId],
        );

        return res.json({
          targetType: "COMMENT",
          flag,
          reporter,
          comment: cRows[0] || null,
        });
      }

      // 🔹 OUTCOME
      if (flag.targetType === "OUTCOME") {
        const [oRows] = await pool.query(
          `SELECT reportId, comment, status, practiceId
           FROM outcomeReports
           WHERE reportId=?`,
          [flag.targetId],
        );

        return res.json({
          targetType: "OUTCOME",
          flag,
          reporter,
          outcome: oRows[0] || null,
        });
      }

      return res.json({ flag, reporter });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  },
);

module.exports = router;
