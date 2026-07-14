import { eq } from "drizzle-orm";
import { users, banned_identities } from "../../db/schema";
import { useDB } from "../../utils/db";
import { isEmailAdmin } from "../../utils/admin";
import { sanitizeRedirectPath } from "../../../shared/utils/auth";
import { computeIdentityHash } from "../../utils/identity-hash";

export default defineOAuthDiscordEventHandler({
  async onSuccess(event, { user }) {
    try {
      const db = useDB(event);
      const config = useRuntimeConfig(event);
      if (!config.session?.password) {
        throw new Error("Missing NUXT_SESSION_PASSWORD runtime config");
      }

      const providerAccountId = `discord:${user.id}`;
      const identityHash = await computeIdentityHash(providerAccountId);

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

      const isInitialAdmin = isEmailAdmin(user.email || "");
      let isAdmin = isInitialAdmin;

      if (currentUser.length === 0) {
        await db.insert(users).values({
          id: providerAccountId,
          username,
          status: "active",
          createdAt: new Date(),
          isAdmin,
        });
      } else {
        isAdmin = currentUser[0]?.isAdmin ?? false;
        if (isInitialAdmin && !isAdmin) {
          isAdmin = true;
          await db
            .update(users)
            .set({ isAdmin: true })
            .where(eq(users.id, providerAccountId));
        }
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
