const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const normalizeEmail = (email) => email.trim().toLowerCase();

const isEmail = (email) =>
  typeof email === "string" && EMAIL_PATTERN.test(email.trim());

module.exports = {
  isEmail,
  isNonEmptyString,
  normalizeEmail,
};
