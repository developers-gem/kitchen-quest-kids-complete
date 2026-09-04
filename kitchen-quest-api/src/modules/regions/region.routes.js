const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const validateRequest = require("../../middleware/validateRequest");
const { listRegionsQuerySchema, regionSlugParamSchema } = require("./region.validation");
const controller = require("./region.controller");

const router = Router();

router.use(authenticate());

router.get("/", validateRequest({ query: listRegionsQuerySchema }), controller.list);
router.get(
  "/:slug",
  validateRequest({ params: regionSlugParamSchema, query: listRegionsQuerySchema }),
  controller.getBySlug
);

module.exports = router;
