// server/routes/discover.routes.js
const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

/**
 * GET /api/discover/practices
 * Query params:
 *  - q
 *  - cropTypeId
 *  - problemTypeId
 *  - season
 *  - confidenceLevel
 *  - location
 *  - sort = trending | new | top | recommended | reported
 *
 * NOTE:
 *  - trending = most applied first, then most reports, then newest
 */
router.get("/discover/practices", async (req, res) => {
  try {
    const {
      q,
      cropTypeId,
      problemTypeId,
      season,
      confidenceLevel,
      location,
      sort = "trending",
    } = req.query;

    const filters = [];
    const params = [];

    // Base filter: only active practices
    filters.push("p.status = 'ACTIVE'");

    if (q && q.trim()) {
      filters.push("(p.title LIKE ? OR p.description LIKE ? OR p.steps LIKE ?)");
      const like = `%${q.trim()}%`;
      params.push(like, like, like);
    }

    if (cropTypeId) {
      filters.push("p.cropTypeId = ?");
      params.push(Number(cropTypeId));
    }

    if (problemTypeId) {
      filters.push("p.problemTypeId = ?");
      params.push(Number(problemTypeId));
    }

    if (season && season.trim()) {
      filters.push("p.season = ?");
      params.push(season.trim());
    }

    if (confidenceLevel && confidenceLevel.trim()) {
      filters.push("p.confidenceLevel = ?");
      params.push(confidenceLevel.trim());
    }

    if (location && location.trim()) {
      filters.push("p.location LIKE ?");
      params.push(`%${location.trim()}%`);
    }

    // Sorting
    let orderBy = "p.createdAt DESC";

    if (sort === "new") orderBy = "p.createdAt DESC";
    if (sort === "top") orderBy = "p.effectivenessScore DESC, p.createdAt DESC";
    if (sort === "reported") orderBy = "totalReports DESC, p.createdAt DESC";
    if (sort === "recommended") orderBy = "yesCount DESC, p.createdAt DESC";

    // ✅ Trending: most applied first, then most reports, then newest
    if (sort === "trending")
      orderBy = "appliedCount DESC, totalReports DESC, p.createdAt DESC";

    const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

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

        -- stats from outcomes
        COALESCE(r.totalReports, 0) AS totalReports,
        COALESCE(r.yesCount, 0) AS yesCount,

        -- ✅ stats from applied/bookmarks
        COALESCE(a.appliedCount, 0) AS appliedCount

      FROM practices p
      JOIN users u ON u.userId = p.userId

      LEFT JOIN (
        SELECT
          practiceId,
          COUNT(*) AS totalReports,
          SUM(CASE WHEN recommendation = 'YES' THEN 1 ELSE 0 END) AS yesCount
        FROM outcomeReports
        WHERE status = 'VALID'
        GROUP BY practiceId
      ) r ON r.practiceId = p.practiceId

      LEFT JOIN (
        SELECT
          practiceId,
          COUNT(*) AS appliedCount
        FROM applied_practices
        GROUP BY practiceId
      ) a ON a.practiceId = p.practiceId

      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT 50
    `;

    const [rows] = await pool.query(sql, params);

    return res.json({
      sort,
      results: rows,
    });
  } catch (err) {
    console.error("GET /api/discover/practices failed:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
