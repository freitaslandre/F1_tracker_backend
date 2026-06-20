const db = require("../config/database");

const favorites = db.collection("favorites");
const docId = (userId, circuitId) => `${userId}_${encodeURIComponent(circuitId)}`;
const nowIso = () => new Date().toISOString();

const normalizeFavorite = (doc) => {
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: doc.id,
    circuitId: data.circuitId,
    circuitName: data.circuitName,
    locality: data.locality,
    country: data.country,
    raceName: data.raceName,
    createdAt: data.createdAt,
  };
};

const FavoriteModel = {
  async upsert(favorite) {
    const ref = favorites.doc(docId(favorite.userId, favorite.circuitId));
    const existing = await ref.get();
    const createdAt = existing.data()?.createdAt || nowIso();

    await ref.set({
      userId: Number(favorite.userId),
      circuitId: favorite.circuitId,
      circuitName: favorite.circuitName,
      locality: favorite.locality,
      country: favorite.country,
      raceName: favorite.raceName || "",
      createdAt,
      updatedAt: nowIso(),
    });

    return normalizeFavorite(await ref.get());
  },

  async findByUser(userId) {
    const snapshot = await favorites.where("userId", "==", Number(userId)).get();
    return snapshot.docs
      .map(normalizeFavorite)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },

  async deleteByUserAndCircuit(userId, circuitId) {
    const ref = favorites.doc(docId(userId, circuitId));
    const doc = await ref.get();
    if (!doc.exists) {
      return 0;
    }

    await ref.delete();
    return 1;
  },
};

module.exports = FavoriteModel;
