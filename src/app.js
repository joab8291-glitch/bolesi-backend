const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get("/", (_req, res) => res.json({ service: "BOLESI API", status: "ok", docs: "/api/health" }));
app.get("/api/health", async (_req, res) => {
  let database = "not_configured";
  try {
    if (process.env.DATABASE_URL) {
      const { prisma } = require("./lib/prisma");
      await prisma.$queryRaw`SELECT 1`;
      database = "connected";
    }
  } catch (_error) { database = "disconnected"; }
  res.status(database === "disconnected" ? 503 : 200).json({
    status: database === "disconnected" ? "degraded" : "healthy",
    service: "bolesi-backend", database, timestamp: new Date().toISOString()
  });
});

app.use((req, res) => res.status(404).json({ error: "Route not found", path: req.originalUrl }));
app.use((err, _req, res, _next) => {
  console.error("API error:", err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Internal server error" });
});

module.exports = app;