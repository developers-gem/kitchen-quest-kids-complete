const ApiError = require("../../../utils/ApiError");
const { parsePagination, buildPaginationMeta } = require("../../../utils/pagination");
const { assertValidTransition } = require("./contentWorkflow");
const { logContentEvent } = require("../../contentAudit/contentAudit.service");

/**
 * Builds the standard set of admin operations (list/get/create/update/
 * transitionStatus/remove) for a given Mongoose model, so every content
 * type gets identical, correct workflow/audit behavior without
 * reimplementing it six times. A content-type's own admin service wraps
 * this factory and adds only what's genuinely specific to it (e.g.
 * recipes validating ingredients/steps shape, regions handling game/
 * recipe assignment) -- see games/recipes/regions/nutrition/achievements
 * admin.service.js files for the thin wrappers.
 *
 * @param {object} opts
 * @param {import('mongoose').Model} opts.Model
 * @param {string} opts.contentType - matches ContentAuditLog's enum
 * @param {string} [opts.searchField] - field name used for ?search= text matching
 * @param {string[]} [opts.filterFields] - top-level fields allowed as exact-match query filters
 */
function createAdminContentService({ Model, contentType, searchField = "title", filterFields = [] }) {
  function buildFilter(query) {
    const filter = {};
    if (query.status) filter.status = query.status;
    filterFields.forEach((field) => {
      if (query[field]) filter[field] = query[field];
    });
    if (query.search) {
      filter[searchField] = { $regex: query.search, $options: "i" };
    }
    return filter;
  }

  async function list(query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const filter = buildFilter(query);

    const [items, total] = await Promise.all([
      Model.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Model.countDocuments(filter),
    ]);

    return { data: items, meta: buildPaginationMeta({ page, limit, total }) };
  }

  async function getById(id) {
    const item = await Model.findById(id);
    if (!item) throw ApiError.notFound(`${contentType} not found`);
    return item;
  }

  /**
   * Always creates in "draft" status regardless of what the request body
   * contains -- a client can never create something pre-published by
   * passing `status: "published"` in the payload. Publishing is only
   * ever reachable through `transitionStatus`, which enforces the
   * workflow's allowed-transition rules and stamps `publishedBy`.
   */
  async function create(input, adminUser) {
    const { status: _ignoredStatus, ...safeInput } = input;
    const item = await Model.create({
      ...safeInput,
      status: "draft",
      version: 1,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    await logContentEvent({
      contentType,
      contentId: item._id,
      action: "created",
      performedBy: adminUser._id,
    });

    return item;
  }

  /**
   * Content-field edits only -- status changes go through
   * `transitionStatus` instead, so "editing content" and "moving it
   * through the workflow" stay two distinct, separately-audited actions
   * even though a UI might present them on the same screen.
   */
  async function update(id, patch, adminUser) {
    const { status: _ignoredStatus, version: _ignoredVersion, ...safePatch } = patch;

    const item = await Model.findById(id);
    if (!item) throw ApiError.notFound(`${contentType} not found`);

    Object.assign(item, safePatch);
    item.updatedBy = adminUser._id;
    item.version += 1;
    await item.save();

    await logContentEvent({
      contentType,
      contentId: item._id,
      action: "updated",
      performedBy: adminUser._id,
      diffSnapshot: safePatch,
    });

    return item;
  }

  async function transitionStatus(id, toStatus, adminUser) {
    const item = await Model.findById(id);
    if (!item) throw ApiError.notFound(`${contentType} not found`);

    const fromStatus = item.status;
    assertValidTransition(fromStatus, toStatus);

    item.status = toStatus;
    item.updatedBy = adminUser._id;
    if (toStatus === "published") {
      item.publishedBy = adminUser._id;
      item.publishedAt = new Date();
    }
    await item.save();

    await logContentEvent({
      contentType,
      contentId: item._id,
      action: toStatus === "published" ? "published" : toStatus === "archived" ? "archived" : "statusChanged",
      performedBy: adminUser._id,
      fromStatus,
      toStatus,
    });

    return item;
  }

  /**
   * Deliberately restricted to draft content only -- published/reviewed
   * content should be archived (a workflow transition, fully audited),
   * never hard-deleted, so a mistake doesn't silently remove something
   * children may already have progress tied to. Drafts, by definition,
   * nothing depends on yet.
   */
  async function remove(id, adminUser) {
    const item = await Model.findById(id);
    if (!item) throw ApiError.notFound(`${contentType} not found`);
    if (item.status !== "draft") {
      throw ApiError.badRequest(`Only draft ${contentType} content can be deleted. Archive it instead.`);
    }

    await Model.deleteOne({ _id: id });

    await logContentEvent({
      contentType,
      contentId: id,
      action: "deleted",
      performedBy: adminUser._id,
      fromStatus: item.status,
    });
  }

  return { list, getById, create, update, transitionStatus, remove };
}

module.exports = { createAdminContentService };
