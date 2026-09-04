const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const childService = require("./childProfile.service");

const list = asyncHandler(async (req, res) => {
  const children = await childService.listForFamily(req.user.organizationId);
  sendSuccess(res, { data: children });
});

const getOne = asyncHandler(async (req, res) => {
  const child = await childService.getOwned(req.params.id, req.user.organizationId);
  sendSuccess(res, { data: child });
});

const create = asyncHandler(async (req, res) => {
  const child = await childService.createChildProfile(req.user.organizationId, req.body);
  sendSuccess(res, { statusCode: 201, data: child, message: "Child profile created" });
});

const update = asyncHandler(async (req, res) => {
  const child = await childService.updateChildProfile(req.params.id, req.user.organizationId, req.body);
  sendSuccess(res, { data: child, message: "Child profile updated" });
});

const remove = asyncHandler(async (req, res) => {
  await childService.deleteChildProfile(req.params.id, req.user.organizationId);
  sendSuccess(res, { message: "Child profile deleted" });
});

const activate = asyncHandler(async (req, res) => {
  const { child, accessToken } = await childService.activateChildProfile(
    req.params.id,
    req.user.organizationId,
    req.user
  );
  sendSuccess(res, { data: { child, accessToken }, message: `Now playing as ${child.displayName}` });
});

const progress = asyncHandler(async (req, res) => {
  const data = await childService.getProgress(req.params.id, req.user.organizationId);
  sendSuccess(res, { data });
});

module.exports = { list, getOne, create, update, remove, activate, progress };
