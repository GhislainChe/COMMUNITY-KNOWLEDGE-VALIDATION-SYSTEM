const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/notifications/mine
 * Returns logged in user's notifications (latest first)
 */
router.get("/notifications/mine", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.query(
      `SELECT notificationId, title, message, linkUrl, type, isRead, createdAt
       FROM notifications
       WHERE userId=?
       ORDER BY createdAt DESC
       LIMIT 200`,
      [userId]
    );

    return res.json({ notifications: rows });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    await pool.query(
      "UPDATE notifications SET isRead=1 WHERE notificationId=? AND userId=?",
      [id, userId]
    );

    return res.json({ message: "Marked as read" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;