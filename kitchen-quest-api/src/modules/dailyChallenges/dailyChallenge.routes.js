const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const validateRequest = require("../../middleware/validateRequest");
const { z } = require("zod");
const { objectId } = require("../../validators/common.schemas");
const controller = require("./dailyChallenge.controller");

const router = Router();

router.use(authenticate());

// GET /api/v1/daily-challenge?childId=
router.get("/", validateRequest({ query: z.object({ childId: objectId }) }), controller.getToday);

module.exports = router;
