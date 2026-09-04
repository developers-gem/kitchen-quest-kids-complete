/**
 * Seeds the avatar character catalog. Run with:
 *   NODE_ENV=development node src/db/seed/seedAvatars.js
 * Matches the original prototype's emoji set exactly.
 */
const { connectDB, disconnectDB } = require("../../config/db");
const AvatarConfiguration = require("../../modules/avatars/avatar.model");

const characters = [
  { characterId: "chef", label: "Chef", emoji: "🧑‍🍳" },
  { characterId: "fox", label: "Fox", emoji: "🦊" },
  { characterId: "panda", label: "Panda", emoji: "🐼" },
  { characterId: "frog", label: "Frog", emoji: "🐸" },
  { characterId: "unicorn", label: "Unicorn", emoji: "🦄" },
  { characterId: "koala", label: "Koala", emoji: "🐨" },
  { characterId: "octopus", label: "Octopus", emoji: "🐙" },
  { characterId: "bee", label: "Bee", emoji: "🐝" },
  { characterId: "strawberry", label: "Strawberry", emoji: "🍓" },
  { characterId: "avocado", label: "Avocado", emoji: "🥑" },
  { characterId: "corn", label: "Corn", emoji: "🌽" },
  { characterId: "pizza", label: "Pizza", emoji: "🍕" },
];

async function seed() {
  await connectDB();
  for (const c of characters) {
    // eslint-disable-next-line no-await-in-loop
    await AvatarConfiguration.findOneAndUpdate(
      { characterId: c.characterId },
      { $set: { ...c, avatarType: "emoji", isSystemDefault: true, active: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  // eslint-disable-next-line no-console
  console.log(`✅ Seeded ${characters.length} avatar characters`);
  await disconnectDB();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", err);
    process.exit(1);
  });
