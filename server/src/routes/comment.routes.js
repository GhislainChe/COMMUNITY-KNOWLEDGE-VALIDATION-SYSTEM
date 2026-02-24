const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * Helper: check practice exists and is ACTIVE
 */
async function ensurePracticeActive(practiceId) {
  const [rows] = await pool.query(
    "SELECT status FROM practices WHERE practiceId = ?",
    [practiceId],
  );
  if (rows.length === 0)
    return { ok: false, code: 404, message: "Practice not found" };
  if (rows[0].status !== "ACTIVE")
    return { ok: false, code: 403, message: "This practice is not available" };
  return { ok: true };
}

/**
 * POST /api/practices/:practiceId/comments
 */
router.post("/practices/:practiceId/comments", requireAuth, async (req, res) => {
  try {
    const practiceId = Number(req.params.practiceId);
    if (!Number.isInteger(practiceId) || practiceId <= 0) {
      return res.status(400).json({ message: "Invalid practiceId" });
    }

    const practiceCheck = await ensurePracticeActive(practiceId);
    if (!practiceCheck.ok) {
      return res.status(practiceCheck.code).json({ message: practiceCheck.message });
    }

    const { content } = req.body;
    if (!content || content.trim().length < 1) {
      return res.status(400).json({ message: "content is required" });
    }
    if (content.length > 500) {
      return res.status(400).json({ message: "content must be 500 characters or less" });
    }

    const userId = req.user.userId;

    const [result] = await pool.query(
      "INSERT INTO comments (userId, practiceId, parentCommentId, content) VALUES (?, ?, NULL, ?)",
      [userId, practiceId, content.trim()],
    );

    return res.status(201).json({ message: "Comment added", commentId: result.insertId });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/practices/:practiceId/comments/:commentId/replies
 */
router.post(
  "/practices/:practiceId/comments/:commentId/replies",
  requireAuth,
  async (req, res) => {
    try {
      const practiceId = Number(req.params.practiceId);
      const parentId = Number(req.params.commentId);

      if (!Number.isInteger(practiceId) || practiceId <= 0) {
        return res.status(400).json({ message: "Invalid practiceId" });
      }
      if (!Number.isInteger(parentId) || parentId <= 0) {
        return res.status(400).json({ message: "Invalid commentId" });
      }

      const practiceCheck = await ensurePracticeActive(practiceId);
      if (!practiceCheck.ok) {
        return res.status(practiceCheck.code).json({ message: practiceCheck.message });
      }

      // Ensure parent comment exists and belongs to the same practice
      const [parentRows] = await pool.query(
        "SELECT commentId, status FROM comments WHERE commentId = ? AND practiceId = ?",
        [parentId, practiceId],
      );

      if (parentRows.length === 0) {
        return res.status(404).json({ message: "Parent comment not found for this practice" });
      }
      if (String(parentRows[0].status).toUpperCase() !== "VISIBLE") {
        return res.status(403).json({ message: "Cannot reply to this comment" });
      }

      const { content } = req.body;
      if (!content || content.trim().length < 1) {
        return res.status(400).json({ message: "content is required" });
      }
      if (content.length > 500) {
        return res.status(400).json({ message: "content must be 500 characters or less" });
      }

      const userId = req.user.userId;

      const [result] = await pool.query(
        "INSERT INTO comments (userId, practiceId, parentCommentId, content) VALUES (?, ?, ?, ?)",
        [userId, practiceId, parentId, content.trim()],
      );

      return res.status(201).json({ message: "Reply added", commentId: result.insertId });
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * GET /api/practices/:practiceId/comments
 * Includes HIDDEN comments but masks them as System moderation messages.
 */
router.get("/practices/:practiceId/comments", async (req, res) => {
  try {
    const practiceId = Number(req.params.practiceId);
    if (!Number.isInteger(practiceId) || practiceId <= 0) {
      return res.status(400).json({ message: "Invalid practiceId" });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        c.commentId,
        c.userId,
        c.parentCommentId,
        c.content,
        c.status,            -- ✅ IMPORTANT FIX
        c.createdAt,
        c.practiceId,
        u.fullName AS authorName
      FROM comments c
      JOIN users u ON u.userId = c.userId
      WHERE c.practiceId = ? AND c.status IN ('VISIBLE', 'HIDDEN')
      ORDER BY c.createdAt ASC
      `,
      [practiceId],
    );

    const masked = rows.map((c) => {
      if (String(c.status).toUpperCase() === "HIDDEN") {
        return {
          ...c,
          userId: 0,
          content:
            "This comment was removed by a moderator for violating community guidelines.",
          authorName: "System",
          isModerationNotice: true,
        };
      }
      return c;
    });

    return res.json({ practiceId, comments: masked });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;