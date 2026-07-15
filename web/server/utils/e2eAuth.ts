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
 * Constant-time string comparison that never short-circuits on length
 * mismatch. `crypto.subtle.timingSafeEqual` throws on unequal-length inputs
 * and is unsafe to guard with an early return, since that would leak the
 * secret's length through timing -- see
 * https://developers.cloudflare.com/workers/examples/protect-against-timing-attacks/
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  const subtle = crypto.subtle as WorkersSubtleCrypto;

  if (aBytes.byteLength === bBytes.byteLength) {
    return subtle.timingSafeEqual(aBytes, bBytes);
  }
  return !subtle.timingSafeEqual(aBytes, aBytes);
}
