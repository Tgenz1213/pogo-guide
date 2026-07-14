async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function resolvePepper(): string {
  const pepper = process.env.NUXT_HASH_PEPPER;
  if (pepper) return pepper;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NUXT_HASH_PEPPER is not set. Refusing to hash identities with a " +
        "publicly-known fallback pepper in production.",
    );
  }

  // Local dev only (NODE_ENV !== "production"): built/deployed Workers
  // (including preview) always run with NODE_ENV=production, so this
  // fallback is never reachable outside `pnpm dev`.
  return "fallback_pepper";
}

/**
 * Canonical identity hash for `banned_identities.hashed_identity` /
 * `infractions.identityHash` (docs/adr/0008-gdpr-compliant-bans.md).
 * Every call site that writes or checks these columns must go through this
 * function with the `users.id` composite (`${provider}:${providerAccountId}`)
 * — diverging implementations break ban enforcement silently.
 */
export async function computeIdentityHash(usersId: string): Promise<string> {
  const pepper = resolvePepper();
  return sha256(usersId + pepper);
}
