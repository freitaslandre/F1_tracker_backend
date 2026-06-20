const jwt = require("jsonwebtoken");
const httpError = require("../utils/httpError");

const SESSION_COOKIE_NAME = "f1rm_session";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV !== "production") {
      return "development-secret-change-me";
    }
    throw httpError(500, "JWT_SECRET is not configured");
  }
  return process.env.JWT_SECRET;
};

const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((cookies, cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});

const getAuthToken = (req) => {
  const cookies = parseCookies(req.headers.cookie || "");
  if (cookies[SESSION_COOKIE_NAME]) {
    return cookies[SESSION_COOKIE_NAME];
  }

  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  return scheme === "Bearer" ? token : "";
};

const requireAuth = (req, _res, next) => {
  const token = getAuthToken(req);

  if (!token) {
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
  SESSION_COOKIE_NAME,
};
