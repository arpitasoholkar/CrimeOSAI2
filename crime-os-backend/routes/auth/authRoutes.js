import express from "express";
import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { signToken, requireAuth } from "../../lib/auth.js";

const router = express.Router();

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
// POST /api/auth/register
// =========================================================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, name, role, organisation, badgeNumber } = req.body;

    if (!username || !email || !password || !name) {
      return res.status(400).json({ error: "username, email, password and name are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
    });
    if (existing) {
      return res.status(409).json({ error: "Username or email already in use." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: role || "Investigator",
      organisation: organisation || "Cyber Crime Unit",
      badgeNumber: badgeNumber || null,
    });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("[auth] Register failed:", err);
    res.status(500).json({ error: "Failed to register." });
  }
});

// =========================================================
// POST /api/auth/login
// =========================================================
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: "identifier and password are required." });
    }

    const lookup = identifier.toLowerCase();
    const user = await User.findOne({ $or: [{ username: lookup }, { email: lookup }] });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("[auth] Login failed:", err);
    res.status(500).json({ error: "Failed to log in." });
  }
});

// =========================================================
// GET /api/auth/me  -- verifies a stored token on app load
// =========================================================
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("[auth] /me failed:", err);
    res.status(500).json({ error: "Failed to load session." });
  }
});

export default router;
