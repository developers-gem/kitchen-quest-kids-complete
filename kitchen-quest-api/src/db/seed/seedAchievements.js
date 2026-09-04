/**
 * Seeds the achievement examples explicitly named in the gamification
 * spec. Run with:
 *   NODE_ENV=development node src/db/seed/seedAchievements.js
 * Idempotent: upserts by title.
 */
const { connectDB, disconnectDB } = require("../../config/db");
const Achievement = require("../../modules/achievements/achievement.model");

const achievements = [
  {
    title: "First Adventure",
    description: "Play your very first mini-game!",
    icon: "achievement-first-game.png",
    category: "exploration",
    unlockCriteria: { type: "firstGame" },
    xpReward: 20,
    rarity: "common",
  },
  {
    title: "Junior Chef",
    description: "Cook your very first recipe!",
    icon: "achievement-first-recipe.png",
    category: "cooking",
    unlockCriteria: { type: "firstRecipe" },
    xpReward: 20,
    rarity: "common",
  },
  {
    title: "Adventurous Eater",
    description: "Explore 5 different foods.",
    icon: "achievement-five-foods.png",
    category: "nutrition",
    unlockCriteria: { type: "foodsExploredAtLeast", value: 5 },
    xpReward: 40,
    rarity: "uncommon",
  },
  {
    title: "On a Roll",
    description: "Keep a 7-day streak going!",
    icon: "achievement-seven-day-streak.png",
    category: "streak",
    unlockCriteria: { type: "streakAtLeast", value: 7 },
    xpReward: 75,
    rarity: "rare",
  },
  {
    title: "Nutrition Nerd",
    description: "Complete 5 nutrition lessons.",
    icon: "achievement-five-lessons.png",
    category: "nutrition",
    unlockCriteria: { type: "nutritionQuestsCompletedAtLeast", value: 5 },
    xpReward: 50,
    rarity: "uncommon",
  },
  {
    title: "World Traveler",
    description: "Explore games from 3 different regions.",
    icon: "achievement-three-regions.png",
    category: "exploration",
    unlockCriteria: { type: "regionsExploredAtLeast", value: 3 },
    xpReward: 60,
    rarity: "rare",
  },
];

async function seed() {
  await connectDB();
  for (const a of achievements) {
    // eslint-disable-next-line no-await-in-loop
    await Achievement.findOneAndUpdate(
      { title: a.title },
      { $set: { ...a, status: "published" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    // eslint-disable-next-line no-console
    console.log(`✅ Seeded achievement: ${a.title}`);
  }
  await disconnectDB();
}

seed()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("🏆 Achievement seeding complete");
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", err);
    process.exit(1);
  });
