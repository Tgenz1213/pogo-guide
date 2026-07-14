import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeIdentityHash } from "../../../server/utils/identity-hash";

describe("computeIdentityHash", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("produces a deterministic hash for the same users.id and pepper", async () => {
    vi.stubEnv("NUXT_HASH_PEPPER", "test-pepper");
    const a = await computeIdentityHash("discord:12345");
    const b = await computeIdentityHash("discord:12345");
    expect(a).toBe(b);
  });

  it("produces different hashes for different users.id values", async () => {
    vi.stubEnv("NUXT_HASH_PEPPER", "test-pepper");
    const a = await computeIdentityHash("discord:12345");
    const b = await computeIdentityHash("discord:67890");
    expect(a).not.toBe(b);
  });

  it("is not base64 of the input (regression: admin ban action previously used btoa(users.id) instead of this hash)", async () => {
    vi.stubEnv("NUXT_HASH_PEPPER", "test-pepper");
    const usersId = "discord:12345";
    const hash = await computeIdentityHash(usersId);
    expect(hash).not.toBe(btoa(usersId));
  });

  it("changes when the pepper changes, for the same users.id", async () => {
    vi.stubEnv("NUXT_HASH_PEPPER", "pepper-a");
    const a = await computeIdentityHash("discord:12345");
    vi.stubEnv("NUXT_HASH_PEPPER", "pepper-b");
    const b = await computeIdentityHash("discord:12345");
    expect(a).not.toBe(b);
  });

  it("refuses to hash with a known fallback pepper in production when NUXT_HASH_PEPPER is unset", async () => {
    vi.stubEnv("NUXT_HASH_PEPPER", "");
    vi.stubEnv("NODE_ENV", "production");
    await expect(computeIdentityHash("discord:12345")).rejects.toThrow(
      /NUXT_HASH_PEPPER/,
    );
  });

  it("still hashes successfully outside production when NUXT_HASH_PEPPER is unset (local dev default)", async () => {
    vi.stubEnv("NUXT_HASH_PEPPER", "");
    vi.stubEnv("NODE_ENV", "development");
    await expect(computeIdentityHash("discord:12345")).resolves.toEqual(
      expect.any(String),
    );
  });

  it("uses the configured pepper in production when it is set", async () => {
    vi.stubEnv("NUXT_HASH_PEPPER", "real-pepper");
    vi.stubEnv("NODE_ENV", "production");
    await expect(computeIdentityHash("discord:12345")).resolves.toEqual(
      expect.any(String),
    );
  });
});
