const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { requireAuth } = require("./middleware/auth");
const practiceRoutes = require("./routes/practice.routes");
const pool = require("./db/pool");
const authRoutes = require("./routes/auth.routes");
const outcomeRoutes = require("./routes/outcome.routes");
const commentRoutes = require("./routes/comment.routes");
const discussionsRoutes = require("./routes/discussions.routes");
const flagRoutes = require("./routes/flag.routes");
const moderationRoutes = require("./routes/moderation.routes");
const adminRoutes = require("./routes/admin.routes");
const path = require("path");
const metaRoutes = require("./routes/meta.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: rows[0].ok });
  } catch (err) {
    res.status(500).json({ status: "fail", error: err.message });
  }
});

app.get("/api/me", requireAuth, async (req, res) => {
  // req.user comes from the token payload
  return res.json({ message: "You are authenticated", user: req.user });
});

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/practices", practiceRoutes);
app.use("/api", outcomeRoutes);
app.use("/api", commentRoutes);
app.use("/api", discussionsRoutes);
app.use("/api", flagRoutes);
app.use("/api", moderationRoutes);
app.use("/api", adminRoutes);
app.use("/api/meta", metaRoutes);

console.log("DB_PASSWORD loaded?", process.env.DB_PASSWORD ? "YES" : "NO");
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
