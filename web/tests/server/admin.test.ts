import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isEmailAdmin,
  isSuperAdminId,
  isProtectedFromActor,
  resolveNewUserAdminState,
} from "../../server/utils/admin";
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

  it("should match regardless of case on either side", () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "Admin@Example.com");
    expect(isEmailAdmin("admin@example.com")).toBe(true);
    expect(isEmailAdmin("ADMIN@EXAMPLE.COM")).toBe(true);
  });

  it("should not match an empty allowlist entry from a trailing comma", () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "admin1@example.com,");
    expect(isEmailAdmin("")).toBe(false);
  });
});

describe("isSuperAdminId", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return false if no SUPER_ADMIN_IDS env variable is set", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "");
    expect(isSuperAdminId("discord:12345")).toBe(false);
  });

  it("should return true if id is in SUPER_ADMIN_IDS", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:111,google:222");
    expect(isSuperAdminId("google:222")).toBe(true);
  });

  it("should return false if id is not in SUPER_ADMIN_IDS", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:111");
    expect(isSuperAdminId("discord:999")).toBe(false);
  });

  it("should handle spaces around ids in the env var", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", " discord:111 , google:222 ");
    expect(isSuperAdminId("google:222")).toBe(true);
  });

  it("should return false for empty id", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:111");
    expect(isSuperAdminId("")).toBe(false);
  });

  it("should not match an empty allowlist entry from a trailing comma", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:111,");
    expect(isSuperAdminId("")).toBe(false);
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

function mockAdminModule({
  actingUserId = "admin:1",
  isProtected = false,
} = {}) {
  const assertNotProtected = vi.fn(() => {
    if (isProtected) {
      const err = new Error(
        "This account is protected and cannot be modified.",
      ) as Error & { statusCode: number };
      err.statusCode = 403;
      throw err;
    }
  });
  vi.doMock("../../server/utils/admin", () => ({
    requireAdmin: vi
      .fn()
      .mockResolvedValue({ user: { id: actingUserId, isAdmin: true } }),
    isEmailAdmin: vi.fn(),
    assertNotProtected,
  }));
  return assertNotProtected;
}

function mockDbCapturingSet(targetUser: Record<string, unknown>) {
  const setCalls: Array<Record<string, unknown>> = [];
  vi.doMock("../../server/utils/db", () => ({
    useDB: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([targetUser]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn((v: Record<string, unknown>) => {
        setCalls.push(v);
        return { where: vi.fn().mockResolvedValue(undefined) };
      }),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    })),
  }));
  return setCalls;
}

function mockDbWithUpdateSpy(targetUser: Record<string, unknown>) {
  const updateSpy = vi.fn().mockReturnThis();
  vi.doMock("../../server/utils/db", () => ({
    useDB: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([targetUser]),
      update: updateSpy,
      set: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    })),
  }));
  return updateSpy;
}

async function importActionHandler() {
  const { default: handler } =
    await import("../../server/api/admin/users/action.post");
  return handler;
}

describe("POST /api/admin/users/action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.doUnmock("../../server/utils/admin");
    vi.doUnmock("../../server/utils/db");
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

    // requireAdmin's D1 re-check is exercised by its own dedicated tests
    // below; stub it here so this test stays focused on the hash regression.
    mockAdminModule({ isProtected: false });

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
    const banInsert = capturedInsertValues.find((v) => "hashedIdentity" in v);

    expect(infractionInsert?.identityHash).toBe(expectedHash);
    expect(banInsert?.hashedIdentity).toBe(expectedHash);
    // The old implementation used btoa(targetUser.id) - guard against regressing to it.
    expect(banInsert?.hashedIdentity).not.toBe(btoa(targetUser.id));
  }, 20000);

  it("make_admin granting sets adminGrantedVia to 'admin_panel'", async () => {
    const targetUser = {
      id: "discord:12345",
      username: "testuser",
      status: "active",
      createdAt: new Date(),
      isAdmin: false,
      adminGrantedVia: null,
    };

    stubServerGlobals({
      session: { user: { id: "admin:1", isAdmin: true } },
      body: { userId: targetUser.id, action: "make_admin" },
    });

    mockAdminModule({ isProtected: false });
    const setCalls = mockDbCapturingSet(targetUser);
    const handler = await importActionHandler();

    await handler({});

    expect(setCalls).toContainEqual({
      isAdmin: true,
      adminGrantedVia: "admin_panel",
    });
  }, 20000);

  it("make_admin revoking sets adminGrantedVia to 'revoked'", async () => {
    const targetUser = {
      id: "discord:12345",
      username: "testuser",
      status: "active",
      createdAt: new Date(),
      isAdmin: true,
      adminGrantedVia: "admin_panel",
    };

    stubServerGlobals({
      session: { user: { id: "admin:1", isAdmin: true } },
      body: { userId: targetUser.id, action: "make_admin" },
    });

    // The target already has isAdmin: true; this test is about the
    // adminGrantedVia payload the revoke writes, not hierarchy enforcement
    // (that gets its own tests below), so the target isn't protected here.
    mockAdminModule({ isProtected: false });
    const setCalls = mockDbCapturingSet(targetUser);
    const handler = await importActionHandler();

    await handler({});

    expect(setCalls).toContainEqual({
      isAdmin: false,
      adminGrantedVia: "revoked",
    });
  }, 20000);

  it.each(["warn", "ban"] as const)(
    "rejects '%s' against a userId in SUPER_ADMIN_IDS with 403",
    async (action) => {
      const targetUser = {
        id: "discord:protected-1",
        username: "protecteduser",
        status: "active",
        createdAt: new Date(),
        isAdmin: false,
        adminGrantedVia: null,
      };

      stubServerGlobals({
        session: { user: { id: "admin:1", isAdmin: true } },
        body: { userId: targetUser.id, action },
      });

      const assertNotProtected = mockAdminModule({ isProtected: true });
      const updateSpy = mockDbWithUpdateSpy(targetUser);
      const handler = await importActionHandler();

      await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
      expect(updateSpy).not.toHaveBeenCalled();
      expect(assertNotProtected).toHaveBeenCalledWith(
        "admin:1",
        expect.objectContaining({ id: targetUser.id }),
      );
    },
  );

  it("rejects a make_admin revoke against a userId in SUPER_ADMIN_IDS with 403", async () => {
    const targetUser = {
      id: "discord:protected-2",
      username: "protecteduser",
      status: "active",
      createdAt: new Date(),
      isAdmin: true,
      adminGrantedVia: "super_admin",
    };

    stubServerGlobals({
      session: { user: { id: "admin:1", isAdmin: true } },
      body: { userId: targetUser.id, action: "make_admin" },
    });

    const assertNotProtected = mockAdminModule({ isProtected: true });
    const updateSpy = mockDbWithUpdateSpy(targetUser);
    const handler = await importActionHandler();

    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
    expect(updateSpy).not.toHaveBeenCalled();
    expect(assertNotProtected).toHaveBeenCalledWith(
      "admin:1",
      expect.objectContaining({ id: targetUser.id }),
    );
  });

  it.each(["warn", "ban"] as const)(
    "rejects '%s' against a super admin even when the acting admin is also a super admin (mutual immunity)",
    async (action) => {
      const targetUser = {
        id: "discord:super-target",
        username: "protecteduser",
        status: "active",
        createdAt: new Date(),
        isAdmin: true,
        adminGrantedVia: "super_admin",
      };

      stubServerGlobals({
        session: { user: { id: "discord:super-actor", isAdmin: true } },
        body: { userId: targetUser.id, action },
      });

      const assertNotProtected = mockAdminModule({
        actingUserId: "discord:super-actor",
        isProtected: true,
      });
      const updateSpy = mockDbWithUpdateSpy(targetUser);
      const handler = await importActionHandler();

      await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
      expect(updateSpy).not.toHaveBeenCalled();
      expect(assertNotProtected).toHaveBeenCalledWith(
        "discord:super-actor",
        expect.objectContaining({ id: targetUser.id }),
      );
    },
  );

  it("rejects a make_admin revoke against a super admin even when the acting admin is also a super admin (mutual immunity)", async () => {
    const targetUser = {
      id: "discord:super-target-2",
      username: "protecteduser",
      status: "active",
      createdAt: new Date(),
      isAdmin: true,
      adminGrantedVia: "super_admin",
    };

    stubServerGlobals({
      session: { user: { id: "discord:super-actor-2", isAdmin: true } },
      body: { userId: targetUser.id, action: "make_admin" },
    });

    mockAdminModule({
      actingUserId: "discord:super-actor-2",
      isProtected: true,
    });
    const updateSpy = mockDbWithUpdateSpy(targetUser);
    const handler = await importActionHandler();

    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("allows granting admin to a SUPER_ADMIN_IDS entry that is not yet admin (grant direction is harmless)", async () => {
    const targetUser = {
      id: "discord:protected-3",
      username: "protecteduser",
      status: "active",
      createdAt: new Date(),
      isAdmin: false,
      adminGrantedVia: null,
    };

    stubServerGlobals({
      session: { user: { id: "admin:1", isAdmin: true } },
      body: { userId: targetUser.id, action: "make_admin" },
    });

    // Target is a SUPER_ADMIN_IDS entry (would be protected if this were a
    // restricted action), but granting a non-admin is never restricted, so
    // isProtectedFromActor should never even be consulted for this case.
    mockAdminModule({ isProtected: true });
    const setCalls = mockDbCapturingSet(targetUser);
    const handler = await importActionHandler();

    await handler({});

    expect(setCalls).toContainEqual({
      isAdmin: true,
      adminGrantedVia: "admin_panel",
    });
  });

  it.each(["warn", "ban"] as const)(
    "rejects '%s' against a regular (non-super) admin when the acting admin is not a super admin",
    async (action) => {
      const targetUser = {
        id: "discord:regular-admin-1",
        username: "regularadmin",
        status: "active",
        createdAt: new Date(),
        isAdmin: true,
        adminGrantedVia: "bootstrap",
      };

      stubServerGlobals({
        session: { user: { id: "admin:1", isAdmin: true } },
        body: { userId: targetUser.id, action },
      });

      mockAdminModule({ isProtected: true });
      const updateSpy = mockDbWithUpdateSpy(targetUser);
      const handler = await importActionHandler();

      await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
      expect(updateSpy).not.toHaveBeenCalled();
    },
  );

  it("rejects a make_admin revoke against a regular (non-super) admin when the acting admin is not a super admin", async () => {
    const targetUser = {
      id: "discord:regular-admin-2",
      username: "regularadmin",
      status: "active",
      createdAt: new Date(),
      isAdmin: true,
      adminGrantedVia: "admin_panel",
    };

    stubServerGlobals({
      session: { user: { id: "admin:1", isAdmin: true } },
      body: { userId: targetUser.id, action: "make_admin" },
    });

    mockAdminModule({ isProtected: true });
    const updateSpy = mockDbWithUpdateSpy(targetUser);
    const handler = await importActionHandler();

    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it.each(["warn", "ban"] as const)(
    "allows a super admin to '%s' a regular (non-super) admin",
    async (action) => {
      const targetUser = {
        id: "discord:regular-admin-3",
        username: "regularadmin",
        status: "active",
        createdAt: new Date(),
        isAdmin: true,
        adminGrantedVia: "bootstrap",
      };

      stubServerGlobals({
        session: { user: { id: "super:1", isAdmin: true } },
        body: { userId: targetUser.id, action, reason: "test" },
      });

      mockAdminModule({ actingUserId: "super:1", isProtected: false });
      const updateSpy = mockDbWithUpdateSpy(targetUser);
      const handler = await importActionHandler();

      const result = await handler({});

      expect(result).toEqual({
        success: true,
        message: action === "warn" ? "User warned" : "User banned",
      });
      expect(updateSpy).toHaveBeenCalled();
    },
  );

  it("allows a super admin to revoke a regular (non-super) admin via make_admin", async () => {
    const targetUser = {
      id: "discord:regular-admin-4",
      username: "regularadmin",
      status: "active",
      createdAt: new Date(),
      isAdmin: true,
      adminGrantedVia: "bootstrap",
    };

    stubServerGlobals({
      session: { user: { id: "super:1", isAdmin: true } },
      body: { userId: targetUser.id, action: "make_admin" },
    });

    mockAdminModule({ actingUserId: "super:1", isProtected: false });
    const setCalls = mockDbCapturingSet(targetUser);
    const handler = await importActionHandler();

    await handler({});

    expect(setCalls).toContainEqual({
      isAdmin: false,
      adminGrantedVia: "revoked",
    });
  });

  it("regression: a super admin cannot ban themselves, using the real assertNotProtected", async () => {
    const targetUser = {
      id: "discord:super-self-ban",
      username: "superadmin",
      status: "active",
      createdAt: new Date(),
      isAdmin: true,
      adminGrantedVia: "super_admin",
    };

    stubServerGlobals({
      session: { user: { id: "discord:super-self-ban", isAdmin: true } },
      body: { userId: targetUser.id, action: "ban", reason: "test" },
    });
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:super-self-ban");

    vi.doMock("../../server/utils/admin", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("../../server/utils/admin")>();
      return {
        ...actual,
        requireAdmin: vi.fn().mockResolvedValue({
          user: { id: "discord:super-self-ban", isAdmin: true },
        }),
      };
    });
    const updateSpy = mockDbWithUpdateSpy(targetUser);
    const handler = await importActionHandler();

    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("regression: a super admin cannot warn themselves, using the real assertNotProtected", async () => {
    const targetUser = {
      id: "discord:super-self-warn",
      username: "superadmin",
      status: "active",
      createdAt: new Date(),
      isAdmin: true,
      adminGrantedVia: "super_admin",
    };

    stubServerGlobals({
      session: { user: { id: "discord:super-self-warn", isAdmin: true } },
      body: { userId: targetUser.id, action: "warn" },
    });
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:super-self-warn");

    vi.doMock("../../server/utils/admin", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("../../server/utils/admin")>();
      return {
        ...actual,
        requireAdmin: vi.fn().mockResolvedValue({
          user: { id: "discord:super-self-warn", isAdmin: true },
        }),
      };
    });
    const updateSpy = mockDbWithUpdateSpy(targetUser);
    const handler = await importActionHandler();

    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("regression: a regular admin can still revoke their own admin status via make_admin (self-demotion), using the real assertNotProtected", async () => {
    const targetUser = {
      id: "discord:self-demote",
      username: "regularadmin",
      status: "active",
      createdAt: new Date(),
      isAdmin: true,
      adminGrantedVia: "bootstrap",
    };

    stubServerGlobals({
      session: { user: { id: "discord:self-demote", isAdmin: true } },
      body: { userId: targetUser.id, action: "make_admin" },
    });
    vi.stubEnv("SUPER_ADMIN_IDS", "");

    vi.doMock("../../server/utils/admin", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("../../server/utils/admin")>();
      return {
        ...actual,
        requireAdmin: vi.fn().mockResolvedValue({
          user: { id: "discord:self-demote", isAdmin: true },
        }),
      };
    });
    const setCalls = mockDbCapturingSet(targetUser);
    const handler = await importActionHandler();

    await handler({});

    expect(setCalls).toContainEqual({
      isAdmin: false,
      adminGrantedVia: "revoked",
    });
  });
});

// ---------------------------------------------------------------------------
// requireAdmin
// ---------------------------------------------------------------------------
describe("requireAdmin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("../../server/utils/db");
    vi.resetModules();
  });

  function stubAdminGlobals(session: unknown) {
    vi.stubGlobal("getUserSession", vi.fn().mockResolvedValue(session));
    vi.stubGlobal(
      "createError",
      vi.fn((data: { statusCode: number; message: string }) => {
        const err = new Error(data.message) as Error & { statusCode: number };
        err.statusCode = data.statusCode;
        return err;
      }),
    );
  }

  it("regression: rejects a session claiming isAdmin=true when D1 shows the user has since been demoted", async () => {
    stubAdminGlobals({ user: { id: "discord:12345", isAdmin: true } });

    vi.doMock("../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi
          .fn()
          .mockResolvedValue([{ id: "discord:12345", isAdmin: false }]),
      })),
    }));

    const { requireAdmin } = await import("../../server/utils/admin");

    await expect(requireAdmin({} as never)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("allows the request when D1 confirms the session's admin status is still current", async () => {
    stubAdminGlobals({ user: { id: "discord:12345", isAdmin: true } });

    vi.doMock("../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi
          .fn()
          .mockResolvedValue([{ id: "discord:12345", isAdmin: true }]),
      })),
    }));

    const { requireAdmin } = await import("../../server/utils/admin");

    await expect(requireAdmin({} as never)).resolves.toMatchObject({
      user: { id: "discord:12345", isAdmin: true },
    });
  });

  it("rejects when there is no session, without querying D1", async () => {
    stubAdminGlobals(null);
    const useDBSpy = vi.fn();
    vi.doMock("../../server/utils/db", () => ({ useDB: useDBSpy }));

    const { requireAdmin } = await import("../../server/utils/admin");

    await expect(requireAdmin({} as never)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(useDBSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reconcileBootstrapAdmin
// ---------------------------------------------------------------------------
describe("reconcileBootstrapAdmin", () => {
  afterEach(() => {
    vi.resetModules();
  });

  function buildDbMock() {
    const setCalls: Array<Record<string, unknown>> = [];
    const db = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn((v: Record<string, unknown>) => {
        setCalls.push(v);
        return db;
      }),
      where: vi.fn().mockResolvedValue(undefined),
    };
    return { db, setCalls };
  }

  it("promotes when the email is on the allowlist and the user is not yet admin", async () => {
    const { reconcileBootstrapAdmin } =
      await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await reconcileBootstrapAdmin(
      db as never,
      "discord:1",
      { isAdmin: false, adminGrantedVia: null },
      true,
    );

    expect(result).toBe(true);
    expect(setCalls).toContainEqual({
      isAdmin: true,
      adminGrantedVia: "bootstrap",
    });
  });

  it("demotes when the email is off the allowlist and admin was granted via bootstrap", async () => {
    const { reconcileBootstrapAdmin } =
      await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await reconcileBootstrapAdmin(
      db as never,
      "discord:1",
      { isAdmin: true, adminGrantedVia: "bootstrap" },
      false,
    );

    expect(result).toBe(false);
    expect(setCalls).toContainEqual({
      isAdmin: false,
      adminGrantedVia: null,
    });
  });

  it("leaves an admin_panel-granted admin untouched when off the allowlist", async () => {
    const { reconcileBootstrapAdmin } =
      await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await reconcileBootstrapAdmin(
      db as never,
      "discord:1",
      { isAdmin: true, adminGrantedVia: "admin_panel" },
      false,
    );

    expect(result).toBe(true);
    expect(setCalls).toEqual([]);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("leaves a legacy admin (no tracked provenance) untouched when off the allowlist", async () => {
    const { reconcileBootstrapAdmin } =
      await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await reconcileBootstrapAdmin(
      db as never,
      "discord:1",
      { isAdmin: true, adminGrantedVia: null },
      false,
    );

    expect(result).toBe(true);
    expect(setCalls).toEqual([]);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("is a no-op when already admin and still on the allowlist", async () => {
    const { reconcileBootstrapAdmin } =
      await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await reconcileBootstrapAdmin(
      db as never,
      "discord:1",
      { isAdmin: true, adminGrantedVia: "bootstrap" },
      true,
    );

    expect(result).toBe(true);
    expect(setCalls).toEqual([]);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("is a no-op when not admin and still not on the allowlist", async () => {
    const { reconcileBootstrapAdmin } =
      await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await reconcileBootstrapAdmin(
      db as never,
      "discord:1",
      { isAdmin: false, adminGrantedVia: null },
      false,
    );

    expect(result).toBe(false);
    expect(setCalls).toEqual([]);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("does not re-grant a panel-revoked user even when their email is still on the allowlist (sticky revoke)", async () => {
    const { reconcileBootstrapAdmin } =
      await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await reconcileBootstrapAdmin(
      db as never,
      "discord:1",
      { isAdmin: false, adminGrantedVia: "revoked" },
      true,
    );

    expect(result).toBe(false);
    expect(setCalls).toEqual([]);
    expect(db.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// enforceSuperAdmin
// ---------------------------------------------------------------------------
describe("enforceSuperAdmin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  function buildDbMock() {
    const setCalls: Array<Record<string, unknown>> = [];
    const db = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn((v: Record<string, unknown>) => {
        setCalls.push(v);
        return db;
      }),
      where: vi.fn().mockResolvedValue(undefined),
    };
    return { db, setCalls };
  }

  it("returns false and makes no DB call when the id is not in SUPER_ADMIN_IDS", async () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:other");
    const { enforceSuperAdmin } = await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await enforceSuperAdmin(db as never, "discord:1", {
      isAdmin: false,
      adminGrantedVia: null,
    });

    expect(result).toBe(false);
    expect(setCalls).toEqual([]);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("grants and tags adminGrantedVia 'super_admin' when the id matches and the user is not yet admin", async () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:1");
    const { enforceSuperAdmin } = await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await enforceSuperAdmin(db as never, "discord:1", {
      isAdmin: false,
      adminGrantedVia: null,
    });

    expect(result).toBe(true);
    expect(setCalls).toContainEqual({
      isAdmin: true,
      adminGrantedVia: "super_admin",
    });
  });

  it("normalizes provenance to 'super_admin' when already admin via a different path, without ever setting isAdmin false", async () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:1");
    const { enforceSuperAdmin } = await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await enforceSuperAdmin(db as never, "discord:1", {
      isAdmin: true,
      adminGrantedVia: "bootstrap",
    });

    expect(result).toBe(true);
    expect(setCalls).toContainEqual({
      isAdmin: true,
      adminGrantedVia: "super_admin",
    });
  });

  it("is a no-op when the id matches and state is already correct", async () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:1");
    const { enforceSuperAdmin } = await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await enforceSuperAdmin(db as never, "discord:1", {
      isAdmin: true,
      adminGrantedVia: "super_admin",
    });

    expect(result).toBe(true);
    expect(setCalls).toEqual([]);
    expect(db.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// resolveReturningUserAdmin
// ---------------------------------------------------------------------------
describe("resolveReturningUserAdmin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  function buildDbMock() {
    const setCalls: Array<Record<string, unknown>> = [];
    const db = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn((v: Record<string, unknown>) => {
        setCalls.push(v);
        return db;
      }),
      where: vi.fn().mockResolvedValue(undefined),
    };
    return { db, setCalls };
  }

  it("super-admin status wins over allowlist removal (short-circuits reconcileBootstrapAdmin)", async () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:1");
    const { resolveReturningUserAdmin } =
      await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await resolveReturningUserAdmin(
      db as never,
      "discord:1",
      { isAdmin: true, adminGrantedVia: "bootstrap" },
      false,
    );

    expect(result).toBe(true);
    expect(setCalls).toContainEqual({
      isAdmin: true,
      adminGrantedVia: "super_admin",
    });
  });

  it("falls through to reconcileBootstrapAdmin's demotion when not a super admin", async () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "");
    const { resolveReturningUserAdmin } =
      await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await resolveReturningUserAdmin(
      db as never,
      "discord:1",
      { isAdmin: true, adminGrantedVia: "bootstrap" },
      false,
    );

    expect(result).toBe(false);
    expect(setCalls).toContainEqual({
      isAdmin: false,
      adminGrantedVia: null,
    });
  });

  it("falls through to reconcileBootstrapAdmin's grant when not a super admin but on the allowlist", async () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "");
    const { resolveReturningUserAdmin } =
      await import("../../server/utils/admin");
    const { db, setCalls } = buildDbMock();

    const result = await resolveReturningUserAdmin(
      db as never,
      "discord:1",
      { isAdmin: false, adminGrantedVia: null },
      true,
    );

    expect(result).toBe(true);
    expect(setCalls).toContainEqual({
      isAdmin: true,
      adminGrantedVia: "bootstrap",
    });
  });
});

// ---------------------------------------------------------------------------
// isProtectedFromActor
// ---------------------------------------------------------------------------
describe("isProtectedFromActor", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("protects a super-admin target regardless of who is acting", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:target");

    expect(
      isProtectedFromActor("discord:actor", {
        id: "discord:target",
        isAdmin: true,
      }),
    ).toBe(true);
  });

  it("protects a super-admin target even from another super admin (mutual immunity)", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:target,discord:actor");

    expect(
      isProtectedFromActor("discord:actor", {
        id: "discord:target",
        isAdmin: true,
      }),
    ).toBe(true);
  });

  it("protects a regular admin target from a non-super acting admin", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "");

    expect(
      isProtectedFromActor("discord:actor", {
        id: "discord:target",
        isAdmin: true,
      }),
    ).toBe(true);
  });

  it("allows a super admin to act on a regular admin target", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:actor");

    expect(
      isProtectedFromActor("discord:actor", {
        id: "discord:target",
        isAdmin: true,
      }),
    ).toBe(false);
  });

  it("never protects a non-admin target", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "");

    expect(
      isProtectedFromActor("discord:actor", {
        id: "discord:target",
        isAdmin: false,
      }),
    ).toBe(false);
  });

  it("regression: has no self-action exemption — a super admin acting on their own row is still protected", () => {
    // isProtectedFromActor deliberately has NO self-exemption. A self-ban
    // would insert a row into bannedIdentities, which the login flow checks
    // *before* enforceSuperAdmin runs, permanently locking the account out
    // with no self-heal. Any self-service exemption (self-demote, self-
    // approve a GDPR deletion) must be scoped by the caller to that one
    // specific action, never granted here.
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:self");

    expect(
      isProtectedFromActor("discord:self", {
        id: "discord:self",
        isAdmin: true,
      }),
    ).toBe(true);
  });

  it("regular admin acting on their own row is still protected (no self-exemption)", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "");

    expect(
      isProtectedFromActor("discord:self", {
        id: "discord:self",
        isAdmin: true,
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resolveNewUserAdminState
// ---------------------------------------------------------------------------
describe("resolveNewUserAdminState", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("grants super_admin provenance when the id is on SUPER_ADMIN_IDS, regardless of the allowlist", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:1");
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "");

    expect(resolveNewUserAdminState("discord:1", false)).toEqual({
      isAdmin: true,
      adminGrantedVia: "super_admin",
    });
  });

  it("prioritizes super_admin over bootstrap when both apply", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:1");

    expect(resolveNewUserAdminState("discord:1", true)).toEqual({
      isAdmin: true,
      adminGrantedVia: "super_admin",
    });
  });

  it("grants bootstrap provenance when only on the allowlist", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "");

    expect(resolveNewUserAdminState("discord:1", true)).toEqual({
      isAdmin: true,
      adminGrantedVia: "bootstrap",
    });
  });

  it("grants nothing when neither applies", () => {
    vi.stubEnv("SUPER_ADMIN_IDS", "");

    expect(resolveNewUserAdminState("discord:1", false)).toEqual({
      isAdmin: false,
      adminGrantedVia: null,
    });
  });
});
