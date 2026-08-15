import jwt from "jsonwebtoken";

// Falls back to a dev secret so the app still boots without .env set up,
// but logs loudly so nobody ships this to production by accident.
const JWT_SECRET = process.env.JWT_SECRET || "crimeos-dev-secret-change-me";
if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️  JWT_SECRET not set in .env — using an insecure development default."
  );
}

const TOKEN_TTL = "7d";

export function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), username: user.username },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// Express middleware: requires a valid "Authorization: Bearer <token>"
// header. On success, attaches { id, username } to req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}
