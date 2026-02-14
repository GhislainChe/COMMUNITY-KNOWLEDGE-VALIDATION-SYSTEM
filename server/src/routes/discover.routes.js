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
 *  - sort: new | top | recommended | reported
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
      sort = "new",
    } = req.query;

    const where = ["p.status='ACTIVE'"];
    const params = [];

    if (q && q.trim()) {
      where.push("(p.title LIKE ? OR p.description LIKE ? OR p.steps LIKE ?)");
      const like = `%${q.trim()}%`;
      params.push(like, like, like);
    }

    if (cropTypeId) {
      where.push("p.cropTypeId = ?");
      params.push(Number(cropTypeId));
    }

    if (problemTypeId) {
      where.push("p.problemTypeId = ?");
      params.push(Number(problemTypeId));
    }

    if (season && season.trim()) {
      where.push("p.season = ?");
      params.push(season.trim());
    }

    if (confidenceLevel && confidenceLevel.trim()) {
      where.push("p.confidenceLevel = ?");
      params.push(confidenceLevel.trim());
    }

    if (location && location.trim()) {
      where.push("p.location LIKE ?");
      params.push(`%${location.trim()}%`);
    }

    // Stats: reports + recommendation YES count
    // NOTE: outcomeReports table name must match yours exactly.
    let orderBy = "p.createdAt DESC";
    if (sort === "top") orderBy = "p.effectivenessScore DESC, p.createdAt DESC";
    if (sort === "reported") orderBy = "totalReports DESC, p.createdAt DESC";
    if (sort === "recommended") orderBy = "yesCount DESC, p.createdAt DESC";

    const sql = `
      SELECT
        p.practiceId,
        p.title,
        p.description,
        p.location,
        p.season,
        p.confidenceLevel,
        p.effectivenessScore,
        p.imageUrl,
        p.createdAt,
        u.fullName AS authorName,

        -- stats
        COALESCE(r.totalReports, 0) AS totalReports,
        COALESCE(r.yesCount, 0) AS yesCount
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

      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT 200
    `;

    const [rows] = await pool.query(sql, params);
    return res.json({ results: rows });
  } catch (err) {
    console.error("GET /api/discover/practices failed:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
