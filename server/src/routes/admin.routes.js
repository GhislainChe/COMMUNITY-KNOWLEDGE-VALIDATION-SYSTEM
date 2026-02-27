// server/routes/admin.routes.js
const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth"); // ensure requireRole exists

const router = express.Router();

/**
 * GET /api/admin/overview
 * Dashboard stats
 */
router.get(
  "/admin/overview",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          COUNT(*) AS totalUsers,
          SUM(CASE WHEN userStatus='ACTIVE' THEN 1 ELSE 0 END) AS activeUsers,
          SUM(CASE WHEN userStatus='SUSPENDED' THEN 1 ELSE 0 END) AS suspendedUsers,
          SUM(CASE WHEN userRole='USER' THEN 1 ELSE 0 END) AS usersCount,
          SUM(CASE WHEN userRole='MODERATOR' THEN 1 ELSE 0 END) AS moderatorsCount,
          SUM(CASE WHEN userRole='ADMIN' THEN 1 ELSE 0 END) AS adminsCount
        FROM users
      `);

      return res.json({ overview: rows[0] || {} });
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * GET /api/admin/users
 * List all users (with optional filters)
 * ?q=search&status=ALL|ACTIVE|SUSPENDED&role=ALL|USER|MODERATOR|ADMIN
 */
router.get(
  "/admin/users",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const q = (req.query.q || "").trim();
      const status = String(req.query.status || "ALL").toUpperCase();
      const role = String(req.query.role || "ALL").toUpperCase();

      const where = [];
      const params = [];

      if (q) {
        where.push("(fullName LIKE ? OR email LIKE ? OR CAST(userId AS CHAR) LIKE ?)");
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }

      if (status !== "ALL") {
        if (!["ACTIVE", "SUSPENDED"].includes(status)) {
          return res.status(400).json({ message: "Invalid status filter" });
        }
        where.push("userStatus = ?");
        params.push(status);
      }

      if (role !== "ALL") {
        if (!["USER", "MODERATOR", "ADMIN"].includes(role)) {
          return res.status(400).json({ message: "Invalid role filter" });
        }
        where.push("userRole = ?");
        params.push(role);
      }

      const sql = `
        SELECT
          userId,
          fullName,
          email,
          userRole,
          userStatus,
          credibilityScore,
          createdAt
        FROM users
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY createdAt DESC
      `;

      const [rows] = await pool.query(sql, params);
      return res.json({ users: rows });
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * PATCH /api/admin/users/:userId/role
 * { role: "USER"|"MODERATOR"|"ADMIN" }
 */
router.patch(
  "/admin/users/:userId/role",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const role = String(req.body.role || "").toUpperCase();

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid userId" });
      }

      const allowed = ["USER", "MODERATOR", "ADMIN"];
      if (!allowed.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      await pool.query(`UPDATE users SET userRole=? WHERE userId=?`, [role, userId]);
      return res.json({ message: "Role updated", userId, role });
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * PATCH /api/admin/users/:userId/status
 * { status: "ACTIVE"|"SUSPENDED" }
 */
router.patch(
  "/admin/users/:userId/status",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const status = String(req.body.status || "").toUpperCase();

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid userId" });
      }

      const allowed = ["ACTIVE", "SUSPENDED"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await pool.query(`UPDATE users SET userStatus=? WHERE userId=?`, [status, userId]);
      return res.json({ message: "Status updated", userId, status });
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

/**
 * PATCH /api/admin/users/:userId/credibility
 * { credibilityScore: number }
 */
router.patch(
  "/admin/users/:userId/credibility",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const credibilityScore = Number(req.body.credibilityScore);

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid userId" });
      }
      if (Number.isNaN(credibilityScore) || credibilityScore < 0 || credibilityScore > 100) {
        return res.status(400).json({ message: "credibilityScore must be between 0 and 100" });
      }

      await pool.query(`UPDATE users SET credibilityScore=? WHERE userId=?`, [
        credibilityScore,
        userId,
      ]);

      return res.json({ message: "Credibility updated", userId, credibilityScore });
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err.message });
    }
  },
);

module.exports = router;