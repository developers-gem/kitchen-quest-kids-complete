const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const validateRequest = require("../../middleware/validateRequest");
const { addCustomItemSchema, itemIdParamSchema, setCheckedSchema } = require("./grocery.validation");
const controller = require("./grocery.controller");

const router = Router();

router.use(authenticate());

// GET /api/v1/grocery — the family's active list (created on first access)
router.get("/", controller.getActiveList);

// POST /api/v1/grocery/items — parent types in something not from a recipe
router.post("/items", validateRequest({ body: addCustomItemSchema }), controller.addCustomItem);

// PATCH /api/v1/grocery/items/:itemId — check/uncheck
router.patch(
  "/items/:itemId",
  validateRequest({ params: itemIdParamSchema, body: setCheckedSchema }),
  controller.setChecked
);

// DELETE /api/v1/grocery/items/:itemId
router.delete("/items/:itemId", validateRequest({ params: itemIdParamSchema }), controller.removeItem);

module.exports = router;
