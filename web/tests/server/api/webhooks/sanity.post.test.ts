import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import * as schema from "../../../../server/db/schema";
import type { H3Event } from "h3";

// See docs/adr/0010-inter-service-endpoint-authentication.md: this webhook must
// verify Sanity's `sanity-webhook-signature` header before touching D1.
const TEST_SECRET = "test-webhook-secret";
const SANITY_DOC_ID = "guide-sanity-webhook-test-doc";

/** Re-implements Sanity's documented HS256 webhook signature scheme, independently
 * of the implementation under test, so the test doesn't just mirror the source. */
async function signPayload(
  rawBody: string,
  timestamp: number,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${timestamp}.${rawBody}`),
  );
  const bytes = Array.from(new Uint8Array(digest));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function stubServerGlobals({
  rawBody,
  signatureHeader,
  secret,
}: {
  rawBody: string | undefined;
  signatureHeader: string | undefined;
  secret: string | undefined;
}) {
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("readRawBody", vi.fn().mockResolvedValue(rawBody));
  vi.stubGlobal(
    "getHeader",
    vi.fn((_event: unknown, name: string) =>
      name === "sanity-webhook-signature" ? signatureHeader : undefined,
    ),
  );
  vi.stubGlobal(
    "useRuntimeConfig",
    vi.fn(() => ({ sanityWebhookSecret: secret })),
  );
  vi.stubGlobal(
    "createError",
    vi.fn((data: { statusCode: number; statusMessage: string }) => {
      const err = new Error(data.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = data.statusCode;
      return err;
    }),
  );
}

function createEvent(): H3Event {
  return {
    context: {
      cloudflare: {
        env: { DB: env.DB },
      },
    },
  } as unknown as H3Event;
}

async function getStatus(): Promise<string> {
  const db = drizzle(env.DB, { schema });
  const rows = await db.select().from(schema.guideSubmissions);
  return rows[0]!.status;
}

describe("POST /api/webhooks/sanity", () => {
  beforeEach(async () => {
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS guide_submissions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT, sanity_doc_id TEXT NOT NULL, status TEXT DEFAULT 'pending' NOT NULL, created_at INTEGER NOT NULL)",
    );
    const db = drizzle(env.DB, { schema });
    await db.delete(schema.guideSubmissions);
    await db.insert(schema.guideSubmissions).values({
      id: "sub-1",
      sanityDocId: SANITY_DOC_ID,
      status: "pending",
      createdAt: new Date(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("rejects a request with no signature header and does not touch D1", async () => {
    const rawBody = JSON.stringify({
      _type: "guide",
      _id: SANITY_DOC_ID,
      isHiddenByModeration: true,
    });
    stubServerGlobals({
      rawBody,
      signatureHeader: undefined,
      secret: TEST_SECRET,
    });

    const { default: handler } =
      await import("../../../../server/api/webhooks/sanity.post");

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(await getStatus()).toBe("pending");
  });

  it("rejects a request with an invalid signature and does not touch D1", async () => {
    const rawBody = JSON.stringify({
      _type: "guide",
      _id: SANITY_DOC_ID,
      isHiddenByModeration: true,
    });
    const forgedSignature = `t=${Date.now()},v1=not-a-real-signature`;
    stubServerGlobals({
      rawBody,
      signatureHeader: forgedSignature,
      secret: TEST_SECRET,
    });

    const { default: handler } =
      await import("../../../../server/api/webhooks/sanity.post");

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(await getStatus()).toBe("pending");
  });

  it("rejects a validly-formatted signature signed with the wrong secret, without touching D1", async () => {
    const rawBody = JSON.stringify({
      _type: "guide",
      _id: SANITY_DOC_ID,
      isHiddenByModeration: true,
    });
    const timestamp = Date.now();
    const signature = await signPayload(rawBody, timestamp, "wrong-secret");
    stubServerGlobals({
      rawBody,
      signatureHeader: `t=${timestamp},v1=${signature}`,
      secret: TEST_SECRET,
    });

    const { default: handler } =
      await import("../../../../server/api/webhooks/sanity.post");

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(await getStatus()).toBe("pending");
  });

  it("rejects requests when the webhook secret is not configured, without touching D1", async () => {
    const rawBody = JSON.stringify({
      _type: "guide",
      _id: SANITY_DOC_ID,
      isHiddenByModeration: true,
    });
    const timestamp = Date.now();
    const signature = await signPayload(rawBody, timestamp, TEST_SECRET);
    stubServerGlobals({
      rawBody,
      signatureHeader: `t=${timestamp},v1=${signature}`,
      secret: "",
    });

    const { default: handler } =
      await import("../../../../server/api/webhooks/sanity.post");

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(await getStatus()).toBe("pending");
  });

  it("accepts a validly-signed request and syncs isHiddenByModeration=true to status=rejected", async () => {
    const rawBody = JSON.stringify({
      _type: "guide",
      _id: SANITY_DOC_ID,
      isHiddenByModeration: true,
    });
    const timestamp = Date.now();
    const signature = await signPayload(rawBody, timestamp, TEST_SECRET);
    stubServerGlobals({
      rawBody,
      signatureHeader: `t=${timestamp},v1=${signature}`,
      secret: TEST_SECRET,
    });

    const { default: handler } =
      await import("../../../../server/api/webhooks/sanity.post");

    const result = await handler(createEvent());
    expect(result).toEqual({ success: true });
    expect(await getStatus()).toBe("rejected");
  });

  it("accepts a validly-signed request and syncs isHiddenByModeration=false to status=published", async () => {
    const rawBody = JSON.stringify({
      _type: "guide",
      _id: SANITY_DOC_ID,
      isHiddenByModeration: false,
    });
    const timestamp = Date.now();
    const signature = await signPayload(rawBody, timestamp, TEST_SECRET);
    stubServerGlobals({
      rawBody,
      signatureHeader: `t=${timestamp},v1=${signature}`,
      secret: TEST_SECRET,
    });

    const { default: handler } =
      await import("../../../../server/api/webhooks/sanity.post");

    const result = await handler(createEvent());
    expect(result).toEqual({ success: true });
    expect(await getStatus()).toBe("published");
  });

  it("rejects a validly-signed request whose timestamp is outside the replay window, without touching D1", async () => {
    const rawBody = JSON.stringify({
      _type: "guide",
      _id: SANITY_DOC_ID,
      isHiddenByModeration: true,
    });
    const staleTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes old
    const signature = await signPayload(rawBody, staleTimestamp, TEST_SECRET);
    stubServerGlobals({
      rawBody,
      signatureHeader: `t=${staleTimestamp},v1=${signature}`,
      secret: TEST_SECRET,
    });

    const { default: handler } =
      await import("../../../../server/api/webhooks/sanity.post");

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(await getStatus()).toBe("pending");
  });

  it("rejects a signature header that doesn't match the t=/v1= format, without touching D1", async () => {
    const rawBody = JSON.stringify({
      _type: "guide",
      _id: SANITY_DOC_ID,
      isHiddenByModeration: true,
    });
    stubServerGlobals({
      rawBody,
      signatureHeader: "not-the-expected-format",
      secret: TEST_SECRET,
    });

    const { default: handler } =
      await import("../../../../server/api/webhooks/sanity.post");

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(await getStatus()).toBe("pending");
  });

  it("returns 400 and does not touch D1 when the validly-signed body is malformed JSON", async () => {
    const rawBody = "{not valid json";
    const timestamp = Date.now();
    const signature = await signPayload(rawBody, timestamp, TEST_SECRET);
    stubServerGlobals({
      rawBody,
      signatureHeader: `t=${timestamp},v1=${signature}`,
      secret: TEST_SECRET,
    });

    const { default: handler } =
      await import("../../../../server/api/webhooks/sanity.post");

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(await getStatus()).toBe("pending");
  });

  it("returns 400 and does not touch D1 when _id is not a string", async () => {
    const rawBody = JSON.stringify({
      _type: "guide",
      _id: 12345,
      isHiddenByModeration: true,
    });
    const timestamp = Date.now();
    const signature = await signPayload(rawBody, timestamp, TEST_SECRET);
    stubServerGlobals({
      rawBody,
      signatureHeader: `t=${timestamp},v1=${signature}`,
      secret: TEST_SECRET,
    });

    const { default: handler } =
      await import("../../../../server/api/webhooks/sanity.post");

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(await getStatus()).toBe("pending");
  });

  it("returns 400 and does not touch D1 when isHiddenByModeration is not a boolean", async () => {
    const rawBody = JSON.stringify({
      _type: "guide",
      _id: SANITY_DOC_ID,
      isHiddenByModeration: "false",
    });
    const timestamp = Date.now();
    const signature = await signPayload(rawBody, timestamp, TEST_SECRET);
    stubServerGlobals({
      rawBody,
      signatureHeader: `t=${timestamp},v1=${signature}`,
      secret: TEST_SECRET,
    });

    const { default: handler } =
      await import("../../../../server/api/webhooks/sanity.post");

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(await getStatus()).toBe("pending");
  });
});
