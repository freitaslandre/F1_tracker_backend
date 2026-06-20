const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");
const { getJwtSecret } = require("../middleware/auth.middleware");
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

    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));
    const user = UserModel.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    return res.status(201).json({ user, token: signToken(user) });
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
    const passwordMatches = user && (await bcrypt.compare(password, user.passwordHash));

    if (!passwordMatches) {
      throw httpError(401, "Invalid email or password");
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    return res.json({ user: publicUser, token: signToken(publicUser) });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  login,
  register,
};
