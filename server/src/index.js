const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db/pool");

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

console.log("DB_PASSWORD loaded?", process.env.DB_PASSWORD ? "YES" : "NO");
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
