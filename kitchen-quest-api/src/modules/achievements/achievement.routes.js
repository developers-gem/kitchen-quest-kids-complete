const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const validateRequest = require("../../middleware/validateRequest");
const { z } = require("zod");
const { objectId } = require("../../validators/common.schemas");
const controller = require("./achievement.controller");

const router = Router();

router.use(authenticate());

const childIdQuery = z.object({ childId: objectId });

// GET /api/v1/achievements/earned?childId=
router.get("/earned", validateRequest({ query: childIdQuery }), controller.getEarned);

// GET /api/v1/achievements/catalog?childId=
router.get("/catalog", validateRequest({ query: childIdQuery }), controller.getCatalog);

module.exports = router;
