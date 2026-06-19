const jwt = require("jsonwebtoken");
const httpError = require("../utils/httpError");

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV !== "production") {
      return "development-secret-change-me";
    }
    throw httpError(500, "JWT_SECRET is not configured");
  }
  return process.env.JWT_SECRET;
};

const requireAuth = (req, _res, next) => {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(httpError(401, "Authentication token is required"));
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = {
      id: Number(payload.sub),
      email: payload.email,
    };
    return next();
  } catch (error) {
    if (error.statusCode) {
      return next(error);
    }
    return next(httpError(401, "Invalid or expired authentication token"));
  }
};

module.exports = {
  getJwtSecret,
  requireAuth,
};
