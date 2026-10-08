import express from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../../models/User.js";
import { signToken, requireAuth } from "../../lib/auth.js";
import { checkEmail } from "../../lib/emailCheck.js";
import { loginLimiter, registerLimiter, sensitiveLimiter } from "../../lib/rateLimit.js";

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || null;
if (!GOOGLE_CLIENT_ID) {
  console.warn(
    "⚠️  GOOGLE_CLIENT_ID not set in .env — POST /api/auth/google will reject every request until it is."
  );
}
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
    provider: user.provider,
    hasPassword: Boolean(user.passwordHash),
    emailConfirmed: user.emailConfirmed,
  };
}

// Turns an email local-part into a valid, available `username`, appending
// a short random suffix on collision. Only used when provisioning a brand
// new account from a Google sign-in (Google doesn't hand us a username).
async function generateUsernameFromEmail(email) {
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 24) || "investigator";

  let candidate = base;
  let attempt = 0;
  while (await User.findOne({ username: candidate })) {
    attempt += 1;
    candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    if (attempt > 8) {
      candidate = `${base}${Date.now().toString().slice(-6)}`;
      break;
    }
  }
  return candidate;
}

// =========================================================
// POST /api/auth/register
// =========================================================
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { username, email, password, name, role, organisation, badgeNumber } = req.body;

    if (!username || !email || !password || !name) {
      return res.status(400).json({ error: "username, email, password and name are required." });
    }
    if (!/^[a-z0-9._-]{3,30}$/i.test(username)) {
      return res.status(400).json({ error: "Username must be 3-30 characters: letters, numbers, . _ -" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    // Free, no-email check: valid format, real domain, not disposable.
    const check = await checkEmail(email);
    if (!check.ok) return res.status(400).json({ error: check.error });

    const lcEmail = check.email;
    const lcUsername = username.toLowerCase();

    const existing = await User.findOne({ $or: [{ username: lcUsername }, { email: lcEmail }] });
    if (existing) {
      // If this email belongs to a Google-only account, tell them how to get in.
      if (existing.email === lcEmail && !existing.passwordHash && existing.googleId) {
        return res.status(409).json({
          error: "This email is already registered with Google. Sign in with Google, then add a password from your Profile.",
        });
      }
      return res.status(409).json({ error: "Username or email already in use." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: lcUsername,
      email: lcEmail,
      passwordHash,
      emailConfirmed: false, // domain checked, ownership NOT proven
      name,
      role: role || "Investigator",
      organisation: organisation || "Cyber Crime Unit",
      badgeNumber: badgeNumber || null,
    });

    user.lastLoginAt = new Date();
    await user.save();

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
router.post("/login", loginLimiter, async (req, res) => {
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
    if (!user.passwordHash) {
      // Google-only account: say so instead of a confusing "invalid credentials".
      return res.status(401).json({
        error: "This account uses Google sign-in. Continue with Google, then add a password from your Profile.",
      });
    }

    // Google-only accounts have no password.
    const valid = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
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
// POST /api/auth/google
// -- Verifies a Google ID token (the `credential` produced by Google
//    Identity Services on the frontend), then finds or creates the
//    matching user and issues a normal TRINETRA session token, exactly
//    like /login does for username/password.
// =========================================================
router.post("/google", sensitiveLimiter, async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "Google sign-in is not configured on this server." });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential." });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error("[auth] Google token verification failed:", verifyErr.message);
      return res.status(401).json({ error: "Invalid Google credential." });
    }

    if (!payload?.sub || !payload?.email) {
      return res.status(401).json({ error: "Google account did not return the expected profile data." });
    }
    if (payload.email_verified === false) {
      return res.status(401).json({ error: "Google account email is not verified." });
    }

    const email = payload.email.toLowerCase();

    // 1) Already linked by Google account id -> just log in.
    let user = await User.findOne({ googleId: payload.sub });

    // 2) Not linked yet, but an account with this email already exists
    //    (e.g. originally registered with username/password) -> link it.
    if (!user) {
      user = await User.findOne({ email });
      if (user && !user.googleId) {
        user.googleId = payload.sub;
        // Google just proved the real owner of this address. If the local account
        // was an unproven email/password signup (emailConfirmed === false), someone
        // else may have registered this address with a password they know, so drop
        // that password and let Google take over the account.
        if (user.emailConfirmed === false) {
          user.passwordHash = null;
          user.provider = "google";
        }
        user.emailConfirmed = true;
        // Deliberately not auto-filling avatarUrl from the Google
        // picture here -- new/linked accounts default to the initials
        // avatar, and the person can upload their own photo from
        // Profile if they want one.
      }
    }

    // 3) No existing account at all -> provision a new Google-provider user.
    if (!user) {
      const username = await generateUsernameFromEmail(email);
      user = new User({
        username,
        email,
        provider: "google",
        emailConfirmed: true,
        googleId: payload.sub,
        name: payload.name || username,
        avatarUrl: null,
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("[auth] Google sign-in failed:", err);
    res.status(500).json({ error: "Failed to sign in with Google." });
  }
});

// =========================================================
// POST /api/auth/set-password   (requires a logged-in session)
//   - Google account with no password yet: body { newPassword, credential }
//     where `credential` is a FRESH Google ID token for the same Google
//     account (re-authentication, so a stolen session token alone can't
//     add a backdoor password).
//   - Account that already has a password:  { newPassword, currentPassword }
// =========================================================
router.post("/set-password", sensitiveLimiter, requireAuth, async (req, res) => {
  try {
    const { newPassword, currentPassword, credential } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (user.passwordHash) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return res.status(401).json({ error: "Current password is incorrect." });
      }
    } else {
      if (!user.googleId) {
        return res.status(400).json({ error: "This account has no way to re-authenticate." });
      }
      if (!credential) {
        return res.status(400).json({ error: "Please confirm with Google to set a password." });
      }
      let payload;
      try {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
        payload = ticket.getPayload();
      } catch {
        return res.status(401).json({ error: "Google confirmation failed. Please try again." });
      }
      if (payload.sub !== user.googleId) {
        return res.status(401).json({ error: "That Google account doesn't match this profile." });
      }
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true, user: publicUser(user) });
  } catch (err) {
    console.error("[auth] set-password failed:", err);
    res.status(500).json({ error: "Failed to set password." });
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