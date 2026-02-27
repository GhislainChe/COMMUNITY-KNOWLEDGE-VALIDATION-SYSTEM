const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function toInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

async function hasColumn(tableName, columnName) {
  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS cnt
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    `,
    [tableName, columnName],
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function pickDateColumn(tableName, preferredList) {
  for (const col of preferredList) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await hasColumn(tableName, col);
    if (ok) return col;
  }
  return null;
}

function csvEscape(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replaceAll('"', '""')}"`;
  }
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
      // Detect date columns safely
      const usersDate = (await pickDateColumn("users", ["createdAt"])) || null;
      const practicesDate =
        (await pickDateColumn("practices", ["createdAt", "created_on"])) || null;
      const commentsDate =
        (await pickDateColumn("comments", ["createdAt", "created_on"])) || null;

      // outcomeReports often uses createdAt OR reportedAt depending on your schema
      const outcomesDate =
        (await pickDateColumn("outcomeReports", ["createdAt", "reportedAt"])) ||
        null;

      const flagsCreated =
        (await pickDateColumn("flags", ["createdAt"])) || null;
      const flagsReviewed =
        (await pickDateColumn("flags", ["reviewedAt"])) || null;

      // USERS OVERVIEW
      const newUsersSql = usersDate
        ? `SUM(CASE WHEN ${usersDate} >= (NOW() - INTERVAL ? DAY) THEN 1 ELSE 0 END) AS newUsers`
        : `0 AS newUsers`;

      const [[usersOverview]] = await pool.query(
        `
        SELECT
          COUNT(*) AS totalUsers,
          SUM(CASE WHEN userStatus='ACTIVE' THEN 1 ELSE 0 END) AS activeUsers,
          SUM(CASE WHEN userStatus='SUSPENDED' THEN 1 ELSE 0 END) AS suspendedUsers,
          SUM(CASE WHEN userRole='USER' THEN 1 ELSE 0 END) AS usersCount,
          SUM(CASE WHEN userRole='MODERATOR' THEN 1 ELSE 0 END) AS moderatorsCount,
          SUM(CASE WHEN userRole='ADMIN' THEN 1 ELSE 0 END) AS adminsCount,
          ${newUsersSql}
        FROM users
        `,
        usersDate ? [days] : [],
      );

      // CONTENT VOLUME (safe)
      async function countNew(table, dateCol) {
        if (!dateCol) return 0;
        const [[r]] = await pool.query(
          `SELECT COUNT(*) AS c FROM ${table} WHERE ${dateCol} >= (NOW() - INTERVAL ? DAY)`,
          [days],
        );
        return Number(r?.c || 0);
      }

      const newPractices = await countNew("practices", practicesDate);
      const newComments = await countNew("comments", commentsDate);
      const newOutcomes = await countNew("outcomeReports", outcomesDate);

      // Flags totals (safe)
      const flagsWhere = flagsCreated
        ? `WHERE ${flagsCreated} >= (NOW() - INTERVAL ? DAY)`
        : "";

      const params = flagsCreated ? [days] : [];

      // avg resolution hours only if reviewedAt exists
      const avgResolutionSql =
        flagsReviewed && flagsCreated
          ? `
          ROUND(AVG(
            CASE WHEN status='RESOLVED' AND ${flagsReviewed} IS NOT NULL
              THEN TIMESTAMPDIFF(MINUTE, ${flagsCreated}, ${flagsReviewed}) / 60
              ELSE NULL
            END
          ), 1) AS avgResolutionHours
        `
          : `NULL AS avgResolutionHours`;

      const under24Sql =
        flagsReviewed && flagsCreated
          ? `
          ROUND(
            100 * AVG(
              CASE WHEN status='RESOLVED' AND ${flagsReviewed} IS NOT NULL
                THEN (TIMESTAMPDIFF(HOUR, ${flagsCreated}, ${flagsReviewed}) <= 24)
                ELSE NULL
              END
            )
          , 0) AS resolvedUnder24hPct
        `
          : `NULL AS resolvedUnder24hPct`;

      const [[flagsTotals]] = await pool.query(
        `
        SELECT
          COUNT(*) AS totalFlags,
          SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) AS pendingFlags,
          SUM(CASE WHEN status='RESOLVED' THEN 1 ELSE 0 END) AS resolvedFlags,
          ${avgResolutionSql},
          ${under24Sql}
        FROM flags
        ${flagsWhere}
        `,
        params,
      );

      // Flags breakdowns (only if flagsCreated exists)
      const byTargetType = flagsCreated
        ? (
            await pool.query(
              `
            SELECT targetType, COUNT(*) AS count
            FROM flags
            WHERE ${flagsCreated} >= (NOW() - INTERVAL ? DAY)
            GROUP BY targetType
            ORDER BY count DESC
            `,
              [days],
            )
          )[0]
        : [];

      const byReason = flagsCreated
        ? (
            await pool.query(
              `
            SELECT reason, COUNT(*) AS count
            FROM flags
            WHERE ${flagsCreated} >= (NOW() - INTERVAL ? DAY)
            GROUP BY reason
            ORDER BY count DESC
            `,
              [days],
            )
          )[0]
        : [];

      const topReporters = flagsCreated
        ? (
            await pool.query(
              `
            SELECT
              f.reporterUserId AS userId,
              u.fullName,
              u.email,
              COUNT(*) AS count
            FROM flags f
            LEFT JOIN users u ON u.userId = f.reporterUserId
            WHERE f.${flagsCreated} >= (NOW() - INTERVAL ? DAY)
            GROUP BY f.reporterUserId
            ORDER BY count DESC
            LIMIT 10
            `,
              [days],
            )
          )[0]
        : [];

      const topTargets = flagsCreated
        ? (
            await pool.query(
              `
            SELECT targetType, targetId, COUNT(*) AS count
            FROM flags
            WHERE ${flagsCreated} >= (NOW() - INTERVAL ? DAY)
            GROUP BY targetType, targetId
            ORDER BY count DESC
            LIMIT 10
            `,
              [days],
            )
          )[0]
        : [];

      // Most flagged owners (safe; if joins fail, return [])
      let topFlaggedOwners = [];
      try {
        topFlaggedOwners = flagsCreated
          ? (
              await pool.query(
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
                WHERE f.${flagsCreated} >= (NOW() - INTERVAL ? DAY)
                GROUP BY p.userId

                UNION ALL

                SELECT c.userId AS ownerUserId, COUNT(*) AS cnt
                FROM flags f
                JOIN comments c ON f.targetType='COMMENT' AND c.commentId = f.targetId
                WHERE f.${flagsCreated} >= (NOW() - INTERVAL ? DAY)
                GROUP BY c.userId
              ) x
              JOIN users owner ON owner.userId = x.ownerUserId
              GROUP BY owner.userId
              ORDER BY count DESC
              LIMIT 10
              `,
                [days, days],
              )
            )[0]
          : [];
      } catch {
        topFlaggedOwners = [];
      }

      return res.json({
        days,
        usersOverview: usersOverview || {},
        content: {
          newPractices,
          newComments,
          newOutcomes,
        },
        flagsTotals: flagsTotals || {},
        byTargetType,
        byReason,
        topReporters,
        topFlaggedOwners,
        topTargets,
      });
    } catch (err) {
      console.error("ADMIN ANALYTICS ERROR:", err);
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * CSV Exports (ADMIN)
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
      // reuse analytics endpoint logic quickly by just counting basics
      const usersDate = (await pickDateColumn("users", ["createdAt"])) || null;
      const practicesDate =
        (await pickDateColumn("practices", ["createdAt", "created_on"])) || null;
      const commentsDate =
        (await pickDateColumn("comments", ["createdAt", "created_on"])) || null;
      const outcomesDate =
        (await pickDateColumn("outcomeReports", ["createdAt", "reportedAt"])) ||
        null;

      async function countNew(table, dateCol) {
        if (!dateCol) return 0;
        const [[r]] = await pool.query(
          `SELECT COUNT(*) AS c FROM ${table} WHERE ${dateCol} >= (NOW() - INTERVAL ? DAY)`,
          [days],
        );
        return Number(r?.c || 0);
      }

      const [[u]] = await pool.query(
        `
        SELECT
          COUNT(*) AS totalUsers,
          SUM(CASE WHEN userStatus='ACTIVE' THEN 1 ELSE 0 END) AS activeUsers,
          SUM(CASE WHEN userStatus='SUSPENDED' THEN 1 ELSE 0 END) AS suspendedUsers
        FROM users
        `,
      );

      const newUsers = usersDate
        ? (
            await pool.query(
              `SELECT COUNT(*) AS c FROM users WHERE ${usersDate} >= (NOW() - INTERVAL ? DAY)`,
              [days],
            )
          )[0][0].c
        : 0;

      const row = {
        rangeDays: days,
        totalUsers: Number(u?.totalUsers || 0),
        activeUsers: Number(u?.activeUsers || 0),
        suspendedUsers: Number(u?.suspendedUsers || 0),
        newUsers: Number(newUsers || 0),
        newPractices: await countNew("practices", practicesDate),
        newComments: await countNew("comments", commentsDate),
        newOutcomes: await countNew("outcomeReports", outcomesDate),
      };

      const headers = Object.keys(row);
      return sendCsv(res, `analytics-${days}d.csv`, headers, [row]);
    } catch (err) {
      console.error("EXPORT ANALYTICS ERROR:", err);
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

router.get(
  "/admin/exports/moderation-audit.csv",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const days = [7, 30, 90, 365].includes(toInt(req.query.days, 30))
      ? toInt(req.query.days, 30)
      : 30;

    try {
      const reviewedCol =
        (await pickDateColumn("flags", ["reviewedAt"])) || null;

      if (!reviewedCol) {
        return sendCsv(
          res,
          `moderation-audit-${days}d.csv`,
          ["note"],
          [{ note: "flags.reviewedAt column not found in DB" }],
        );
      }

      const [rows] = await pool.query(
        `
        SELECT
          f.flagId,
          f.targetType,
          f.targetId,
          f.reason,
          f.actionTaken,
          f.reviewNote,
          f.${reviewedCol} AS reviewedAt,
          mu.fullName AS moderatorName,
          ru.fullName AS reporterName
        FROM flags f
        LEFT JOIN users mu ON mu.userId = f.reviewedBy
        LEFT JOIN users ru ON ru.userId = f.reporterUserId
        WHERE f.status='RESOLVED'
          AND f.${reviewedCol} >= (NOW() - INTERVAL ? DAY)
        ORDER BY f.${reviewedCol} DESC
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
      console.error("EXPORT AUDIT ERROR:", err);
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

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
      console.error("EXPORT USERS ERROR:", err);
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

module.exports = router;