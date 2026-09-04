const crypto = require("crypto");
const GroceryList = require("./groceryList.model");
const ApiError = require("../../utils/ApiError");

function itemKeyFor(name, unit) {
  return `${name.trim().toLowerCase()}|${unit || ""}`;
}

/** Explicit 24-hex-char id, valid as a MongoDB ObjectId string. Real
 * Mongoose would auto-assign a subdocument _id anyway, but assigning it
 * explicitly here means item targeting (check/uncheck, remove) works
 * identically whether the array element came from a real Mongoose
 * document or this app's in-memory test fake, which doesn't auto-assign
 * subdocument ids the way Mongoose does. */
function generateItemId() {
  return crypto.randomBytes(12).toString("hex");
}

async function getOrCreateActiveList(familyId) {
  let list = await GroceryList.findOne({ family: familyId, status: "active" });
  if (!list) {
    list = await GroceryList.create({ family: familyId, items: [] });
  }
  return list;
}

/**
 * Merges a recipe's ingredients into the family's active grocery list.
 * Duplicate ingredients (same name + unit) across multiple recipes are
 * combined into one line with summed quantity, rather than appearing as
 * separate rows — this is the "combine duplicate ingredients
 * automatically" requirement from the database design, implemented here
 * in the service layer rather than relying on any Mongo-level dedup.
 */
async function addIngredientsFromRecipe(familyId, recipe) {
  const list = await getOrCreateActiveList(familyId);

  recipe.ingredients.forEach((ingredient) => {
    const key = itemKeyFor(ingredient.name, ingredient.unit);
    const existing = list.items.find((i) => i.itemKey === key);

    if (existing) {
      if (typeof ingredient.quantity === "number" && typeof existing.quantity === "number") {
        existing.quantity += ingredient.quantity;
      }
      if (!existing.sourceRecipes.some((r) => String(r) === String(recipe._id))) {
        existing.sourceRecipes.push(recipe._id);
      }
    } else {
      list.items.push({
        _id: generateItemId(),
        itemKey: key,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: ingredient.category || "Other",
        checked: false,
        custom: false,
        sourceRecipes: [recipe._id],
      });
    }
  });

  await list.save();
  return list;
}

async function addCustomItem(familyId, { name, quantity, unit, category }) {
  const list = await getOrCreateActiveList(familyId);
  const key = itemKeyFor(name, unit);
  const existing = list.items.find((i) => i.itemKey === key);
  if (existing) {
    if (typeof quantity === "number" && typeof existing.quantity === "number") {
      existing.quantity += quantity;
    }
    await list.save();
    return list;
  }
  list.items.push({ _id: generateItemId(), itemKey: key, name, quantity, unit, category: category || "Other", checked: false, custom: true, sourceRecipes: [] });
  await list.save();
  return list;
}

async function setItemChecked(familyId, itemId, checked) {
  const list = await GroceryList.findOne({ family: familyId, status: "active" });
  if (!list) throw ApiError.notFound("No active grocery list found");
  const item = list.items.find((i) => String(i._id) === String(itemId));
  if (!item) throw ApiError.notFound("Grocery item not found");
  item.checked = checked;
  await list.save();
  return list;
}

async function removeItem(familyId, itemId) {
  const list = await GroceryList.findOne({ family: familyId, status: "active" });
  if (!list) throw ApiError.notFound("No active grocery list found");
  list.items = list.items.filter((i) => String(i._id) !== String(itemId));
  await list.save();
  return list;
}

module.exports = { getOrCreateActiveList, addIngredientsFromRecipe, addCustomItem, setItemChecked, removeItem };
