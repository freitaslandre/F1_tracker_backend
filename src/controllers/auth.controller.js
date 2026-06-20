const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");
const { getJwtSecret, SESSION_COOKIE_NAME } = require("../middleware/auth.middleware");
const httpError = require("../utils/httpError");
const { isEmail, isNonEmptyString, normalizeEmail } = require("../utils/validation");

const signToken = (user) =>
  jwt.sign(
    { email: user.email, name: user.name },
    getJwtSecret(),
    {
      subject: String(user.id),
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production",
  sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === "production" ? "none" : "lax"),
  maxAge: Number(process.env.SESSION_COOKIE_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000),
  path: "/",
});

const setSessionCookie = (res, user) => {
  res.cookie(SESSION_COOKIE_NAME, signToken(user), cookieOptions());
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!isNonEmptyString(name) || name.trim().length < 2) {
      throw httpError(400, "Name must have at least 2 characters");
    }
    if (!isEmail(email)) {
      throw httpError(400, "A valid email is required");
    }
    if (typeof password !== "string" || password.length < 8) {
      throw httpError(400, "Password must have at least 8 characters");
    }

    const normalizedEmail = normalizeEmail(email);
    if (UserModel.findByEmail(normalizedEmail)) {
      throw httpError(409, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_ROUNDS || 12),
    );
    const user = UserModel.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    setSessionCookie(res, user);
    return res.status(201).json({ user });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!isEmail(email) || typeof password !== "string") {
      throw httpError(400, "Email and password are required");
    }

    const user = UserModel.findByEmail(normalizeEmail(email));
    const passwordMatches =
      user && (await bcrypt.compare(password, user.passwordHash));

    if (!passwordMatches) {
      throw httpError(401, "Invalid email or password");
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
    setSessionCookie(res, publicUser);
    return res.json({ user: publicUser });
  } catch (error) {
    return next(error);
  }
};

const me = (req, res, next) => {
  try {
    const user = UserModel.findPublicById(req.user.id);
    if (!user) {
      throw httpError(404, "User not found");
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

const logout = (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
  return res.status(204).send();
};

module.exports = {
  login,
  logout,
  me,
  register,
};
