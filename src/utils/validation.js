const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

module.exports = {
  isEmail,
  isNonEmptyString,
  normalizeEmail,
};
