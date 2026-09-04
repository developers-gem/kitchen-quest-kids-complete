const { Schema, model } = require("mongoose");

const GroceryItemSchema = new Schema(
  {
    itemKey: { type: String, required: true }, // stable id for check/uncheck targeting, e.g. "bell-peppers|count"
    name: { type: String, required: true },
    quantity: { type: Number },
    unit: { type: String },
    category: { type: String, default: "Other" },
    checked: { type: Boolean, default: false },
    custom: { type: Boolean, default: false }, // true if a parent typed this in manually, not derived from a recipe
    sourceRecipes: [{ type: Schema.Types.ObjectId, ref: "Recipe" }],
  },
  { _id: true }
);

const GroceryListSchema = new Schema(
  {
    family: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    items: { type: [GroceryItemSchema], default: [] },
    status: { type: String, enum: ["active", "archived"], default: "active" },
  },
  { timestamps: true }
);

GroceryListSchema.index({ family: 1, status: 1 });

module.exports = model("GroceryList", GroceryListSchema);
