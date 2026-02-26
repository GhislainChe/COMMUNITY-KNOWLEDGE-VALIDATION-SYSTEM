const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/admin/users
 * Admin: list all users (basic info only)
 */
router.get(
  "/admin/users",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT userId, fullName, email, credibilityScore, userRole, userStatus, createdAt
       FROM users
       ORDER BY createdAt DESC`,
      );

      return res.json({ users: rows });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * PATCH /api/admin/users/:userId/role
 * Admin: update user role
 */
router.patch(
  "/admin/users/:userId/role",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const { userRole } = req.body;

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid userId" });
      }

      if (!["USER", "MODERATOR", "ADMIN"].includes(userRole)) {
        return res.status(400).json({ message: "Invalid userRole" });
      }

      await pool.query("UPDATE users SET userRole=? WHERE userId=?", [
        userRole,
        userId,
      ]);

      return res.json({ message: "User role updated", userId, userRole });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * PATCH /api/admin/users/:userId/status
 * Admin: suspend/activate user
 */
router.patch(
  "/admin/users/:userId/status",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const { userStatus } = req.body;

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid userId" });
      }

      if (!["ACTIVE", "SUSPENDED"].includes(userStatus)) {
        return res.status(400).json({ message: "Invalid userStatus" });
      }

      await pool.query("UPDATE users SET userStatus=? WHERE userId=?", [
        userStatus,
        userId,
      ]);

      return res.json({ message: "User status updated", userId, userStatus });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Server error", error: err.message });
    }
  },
);

module.exports = router;
