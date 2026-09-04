const asyncHandler = require("../../../utils/asyncHandler");
const { sendSuccess } = require("../../../utils/ApiResponse");

/**
 * Wraps an admin content service (built by adminContentServiceFactory.js)
 * into Express controller functions. Every content type's controller is
 * this same shape -- list/getOne/create/update/transitionStatus/remove --
 * so there's exactly one place to look for "what does the admin games
 * controller do" regardless of which content type it is.
 */
function createAdminContentController(service) {
  const list = asyncHandler(async (req, res) => {
    const { data, meta } = await service.list(req.query);
    sendSuccess(res, { data, meta });
  });

  const getOne = asyncHandler(async (req, res) => {
    const data = await service.getById(req.params.id);
    sendSuccess(res, { data });
  });

  const create = asyncHandler(async (req, res) => {
    const data = await service.create(req.body, req.user);
    sendSuccess(res, { statusCode: 201, data, message: "Created as a draft" });
  });

  const update = asyncHandler(async (req, res) => {
    const data = await service.update(req.params.id, req.body, req.user);
    sendSuccess(res, { data, message: "Saved" });
  });

  const transitionStatus = asyncHandler(async (req, res) => {
    const data = await service.transitionStatus(req.params.id, req.body.status, req.user);
    sendSuccess(res, { data, message: `Moved to "${req.body.status}"` });
  });

  const remove = asyncHandler(async (req, res) => {
    await service.remove(req.params.id, req.user);
    sendSuccess(res, { message: "Deleted" });
  });

  return { list, getOne, create, update, transitionStatus, remove };
}

module.exports = { createAdminContentController };
