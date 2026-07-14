/**
 * Constant-time string equality check.
 *
 * A naive `a === b` (or a byte-by-byte loop that returns as soon as it finds
 * a mismatch, or short-circuits on length) leaks timing information that can
 * be used to guess a secret one character at a time. Comparing two
 * fixed-length SHA-256 digests instead of the raw strings avoids both the
 * length side-channel (digests are always the same size) and the
 * early-exit side-channel (the XOR-accumulate loop below never branches on
 * the comparison result).
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);

  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);

  if (bytesA.length !== bytesB.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }

  return diff === 0;
}
