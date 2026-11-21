import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrCreateVoterId, hasStoredVote, storeVote } from "./voterStorage";

describe("voter storage", () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "12345678-1234-4234-8234-123456789012",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates and reuses a versioned voter identifier per session", () => {
    const first = getOrCreateVoterId("session-a");
    const second = getOrCreateVoterId("session-a");

    expect(first).toBe("voter_12345678_1234_4234_8234_123456789012");
    expect(second).toBe(first);
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });

  it("replaces malformed stored identifiers", () => {
    localStorage.setItem("moderate-questions:voter:v1:session-a", "bad");
    expect(getOrCreateVoterId("session-a")).toMatch(/^voter_/);
  });

  it("stores an affirmative vote marker", () => {
    expect(hasStoredVote("session-a", "question-a", "voter-a")).toBe(false);
    storeVote("session-a", "question-a", "voter-a");
    expect(hasStoredVote("session-a", "question-a", "voter-a")).toBe(true);
  });

  it("continues with an ephemeral ID when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    expect(getOrCreateVoterId("session-a")).toMatch(/^voter_/);
    expect(hasStoredVote("session-a", "question-a", "voter-a")).toBe(false);
    expect(() => storeVote("session-a", "question-a", "voter-a")).not.toThrow();
  });
});
