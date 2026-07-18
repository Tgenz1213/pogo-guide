import { describe, it, expect, vi, afterEach } from "vitest";

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

describe("POST /api/admin/deletion-requests/action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.doUnmock("../../../../../server/utils/admin");
    vi.doUnmock("../../../../../server/utils/db");
    vi.resetModules();
  });

  it("rejects approving a deletion request targeting a protected account with 403, and does not delete the row", async () => {
    const request = {
      id: "req-1",
      userId: "discord:protected",
      status: "pending",
    };
    const targetUser = { id: "discord:protected", isAdmin: true };

    stubServerGlobals({
      session: { user: { id: "admin:1", isAdmin: true } },
      body: { requestId: request.id, action: "approve" },
    });

    const assertNotProtected = vi.fn(() => {
      const err = new Error(
        "This account is protected and cannot be modified.",
      ) as Error & { statusCode: number };
      err.statusCode = 403;
      throw err;
    });
    vi.doMock("../../../../../server/utils/admin", () => ({
      requireAdmin: vi
        .fn()
        .mockResolvedValue({ user: { id: "admin:1", isAdmin: true } }),
      assertNotProtected,
    }));

    const deleteSpy = vi.fn().mockReturnThis();
    const updateSpy = vi.fn().mockReturnThis();
    vi.doMock("../../../../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi
          .fn()
          .mockResolvedValueOnce([request])
          .mockResolvedValueOnce([targetUser]),
        update: updateSpy,
        set: vi.fn().mockReturnThis(),
        delete: deleteSpy,
      })),
    }));

    const { default: handler } =
      await import("../../../../../server/api/admin/deletion-requests/action.post");

    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(assertNotProtected).toHaveBeenCalledWith(
      "admin:1",
      expect.objectContaining({ id: targetUser.id }),
    );
  });

  it("approves a deletion request targeting a non-protected account and deletes the row", async () => {
    const request = {
      id: "req-2",
      userId: "discord:regular",
      status: "pending",
    };
    const targetUser = { id: "discord:regular", isAdmin: false };

    stubServerGlobals({
      session: { user: { id: "admin:1", isAdmin: true } },
      body: { requestId: request.id, action: "approve" },
    });

    const assertNotProtected = vi.fn();
    vi.doMock("../../../../../server/utils/admin", () => ({
      requireAdmin: vi
        .fn()
        .mockResolvedValue({ user: { id: "admin:1", isAdmin: true } }),
      assertNotProtected,
    }));

    const deleteWhereSpy = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../../../../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi
          .fn()
          .mockResolvedValueOnce([request])
          .mockResolvedValueOnce([targetUser])
          .mockResolvedValueOnce(undefined),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn(() => ({ where: deleteWhereSpy })),
      })),
    }));

    const { default: handler } =
      await import("../../../../../server/api/admin/deletion-requests/action.post");

    const result = await handler({});

    expect(result).toEqual({ success: true, message: "Account deleted" });
    expect(deleteWhereSpy).toHaveBeenCalled();
    expect(assertNotProtected).toHaveBeenCalledWith(
      "admin:1",
      expect.objectContaining({ id: targetUser.id }),
    );
  });

  it("rejects a pending request", async () => {
    const request = {
      id: "req-3",
      userId: "discord:regular",
      status: "pending",
    };

    stubServerGlobals({
      session: { user: { id: "admin:1", isAdmin: true } },
      body: { requestId: request.id, action: "reject" },
    });

    vi.doMock("../../../../../server/utils/admin", () => ({
      requireAdmin: vi
        .fn()
        .mockResolvedValue({ user: { id: "admin:1", isAdmin: true } }),
      assertNotProtected: vi.fn(),
    }));

    const setCalls: Array<Record<string, unknown>> = [];
    vi.doMock("../../../../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([request]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn((v: Record<string, unknown>) => {
          setCalls.push(v);
          return { where: vi.fn().mockResolvedValue(undefined) };
        }),
      })),
    }));

    const { default: handler } =
      await import("../../../../../server/api/admin/deletion-requests/action.post");

    const result = await handler({});

    expect(result).toEqual({ success: true, message: "Request rejected" });
    expect(setCalls).toContainEqual({ status: "rejected" });
  });

  it("regression: a super admin can approve their own GDPR deletion request (self-exemption), using the real assertNotProtected", async () => {
    const request = {
      id: "req-self",
      userId: "discord:super-self",
      status: "pending",
    };

    stubServerGlobals({
      session: { user: { id: "discord:super-self", isAdmin: true } },
      body: { requestId: request.id, action: "approve" },
    });
    vi.stubEnv("SUPER_ADMIN_IDS", "discord:super-self");

    vi.doMock("../../../../../server/utils/admin", async (importOriginal) => {
      const actual =
        await importOriginal<
          typeof import("../../../../../server/utils/admin")
        >();
      return {
        ...actual,
        requireAdmin: vi.fn().mockResolvedValue({
          user: { id: "discord:super-self", isAdmin: true },
        }),
      };
    });

    const deleteWhereSpy = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../../../../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi
          .fn()
          .mockResolvedValueOnce([request])
          .mockResolvedValueOnce([{ id: "discord:super-self", isAdmin: true }])
          .mockResolvedValueOnce(undefined),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn(() => ({ where: deleteWhereSpy })),
      })),
    }));

    const { default: handler } =
      await import("../../../../../server/api/admin/deletion-requests/action.post");

    const result = await handler({});

    expect(result).toEqual({ success: true, message: "Account deleted" });
    expect(deleteWhereSpy).toHaveBeenCalled();
  });
});
