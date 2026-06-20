const { cert, getApps, initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const parseServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  }

  return null;
};

if (!getApps().length) {
  const serviceAccount = parseServiceAccount();

  initializeApp({
    credential: serviceAccount
      ? cert(serviceAccount)
      : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id,
  });
}

module.exports = getFirestore();
