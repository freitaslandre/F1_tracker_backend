const db = require("../config/database");

const createStatement = db.prepare(`
  INSERT INTO users (name, email, password_hash)
  VALUES (@name, @email, @passwordHash)
`);

const findByEmailStatement = db.prepare(`
  SELECT id, name, email, password_hash AS passwordHash, created_at AS createdAt
  FROM users
  WHERE email = ?
`);

const findPublicByIdStatement = db.prepare(`
  SELECT id, name, email, created_at AS createdAt
  FROM users
  WHERE id = ?
`);

const UserModel = {
  create({ name, email, passwordHash }) {
    const result = createStatement.run({ name, email, passwordHash });
    return this.findPublicById(result.lastInsertRowid);
  },

  findByEmail(email) {
    return findByEmailStatement.get(email);
  },

  findPublicById(id) {
    return findPublicByIdStatement.get(id);
  },
};

module.exports = UserModel;
