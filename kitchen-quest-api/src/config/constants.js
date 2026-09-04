const ROLES = Object.freeze({
  PARENT: "parent",
  TEACHER: "teacher",
  SCHOOL_ADMIN: "school_admin",
  PLATFORM_ADMIN: "platform_admin",
  CONTENT_MANAGER: "content_manager",
});

const ALL_ROLES = Object.values(ROLES);

const ORGANIZATION_TYPES = Object.freeze({
  FAMILY: "family",
  SCHOOL: "school",
});

const AGE_RANGES = Object.freeze(["4-6", "7-9", "10-12"]);

const USER_STATUS = Object.freeze({
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DELETED: "deleted",
});

module.exports = {
  ROLES,
  ALL_ROLES,
  ORGANIZATION_TYPES,
  AGE_RANGES,
  USER_STATUS,
};
