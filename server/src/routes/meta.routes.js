const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

/**
 * GET /api/meta/crops
 * Returns crop types for dropdown
 */
router.get("/crops", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT cropTypeId, name FROM cropTypes ORDER BY name ASC"
    );
    return res.json({ crops: rows });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET /api/meta/problems
 * Returns problem types for dropdown
 */
router.get("/problems", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT problemTypeId, name FROM problemTypes ORDER BY name ASC"
    );
    return res.json({ problems: rows });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET /api/meta/seasons
 * Static list (no DB table needed)
 */
router.get("/seasons", (req, res) => {
  return res.json({
    seasons: ["Dry season", "Rainy season", "All seasons"]
  });
});

module.exports = router;
