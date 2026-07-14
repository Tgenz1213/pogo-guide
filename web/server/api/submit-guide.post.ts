import {
  submitGuideSchema,
  generateGuideIdempotencyKey,
} from "@pogo/shared-utils";
import { verifySubmissionTurnstile } from "../utils/turnstile";

interface CloudflareEnv {
  POGO_QUEUE?: {
    send: (msg: unknown) => Promise<void>;
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const validation = submitGuideSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      data: validation.error.format(),
    });
  }

  const data = validation.data;

  // 1. Honeypot check
  if (data.websiteAddress && data.websiteAddress.trim() !== "") {
    console.warn("Honeypot triggered, ignoring request.");
    return { success: true };
  }

  // 2. Turnstile Verification
  await verifySubmissionTurnstile(event, data.turnstileToken);

  const env = (event.context.cloudflare?.env || {}) as CloudflareEnv;
  const { POGO_QUEUE } = env;
  const isMockMode = process.env.NODE_ENV !== "production" && !POGO_QUEUE;

  const cfRay = getHeader(event, "cf-ray");
  const requestId = cfRay || `req-${Date.now()}`;
  const messageId = globalThis.crypto.randomUUID();
  const idempotencyKey = await generateGuideIdempotencyKey(data);

  const payload = {
    version: 1,
    type: "guide",
    messageId,
    idempotencyKey,
    submittedAt: new Date().toISOString(),
    requestId,
    data,
  };

  if (isMockMode) {
    console.warn(
      "[pogo-guide] POGO_QUEUE binding not found in event context. Triggering mock mode for local dev.",
    );
    return {
      success: true,
      mocked: true,
      messageId,
    };
  }

  if (!POGO_QUEUE) {
    throw createError({
      statusCode: 500,
      statusMessage: "Queue configuration missing",
    });
  }

  try {
    await POGO_QUEUE.send(payload);

    setResponseStatus(event, 202);
    return { success: true, messageId };
  } catch (error) {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      throw error;
    }

    console.error("Queue Dispatch Error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to queue guide submission",
    });
  }
});
