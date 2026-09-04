const { Router } = require("express");
const { z } = require("zod");
const authenticate = require("../../middleware/authenticate");
const validateRequest = require("../../middleware/validateRequest");
const { objectId } = require("../../validators/common.schemas");
const controller = require("./avatar.controller");

const router = Router();

router.use(authenticate());

// GET /api/v1/avatars?childId= — the character + color + cosmetics catalog
// for the profile/avatar picker. childId is optional; when supplied, each
// cosmetic is annotated with `unlocked` for that specific child.
router.get("/", validateRequest({ query: z.object({ childId: objectId.optional() }) }), controller.list);

module.exports = router;
