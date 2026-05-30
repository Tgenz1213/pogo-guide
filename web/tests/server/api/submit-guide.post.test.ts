import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event, EventHandler } from "h3";

interface ZodValidationErrorData {
  statusCode: number;
  statusMessage: string;
  data: Record<string, unknown>;
}

describe("Submit Guide API (Producer)", () => {
  let submitGuideHandler: EventHandler;
  let mockQueueSend: ReturnType<typeof vi.fn>;

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
});
