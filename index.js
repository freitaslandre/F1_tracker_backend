const { onRequest } = require("firebase-functions/v2/https");
const app = require("./src/app");

exports.api = onRequest(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  app,
);
