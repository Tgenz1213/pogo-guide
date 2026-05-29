import { eq } from "drizzle-orm";
import { users, banned_identities } from "../../db/schema";
import { useDB } from "../../utils/db";
import { sanitizeRedirectPath } from "~~/shared/utils/auth";

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default defineOAuthDiscordEventHandler({
  async onSuccess(event, { user }) {
    try {
      const db = useDB(event);
      const config = useRuntimeConfig(event);
      if (!config.session?.password) {
        throw new Error("Missing NUXT_SESSION_PASSWORD runtime config");
      }

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

      const username =
        user.username ||
        user.global_name ||
        user.email ||
        `discord-user-${String(user.id || "unknown")}`;

      let isAdmin = false;

      if (currentUser.length === 0) {
        const adminEmails = process.env.INITIAL_ADMIN_EMAILS?.split(",") || [];
        const userEmail = user.email;
        isAdmin = !!userEmail && adminEmails.includes(userEmail);

        await db.insert(users).values({
          id: providerAccountId,
          username,
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
          username,
          provider: "discord",
          isAdmin,
        },
      });

      const rawRedirectUrl = getCookie(event, "auth_redirect");
      deleteCookie(event, "auth_redirect", { path: "/" });

      const redirectUrl = sanitizeRedirectPath(rawRedirectUrl);

      return sendRedirect(event, redirectUrl);
    } catch (error) {
      console.error("Discord OAuth post-login failure:", error);
      return sendRedirect(event, "/login?error=oauth_callback_failed");
    }
  },
  onError(event, error) {
    console.error("Discord OAuth Error:", error);
    return sendRedirect(event, "/login?error=oauth_failed");
  },
});
