import { describe, it, expect, vi, afterEach } from "vitest";

// Shared helper to stub the H3/Nuxt server globals used by all handlers
function stubServerGlobals({
  session = null as unknown,
  body = {} as unknown,
} = {}) {
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("getUserSession", vi.fn().mockResolvedValue(session));
  vi.stubGlobal("readBody", vi.fn().mockResolvedValue(body));
  vi.stubGlobal(
    "createError",
    vi.fn((data: { statusCode: number; message: string }) => {
      const err = new Error(data.message) as Error & { statusCode: number };
      err.statusCode = data.statusCode;
      return err;
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// POST /api/guide-reports
// ---------------------------------------------------------------------------
describe("POST /api/guide-reports", () => {
  it("returns 401 when user is not authenticated", async () => {
    stubServerGlobals({ session: null });

    const { default: handler } =
      await import("../../server/api/guide-reports.post");

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 401,
      message: "Unauthorized",
    });
  });

  it("returns 400 when body fails Zod validation", async () => {
    stubServerGlobals({
      session: { user: { id: "user:123" } },
      body: { sanityDocId: "", reason: "invalid-reason" },
    });

    // Stub DB so we don't need a real connection
    vi.doMock("../../server/utils/db", () => ({
      useDB: vi.fn(),
    }));

    const { default: handler } =
      await import("../../server/api/guide-reports.post");

    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 409 when user has already reported this guide", async () => {
    stubServerGlobals({
      session: { user: { id: "user:123" } },
      body: { sanityDocId: "guide-abc", reason: "spam" },
    });

    vi.doMock("../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: "existing-report-id" }]),
      })),
    }));

    const { default: handler } =
      await import("../../server/api/guide-reports.post");

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 409,
      message: "You have already reported this guide.",
    });
  });
});

// ---------------------------------------------------------------------------
// GET /api/guide-reports/[sanityDocId]
// ---------------------------------------------------------------------------
describe("GET /api/guide-reports/[sanityDocId]", () => {
  it("returns 401 when user is not authenticated", async () => {
    stubServerGlobals({ session: null });
    vi.stubGlobal("getRouterParam", vi.fn().mockReturnValue("guide-abc"));

    const { default: handler } =
      await import("../../server/api/guide-reports/[sanityDocId].get");

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 401,
      message: "Unauthorized",
    });
  });

  it("returns 400 when sanityDocId param is missing", async () => {
    stubServerGlobals({ session: { user: { id: "user:123" } } });
    vi.stubGlobal("getRouterParam", vi.fn().mockReturnValue(undefined));

    const { default: handler } =
      await import("../../server/api/guide-reports/[sanityDocId].get");

    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns hasReported: false when no existing report", async () => {
    stubServerGlobals({ session: { user: { id: "user:123" } } });
    vi.stubGlobal("getRouterParam", vi.fn().mockReturnValue("guide-abc"));

    vi.doMock("../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })),
    }));

    const { default: handler } =
      await import("../../server/api/guide-reports/[sanityDocId].get");

    const result = await handler({});
    expect(result).toEqual({ hasReported: false });
  });

  it("returns hasReported: true when report exists", async () => {
    stubServerGlobals({ session: { user: { id: "user:123" } } });
    vi.stubGlobal("getRouterParam", vi.fn().mockReturnValue("guide-abc"));

    vi.doMock("../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: "report-id" }]),
      })),
    }));

    const { default: handler } =
      await import("../../server/api/guide-reports/[sanityDocId].get");

    const result = await handler({});
    expect(result).toEqual({ hasReported: true });
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/reports
// ---------------------------------------------------------------------------
describe("GET /api/admin/reports", () => {
  it("returns 403 when user is not an admin", async () => {
    stubServerGlobals({
      session: { user: { id: "user:123", isAdmin: false } },
    });
    vi.stubGlobal("getQuery", vi.fn().mockReturnValue({}));

    const { default: handler } =
      await import("../../server/api/admin/reports.get");

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 403,
      message: "Forbidden",
    });
  });

  it("returns 403 when session is null", async () => {
    stubServerGlobals({ session: null });
    vi.stubGlobal("getQuery", vi.fn().mockReturnValue({}));

    const { default: handler } =
      await import("../../server/api/admin/reports.get");

    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/reports/action
// ---------------------------------------------------------------------------
describe("POST /api/admin/reports/action", () => {
  it("returns 403 when user is not an admin", async () => {
    stubServerGlobals({
      session: { user: { id: "user:123", isAdmin: false } },
      body: { reportId: "r1", action: "reviewed" },
    });

    const { default: handler } =
      await import("../../server/api/admin/reports/action.post");

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 403,
      message: "Forbidden",
    });
  });

  it("returns 400 when action is invalid", async () => {
    stubServerGlobals({
      session: { user: { id: "user:123", isAdmin: true } },
      body: { reportId: "r1", action: "delete" },
    });

    const { default: handler } =
      await import("../../server/api/admin/reports/action.post");

    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 404 when report does not exist", async () => {
    stubServerGlobals({
      session: { user: { id: "user:123", isAdmin: true } },
      body: { reportId: "nonexistent", action: "dismissed" },
    });

    vi.doMock("../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      })),
    }));

    const { default: handler } =
      await import("../../server/api/admin/reports/action.post");

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 404,
      message: "Report not found",
    });
  });

  it("returns success when valid admin action is performed", async () => {
    stubServerGlobals({
      session: { user: { id: "user:123", isAdmin: true } },
      body: { reportId: "r1", action: "reviewed" },
    });

    vi.doMock("../../server/utils/db", () => ({
      useDB: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: "r1" }]),
      })),
    }));

    const { default: handler } =
      await import("../../server/api/admin/reports/action.post");

    const result = await handler({});
    expect(result).toEqual({ success: true });
  });
});
