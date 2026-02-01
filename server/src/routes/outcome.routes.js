const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * Helper: convert outcomeType to numeric score.
 * Why? We need numbers for calculating averages.
 */
function outcomeTypeToScore(outcomeType) {
  if (outcomeType === "EFFECTIVE") return 1.0;
  if (outcomeType === "PARTIAL") return 0.5;
  if (outcomeType === "INEFFECTIVE") return 0.0;
  return null;
}

/**
 * Helper: compute confidence level based on number of valid reports.
 * Why? More reports = more confidence.
 */
function confidenceFromCount(count) {
  if (count >= 10) return "HIGH";
  if (count >= 3) return "MEDIUM";
  return "LOW";
}

/**
 * POST /api/practices/:practiceId/outcomes
 * Protected: user must be logged in.
 */
router.post(
  "/practices/:practiceId/outcomes",
  requireAuth,
  async (req, res) => {
    try {
      const practiceId = Number(req.params.practiceId);
      if (!Number.isInteger(practiceId) || practiceId <= 0) {
        return res.status(400).json({ message: "Invalid practiceId" });
      }

      // 0) Check if practice exists and is active
      const [practiceRows] = await pool.query(
        "SELECT practiceId, status FROM practices WHERE practiceId = ?",
        [practiceId],
      );

      if (practiceRows.length === 0) {
        return res.status(404).json({ message: "Practice not found" });
      }

      if (practiceRows[0].status !== "ACTIVE") {
        return res.status(403).json({
          message: "This practice is not available for outcome reporting",
        });
      }

      // userId comes from the JWT (this prevents identity cheating)
      const userId = req.user.userId;

      const {
        outcomeType,
        similarContext,
        observation,
        timeToResult,
        recommendation,
      } = req.body;

      // 1) Validate required fields
      if (!outcomeType || !similarContext) {
        return res
          .status(400)
          .json({ message: "outcomeType and similarContext are required" });
      }
      if (!["EFFECTIVE", "PARTIAL", "INEFFECTIVE"].includes(outcomeType)) {
        return res.status(400).json({ message: "Invalid outcomeType" });
      }
      if (!["Y", "N"].includes(similarContext)) {
        return res
          .status(400)
          .json({ message: "similarContext must be Y or N" });
      }

      // 2) Convert outcomeType → outcomeScore
      const outcomeScore = outcomeTypeToScore(outcomeType);

      // 3) Insert report
      // IMPORTANT: UNIQUE(userId, practiceId) in DB will block duplicates
      await pool.query(
        `INSERT INTO outcomeReports
       (userId, practiceId, outcomeType, outcomeScore, similarContext, observation, timeToResult, recommendation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          practiceId,
          outcomeType,
          outcomeScore,
          similarContext,
          observation || null,
          timeToResult || null,
          recommendation || null,
        ],
      );

      // 4) Recalculate practice score using ALL outcome reports
      // Why? Each new report changes the average effectiveness.
      const [rows] = await pool.query(
        "SELECT AVG(outcomeScore) AS avgScore, COUNT(*) AS countReports FROM outcomeReports WHERE practiceId = ?",
        [practiceId],
      );

      const avgScore = rows[0].avgScore === null ? 0 : Number(rows[0].avgScore);
      const countReports = Number(rows[0].countReports);

      const confidenceLevel = confidenceFromCount(countReports);

      // 5) Update practice table
      await pool.query(
        "UPDATE practices SET effectivenessScore = ?, confidenceLevel = ? WHERE practiceId = ?",
        [avgScore, confidenceLevel, practiceId],
      );

      // 6) Update contributor credibility score (author of the practice)
      // Why? Credibility is based on how well the user's practices perform over time.

      // a) Get the practice owner (author)
      const [ownerRows] = await pool.query(
        "SELECT userId FROM practices WHERE practiceId = ?",
        [practiceId],
      );

      const ownerId = ownerRows[0].userId;

      // b) Compute new credibility as average effectiveness of all author's active practices
      const [credRows] = await pool.query(
        "SELECT AVG(effectivenessScore) AS credibility FROM practices WHERE userId = ? AND status='ACTIVE'",
        [ownerId],
      );

      const newCredibility =
        credRows[0].credibility === null ? 0 : Number(credRows[0].credibility);

      // c) Update user's credibilityScore
      await pool.query(
        "UPDATE users SET credibilityScore = ? WHERE userId = ?",
        [newCredibility, ownerId],
      );

      // 6) Return response
      return res.status(201).json({
        message: "Outcome report submitted",
        practiceId,
        newEffectivenessScore: avgScore,
        confidenceLevel,
        reportsCount: countReports,
        authorCredibilityScore: newCredibility

      });
    } catch (err) {
      // Duplicate outcome report case:
      // MySQL will throw an error because of UNIQUE(userId, practiceId)
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          message: "You have already submitted an outcome for this practice",
        });
      }

      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  },
);

module.exports = router;
