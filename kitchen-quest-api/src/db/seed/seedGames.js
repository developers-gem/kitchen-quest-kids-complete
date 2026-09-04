/**
 * Seeds the 10 launch regions and 10 launch mini-games described in the
 * game-framework design doc. Run with:
 *   NODE_ENV=development node src/db/seed/seedGames.js
 *
 * Idempotent: uses upsert-by-slug, safe to re-run.
 */
const { connectDB, disconnectDB } = require("../../config/db");
const Region = require("../../modules/regions/region.model");
const Game = require("../../modules/games/game.model");

const regions = [
  { name: "New York", slug: "new-york", state: "New York", unlockOrder: 1 },
  { name: "Iowa", slug: "iowa", state: "Iowa", unlockOrder: 2 },
  { name: "Midwest", slug: "midwest", state: "Midwest", unlockOrder: 3 },
  { name: "Louisiana", slug: "louisiana", state: "Louisiana", unlockOrder: 4 },
  { name: "California", slug: "california", state: "California", unlockOrder: 5 },
  { name: "Maine", slug: "maine", state: "Maine", unlockOrder: 6 },
  { name: "Wisconsin", slug: "wisconsin", state: "Wisconsin", unlockOrder: 7 },
  { name: "Georgia", slug: "georgia", state: "Georgia", unlockOrder: 8 },
  { name: "Alaska", slug: "alaska", state: "Alaska", unlockOrder: 9 },
  { name: "New England", slug: "new-england", state: "New England", unlockOrder: 10 },
].map((r) => ({
  ...r,
  // Sequential unlock: the first region is always open; each subsequent
  // one requires a modest level bump, giving the Flavor Hub a genuine
  // progression instead of every region being open on day one. This is
  // data on the Region document, evaluated by the shared unlock-rule
  // engine server-side -- never a boolean the frontend invents.
  unlockRequirements: r.unlockOrder === 1 ? { type: "always" } : { type: "levelAtLeast", value: r.unlockOrder },
  // Seeded content is launch-ready content, not a work-in-progress draft
  // -- published immediately so the child-facing app (which only shows
  // status: "published" regions/games) can actually see it. Content
  // authored through the admin UI instead starts at "draft" by default,
  // per the admin content service factory's rule.
  status: "published",
}));

async function upsertRegion(r) {
  return Region.findOneAndUpdate({ slug: r.slug }, { $set: r }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function seed() {
  await connectDB();

  const regionDocs = {};
  for (const r of regions) {
    // eslint-disable-next-line no-await-in-loop
    regionDocs[r.slug] = await upsertRegion(r);
  }

  const games = [
    {
      title: "Big Apple Crunch",
      slug: "big-apple-crunch",
      region: regionDocs["new-york"]._id,
      state: "New York",
      gameType: "quiz",
      ageGroups: ["7-9", "10-12"],
      difficulty: "easy",
      description: "A quick-fire quiz about fiber and why apples are a smart snack.",
      learningObjectives: ["Identify fiber-rich foods", "Understand why fiber matters for digestion"],
      nutritionTopics: ["fiber", "vitamins"],
      foodTopics: ["apples", "whole foods"],
      instructions: "Read each question and tap the healthiest answer.",
      xpReward: 30,
      maxStars: 3,
      unlockRequirements: { type: "always" },
      status: "published",
      configuration: {
        questions: [
          {
            id: "q1",
            prompt: "Which snack has more fiber?",
            options: [
              { id: "a", text: "An apple with the skin on" },
              { id: "b", text: "A glass of apple juice" },
            ],
            correctOptionId: "a",
          },
          {
            id: "q2",
            prompt: "Fiber mostly helps your body...",
            options: [
              { id: "a", text: "See in the dark" },
              { id: "b", text: "Digest food and feel full longer" },
            ],
            correctOptionId: "b",
          },
          {
            id: "q3",
            prompt: "Which of these is also a good source of fiber?",
            options: [
              { id: "a", text: "Whole wheat bread" },
              { id: "b", text: "White candy" },
            ],
            correctOptionId: "a",
          },
        ],
      },
    },
    {
      title: "Corn Maze Maze",
      slug: "corn-maze-maze",
      region: regionDocs.iowa._id,
      state: "Iowa",
      gameType: "maze",
      ageGroups: ["4-6", "7-9"],
      difficulty: "easy",
      description: "Navigate the corn maze and collect whole-grain foods along the way.",
      learningObjectives: ["Recognize whole grains vs. refined/sugary snacks"],
      nutritionTopics: ["whole grains"],
      foodTopics: ["corn", "grains"],
      instructions: "Guide your character through the maze. Grab whole grains, dodge sugary snacks!",
      xpReward: 25,
      maxStars: 3,
      unlockRequirements: { type: "always" },
      status: "published",
      configuration: {
        layoutKey: "corn-maze-01",
        timeLimitSeconds: 90,
        collectibles: [
          { id: "corn", label: "Corn on the cob", isCorrectFood: true },
          { id: "oats", label: "Oatmeal", isCorrectFood: true },
          { id: "brownRice", label: "Brown rice", isCorrectFood: true },
          { id: "candy", label: "Candy", isCorrectFood: false },
          { id: "soda", label: "Soda", isCorrectFood: false },
          { id: "chips", label: "Chips", isCorrectFood: false },
        ],
      },
    },
    {
      title: "Burger Build",
      slug: "burger-build",
      region: regionDocs.midwest._id,
      state: "Midwest",
      gameType: "dragAndDrop",
      ageGroups: ["7-9", "10-12"],
      difficulty: "medium",
      description: "Stack a balanced burger — the right ingredient in the right layer.",
      learningObjectives: ["Build a balanced plate: protein, grain, vegetables, and a smart topping"],
      nutritionTopics: ["balanced plates", "protein", "vegetables"],
      foodTopics: ["burgers"],
      instructions: "Drag each ingredient onto the layer where it belongs to build a balanced burger.",
      xpReward: 35,
      maxStars: 3,
      unlockRequirements: { type: "levelAtLeast", value: 2 },
      status: "published",
      configuration: {
        slots: [
          { id: "bottomBun", order: 1, label: "Bottom bun", correctItemId: "wholeWheatBun" },
          { id: "protein", order: 2, label: "Protein", correctItemId: "leanPatty" },
          { id: "veggie", order: 3, label: "Vegetable topping", correctItemId: "lettuceTomato" },
          { id: "topBun", order: 4, label: "Top bun", correctItemId: "wholeWheatBunTop" },
        ],
        draggableItems: [
          { id: "wholeWheatBun", label: "Whole wheat bun (bottom)" },
          { id: "leanPatty", label: "Lean turkey patty" },
          { id: "lettuceTomato", label: "Lettuce & tomato" },
          { id: "wholeWheatBunTop", label: "Whole wheat bun (top)" },
          { id: "friedBun", label: "Fried donut bun" },
          { id: "extraCheeseStack", label: "Triple cheese stack" },
        ],
      },
    },
    {
      title: "Gumbo Stir",
      slug: "gumbo-stir",
      region: regionDocs.louisiana._id,
      state: "Louisiana",
      gameType: "sequence",
      ageGroups: ["7-9", "10-12"],
      difficulty: "medium",
      description: "Put the steps of cooking gumbo safely in the right order.",
      learningObjectives: ["Understand basic kitchen safety and cooking sequence"],
      nutritionTopics: ["cooking safety"],
      foodTopics: ["gumbo", "Louisiana cuisine"],
      instructions: "Drag the steps into the order you'd really cook them in.",
      xpReward: 35,
      maxStars: 3,
      unlockRequirements: { type: "always" },
      status: "published",
      configuration: {
        steps: [
          { id: "washHands", label: "Wash your hands" },
          { id: "chopVeggies", label: "Ask an adult to help chop the vegetables" },
          { id: "makeRoux", label: "Cook the roux with an adult, stirring carefully" },
          { id: "addVeggies", label: "Add the vegetables to the pot" },
          { id: "simmer", label: "Let it simmer while an adult watches the heat" },
          { id: "tasteTest", label: "Taste-test once it's cooled a bit" },
        ],
      },
    },
    {
      title: "Guac Hero",
      slug: "guac-hero",
      region: regionDocs.california._id,
      state: "California",
      gameType: "ingredientBuilder",
      ageGroups: ["4-6", "7-9"],
      difficulty: "easy",
      description: "Pick the real guacamole ingredients — don't get fooled by the distractors!",
      learningObjectives: ["Recognize healthy fats", "Identify real ingredients in a familiar recipe"],
      nutritionTopics: ["healthy fats"],
      foodTopics: ["avocado", "guacamole"],
      instructions: "Tap every ingredient that belongs in guacamole.",
      xpReward: 25,
      maxStars: 3,
      unlockRequirements: { type: "always" },
      status: "published",
      configuration: {
        targetItems: [
          { id: "avocado", label: "Avocado" },
          { id: "lime", label: "Lime" },
          { id: "onion", label: "Onion" },
          { id: "cilantro", label: "Cilantro" },
          { id: "salt", label: "Salt" },
        ],
        distractorItems: [
          { id: "chocolate", label: "Chocolate syrup" },
          { id: "ketchup", label: "Ketchup" },
          { id: "gumdrops", label: "Gumdrops" },
        ],
      },
    },
    {
      title: "Berry Blast",
      slug: "berry-blast",
      region: regionDocs.maine._id,
      state: "Maine",
      gameType: "matching",
      ageGroups: ["4-6", "7-9"],
      difficulty: "easy",
      description: "Match each berry to the superpower it gives your body.",
      learningObjectives: ["Learn what antioxidants and vitamins different berries provide"],
      nutritionTopics: ["antioxidants", "vitamins"],
      foodTopics: ["blueberries", "strawberries", "berries"],
      instructions: "Match each berry on the left to its fun fact on the right.",
      xpReward: 25,
      maxStars: 3,
      unlockRequirements: { type: "always" },
      status: "published",
      configuration: {
        items: [
          { id: "blueberry", promptLabel: "Blueberry", matchLabel: "Packed with antioxidants" },
          { id: "strawberry", promptLabel: "Strawberry", matchLabel: "Full of vitamin C" },
          { id: "raspberry", promptLabel: "Raspberry", matchLabel: "Great source of fiber" },
          { id: "blackberry", promptLabel: "Blackberry", matchLabel: "Supports healthy skin" },
        ],
      },
    },
    {
      title: "Dairy Dash",
      slug: "dairy-dash",
      region: regionDocs.wisconsin._id,
      state: "Wisconsin",
      gameType: "timedChallenge",
      ageGroups: ["7-9", "10-12"],
      difficulty: "medium",
      description: "Tap the calcium-rich foods before time runs out!",
      learningObjectives: ["Recognize calcium-rich foods that build strong bones"],
      nutritionTopics: ["calcium", "bone health"],
      foodTopics: ["dairy", "cheese", "milk", "yogurt"],
      instructions: "Foods will flash by — tap only the ones that are good for your bones!",
      xpReward: 30,
      maxStars: 3,
      unlockRequirements: { type: "levelAtLeast", value: 2 },
      status: "published",
      configuration: {
        timeLimitSeconds: 30,
        targetCorrectCount: 5,
        items: [
          { id: "milk", label: "Milk", isCorrect: true },
          { id: "cheese", label: "Cheese", isCorrect: true },
          { id: "yogurt", label: "Yogurt", isCorrect: true },
          { id: "kale", label: "Kale", isCorrect: true },
          { id: "almonds", label: "Almonds", isCorrect: true },
          { id: "soda", label: "Soda", isCorrect: false },
          { id: "candy", label: "Candy", isCorrect: false },
          { id: "chips", label: "Chips", isCorrect: false },
        ],
      },
    },
    {
      title: "Peach Pick",
      slug: "peach-pick",
      region: regionDocs.georgia._id,
      state: "Georgia",
      gameType: "sorting",
      ageGroups: ["4-6", "7-9"],
      difficulty: "easy",
      description: "Sort the produce into fruits and vegetables.",
      learningObjectives: ["Classify common produce as fruit or vegetable"],
      nutritionTopics: ["food groups"],
      foodTopics: ["peaches", "produce"],
      instructions: "Drag each food into the Fruit bin or the Vegetable bin.",
      xpReward: 25,
      maxStars: 3,
      unlockRequirements: { type: "always" },
      status: "published",
      configuration: {
        bins: [
          { id: "fruit", label: "Fruit" },
          { id: "vegetable", label: "Vegetable" },
        ],
        items: [
          { id: "peach", label: "Peach", correctBinId: "fruit" },
          { id: "plum", label: "Plum", correctBinId: "fruit" },
          { id: "watermelon", label: "Watermelon", correctBinId: "fruit" },
          { id: "carrot", label: "Carrot", correctBinId: "vegetable" },
          { id: "broccoli", label: "Broccoli", correctBinId: "vegetable" },
          { id: "pepper", label: "Bell pepper", correctBinId: "vegetable" },
        ],
      },
    },
    {
      title: "Salmon Run",
      slug: "salmon-run",
      region: regionDocs.alaska._id,
      state: "Alaska",
      gameType: "memory",
      ageGroups: ["7-9", "10-12"],
      difficulty: "medium",
      description: "Flip cards to match omega-3-rich foods.",
      learningObjectives: ["Recognize omega-3 rich foods and why they matter for brain health"],
      nutritionTopics: ["omega-3", "brain health"],
      foodTopics: ["salmon", "fish", "nuts"],
      instructions: "Flip two cards at a time to find matching pairs.",
      xpReward: 30,
      maxStars: 3,
      unlockRequirements: { type: "levelAtLeast", value: 3 },
      status: "published",
      configuration: {
        parMoves: 10,
        pairs: [
          { id: "salmon", label: "Salmon" },
          { id: "walnuts", label: "Walnuts" },
          { id: "chiaSeeds", label: "Chia seeds" },
          { id: "flaxseed", label: "Flaxseed" },
          { id: "tuna", label: "Tuna" },
        ],
      },
    },
    {
      title: "Pumpkin Patch",
      slug: "pumpkin-patch",
      region: regionDocs["new-england"]._id,
      state: "New England",
      gameType: "quiz",
      ageGroups: ["4-6", "7-9"],
      difficulty: "easy",
      description: "A cozy quiz about pumpkins, seasons, and eating what's in season.",
      learningObjectives: ["Understand seasonal eating and pumpkin nutrition"],
      nutritionTopics: ["vitamin A", "seasonal eating"],
      foodTopics: ["pumpkin", "squash"],
      instructions: "Answer the questions about our favorite fall vegetable!",
      xpReward: 25,
      maxStars: 3,
      unlockRequirements: { type: "always" },
      status: "published",
      configuration: {
        questions: [
          {
            id: "q1",
            prompt: "Pumpkins are packed with which vitamin that's great for your eyes?",
            options: [
              { id: "a", text: "Vitamin A" },
              { id: "b", text: "Vitamin Z" },
            ],
            correctOptionId: "a",
          },
          {
            id: "q2",
            prompt: "\"Eating in season\" means eating foods that...",
            options: [
              { id: "a", text: "Grow naturally at that time of year" },
              { id: "b", text: "Come in bright orange packages" },
            ],
            correctOptionId: "a",
          },
        ],
      },
    },
  ];

  for (const g of games) {
    // eslint-disable-next-line no-await-in-loop
    await Game.findOneAndUpdate({ slug: g.slug }, { $set: g }, { upsert: true, new: true, setDefaultsOnInsert: true });
    // eslint-disable-next-line no-console
    console.log(`✅ Seeded game: ${g.title} (${g.gameType})`);
  }

  await disconnectDB();
}

seed()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("🌱 Seeding complete");
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", err);
    process.exit(1);
  });
