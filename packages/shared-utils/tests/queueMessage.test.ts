import { describe, it, expect } from "vitest";
import { queueMessageSchema } from "../src/queueMessage";

describe("Queue Message Schema", () => {
  it("accepts valid guide envelopes", () => {
    const payload = {
      version: 1,
      type: "guide",
      messageId: "123e4567-e89b-12d3-a456-426614174000",
      idempotencyKey: "abc123hash",
      submittedAt: new Date().toISOString(),
      requestId: "req-123",
      data: {
        title: "Valid Guide",
        htmlContent: "Valid Content with more than 10 characters",
        suggestedCategory: "New Category",
      },
    };

    const result = queueMessageSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects unsupported versions", () => {
    const payload = {
      version: 2, // Unsupported
      type: "guide",
      messageId: "123e4567-e89b-12d3-a456-426614174000",
      idempotencyKey: "abc123hash",
      submittedAt: new Date().toISOString(),
      requestId: "req-123",
      data: {
        title: "Valid Guide",
        htmlContent: "Valid Content with more than 10 characters",
        suggestedCategory: "New Category",
      },
    };

    const result = queueMessageSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for messageId", () => {
    const payload = {
      version: 1,
      type: "guide",
      messageId: "not-a-uuid",
      idempotencyKey: "abc123hash",
      submittedAt: new Date().toISOString(),
      requestId: "req-123",
      data: {
        title: "Valid Guide",
        htmlContent: "Valid Content with more than 10 characters",
        suggestedCategory: "New Category",
      },
    };

    const result = queueMessageSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
