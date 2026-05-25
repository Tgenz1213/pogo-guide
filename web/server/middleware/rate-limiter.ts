export default defineEventHandler(async (event) => {
  const path = event.path;

  // Only apply rate limiting to these specific routes
  if (
    !path.startsWith("/api/submit-suggestion") &&
    !path.startsWith("/api/submit-guide")
  ) {
    return;
  }

  // Access the KV namespace via optional chaining for local dev compatibility
  const kv = event.context.cloudflare?.env?.POGO_RATE_LIMIT;

  if (!kv) {
    console.warn(
      "Rate limiter KV namespace POGO_RATE_LIMIT is not available. Bypassing rate limit.",
    );
    return;
  }

  const ip =
    getRequestHeader(event, "cf-connecting-ip") ||
    getRequestHeader(event, "x-forwarded-for") ||
    "unknown";

  if (ip === "unknown") {
    return;
  }

  const kvKey = `rate_limit:${ip}`;

  try {
    const rawData = await kv.get(kvKey);
    let timestamps: number[] = [];

    if (rawData) {
      try {
        timestamps = JSON.parse(rawData);
      } catch {
        timestamps = [];
      }
    }

    const now = Date.now();
    const windowStart = now - 60 * 1000;

    // Keep only timestamps within the last 60 seconds
    timestamps = timestamps.filter((ts) => ts > windowStart);

    if (timestamps.length >= 3) {
      throw createError({
        statusCode: 429,
        statusMessage: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
      });
    }

    timestamps.push(now);

    // Save back to KV, using expirationTtl to auto-clean records after 65 seconds
    await kv.put(kvKey, JSON.stringify(timestamps), { expirationTtl: 65 });
  } catch (error: unknown) {
    // Re-throw our 429 error so Nitro returns it
    if (
      error !== null &&
      typeof error === "object" &&
      "statusCode" in error &&
      (error as Record<string, unknown>).statusCode === 429
    ) {
      throw error;
    }
    // Fail open for actual KV errors
    console.error("Rate limiting KV operation failed:", error);
  }
});
