import { eq } from "drizzle-orm";
import { users, banned_identities } from "../../db/schema";
import { useDB } from "../../utils/db";

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default defineOAuthDiscordEventHandler({
  async onSuccess(event, { user }) {
    const db = useDB(event);

    const providerAccountId = `discord:${user.id}`;
    const pepper = process.env.NUXT_HASH_PEPPER || "fallback_pepper";
    const identityHash = await sha256(providerAccountId + pepper);

    const banned = await db
      .select()
      .from(banned_identities)
      .where(eq(banned_identities.hashed_identity, identityHash));

    if (banned.length > 0) {
      return sendRedirect(event, "/login?error=banned");
    }

    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, providerAccountId));

    let isAdmin = false;

    if (currentUser.length === 0) {
      const adminEmails = process.env.INITIAL_ADMIN_EMAILS?.split(",") || [];
      const userEmail = user.email;
      isAdmin = !!userEmail && adminEmails.includes(userEmail);

      await db.insert(users).values({
        id: providerAccountId,
        username: user.username,
        status: "active",
        createdAt: new Date(),
        isAdmin,
      });
    } else {
      isAdmin = currentUser[0]!.isAdmin;
    }

    await setUserSession(event, {
      user: {
        id: providerAccountId,
        username: user.username,
        provider: "discord",
        isAdmin,
      },
    });

    return sendRedirect(event, "/submit-guide");
  },
  onError(event, error) {
    console.error("Discord OAuth Error:", error);
    return sendRedirect(event, "/login?error=oauth_failed");
  },
});
