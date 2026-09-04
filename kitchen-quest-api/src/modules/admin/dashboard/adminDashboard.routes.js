const { Router } = require("express");
const controller = require("./adminDashboard.controller");

const router = Router();

router.get("/overview", controller.getOverview);

module.exports = router;
