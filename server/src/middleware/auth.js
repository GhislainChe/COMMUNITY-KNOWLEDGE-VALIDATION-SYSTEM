const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * This middleware checks if the user is authenticated.
 * It expects a JWT token in the Authorization header.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  // Header must exist and start with "Bearer "
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  // Extract token from "Bearer <token>"
  const token = header.slice("Bearer ".length);

  try {
    // Verify token using the secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded info to request object
    // decoded = { userId, role, iat, exp }
    req.user = decoded;

    // Continue to the route
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * This middleware restricts access by role.
 * Example: requireRole("ADMIN")
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
