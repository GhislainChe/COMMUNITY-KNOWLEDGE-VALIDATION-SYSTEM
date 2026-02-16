// server/routes/users.routes.js
const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/users/me  -> return real DB user
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.query(
      `SELECT userId, fullName, email, userRole, credibilityScore, createdAt
       FROM users
       WHERE userId = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: rows[0] });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PATCH /api/users/me  -> update profile
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, email } = req.body;

    // basic validation
    if (fullName !== undefined && !String(fullName).trim()) {
      return res.status(400).json({ message: "Full name cannot be empty" });
    }
    if (email !== undefined && !String(email).trim()) {
      return res.status(400).json({ message: "Email cannot be empty" });
    }

    // if email changes, ensure unique
    if (email) {
      const [dup] = await pool.query(
        "SELECT userId FROM users WHERE email = ? AND userId <> ?",
        [email.trim(), userId]
      );
      if (dup.length > 0) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    await pool.query(
      `UPDATE users
       SET fullName = COALESCE(?, fullName),
           email    = COALESCE(?, email)
       WHERE userId = ?`,
      [fullName?.trim() || null, email?.trim() || null, userId]
    );

    const [rows] = await pool.query(
      `SELECT userId, fullName, email, userRole, credibilityScore, createdAt
       FROM users
       WHERE userId = ?`,
      [userId]
    );

    return res.json({ message: "Profile updated", user: rows[0] });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
