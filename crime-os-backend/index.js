// crime-os-backend/index.js
//
// Main Crime OS AI backend -- ingestion, case management, evidence,
// legal requests, audit trail, and the dashboard endpoints consumed by
// crimeos-frontend.
//
// Run with: npm start   (needs MONGO_URI in .env)

import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import mongoose from "mongoose";
import ingestRouter from "./routes/ingest.js";
import caseRoutes from "./routes/cases/caseRoutes.js";
import summaryRoutes from "./routes/summary.js";
import dashboardRouter from "./routes/dashboard.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ============================
// MongoDB Connection
// ============================
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:");
    console.error(err.message);
    process.exit(1);
  }
}

connectDB();

// ============================
// Middleware
// ============================
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static("public")); // serves the test page

// ============================
// Routes
// ============================
app.use("/ingest", ingestRouter);
app.use("/cases", caseRoutes);
app.use("/cases", summaryRoutes);
app.use("/api", dashboardRouter);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================
// Global Error Handler
// ============================
//
// Without this, errors thrown by middleware BEFORE a route handler runs
// (e.g. Multer rejecting an oversized file, or a malformed multipart
// request) skip the route's own try/catch entirely and fall through to
// Express's default handler, which returns an HTML page with a full
// stack trace — breaking the "every failure returns JSON" contract and
// leaking server file paths. This catches those cases (and any other
// unhandled error) and returns a consistent JSON response instead.
//
// Must be registered LAST, after all routes — that's how Express knows
// it's an error handler (4 arguments) rather than normal middleware.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large. Maximum upload size is 20MB."
        : `File upload error: ${err.message}`;

    return res.status(400).json({ error: message });
  }

  console.error("[error handler] Unhandled error:", err);

  res.status(500).json({
    error: "Something went wrong processing this request.",
  });
});

// ============================
// Start Server
// ============================

app.listen(PORT, () => {
  console.log(`🚀 Crime OS AI backend running on http://localhost:${PORT}`);
  console.log(`🧪 Test page: http://localhost:${PORT}/test.html`);
});
