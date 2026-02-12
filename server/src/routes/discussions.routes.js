const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/discussions/mine
 * Protected: returns list of practice threads the user commented in.
 *
 * Output example:
 * {
 *   "threads": [
 *     {
 *       "practiceId": 4,
 *       "title": "Leaves Pest Control",
 *       "authorName": "Test User 2",
 *       "lastMessage": "I agree, but it needs regular application.",
 *       "lastAt": "2026-02-02T08:31:36.000Z",
 *       "messagesCount": 5
 *     }
 *   ]
 * }
 */
router.get("/discussions/mine", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1) Get each practice the user has commented in + stats
    // - last message content/date (for that practice)
    // - total visible messages in that practice (optional)
    // - practice title + author name
    const [rows] = await pool.query(
      `
      SELECT
        p.practiceId,
        p.title,
        COALESCE(u.fullName, u.email, 'Community member') AS authorName,
        lastC.content AS lastMessage,
        lastC.createdAt AS lastAt,
        counts.messagesCount AS messagesCount
      FROM (
        -- all practices where THIS user has at least 1 visible comment
        SELECT DISTINCT practiceId
        FROM comments
        WHERE userId = ? AND status = 'VISIBLE'
      ) my

      INNER JOIN practices p ON p.practiceId = my.practiceId

      -- practice owner (author)
      LEFT JOIN users u ON u.userId = p.userId

      -- last comment in that practice (anyone's message)
      INNER JOIN (
        SELECT c1.practiceId, c1.content, c1.createdAt
        FROM comments c1
        INNER JOIN (
          SELECT practiceId, MAX(createdAt) AS maxCreatedAt
          FROM comments
          WHERE status='VISIBLE'
          GROUP BY practiceId
        ) mx
          ON mx.practiceId = c1.practiceId
         AND mx.maxCreatedAt = c1.createdAt
        WHERE c1.status='VISIBLE'
      ) lastC ON lastC.practiceId = p.practiceId

      -- total visible comments count per practice
      INNER JOIN (
        SELECT practiceId, COUNT(*) AS messagesCount
        FROM comments
        WHERE status='VISIBLE'
        GROUP BY practiceId
      ) counts ON counts.practiceId = p.practiceId

      ORDER BY lastAt DESC
      `,
      [userId]
    );

    return res.json({ threads: rows });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
