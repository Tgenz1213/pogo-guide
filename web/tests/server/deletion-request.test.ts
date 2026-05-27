import { describe, it, expect, vi, afterEach } from "vitest";

describe("POST /api/user/deletion-request", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("getUserSession", vi.fn().mockResolvedValue(null));
    vi.stubGlobal(
      "createError",
      vi.fn((data: { statusCode: number; message: string }) => {
        const err = new Error(data.message) as Error & {
          statusCode: number;
        };
        err.statusCode = data.statusCode;
        return err;
      }),
    );

    const { default: handler } =
      await import("../../server/api/user/deletion-request.post");

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 401,
      message: "Unauthorized",
    });
  });
});
