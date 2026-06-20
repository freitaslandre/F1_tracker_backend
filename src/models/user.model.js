const db = require("../config/database");

const users = db.collection("users");
const userEmails = db.collection("user_emails");
const counters = db.collection("counters");

const nowIso = () => new Date().toISOString();
const emailDocId = (email) => encodeURIComponent(email);

const publicUser = (doc) => {
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: Number(doc.id),
    name: data.name,
    email: data.email,
    createdAt: data.createdAt,
  };
};

const privateUser = (doc) => {
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: Number(doc.id),
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    createdAt: data.createdAt,
  };
};

const UserModel = {
  async create({ name, email, passwordHash }) {
    const createdAt = nowIso();

    return db.runTransaction(async (transaction) => {
      const emailRef = userEmails.doc(emailDocId(email));
      const emailDoc = await transaction.get(emailRef);
      if (emailDoc.exists) {
        return null;
      }

      const counterRef = counters.doc("users");
      const counterDoc = await transaction.get(counterRef);
      const nextId = Number(counterDoc.data()?.nextId || 1);
      const userRef = users.doc(String(nextId));

      transaction.set(userRef, { name, email, passwordHash, createdAt });
      transaction.set(emailRef, { userId: nextId });
      transaction.set(counterRef, { nextId: nextId + 1 }, { merge: true });

      return { id: nextId, name, email, createdAt };
    });
  },

  async findByEmail(email) {
    const emailDoc = await userEmails.doc(emailDocId(email)).get();
    if (!emailDoc.exists) {
      return null;
    }

    const userId = emailDoc.data().userId;
    return privateUser(await users.doc(String(userId)).get());
  },

  async findPublicById(id) {
    return publicUser(await users.doc(String(id)).get());
  },
};

module.exports = UserModel;
