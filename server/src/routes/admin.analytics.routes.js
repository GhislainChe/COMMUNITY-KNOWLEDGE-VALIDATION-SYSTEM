const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function toInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function csvEscape(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function sendCsv(res, filename, headers, rows) {
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r?.[h])).join(",")),
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(lines.join("\n"));
}

/**
 * GET /api/admin/analytics?days=7|30|90|365
 * Returns dashboard analytics data.
 */
router.get(
  "/admin/analytics",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const days = [7, 30, 90, 365].includes(toInt(req.query.days, 30))
      ? toInt(req.query.days, 30)
      : 30;

    try {
      // 1) Users overview
      const [[usersOverview]] = await pool.query(
        `
        SELECT
          COUNT(*) AS totalUsers,
          SUM(CASE WHEN userStatus='ACTIVE' THEN 1 ELSE 0 END) AS activeUsers,
          SUM(CASE WHEN userStatus='SUSPENDED' THEN 1 ELSE 0 END) AS suspendedUsers,
          SUM(CASE WHEN userRole='USER' THEN 1 ELSE 0 END) AS usersCount,
          SUM(CASE WHEN userRole='MODERATOR' THEN 1 ELSE 0 END) AS moderatorsCount,
          SUM(CASE WHEN userRole='ADMIN' THEN 1 ELSE 0 END) AS adminsCount,
          SUM(CASE WHEN createdAt >= (NOW() - INTERVAL ? DAY) THEN 1 ELSE 0 END) AS newUsers
        FROM users
        `,
        [days],
      );

      // 2) Content volume
      // NOTE: If you don't have createdAt on comments/practices, tell me and I adjust.
      const [[content]] = await pool.query(
        `
        SELECT
          (SELECT COUNT(*) FROM practices WHERE createdAt >= (NOW() - INTERVAL ? DAY)) AS newPractices,
          (SELECT COUNT(*) FROM comments  WHERE createdAt >= (NOW() - INTERVAL ? DAY)) AS newComments,
          (SELECT COUNT(*) FROM outcomeReports WHERE createdAt >= (NOW() - INTERVAL ? DAY)) AS newOutcomes,

          (SELECT COUNT(*) FROM practices WHERE status <> 'ACTIVE') AS totalNonActivePractices,
          (SELECT COUNT(*) FROM comments WHERE status <> 'VISIBLE') AS totalNonVisibleComments
        `,
        [days, days, days],
      );

      // 3) Flags totals
      const [[flagsTotals]] = await pool.query(
        `
        SELECT
          COUNT(*) AS totalFlags,
          SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) AS pendingFlags,
          SUM(CASE WHEN status='RESOLVED' THEN 1 ELSE 0 END) AS resolvedFlags,

          -- average resolution time in hours (resolved only)
          ROUND(AVG(
            CASE WHEN status='RESOLVED' AND reviewedAt IS NOT NULL
              THEN TIMESTAMPDIFF(MINUTE, createdAt, reviewedAt) / 60
              ELSE NULL
            END
          ), 1) AS avgResolutionHours,

          -- percent resolved within 24h
          ROUND(
            100 * AVG(
              CASE WHEN status='RESOLVED' AND reviewedAt IS NOT NULL
                THEN (TIMESTAMPDIFF(HOUR, createdAt, reviewedAt) <= 24)
                ELSE NULL
              END
            )
          , 0) AS resolvedUnder24hPct
        FROM flags
        WHERE createdAt >= (NOW() - INTERVAL ? DAY)
        `,
        [days],
      );

      // 4) Flags by target type
      const [byTargetType] = await pool.query(
        `
        SELECT targetType, COUNT(*) AS count
        FROM flags
        WHERE createdAt >= (NOW() - INTERVAL ? DAY)
        GROUP BY targetType
        ORDER BY count DESC
        `,
        [days],
      );

      // 5) Flags by reason
      const [byReason] = await pool.query(
        `
        SELECT reason, COUNT(*) AS count
        FROM flags
        WHERE createdAt >= (NOW() - INTERVAL ? DAY)
        GROUP BY reason
        ORDER BY count DESC
        `,
        [days],
      );

      // 6) Top reporters (users who report most)
      const [topReporters] = await pool.query(
        `
        SELECT
          f.reporterUserId AS userId,
          u.fullName,
          u.email,
          COUNT(*) AS count
        FROM flags f
        LEFT JOIN users u ON u.userId = f.reporterUserId
        WHERE f.createdAt >= (NOW() - INTERVAL ? DAY)
        GROUP BY f.reporterUserId
        ORDER BY count DESC
        LIMIT 10
        `,
        [days],
      );

      // 7) Most flagged content owners (who gets reported most)
      // Works for PRACTICE and COMMENT targets.
      const [topFlaggedOwners] = await pool.query(
        `
        SELECT
          owner.userId,
          owner.fullName,
          owner.email,
          SUM(x.cnt) AS count
        FROM (
          SELECT p.userId AS ownerUserId, COUNT(*) AS cnt
          FROM flags f
          JOIN practices p ON f.targetType='PRACTICE' AND p.practiceId = f.targetId
          WHERE f.createdAt >= (NOW() - INTERVAL ? DAY)
          GROUP BY p.userId

          UNION ALL

          SELECT c.userId AS ownerUserId, COUNT(*) AS cnt
          FROM flags f
          JOIN comments c ON f.targetType='COMMENT' AND c.commentId = f.targetId
          WHERE f.createdAt >= (NOW() - INTERVAL ? DAY)
          GROUP BY c.userId
        ) x
        JOIN users owner ON owner.userId = x.ownerUserId
        GROUP BY owner.userId
        ORDER BY count DESC
        LIMIT 10
        `,
        [days],
      );

      // 8) Most flagged targets (practice/comment IDs)
      const [topTargets] = await pool.query(
        `
        SELECT targetType, targetId, COUNT(*) AS count
        FROM flags
        WHERE createdAt >= (NOW() - INTERVAL ? DAY)
        GROUP BY targetType, targetId
        ORDER BY count DESC
        LIMIT 10
        `,
        [days],
      );

      return res.json({
        days,
        usersOverview: usersOverview || {},
        content: content || {},
        flagsTotals: flagsTotals || {},
        byTargetType,
        byReason,
        topReporters,
        topFlaggedOwners,
        topTargets,
      });
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * GET /api/admin/exports/analytics.csv?days=30
 * Downloads a small analytics summary CSV
 */
router.get(
  "/admin/exports/analytics.csv",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const days = [7, 30, 90, 365].includes(toInt(req.query.days, 30))
      ? toInt(req.query.days, 30)
      : 30;

    try {
      const aRes = await pool.query(
        `
        SELECT
          (SELECT COUNT(*) FROM users) AS totalUsers,
          (SELECT SUM(CASE WHEN userStatus='ACTIVE' THEN 1 ELSE 0 END) FROM users) AS activeUsers,
          (SELECT SUM(CASE WHEN userStatus='SUSPENDED' THEN 1 ELSE 0 END) FROM users) AS suspendedUsers,
          (SELECT COUNT(*) FROM users WHERE createdAt >= (NOW() - INTERVAL ? DAY)) AS newUsers,

          (SELECT COUNT(*) FROM practices WHERE createdAt >= (NOW() - INTERVAL ? DAY)) AS newPractices,
          (SELECT COUNT(*) FROM comments WHERE createdAt >= (NOW() - INTERVAL ? DAY)) AS newComments,
          (SELECT COUNT(*) FROM outcomeReports WHERE createdAt >= (NOW() - INTERVAL ? DAY)) AS newOutcomes,

          (SELECT COUNT(*) FROM flags WHERE createdAt >= (NOW() - INTERVAL ? DAY)) AS flagsTotal,
          (SELECT SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) FROM flags WHERE createdAt >= (NOW() - INTERVAL ? DAY)) AS flagsPending,
          (SELECT SUM(CASE WHEN status='RESOLVED' THEN 1 ELSE 0 END) FROM flags WHERE createdAt >= (NOW() - INTERVAL ? DAY)) AS flagsResolved
        `,
        [days, days, days, days, days, days],
      );

      const row = (aRes[0] && aRes[0][0]) || {};
      const headers = Object.keys(row);
      return sendCsv(res, `analytics-${days}d.csv`, headers, [row]);
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * GET /api/admin/exports/moderation-audit.csv?days=30
 * Downloads audit (resolved flags)
 */
router.get(
  "/admin/exports/moderation-audit.csv",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const days = [7, 30, 90, 365].includes(toInt(req.query.days, 30))
      ? toInt(req.query.days, 30)
      : 30;

    try {
      const [rows] = await pool.query(
        `
        SELECT
          f.flagId,
          f.targetType,
          f.targetId,
          f.reason,
          f.actionTaken,
          f.reviewNote,
          f.reviewedAt,
          mu.fullName AS moderatorName,
          ru.fullName AS reporterName
        FROM flags f
        LEFT JOIN users mu ON mu.userId = f.reviewedBy
        LEFT JOIN users ru ON ru.userId = f.reporterUserId
        WHERE f.status='RESOLVED'
          AND f.reviewedAt >= (NOW() - INTERVAL ? DAY)
        ORDER BY f.reviewedAt DESC
        `,
        [days],
      );

      const headers = [
        "flagId",
        "targetType",
        "targetId",
        "reason",
        "actionTaken",
        "reviewNote",
        "moderatorName",
        "reporterName",
        "reviewedAt",
      ];

      return sendCsv(res, `moderation-audit-${days}d.csv`, headers, rows);
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * GET /api/admin/exports/users.csv
 * Downloads users table as CSV
 */
router.get(
  "/admin/exports/users.csv",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT
          userId, fullName, email, userRole, userStatus, credibilityScore, createdAt
        FROM users
        ORDER BY createdAt DESC
        `,
      );

      const headers = [
        "userId",
        "fullName",
        "email",
        "userRole",
        "userStatus",
        "credibilityScore",
        "createdAt",
      ];

      return sendCsv(res, `users.csv`, headers, rows);
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

module.exports = router;