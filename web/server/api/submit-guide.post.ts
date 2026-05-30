import {
  submitGuideSchema,
  generateGuideIdempotencyKey,
} from "@pogo/shared-utils";

interface CloudflareEnv {
  POGO_QUEUE?: {
    send: (msg: unknown) => Promise<void>;
  };
}

interface LocalMirrorResult {
  ok: boolean;
  status?: number;
  body?: string;
  error?: unknown;
}

async function mirrorToLocalConsumer(
  payload: unknown,
): Promise<LocalMirrorResult> {
  const endpoint =
    process.env.LOCAL_QUEUE_CONSUMER_URL ||
    "http://127.0.0.1:8787/__debug/process";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        status: response.status,
        body: text,
      };
    }

    return {
      ok: true,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      error,
    };
  }
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

  const env = (event.context.cloudflare?.env || {}) as CloudflareEnv;
  const { POGO_QUEUE } = env;
  const isMockMode = process.env.NODE_ENV !== "production" && !POGO_QUEUE;

  const cfRay = getHeader(event, "cf-ray");
  const host = getHeader(event, "host") || "";
  const isLocalHost = /^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/.test(host);
  const requestId = cfRay || `req-${Date.now()}`;
  const isLocalRuntime = !cfRay || isLocalHost;
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

    // In local development, mirror dispatch to the consumer worker over HTTP.
    // This keeps the full processing logic testable even when local Queue
    // delivery between two wrangler dev processes is not active.
    if (isLocalRuntime) {
      const mirrorResult = await mirrorToLocalConsumer(payload);

      if (!mirrorResult.ok) {
        const details =
          mirrorResult.body || String(mirrorResult.error || "Unknown error");
        console.error("[pogo-guide] Local consumer mirror failed:", details);

        throw createError({
          statusCode: 500,
          statusMessage: "Local queue consumer failed to process submission",
          data: {
            mirrorStatus: mirrorResult.status,
            details,
          },
        });
      }
    }

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
