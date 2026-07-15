import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event, EventHandler } from "h3";

const VALID_TOKEN = "correct-e2e-login-token";

describe("E2E Login API (preview-only test harness auth)", () => {
  let e2eLoginHandler: EventHandler;
  let mockSetUserSession: ReturnType<typeof vi.fn>;

  const stubRuntimeConfig = (e2eLoginToken = VALID_TOKEN) => {
    vi.stubGlobal("useRuntimeConfig", () => ({ e2eLoginToken }));
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal(
      "createError",
      (err: { statusCode: number; statusMessage: string; data?: unknown }) => {
        const error = new Error(err.statusMessage);
        Object.assign(error, err);
        return error;
      },
    );
    vi.stubGlobal(
      "getHeader",
      (event: { context?: { headers?: Map<string, string> } }, name: string) =>
        event.context?.headers?.get(name.toLowerCase()),
    );

    stubRuntimeConfig();

    mockSetUserSession = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("setUserSession", mockSetUserSession);
  });

  beforeEach(async () => {
    e2eLoginHandler = (await import("../../../server/api/e2e-login.post"))
      .default as EventHandler;
  });

  const createEvent = (authorizationHeader?: string) => {
    const headers = new Map<string, string>();
    if (authorizationHeader !== undefined) {
      headers.set("authorization", authorizationHeader);
    }

    return {
      context: { headers },
    } as unknown as H3Event;
  };

  it("1. rejects with 404 when the secret is unconfigured, even with a matching-looking header", async () => {
    stubRuntimeConfig("");

    try {
      await e2eLoginHandler(createEvent(`Bearer ${VALID_TOKEN}`));
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as { statusCode: number; statusMessage: string };
      expect(error.statusCode).toBe(404);
    }
    expect(mockSetUserSession).not.toHaveBeenCalled();
  });

  it("2. rejects with 404 when the Authorization header is missing", async () => {
    try {
      await e2eLoginHandler(createEvent());
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as { statusCode: number; statusMessage: string };
      expect(error.statusCode).toBe(404);
    }
    expect(mockSetUserSession).not.toHaveBeenCalled();
  });

  it("3. rejects with 404 when the token is wrong", async () => {
    try {
      await e2eLoginHandler(createEvent("Bearer wrong-token"));
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as { statusCode: number; statusMessage: string };
      expect(error.statusCode).toBe(404);
    }
    expect(mockSetUserSession).not.toHaveBeenCalled();
  });

  it("4. rejects with 404 when the header isn't a Bearer token", async () => {
    try {
      await e2eLoginHandler(createEvent(VALID_TOKEN));
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as { statusCode: number; statusMessage: string };
      expect(error.statusCode).toBe(404);
    }
    expect(mockSetUserSession).not.toHaveBeenCalled();
  });

  it("5. mints a fixed, non-admin session and succeeds when the token is correct", async () => {
    const result = await e2eLoginHandler(createEvent(`Bearer ${VALID_TOKEN}`));

    expect(result).toEqual({ success: true, message: expect.any(String) });
    expect(mockSetUserSession).toHaveBeenCalledTimes(1);
    expect(mockSetUserSession).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user: expect.objectContaining({
          id: "e2e:preview-test",
          provider: "e2e",
          isAdmin: false,
        }),
      }),
    );
  });
});
