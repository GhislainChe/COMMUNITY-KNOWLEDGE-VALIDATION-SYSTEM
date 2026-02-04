const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db/pool");
const { signToken } = require("../utils/jwt");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, gender } = req.body;

    if (!fullName || !email || !password || !gender) {
      return res
        .status(400)
        .json({
          message: "fullName, email, password, and gender are required",
        });
    }

    const allowedGenders = ["MALE", "FEMALE", "OTHER"];
    if (!allowedGenders.includes(gender)) {
      return res.status(400).json({ message: "Invalid gender value" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const [existing] = await pool.query(
      "SELECT userId FROM users WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (fullName, email, passwordHash, gender) VALUES (?, ?, ?, ?)",
      [fullName, email, passwordHash, gender],
    );

    // Your DB uses userRole, default is USER already
    const token = signToken({ userId: result.insertId, role: "USER" });

    return res.status(201).json({
      message: "Registered successfully",
      token,
      user: { userId: result.insertId, fullName, email, role: "USER" },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }

    // IMPORTANT: use userRole and userStatus (matches your DB)
    const [rows] = await pool.query(
      "SELECT userId, fullName, email, passwordHash, userRole, userStatus FROM users WHERE email = ?",
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    if (user.userStatus !== "ACTIVE") {
      return res.status(403).json({ message: "Account is not active" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ userId: user.userId, role: user.userRole });

    return res.json({
      message: "Logged in successfully",
      token,
      user: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        role: user.userRole,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
