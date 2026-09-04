const { Router } = require("express");
const validateRequest = require("../../../middleware/validateRequest");
const { idParamSchema, listQuerySchema, statusTransitionSchema } = require("./adminValidation");

/**
 * Builds the standard admin route set for a content type:
 *   GET    /                list (paginated, filterable by status/search)
 *   GET    /:id              get one
 *   POST   /                 create (always starts as draft)
 *   PATCH  /:id               edit content fields
 *   POST   /:id/status        workflow transition (draft/review/published/archived)
 *   DELETE /:id               delete (draft only -- see the service factory)
 *
 * `createSchema`/`updateSchema` are the only genuinely content-type-
 * specific inputs -- everything else (pagination, id validation, the
 * status-transition body) is shared. This is what keeps adding a 7th
 * admin-managed content type to a few lines of glue rather than a new
 * route file's worth of boilerplate.
 */
function buildAdminContentRoutes({ controller, createSchema, updateSchema }) {
  const router = Router();

  router.get("/", validateRequest({ query: listQuerySchema }), controller.list);
  router.get("/:id", validateRequest({ params: idParamSchema }), controller.getOne);
  router.post("/", validateRequest({ body: createSchema }), controller.create);
  router.patch("/:id", validateRequest({ params: idParamSchema, body: updateSchema }), controller.update);
  router.post(
    "/:id/status",
    validateRequest({ params: idParamSchema, body: statusTransitionSchema }),
    controller.transitionStatus
  );
  router.delete("/:id", validateRequest({ params: idParamSchema }), controller.remove);

  return router;
}

module.exports = { buildAdminContentRoutes };
