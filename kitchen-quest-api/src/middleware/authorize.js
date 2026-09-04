const ApiError = require("../utils/ApiError");

/**
 * Role check only. Resource-ownership checks (e.g. "does this child belong
 * to this parent's family") are done separately in each module's service,
 * since ownership rules are resource-specific and shouldn't be crammed into
 * a generic middleware.
 *
 * Usage: authorize("platform_admin") or authorize("parent", "platform_admin")
 */
function authorize(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    const userRoles = req.user.role || [];
    const hasRole = allowedRoles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      return next(ApiError.forbidden());
    }
    next();
  };
}

/**
 * Ensures the requested :childId belongs to the authenticated user's
 * organization. Applied after authenticate(); expects req.params.childId
 * or req.params.id to reference a ChildProfile.
 */
function authorizeFamilyOwnership(paramName = "id") {
  const ChildProfile = require("../modules/children/childProfile.model");
  return async function (req, res, next) {
    try {
      const childId = req.params[paramName];
      const child = await ChildProfile.findOne({ _id: childId, deletedAt: null });
      if (!child) {
        throw ApiError.notFound("Child profile not found");
      }
      if (String(child.familyId) !== String(req.user.organizationId)) {
        throw ApiError.forbidden("This child profile does not belong to your family");
      }
      req.childProfile = child;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authorize, authorizeFamilyOwnership };
