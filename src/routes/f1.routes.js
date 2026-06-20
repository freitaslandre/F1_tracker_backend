const { Router } = require("express");
const F1Controller = require("../controllers/f1.controller");

const router = Router();

router.get("/races", F1Controller.getRaces);

module.exports = router;
