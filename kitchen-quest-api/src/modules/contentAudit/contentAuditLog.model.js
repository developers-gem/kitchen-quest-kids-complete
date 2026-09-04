const { Schema, model } = require("mongoose");

/**
 * One shared audit-trail collection across every content type, rather
 * than a per-type log -- "who published this recipe and when" and "who
 * archived this game" are the same kind of question regardless of which
 * content type it's about. Complements (doesn't replace) the
 * createdBy/updatedBy/publishedBy fields living directly on each content
 * document: those three fields answer "who did the *current* version's
 * key actions," while this log answers "show me the full history."
 */
const ContentAuditLogSchema = new Schema(
  {
    contentType: {
      type: String,
      enum: ["Game", "Recipe", "Region", "NutritionLesson", "FoodFact", "Achievement", "DailyChallenge", "AvatarCosmetic"],
      required: true,
    },
    contentId: { type: Schema.Types.ObjectId, required: true },
    action: {
      type: String,
      enum: ["created", "updated", "statusChanged", "published", "archived", "deleted"],
      required: true,
    },
    fromStatus: { type: String },
    toStatus: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    diffSnapshot: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ContentAuditLogSchema.index({ contentType: 1, contentId: 1, createdAt: -1 });
ContentAuditLogSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = model("ContentAuditLog", ContentAuditLogSchema);
