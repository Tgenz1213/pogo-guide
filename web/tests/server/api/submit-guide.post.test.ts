import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event, EventHandler } from "h3";

interface ZodValidationErrorData {
  statusCode: number;
  statusMessage: string;
  data: Record<string, unknown>;
}

interface TurnstileRuntimeConfig {
  e2eMode?: boolean;
  turnstileSiteKey?: string;
  turnstileSecretKey?: string;
}

describe("Submit Guide API (Producer)", () => {
  let submitGuideHandler: EventHandler;
  let mockQueueSend: ReturnType<typeof vi.fn>;
  let mockVerifyTurnstileToken: ReturnType<typeof vi.fn>;
  let mockGetUserSession: ReturnType<typeof vi.fn>;

  const stubRuntimeConfig = ({
    e2eMode = false,
    turnstileSiteKey = "",
    turnstileSecretKey = "",
  }: TurnstileRuntimeConfig = {}) => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      public: {
        e2eMode,
        turnstileSiteKey,
      },
      turnstile: {
        secretKey: turnstileSecretKey,
      },
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("readBody", async (event: { _body: unknown }) => event._body);
    vi.stubGlobal(
      "createError",
      (err: { statusCode: number; statusMessage: string; data?: unknown }) => {
        const error = new Error(err.statusMessage);
        Object.assign(error, err);
        return error;
      },
    );
    vi.stubGlobal("setResponseStatus", vi.fn());
    vi.stubGlobal(
      "getHeader",
      (
        event: {
          context?: {
            cloudflare?: { req?: { headers?: Map<string, string> } };
          };
        },
        name: string,
      ) => event.context?.cloudflare?.req?.headers?.get(name),
    );

    // By default, Turnstile is unconfigured (no secret/site key), matching
    // local/dev environments — this keeps the pre-existing tests, which
    // don't set up Turnstile at all, passing unaffected.
    stubRuntimeConfig();

    mockVerifyTurnstileToken = vi.fn().mockResolvedValue({ success: true });
    vi.stubGlobal("verifyTurnstileToken", mockVerifyTurnstileToken);

    // By default, requests are authenticated — matches the pre-existing
    // tests, none of which exercise the unauthenticated path.
    mockGetUserSession = vi
      .fn()
      .mockResolvedValue({ user: { id: "discord:12345" } });
    vi.stubGlobal("getUserSession", mockGetUserSession);

    mockQueueSend = vi.fn().mockResolvedValue(undefined);
  });

  beforeEach(async () => {
    submitGuideHandler = (await import("../../../server/api/submit-guide.post"))
      .default as EventHandler;
  });

  const createEvent = (
    body: unknown,
    env: Record<string, unknown> = {},
    isProduction = true,
    withCfRay = true,
    host?: string,
  ) => {
    // Override NODE_ENV for mock tests
    if (isProduction) {
      process.env.NODE_ENV = "production";
    } else {
      process.env.NODE_ENV = "development";
    }

    const headers = new Map<string, string>();
    if (withCfRay) {
      headers.set("cf-ray", "test-cf-ray");
    }
    if (host) {
      headers.set("host", host);
    }

    return {
      _body: body,
      context: {
        cloudflare: {
          env: {
            POGO_QUEUE: {
              send: mockQueueSend,
            },
            ...env,
          },
          req: {
            headers,
          },
        },
      },
    } as unknown as H3Event;
  };

  const validBody = {
    title: "Valid Title",
    htmlContent: "<p>Valid Content with more than 10 characters</p>",
    categoryId: "existing-cat-id",
  };

  it("1. handles validation correctly and rejects invalid payloads", async () => {
    const invalidBody = {
      title: "",
      htmlContent: "too short",
    };

    try {
      await submitGuideHandler(createEvent(invalidBody));
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as ZodValidationErrorData;
      expect(error.statusCode).toBe(400);
      expect(error.data).toBeDefined();
    }
  });

  it("2. generates correct queue envelope and dispatches successfully", async () => {
    const event = createEvent(validBody);
    const result = await submitGuideHandler(event);

    expect(result).toEqual({
      success: true,
      messageId: expect.any(String),
    });

    expect(mockQueueSend).toHaveBeenCalledTimes(1);

    const payload = mockQueueSend.mock.calls[0][0];
    expect(payload).toMatchObject({
      version: 1,
      type: "guide",
      requestId: "test-cf-ray",
      data: validBody,
    });
    expect(payload.messageId).toBeDefined();
    expect(payload.idempotencyKey).toBeDefined();
    expect(payload.submittedAt).toBeDefined();
  });

  it("3. handles missing POGO_QUEUE config by throwing 500 error", async () => {
    const event = createEvent(validBody, { POGO_QUEUE: undefined });

    try {
      await submitGuideHandler(event);
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as { statusCode: number; statusMessage: string };
      expect(error.statusCode).toBe(500);
      expect(error.statusMessage).toBe("Queue configuration missing");
    }
  });

  it("4. enters mock mode successfully in local dev without queue", async () => {
    const event = createEvent(validBody, { POGO_QUEUE: undefined }, false);

    const result = await submitGuideHandler(event);

    expect(result).toEqual({
      success: true,
      mocked: true,
      messageId: expect.any(String),
    });

    expect(mockQueueSend).not.toHaveBeenCalled();
  });

  it("5. throws 500 if queue dispatch rejects", async () => {
    mockQueueSend.mockRejectedValue(new Error("Queue full"));
    const event = createEvent(validBody);

    try {
      await submitGuideHandler(event);
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as { statusCode: number; statusMessage: string };
      expect(error.statusCode).toBe(500);
      expect(error.statusMessage).toBe("Failed to queue guide submission");
    }
  });

  it("6. silently returns success if honeypot is triggered", async () => {
    const honeypotBody = {
      ...validBody,
      websiteAddress: "http://spam.com",
    };

    const event = createEvent(honeypotBody);
    const result = await submitGuideHandler(event);

    expect(result).toEqual({ success: true });
    expect(mockQueueSend).not.toHaveBeenCalled();
  });

  it("7. uses generated requestId when cf-ray header is missing", async () => {
    const event = createEvent(validBody, {}, true, false);
    const result = await submitGuideHandler(event);

    expect(result).toEqual({
      success: true,
      messageId: expect.any(String),
    });

    expect(mockQueueSend).toHaveBeenCalledTimes(1);
    const payload = mockQueueSend.mock.calls[0][0] as {
      requestId?: string;
    };
    expect(payload.requestId).toMatch(/^req-\d+$/);
  });

  it("8. ignores localhost host value when cf-ray header exists", async () => {
    const event = createEvent(validBody, {}, true, true, "127.0.0.1:8788");
    const result = await submitGuideHandler(event);

    expect(result).toEqual({
      success: true,
      messageId: expect.any(String),
    });

    expect(mockQueueSend).toHaveBeenCalledTimes(1);
    const payload = mockQueueSend.mock.calls[0][0] as {
      requestId?: string;
    };
    expect(payload.requestId).toBe("test-cf-ray");
  });

  it("9. rejects submissions without a Turnstile token outside E2E mode", async () => {
    stubRuntimeConfig({
      turnstileSiteKey: "test-site-key",
      turnstileSecretKey: "test-secret-key",
    });

    const event = createEvent(validBody); // isProduction = true by default

    try {
      await submitGuideHandler(event);
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as { statusCode: number; statusMessage: string };
      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toBe(
        "Invalid Turnstile token. Please try again.",
      );
    }

    expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
    expect(mockQueueSend).not.toHaveBeenCalled();
  });

  it("10. allows a valid Turnstile token through to the queue", async () => {
    stubRuntimeConfig({
      turnstileSiteKey: "test-site-key",
      turnstileSecretKey: "test-secret-key",
    });
    mockVerifyTurnstileToken.mockResolvedValue({ success: true });

    const event = createEvent({
      ...validBody,
      turnstileToken: "valid-token",
    });

    const result = await submitGuideHandler(event);

    expect(result).toEqual({
      success: true,
      messageId: expect.any(String),
    });
    expect(mockVerifyTurnstileToken).toHaveBeenCalledWith("valid-token", event);
    expect(mockQueueSend).toHaveBeenCalledTimes(1);
  });

  it("11. rejects submissions when Turnstile verification fails", async () => {
    stubRuntimeConfig({
      turnstileSiteKey: "test-site-key",
      turnstileSecretKey: "test-secret-key",
    });
    mockVerifyTurnstileToken.mockResolvedValue({ success: false });

    const event = createEvent({
      ...validBody,
      turnstileToken: "invalid-token",
    });

    try {
      await submitGuideHandler(event);
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as { statusCode: number; statusMessage: string };
      expect(error.statusCode).toBe(400);
      expect(error.statusMessage).toBe(
        "Invalid Turnstile token. Please try again.",
      );
    }

    expect(mockQueueSend).not.toHaveBeenCalled();
  });

  it("13. rejects submissions with no session and does not touch the queue", async () => {
    mockGetUserSession.mockResolvedValue(null);

    const event = createEvent(validBody);

    try {
      await submitGuideHandler(event);
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as { statusCode: number; message: string };
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Unauthorized");
    }

    expect(mockQueueSend).not.toHaveBeenCalled();
  });

  it("14. rejects submissions with a session lacking a user id and does not touch the queue", async () => {
    mockGetUserSession.mockResolvedValue({ user: {} });

    const event = createEvent(validBody);

    try {
      await submitGuideHandler(event);
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as { statusCode: number; message: string };
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Unauthorized");
    }

    expect(mockQueueSend).not.toHaveBeenCalled();
  });

  it("12. skips Turnstile verification in E2E mode even when configured", async () => {
    stubRuntimeConfig({
      e2eMode: true,
      turnstileSiteKey: "test-site-key",
      turnstileSecretKey: "test-secret-key",
    });

    const event = createEvent(validBody); // no turnstileToken supplied
    const result = await submitGuideHandler(event);

    expect(result).toEqual({
      success: true,
      messageId: expect.any(String),
    });
    expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
    expect(mockQueueSend).toHaveBeenCalledTimes(1);
  });
});
