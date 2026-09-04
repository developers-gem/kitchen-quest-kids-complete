const { createAdminContentController } = require("../shared/adminContentController");
const { buildAdminContentRoutes } = require("../shared/adminContentRoutes");
const { idParamSchema } = require("../shared/adminValidation");
const validateRequest = require("../../../middleware/validateRequest");
const asyncHandler = require("../../../utils/asyncHandler");
const { sendSuccess } = require("../../../utils/ApiResponse");
const service = require("./adminRegions.service");
const { createRegionSchema, updateRegionSchema } = require("./adminRegions.validation");

const controller = createAdminContentController(service);

const router = buildAdminContentRoutes({
  controller,
  createSchema: createRegionSchema,
  updateSchema: updateRegionSchema,
});

// GET /api/v1/admin/regions/:id/content -- games/recipes currently
// assigned to this region (see adminRegions.service.js for why this is a
// derived read rather than stored on Region itself).
router.get(
  "/:id/content",
  validateRequest({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const data = await service.getAssignedContent(req.params.id);
    sendSuccess(res, { data });
  })
);

module.exports = router;
