import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isEmailAdmin } from "../../server/utils/admin";
import { computeIdentityHash } from "../../server/utils/identity-hash";

describe("isEmailAdmin", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return false if no INITIAL_ADMIN_EMAILS env variable is set", () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "");
    expect(isEmailAdmin("test@example.com")).toBe(false);
  });

  it("should return true if email is in INITIAL_ADMIN_EMAILS", () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "admin1@example.com,admin2@example.com");
    expect(isEmailAdmin("admin2@example.com")).toBe(true);
  });

  it("should return false if email is not in INITIAL_ADMIN_EMAILS", () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "admin1@example.com");
    expect(isEmailAdmin("user@example.com")).toBe(false);
  });

  it("should handle spaces around emails in the env var", () => {
    vi.stubEnv(
      "INITIAL_ADMIN_EMAILS",
      " admin1@example.com , admin2@example.com ",
    );
    expect(isEmailAdmin("admin2@example.com")).toBe(true);
  });

  it("should return false for empty email", () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "admin1@example.com");
    expect(isEmailAdmin("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/action
// ---------------------------------------------------------------------------
function stubServerGlobals({
  session = null as unknown,
  body = {} as unknown,
} = {}) {
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("getUserSession", vi.fn().mockResolvedValue(session));
  vi.stubGlobal("readValidatedBody", vi.fn().mockResolvedValue(body));
  vi.stubGlobal(
    "createError",
    vi.fn((data: { statusCode: number; message: string }) => {
      const err = new Error(data.message) as Error & { statusCode: number };
      err.statusCode = data.statusCode;
      return err;
    }),
  );
}

describe("POST /api/admin/users/action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("regression: ban action stores a hashed_identity that matches the shared identity-hash utility, not btoa(users.id)", async () => {
    // First dynamic import + bundle of the handler under the Workers test pool is slow.
    vi.stubEnv("NUXT_HASH_PEPPER", "test-pepper");

    const targetUser = {
      id: "discord:12345",
      username: "testuser",
      status: "active",
      createdAt: new Date(),
      isAdmin: false,
    };

    stubServerGlobals({
      session: { user: { id: "admin:1", isAdmin: true } },
      body: { userId: targetUser.id, action: "ban", reason: "spam" },
    });

    const capturedInsertValues: Array<Record<string, unknown>> = [];

    vi.doMock("../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([targetUser]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn((v: Record<string, unknown>) => {
          capturedInsertValues.push(v);
          return { onConflictDoNothing: vi.fn().mockResolvedValue(undefined) };
        }),
      })),
    }));

    const { default: handler } =
      await import("../../server/api/admin/users/action.post");

    await handler({});

    const expectedHash = await computeIdentityHash(targetUser.id);

    const infractionInsert = capturedInsertValues.find(
      (v) => "identityHash" in v,
    );
    const banInsert = capturedInsertValues.find((v) => "hashed_identity" in v);

    expect(infractionInsert?.identityHash).toBe(expectedHash);
    expect(banInsert?.hashed_identity).toBe(expectedHash);
    // The old implementation used btoa(targetUser.id) - guard against regressing to it.
    expect(banInsert?.hashed_identity).not.toBe(btoa(targetUser.id));
  }, 20000);
});
