/**
 * Verification for Sanity's inbound webhook signature scheme.
 *
 * Per docs/adr/0010-inter-service-endpoint-authentication.md, every inbound
 * webhook must verify a provider-issued signature before performing any
 * mutation and must fail closed when verification fails or the secret is
 * unconfigured.
 *
 * Sanity signs webhook deliveries with the `sanity-webhook-signature` header
 * (https://www.sanity.io/docs/content-lake/webhooks#secret), modeled on
 * Stripe's signature scheme. The header format is `t=<ms-timestamp>,v1=<sig>`
 * where `<sig>` is a base64url-encoded HMAC-SHA256 digest of
 * `${timestamp}.${rawRequestBody}`, keyed with the shared webhook secret.
 * This mirrors the reference implementation in Sanity's own
 * `webhook-toolkit` (https://github.com/sanity-io/webhook-toolkit), which we
 * don't depend on directly since it isn't already a dependency anywhere in
 * this repo.
 */

export const SANITY_WEBHOOK_SIGNATURE_HEADER = "sanity-webhook-signature";

const SIGNATURE_HEADER_REGEX = /^t=(\d+)[, ]+v1=([^, ]+)$/;

// Sanity did not sign webhook payloads before this date; matches the
// minimum accepted by Sanity's own webhook-toolkit implementation.
const MINIMUM_TIMESTAMP_MS = 1609459200000; // 2021-01-01T00:00:00.000Z

// Defense-in-depth against replay of a captured (but validly-signed) request.
// Sanity retries failed deliveries twice with a 30s interval, so 5 minutes
// is generous enough to avoid false rejections from clock skew or retries.
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

function base64UrlToBytes(base64url: string): Uint8Array<ArrayBuffer> | null {
  try {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function computeSignatureBytes(
  rawBody: string,
  timestamp: number,
  secret: string,
): Promise<Uint8Array<ArrayBuffer>> {
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
  return new Uint8Array(digest);
}

/**
 * `crypto.subtle.timingSafeEqual` is a Cloudflare Workers runtime extension
 * (https://developers.cloudflare.com/workers/runtime-apis/web-crypto/) not
 * present in TypeScript's standard `lib.dom` `SubtleCrypto` typings used by
 * Nuxt's typecheck project, so it's declared explicitly here rather than
 * assumed to be merged in globally.
 */
interface WorkersSubtleCrypto extends SubtleCrypto {
  timingSafeEqual(a: BufferSource, b: BufferSource): boolean;
}

/**
 * Constant-time comparison that never short-circuits on length mismatch.
 * `crypto.subtle.timingSafeEqual` throws on unequal-length inputs and is
 * unsafe to guard with an early return, since that would leak the secret's
 * length through timing -- see
 * https://developers.cloudflare.com/workers/examples/protect-against-timing-attacks/
 */
function timingSafeEqualBytes(
  a: Uint8Array<ArrayBuffer>,
  b: Uint8Array<ArrayBuffer>,
): boolean {
  const subtle = crypto.subtle as WorkersSubtleCrypto;
  if (a.byteLength === b.byteLength) {
    return subtle.timingSafeEqual(a, b);
  }
  return !subtle.timingSafeEqual(a, a);
}

/**
 * Verifies a Sanity webhook request per Sanity's documented signature
 * scheme. Never throws -- any malformed/missing input resolves to `false`
 * so callers can fail closed uniformly.
 *
 * `rawBody` must be the exact, unparsed request body string (not a
 * re-serialized JSON object), since re-encoding can change byte-for-byte
 * content and invalidate the signature.
 */
export async function verifySanityWebhookSignature(
  rawBody: string | undefined | null,
  signatureHeader: string | undefined | null,
  secret: string | undefined | null,
  now: number = Date.now(),
): Promise<boolean> {
  if (!secret || !rawBody || !signatureHeader) {
    return false;
  }

  const match = signatureHeader.trim().match(SIGNATURE_HEADER_REGEX);
  if (!match) {
    return false;
  }

  const [, timestampStr, providedSignature] = match;
  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp) || timestamp < MINIMUM_TIMESTAMP_MS) {
    return false;
  }
  if (Math.abs(now - timestamp) > MAX_SIGNATURE_AGE_MS) {
    return false;
  }

  const providedBytes = base64UrlToBytes(providedSignature!);
  if (!providedBytes) {
    return false;
  }

  const expectedBytes = await computeSignatureBytes(rawBody, timestamp, secret);
  return timingSafeEqualBytes(expectedBytes, providedBytes);
}
