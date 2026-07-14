async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Canonical identity hash for `banned_identities.hashed_identity` /
 * `infractions.identityHash` (docs/adr/0008-gdpr-compliant-bans.md).
 * Every call site that writes or checks these columns must go through this
 * function with the `users.id` composite (`${provider}:${providerAccountId}`)
 * — diverging implementations break ban enforcement silently.
 */
export async function computeIdentityHash(usersId: string): Promise<string> {
  const pepper = process.env.NUXT_HASH_PEPPER || "fallback_pepper";
  return sha256(usersId + pepper);
}
