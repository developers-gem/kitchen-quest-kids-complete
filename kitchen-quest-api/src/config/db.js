const mongoose = require("mongoose");
const env = require("./env");
const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]); // Use Cloudflare and Google DNS servers for better reliability
mongoose.set("strictQuery", true);

/**
 * FIXED (production readiness audit, finding E1): connectDB() used to
 * make exactly one connection attempt and let the process crash
 * immediately on failure. Fine when Mongo is already up and stable; a
 * real problem the moment the database takes a few extra seconds to
 * accept connections during a coordinated restart, a DNS change
 * propagating, or a brief network blip during deploy -- all of which
 * would previously take the API process down with them for no good
 * reason. Retries a bounded number of times with exponential backoff
 * before giving up and letting the caller (server.js) decide to exit.
 */
async function connectWithRetry(uri, { retries = 5, baseDelayMs = 1000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(uri);
      return;
    } catch (err) {
      const isLastAttempt = attempt === retries;
      // eslint-disable-next-line no-console
      console.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (isLastAttempt) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      // eslint-disable-next-line no-console
      console.log(`Retrying in ${delay}ms...`);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function connectDB(uri = env.MONGO_URI) {
  mongoose.connection.on("connected", () => {
    // eslint-disable-next-line no-console
    console.log(`✅ MongoDB connected (${mongoose.connection.name})`);
  });

  mongoose.connection.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("❌ MongoDB connection error:", err.message);
  });

  await connectWithRetry(uri);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB, connectWithRetry, mongoose };
