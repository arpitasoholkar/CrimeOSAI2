import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import User from "../../models/User.js";
import Case from "../cases/caseModel.js";
import { requireAuth } from "../../lib/auth.js";

const router = express.Router();

const RESOLVED_STATUSES = ["resolved", "closed"];

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    organisation: user.organisation,
    badgeNumber: user.badgeNumber,
    phone: user.phone,
    location: user.location,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
  };
}

// =========================================================
// Avatar upload storage
// =========================================================

const AVATAR_DIR = path.join("public", "uploads", "avatars");
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${req.user.id}-${crypto.randomUUID()}${ext}`);
  },
});

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WEBP or GIF images are allowed."));
    }
    cb(null, true);
  },
});

// =========================================================
// GET /api/users/me
// =========================================================
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("[users] Failed to load profile:", err);
    res.status(500).json({ error: "Failed to load profile." });
  }
});

// =========================================================
// PUT /api/users/me  -- edit personal info (not credentials)
// =========================================================
const EDITABLE_FIELDS = ["name", "role", "organisation", "badgeNumber", "phone", "location", "bio"];

router.put("/me", requireAuth, async (req, res) => {
  try {
    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.bio && updates.bio.length > 500) {
      return res.status(400).json({ error: "Bio must be 500 characters or fewer." });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ error: "User not found." });

    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("[users] Failed to update profile:", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// =========================================================
// POST /api/users/me/avatar  -- upload/replace profile photo
// =========================================================
router.post("/me/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image file provided." });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    // Clean up the previous avatar file, if any, so uploads don't pile up.
    if (user.avatarUrl) {
      const oldPath = path.join("public", user.avatarUrl.replace(/^\//, ""));
      fs.unlink(oldPath, () => {});
    }

    user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("[users] Avatar upload failed:", err);
    res.status(500).json({ error: "Failed to upload photo." });
  }
});

// =========================================================
// DELETE /api/users/me/avatar  -- revert to initials avatar
// =========================================================
router.delete("/me/avatar", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (user.avatarUrl) {
      const oldPath = path.join("public", user.avatarUrl.replace(/^\//, ""));
      fs.unlink(oldPath, () => {});
    }
    user.avatarUrl = null;
    await user.save();

    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("[users] Avatar removal failed:", err);
    res.status(500).json({ error: "Failed to remove photo." });
  }
});

// =========================================================
// GET /api/users/me/stats  -- solved / ongoing case counters
// =========================================================
router.get("/me/stats", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const cases = await Case.find({ assignedTo: user.username }, "status").lean();

    let solved = 0;
    let ongoing = 0;
    for (const c of cases) {
      if (RESOLVED_STATUSES.includes(c.status)) solved += 1;
      else ongoing += 1;
    }

    res.json({ totalCases: cases.length, solved, ongoing });
  } catch (err) {
    console.error("[users] Failed to compute officer stats:", err);
    res.status(500).json({ error: "Failed to load case stats." });
  }
});

export default router;
