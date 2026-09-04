const mongoose = require("mongoose");
const { connectWithRetry } = require("../src/config/db");

describe("Database connection retry/backoff", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("succeeds immediately without retrying when the first attempt connects", async () => {
    const connectSpy = jest.spyOn(mongoose, "connect").mockResolvedValueOnce(undefined);

    await connectWithRetry("mongodb://irrelevant", { retries: 5, baseDelayMs: 1 });

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed attempt and succeeds once the connection recovers", async () => {
    const connectSpy = jest
      .spyOn(mongoose, "connect")
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(undefined);

    await connectWithRetry("mongodb://irrelevant", { retries: 5, baseDelayMs: 1 });

    expect(connectSpy).toHaveBeenCalledTimes(3);
  });

  it("gives up and throws after exhausting the configured retry count", async () => {
    const persistentError = new Error("ECONNREFUSED");
    const connectSpy = jest.spyOn(mongoose, "connect").mockRejectedValue(persistentError);

    await expect(connectWithRetry("mongodb://irrelevant", { retries: 3, baseDelayMs: 1 })).rejects.toThrow(
      "ECONNREFUSED"
    );
    expect(connectSpy).toHaveBeenCalledTimes(3);
  });
});
