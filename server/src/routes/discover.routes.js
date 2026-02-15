// server/routes/discover.routes.js
const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/discover/practices
 * Public discover search with:
 * - Tabs/Sort modes: trending | recommended | new | validated | top | reported
 * - Filters: q, cropTypeId, problemTypeId, season, confidenceLevel, location
 * - Pagination: page, limit
 * - Adds:
 *   appliedCount, appliedLast7,
 *   totalReports, validReports, yesCount, recommendationRate,
 *   whyText (micro insight)
 */
router.get("/discover/practices", async (req, res) => {
  try {
    const {
      q = "",
      cropTypeId = "",
      problemTypeId = "",
      season = "",
      confidenceLevel = "",
      location = "",
      sort = "trending",
      page = "1",
      limit = "10",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(5, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    // WHERE filters
    const where = [`p.status='ACTIVE'`];
    const params = [];

    if (q && q.trim()) {
      where.push(`(p.title LIKE ? OR p.description LIKE ? OR p.steps LIKE ?)`);
      const like = `%${q.trim()}%`;
      params.push(like, like, like);
    }
    if (cropTypeId) {
      where.push(`p.cropTypeId = ?`);
      params.push(Number(cropTypeId));
    }
    if (problemTypeId) {
      where.push(`p.problemTypeId = ?`);
      params.push(Number(problemTypeId));
    }
    if (season) {
      where.push(`p.season = ?`);
      params.push(season);
    }
    if (confidenceLevel) {
      where.push(`p.confidenceLevel = ?`);
      params.push(confidenceLevel);
    }
    if (location && location.trim()) {
      where.push(`p.location LIKE ?`);
      params.push(`%${location.trim()}%`);
    }

    // ORDER BY (tabs)
    // We compute “appliedLast7” & “validReports” in SELECT using subqueries, then sort on them.
    let orderBy = `p.createdAt DESC`; // default
    if (sort === "trending") orderBy = `appliedLast7 DESC, appliedCount DESC, p.createdAt DESC`;
    if (sort === "recommended") orderBy = `recommendationRate DESC, yesCount DESC, p.createdAt DESC`;
    if (sort === "new") orderBy = `p.createdAt DESC`;
    if (sort === "validated") orderBy = `validReports DESC, totalReports DESC, p.createdAt DESC`;
    if (sort === "top") orderBy = `p.effectivenessScore DESC, validReports DESC, p.createdAt DESC`;
    if (sort === "reported") orderBy = `totalReports DESC, p.createdAt DESC`;

    // Main query (results)
    const sql = `
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

        u.fullName AS authorName,

        ct.name AS cropName,
        pt.name AS problemName,

        -- total applied ever
        (SELECT COUNT(*)
         FROM applied_practices ap
         WHERE ap.practiceId = p.practiceId) AS appliedCount,

        -- applied in last 7 days (trending)
        (SELECT COUNT(*)
         FROM applied_practices ap
         WHERE ap.practiceId = p.practiceId
           AND ap.appliedAt >= (NOW() - INTERVAL 7 DAY)) AS appliedLast7,

        -- outcome reports totals
        (SELECT COUNT(*)
         FROM outcomeReports o
         WHERE o.practiceId = p.practiceId) AS totalReports,

        -- valid reports
        (SELECT COUNT(*)
         FROM outcomeReports o
         WHERE o.practiceId = p.practiceId
           AND o.status = 'VALID') AS validReports,

        -- yesCount among VALID reports
        (SELECT COUNT(*)
         FROM outcomeReports o
         WHERE o.practiceId = p.practiceId
           AND o.status = 'VALID'
           AND o.recommendation = 'YES') AS yesCount,

        -- recommendationRate among VALID where recommendation not null
        (
          CASE
            WHEN (
              SELECT COUNT(*)
              FROM outcomeReports o
              WHERE o.practiceId = p.practiceId
                AND o.status='VALID'
                AND o.recommendation IS NOT NULL
            ) = 0 THEN 0
            ELSE ROUND(
              (
                (SELECT COUNT(*)
                 FROM outcomeReports o
                 WHERE o.practiceId = p.practiceId
                   AND o.status='VALID'
                   AND o.recommendation='YES')
                /
                (SELECT COUNT(*)
                 FROM outcomeReports o
                 WHERE o.practiceId = p.practiceId
                   AND o.status='VALID'
                   AND o.recommendation IS NOT NULL)
              ) * 100
            )
          END
        ) AS recommendationRate

      FROM practices p
      JOIN users u ON u.userId = p.userId
      LEFT JOIN cropTypes ct ON ct.cropTypeId = p.cropTypeId
      LEFT JOIN problemTypes pt ON pt.problemTypeId = p.problemTypeId
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(sql, [...params, limitNum, offset]);

    // Count query (for hasMore/total)
    const countSql = `
      SELECT COUNT(*) AS total
      FROM practices p
      WHERE ${where.join(" AND ")}
    `;
    const [countRows] = await pool.query(countSql, params);
    const total = Number(countRows?.[0]?.total || 0);
    const hasMore = offset + rows.length < total;

    // Add “whyText” per row (micro-insight)
    const results = rows.map((r) => {
      let whyText = "";
      if (sort === "trending") whyText = `Trending: ${Number(r.appliedLast7 || 0)} applied this week`;
      else if (sort === "recommended") whyText = `Recommended: ${Number(r.recommendationRate || 0)}% say YES`;
      else if (sort === "validated") whyText = `Validated: ${Number(r.validReports || 0)} valid reports`;
      else if (sort === "top") whyText = `Top score: ${r.effectivenessScore ?? "—"}`;
      else if (sort === "reported") whyText = `Most reported: ${Number(r.totalReports || 0)} reports`;
      else whyText = `New: added recently`;

      return { ...r, whyText };
    });

    return res.json({
      results,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        hasMore,
        sort,
      },
    });
  } catch (err) {
    console.error("GET /api/discover/practices failed:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET /api/discover/for-you
 * Protected (personalized discover):
 * - Finds user’s most-applied cropTypeId
 * - Returns practices in that cropTypeId (fallback to trending if none)
 */
router.get("/discover/for-you", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // find user's top cropTypeId based on their applied practices
    const [prefRows] = await pool.query(
      `
      SELECT p.cropTypeId, COUNT(*) AS cnt
      FROM applied_practices ap
      JOIN practices p ON p.practiceId = ap.practiceId
      WHERE ap.userId = ? AND p.cropTypeId IS NOT NULL
      GROUP BY p.cropTypeId
      ORDER BY cnt DESC
      LIMIT 1
      `,
      [userId]
    );

    const preferredCropTypeId = prefRows?.[0]?.cropTypeId || null;

    // If no preference, fallback to trending
    const sort = "trending";
    const limitNum = 10;

    const where = [`p.status='ACTIVE'`];
    const params = [];

    if (preferredCropTypeId) {
      where.push(`p.cropTypeId = ?`);
      params.push(Number(preferredCropTypeId));
    }

    const sql = `
      SELECT
        p.practiceId,
        p.title,
        p.description,
        p.season,
        p.location,
        p.imageUrl,
        p.effectivenessScore,
        p.confidenceLevel,
        p.createdAt,
        u.fullName AS authorName,

        (SELECT COUNT(*) FROM applied_practices ap WHERE ap.practiceId = p.practiceId) AS appliedCount,
        (SELECT COUNT(*) FROM applied_practices ap
          WHERE ap.practiceId = p.practiceId AND ap.appliedAt >= (NOW() - INTERVAL 7 DAY)) AS appliedLast7,

        (SELECT COUNT(*) FROM outcomeReports o WHERE o.practiceId = p.practiceId) AS totalReports,
        (SELECT COUNT(*) FROM outcomeReports o WHERE o.practiceId = p.practiceId AND o.status='VALID') AS validReports,
        (SELECT COUNT(*) FROM outcomeReports o
          WHERE o.practiceId = p.practiceId AND o.status='VALID' AND o.recommendation='YES') AS yesCount,

        (
          CASE
            WHEN (
              SELECT COUNT(*)
              FROM outcomeReports o
              WHERE o.practiceId = p.practiceId
                AND o.status='VALID'
                AND o.recommendation IS NOT NULL
            ) = 0 THEN 0
            ELSE ROUND(
              (
                (SELECT COUNT(*)
                 FROM outcomeReports o
                 WHERE o.practiceId = p.practiceId
                   AND o.status='VALID'
                   AND o.recommendation='YES')
                /
                (SELECT COUNT(*)
                 FROM outcomeReports o
                 WHERE o.practiceId = p.practiceId
                   AND o.status='VALID'
                   AND o.recommendation IS NOT NULL)
              ) * 100
            )
          END
        ) AS recommendationRate

      FROM practices p
      JOIN users u ON u.userId = p.userId
      WHERE ${where.join(" AND ")}
      ORDER BY appliedLast7 DESC, appliedCount DESC, p.createdAt DESC
      LIMIT ?
    `;

    const [rows] = await pool.query(sql, [...params, limitNum]);

    const results = rows.map((r) => ({
      ...r,
      whyText: preferredCropTypeId
        ? "For you: matches your most-applied crop"
        : `Trending: ${Number(r.appliedLast7 || 0)} applied this week`,
    }));

    return res.json({
      results,
      meta: { sort: "forYou", preferredCropTypeId: preferredCropTypeId || null },
    });
  } catch (err) {
    console.error("GET /api/discover/for-you failed:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
