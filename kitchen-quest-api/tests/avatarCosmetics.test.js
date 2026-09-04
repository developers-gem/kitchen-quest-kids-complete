const request = require("supertest");
const createApp = require("../src/app");
const User = require("../src/modules/users/user.model");
const AvatarCosmetic = require("../src/modules/avatars/avatarCosmetic.model");

const app = createApp();

const parent = {
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  password: "StrongPass123",
  consentAcknowledged: true,
};

async function registerParent() {
  const res = await request(app).post("/api/v1/auth/register").send(parent);
  return { accessToken: res.body.data.accessToken, userId: res.body.data.user._id };
}

async function makeAdmin(userId) {
  await User.findByIdAndUpdate(userId, { $set: { role: ["parent", "platform_admin"] } });
}

async function getGateToken(accessToken) {
  const challengeRes = await request(app)
    .post("/api/v1/auth/parental-gate/challenge")
    .set("Authorization", `Bearer ${accessToken}`);
  const { question, challengeToken } = challengeRes.body.data;
  const [a, , b] = question.split(" ");
  const answer = Number(a) * Number(b);
  const verifyRes = await request(app)
    .post("/api/v1/auth/parental-gate/verify")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ challengeToken, answer });
  return verifyRes.body.data.gateToken;
}

async function createChild(accessToken, gateToken) {
  const res = await request(app)
    .post("/api/v1/children")
    .set("Authorization", `Bearer ${accessToken}`)
    .set("x-parental-gate-token", gateToken)
    .send({ displayName: "Mia", ageRange: "7-9" });
  return res.body.data;
}

describe("Avatar cosmetics: unlocking", () => {
  it("annotates each published cosmetic with unlocked/locked for a given child", async () => {
    const { accessToken } = await registerParent();
    const gateToken = await getGateToken(accessToken);
    const child = await createChild(accessToken, gateToken);

    const alwaysUnlocked = await AvatarCosmetic.create({
      label: "Basic Bandana",
      slot: "hat",
      assetKey: "bandana",
      status: "published",
      unlockRequirements: { type: "always" },
    });
    const lockedByLevel = await AvatarCosmetic.create({
      label: "Golden Chef Hat",
      slot: "hat",
      assetKey: "golden-hat",
      status: "published",
      unlockRequirements: { type: "levelAtLeast", value: 5 },
    });
    // A draft cosmetic should never appear at all, same as any other
    // draft content type.
    await AvatarCosmetic.create({
      label: "Unfinished Cosmetic",
      slot: "accessory",
      assetKey: "wip",
      status: "draft",
    });

    const res = await request(app)
      .get(`/api/v1/avatars?childId=${child._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const cosmetics = res.body.data.cosmetics;
    expect(cosmetics).toHaveLength(2);

    const bandana = cosmetics.find((c) => c._id === String(alwaysUnlocked._id));
    const goldenHat = cosmetics.find((c) => c._id === String(lockedByLevel._id));
    expect(bandana.unlocked).toBe(true);
    expect(goldenHat.unlocked).toBe(false);
  });

  it("lists cosmetics without an unlocked flag when no childId is supplied", async () => {
    const { accessToken } = await registerParent();
    await AvatarCosmetic.create({ label: "Basic Bandana", slot: "hat", assetKey: "bandana", status: "published" });

    const res = await request(app).get("/api/v1/avatars").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.cosmetics[0].unlocked).toBeUndefined();
  });

  it("admin can create a cosmetic as a draft and publish it through the workflow", async () => {
    const { userId, accessToken: parentToken } = await registerParent();
    await makeAdmin(userId);

    const createRes = await request(app)
      .post("/api/v1/admin/avatar-cosmetics")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ label: "Rainbow Apron", slot: "accessory", assetKey: "rainbow-apron" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe("draft");

    const id = createRes.body.data._id;
    await request(app)
      .post(`/api/v1/admin/avatar-cosmetics/${id}/status`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ status: "review" });
    const publishRes = await request(app)
      .post(`/api/v1/admin/avatar-cosmetics/${id}/status`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ status: "published" });
    expect(publishRes.body.data.status).toBe("published");
  });
});
