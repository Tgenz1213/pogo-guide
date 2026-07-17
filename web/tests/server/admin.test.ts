import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isEmailAdmin, isSuperAdminId } from "../../server/utils/admin";
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
    vi.doMock("../../server/utils/admin", () => ({
      requireAdmin: vi
        .fn()
        .mockResolvedValue({ user: { id: "admin:1", isAdmin: true } }),
      isEmailAdmin: vi.fn(),
      isSuperAdminId: vi.fn().mockReturnValue(false),
    }));

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

    vi.doMock("../../server/utils/admin", () => ({
      requireAdmin: vi
        .fn()
        .mockResolvedValue({ user: { id: "admin:1", isAdmin: true } }),
      isEmailAdmin: vi.fn(),
      isSuperAdminId: vi.fn().mockReturnValue(false),
    }));

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
      })),
    }));

    const { default: handler } =
      await import("../../server/api/admin/users/action.post");

    await handler({});

    expect(setCalls).toContainEqual({
      isAdmin: true,
      adminGrantedVia: "admin_panel",
    });
  }, 20000);

  it("make_admin revoking clears adminGrantedVia", async () => {
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

    // The target already has isAdmin: true, so the new admin-hierarchy rule
    // (Step 3 below) requires the ACTING admin to be a super admin for this
    // revoke to be allowed. This test is about the adminGrantedVia clearing
    // payload, not hierarchy enforcement (that gets its own tests in Step 6),
    // so make the acting admin ("admin:1") a super admin here.
    vi.doMock("../../server/utils/admin", () => ({
      requireAdmin: vi
        .fn()
        .mockResolvedValue({ user: { id: "admin:1", isAdmin: true } }),
      isEmailAdmin: vi.fn(),
      isSuperAdminId: vi.fn((id: string) => id === "admin:1"),
    }));

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
      })),
    }));

    const { default: handler } =
      await import("../../server/api/admin/users/action.post");

    await handler({});

    expect(setCalls).toContainEqual({
      isAdmin: false,
      adminGrantedVia: null,
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

      vi.doMock("../../server/utils/admin", () => ({
        requireAdmin: vi
          .fn()
          .mockResolvedValue({ user: { id: "admin:1", isAdmin: true } }),
        isEmailAdmin: vi.fn(),
        isSuperAdminId: vi.fn((id: string) => id === targetUser.id),
      }));

      const updateSpy = vi.fn().mockReturnThis();
      vi.doMock("../../server/utils/db", () => ({
        useDB: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([targetUser]),
          update: updateSpy,
          set: vi.fn().mockReturnThis(),
        })),
      }));

      const { default: handler } =
        await import("../../server/api/admin/users/action.post");

      await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
      expect(updateSpy).not.toHaveBeenCalled();
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

    vi.doMock("../../server/utils/admin", () => ({
      requireAdmin: vi
        .fn()
        .mockResolvedValue({ user: { id: "admin:1", isAdmin: true } }),
      isEmailAdmin: vi.fn(),
      isSuperAdminId: vi.fn((id: string) => id === targetUser.id),
    }));

    const updateSpy = vi.fn().mockReturnThis();
    vi.doMock("../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([targetUser]),
        update: updateSpy,
        set: vi.fn().mockReturnThis(),
      })),
    }));

    const { default: handler } =
      await import("../../server/api/admin/users/action.post");

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

    vi.doMock("../../server/utils/admin", () => ({
      requireAdmin: vi
        .fn()
        .mockResolvedValue({ user: { id: "admin:1", isAdmin: true } }),
      isEmailAdmin: vi.fn(),
      isSuperAdminId: vi.fn((id: string) => id === targetUser.id),
    }));

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
      })),
    }));

    const { default: handler } =
      await import("../../server/api/admin/users/action.post");

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

      vi.doMock("../../server/utils/admin", () => ({
        requireAdmin: vi
          .fn()
          .mockResolvedValue({ user: { id: "admin:1", isAdmin: true } }),
        isEmailAdmin: vi.fn(),
        isSuperAdminId: vi.fn().mockReturnValue(false),
      }));

      const updateSpy = vi.fn().mockReturnThis();
      vi.doMock("../../server/utils/db", () => ({
        useDB: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([targetUser]),
          update: updateSpy,
          set: vi.fn().mockReturnThis(),
        })),
      }));

      const { default: handler } =
        await import("../../server/api/admin/users/action.post");

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

    vi.doMock("../../server/utils/admin", () => ({
      requireAdmin: vi
        .fn()
        .mockResolvedValue({ user: { id: "admin:1", isAdmin: true } }),
      isEmailAdmin: vi.fn(),
      isSuperAdminId: vi.fn().mockReturnValue(false),
    }));

    const updateSpy = vi.fn().mockReturnThis();
    vi.doMock("../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([targetUser]),
        update: updateSpy,
        set: vi.fn().mockReturnThis(),
      })),
    }));

    const { default: handler } =
      await import("../../server/api/admin/users/action.post");

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

      vi.doMock("../../server/utils/admin", () => ({
        requireAdmin: vi
          .fn()
          .mockResolvedValue({ user: { id: "super:1", isAdmin: true } }),
        isEmailAdmin: vi.fn(),
        isSuperAdminId: vi.fn((id: string) => id === "super:1"),
      }));

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

      const { default: handler } =
        await import("../../server/api/admin/users/action.post");

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

    vi.doMock("../../server/utils/admin", () => ({
      requireAdmin: vi
        .fn()
        .mockResolvedValue({ user: { id: "super:1", isAdmin: true } }),
      isEmailAdmin: vi.fn(),
      isSuperAdminId: vi.fn((id: string) => id === "super:1"),
    }));

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
      })),
    }));

    const { default: handler } =
      await import("../../server/api/admin/users/action.post");

    await handler({});

    expect(setCalls).toContainEqual({
      isAdmin: false,
      adminGrantedVia: null,
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
