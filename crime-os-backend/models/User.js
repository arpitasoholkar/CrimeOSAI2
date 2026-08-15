import mongoose from "mongoose";

// =========================================================
// USER SCHEMA
// =========================================================
//
// Backs authentication + the officer Profile page:
//   - credentials (email/username + hashed password)
//   - identity (name, role, organisation, badge number, phone, bio)
//   - avatar (uploaded file path; frontend falls back to initials
//     when this is null)
//
// Case assignment links back to this user via Case.assignedTo
// (stored as this user's `username`), which is how the profile's
// "cases solved / ongoing" counters are computed.
//

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // "local" = username/password account, "google" = signed in via Google.
    // Drives whether passwordHash is required and lets the UI/API tell
    // the two kinds of account apart.
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    passwordHash: {
      type: String,
      required: function () {
        return this.provider !== "google";
      },
      default: null,
    },

    // Google's stable per-account identifier (the ID token's `sub` claim).
    // Unique + sparse so local accounts (where this is null) don't collide.
    googleId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },

    // ---- identity / profile ----
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      default: "Investigator",
      trim: true,
    },
    organisation: {
      type: String,
      default: "Cyber Crime Unit",
      trim: true,
    },
    badgeNumber: {
      type: String,
      default: null,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    location: {
      type: String,
      default: null,
      trim: true,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },

    // Relative path under /uploads, e.g. "/uploads/avatars/xyz.png".
    // Null means "no photo uploaded" -> frontend renders initials.
    avatarUrl: {
      type: String,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;