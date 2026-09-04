const ContentAuditLog = require("./contentAuditLog.model");

async function logContentEvent({ contentType, contentId, action, performedBy, fromStatus, toStatus, diffSnapshot }) {
  await ContentAuditLog.create({
    contentType,
    contentId,
    action,
    performedBy,
    fromStatus,
    toStatus,
    diffSnapshot,
  });
}

async function getHistoryFor(contentType, contentId) {
  return ContentAuditLog.find({ contentType, contentId }).sort({ createdAt: -1 });
}

module.exports = { logContentEvent, getHistoryFor };
