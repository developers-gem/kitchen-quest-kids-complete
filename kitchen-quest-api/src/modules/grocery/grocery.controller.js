const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/ApiResponse");
const groceryService = require("./grocery.service");

const getActiveList = asyncHandler(async (req, res) => {
  const list = await groceryService.getOrCreateActiveList(req.user.organizationId);
  sendSuccess(res, { data: list });
});

const addCustomItem = asyncHandler(async (req, res) => {
  const list = await groceryService.addCustomItem(req.user.organizationId, req.body);
  sendSuccess(res, { statusCode: 201, data: list, message: "Item added" });
});

const setChecked = asyncHandler(async (req, res) => {
  const list = await groceryService.setItemChecked(req.user.organizationId, req.params.itemId, req.body.checked);
  sendSuccess(res, { data: list });
});

const removeItem = asyncHandler(async (req, res) => {
  const list = await groceryService.removeItem(req.user.organizationId, req.params.itemId);
  sendSuccess(res, { data: list, message: "Item removed" });
});

module.exports = { getActiveList, addCustomItem, setChecked, removeItem };
