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

// ✅ NEW: Moderation Stats
// GET /api/moderation/stats?range=7d|30d|90d
router.get(
  "/moderation/stats",
  requireAuth,
  requireRole("MODERATOR", "ADMIN"),
  async (req, res) => {
    try {
      const range = String(req.query.range || "7d").toLowerCase();
      const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;

      // 1) KPIs
      const [kpiRows] = await pool.query(
        `
        SELECT
          COUNT(*) AS totalFlags,
          SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) AS pendingFlags,
          SUM(CASE WHEN status='RESOLVED' THEN 1 ELSE 0 END) AS resolvedFlags,

          AVG(
            CASE
              WHEN status='RESOLVED' AND reviewedAt IS NOT NULL
              THEN TIMESTAMPDIFF(HOUR, createdAt, reviewedAt)
              ELSE NULL
            END
          ) AS avgResolutionHours,

          SUM(
            CASE
              WHEN status='RESOLVED' AND reviewedAt IS NOT NULL
                   AND TIMESTAMPDIFF(HOUR, createdAt, reviewedAt) <= 24
              THEN 1 ELSE 0
            END
          ) AS resolvedUnder24h
        FROM flags
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `,
        [days],
      );

      const k = kpiRows[0] || {};
      const totalFlags = Number(k.totalFlags || 0);
      const resolvedFlags = Number(k.resolvedFlags || 0);
      const resolvedUnder24h = Number(k.resolvedUnder24h || 0);

      const resolvedUnder24hPct =
        resolvedFlags === 0
          ? 0
          : Math.round((resolvedUnder24h / resolvedFlags) * 100);

      // 2) Breakdown by type
      const [byType] = await pool.query(
        `
        SELECT targetType, COUNT(*) AS count
        FROM flags
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY targetType
        ORDER BY count DESC
        `,
        [days],
      );

      // 3) Breakdown by reason
      const [byReason] = await pool.query(
        `
        SELECT reason, COUNT(*) AS count
        FROM flags
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY reason
        ORDER BY count DESC
        `,
        [days],
      );

      // 4) Trend (daily counts)
      const [trend] = await pool.query(
        `
        SELECT DATE(createdAt) AS day, COUNT(*) AS count
        FROM flags
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(createdAt)
        ORDER BY day ASC
        `,
        [days],
      );

      // 5) Top reported targets
      const [topTargets] = await pool.query(
        `
        SELECT
          f.targetType,
          f.targetId,
          COUNT(*) AS count,
          MAX(f.createdAt) AS lastFlagAt,

          p.title AS practiceTitle,
          LEFT(c.content, 140) AS commentPreview
        FROM flags f
        LEFT JOIN practices p ON (f.targetType='PRACTICE' AND p.practiceId = f.targetId)
        LEFT JOIN comments c ON (f.targetType='COMMENT' AND c.commentId = f.targetId)
        WHERE f.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY f.targetType, f.targetId
        ORDER BY count DESC, lastFlagAt DESC
        LIMIT 8
        `,
        [days],
      );

      // 6) Top reporters (who reports the most)
      const [topReporters] = await pool.query(
        `
        SELECT
          f.reporterUserId,
          u.fullName AS reporterName,
          u.email AS reporterEmail,
          COUNT(*) AS count,
          MAX(f.createdAt) AS lastReportAt
        FROM flags f
        LEFT JOIN users u ON u.userId = f.reporterUserId
        WHERE f.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY f.reporterUserId
        ORDER BY count DESC, lastReportAt DESC
        LIMIT 8
        `,
        [days],
      );

      return res.json({
        range,
        days,
        kpis: {
          totalFlags,
          pendingFlags: Number(k.pendingFlags || 0),
          resolvedFlags,
          avgResolutionHours:
            k.avgResolutionHours === null ? null : Number(k.avgResolutionHours),
          resolvedUnder24hPct,
        },
        byType,
        byReason,
        trend,
        topTargets,
        topReporters,
      });
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
      const limit = Math.min(Number(req.query.limit || 200), 500);
      const offset = Math.max(Number(req.query.offset || 0), 0);

      const q = String(req.query.q || "").trim();
      const targetType = String(req.query.targetType || "ALL").toUpperCase();
      const actionTaken = String(req.query.actionTaken || "ALL").toUpperCase();
      const days = Number(req.query.days || 30); // default last 30 days
      const safeDays =
        Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30;

      const where = [
        `f.status='RESOLVED'`,
        `f.reviewedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      ];
      const params = [safeDays];

      if (targetType !== "ALL") {
        where.push(`f.targetType = ?`);
        params.push(targetType);
      }

      if (actionTaken !== "ALL") {
        where.push(`f.actionTaken = ?`);
        params.push(actionTaken);
      }

      if (q) {
        // search in note, moderator name, reporter name, ids
        where.push(`
          (
            f.reviewNote LIKE ?
            OR mu.fullName LIKE ?
            OR ru.fullName LIKE ?
            OR CAST(f.flagId AS CHAR) LIKE ?
            OR CAST(f.targetId AS CHAR) LIKE ?
          )
        `);
        const like = `%${q}%`;
        params.push(like, like, like, like, like);
      }

      const whereSql = `WHERE ${where.join(" AND ")}`;

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
          f.isUndone,
          f.undoneBy,
          f.undoneAt,
          f.undoNote,
          mu.fullName AS moderatorName,
          ru.fullName AS reporterName
        FROM flags f
        LEFT JOIN users mu ON mu.userId = f.reviewedBy
        LEFT JOIN users ru ON ru.userId = f.reporterUserId
        ${whereSql}
        ORDER BY f.reviewedAt DESC
        LIMIT ? OFFSET ?
        `,
        [...params, limit, offset],
      );

      const [countRows] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM flags f
        LEFT JOIN users mu ON mu.userId = f.reviewedBy
        LEFT JOIN users ru ON ru.userId = f.reporterUserId
        ${whereSql}
        `,
        params,
      );

      return res.json({
        audit: rows,
        pagination: {
          total: Number(countRows?.[0]?.total || 0),
          limit,
          offset,
          days: safeDays,
        },
      });
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
        // "REMOVE_PRACTICE", 
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
          [flag.targetId],
        );
        const [cRows] = await conn.query(
          "SELECT userId, practiceId FROM comments WHERE commentId=?",
          [flag.targetId],
        );

        if (cRows.length > 0) {
          const commentOwnerId = cRows[0].userId;
          const practiceId = cRows[0].practiceId;

          await conn.query(
            `INSERT INTO notifications (userId, title, message, linkUrl, type)
     VALUES (?, ?, ?, ?, 'MODERATION')`,
            [
              commentOwnerId,
              "Your comment was removed",
              "A moderator removed your comment for violating community guidelines.",
              `/app/discussions?practiceId=${practiceId}`,
            ],
          );
        }

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
          [flag.targetId],
        );
        const [pRows] = await conn.query(
          "SELECT userId, title FROM practices WHERE practiceId=?",
          [flag.targetId],
        );

        if (pRows.length > 0) {
          const ownerId = pRows[0].userId;
          const practiceTitle = pRows[0].title;

          await conn.query(
            `INSERT INTO notifications (userId, title, message, linkUrl, type)
     VALUES (?, ?, ?, ?, 'MODERATION')`,
            [
              ownerId,
              "Your practice was removed",
              `Your practice "${practiceTitle}" was removed by a moderator for policy reasons.`,
              "/app/practices",
            ],
          );
        }

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
          [flag.targetId],
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
        [req.user.userId, actionTaken, reviewNote || null, flagId],
      );

      await conn.commit();
      conn.release();

      return res.json({ message: "Resolved", flagId, actionTaken });
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

// POST /api/moderation/flags/:flagId/undo
router.post(
  "/moderation/flags/:flagId/undo",
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

      const { undoNote } = req.body || {};

      await conn.beginTransaction();

      const [flagRows] = await conn.query(
        `SELECT *
         FROM flags
         WHERE flagId=? AND status='RESOLVED'
         LIMIT 1`,
        [flagId],
      );

      if (flagRows.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ message: "Resolved flag not found" });
      }

      const flag = flagRows[0];

      if (!flag.actionTaken || flag.actionTaken === "NO_ACTION") {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ message: "Nothing to undo for this flag" });
      }

      if (Number(flag.isUndone) === 1) {
        await conn.rollback();
        conn.release();
        return res
          .status(400)
          .json({ message: "This action is already undone" });
      }

      // ===== Undo by actionTaken =====
      if (flag.actionTaken === "HIDE_COMMENT") {
        // comment back to VISIBLE
        await conn.query(
          "UPDATE comments SET status='VISIBLE' WHERE commentId=?",
          [flag.targetId],
        );
      }

      if (
        flag.actionTaken === "HIDE_PRACTICE" ||
        flag.actionTaken === "REMOVE_PRACTICE"
      ) {
        // practice back to ACTIVE
        await conn.query(
          "UPDATE practices SET status='ACTIVE' WHERE practiceId=?",
          [flag.targetId],
        );
      }

      if (flag.actionTaken === "REJECT_OUTCOME") {
        // outcome back to VALID
        await conn.query(
          "UPDATE outcomeReports SET status='VALID' WHERE reportId=?",
          [flag.targetId],
        );

        // recalc score
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

      // Mark flag as undone (audit)
      await conn.query(
        `UPDATE flags
         SET isUndone=1,
             undoneBy=?,
             undoneAt=NOW(),
             undoNote=?
         WHERE flagId=?`,
        [req.user.userId, undoNote?.trim() || null, flagId],
      );

      // OPTIONAL: notify content owner (recommended)
      // If you already have helper in notification.routes.js, reuse it here
      // Otherwise tell me and I will plug it in properly.
      // Example:
      // await createNotification(conn, targetOwnerId, "Moderation action undone", "...", "/app/discussions?practiceId=...");

      await conn.commit();
      conn.release();

      return res.json({
        message: "Undo completed",
        flagId,
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

module.exports = router;
