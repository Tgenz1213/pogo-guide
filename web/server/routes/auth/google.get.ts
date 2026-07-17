import { eq } from "drizzle-orm";
import { users, bannedIdentities } from "../../db/schema";
import { useDB } from "../../utils/db";
import {
  isEmailAdmin,
  isSuperAdminId,
  enforceSuperAdmin,
  reconcileBootstrapAdmin,
} from "../../utils/admin";
import { sanitizeRedirectPath } from "../../../shared/utils/auth";
import { computeIdentityHash } from "../../utils/identity-hash";

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    try {
      const db = useDB(event);
      const config = useRuntimeConfig(event);
      if (!config.session?.password) {
        throw new Error("Missing NUXT_SESSION_PASSWORD runtime config");
      }

      // Google provides 'sub' for the unique identifier
      const providerAccountId = `google:${user.sub || user.id}`;
      const identityHash = await computeIdentityHash(providerAccountId);

      const banned = await db
        .select()
        .from(bannedIdentities)
        .where(eq(bannedIdentities.hashedIdentity, identityHash));

      if (banned.length > 0) {
        return sendRedirect(event, "/login?error=banned");
      }

      const currentUser = await db
        .select()
        .from(users)
        .where(eq(users.id, providerAccountId));

      const username =
        user.name ||
        user.email ||
        `google-user-${String(user.sub || user.id || "unknown")}`;

      const email = user.email || "";
      const isOnAllowlist = isEmailAdmin(email);
      let isAdmin: boolean;

      if (currentUser.length === 0) {
        const isSuperAdmin = isSuperAdminId(providerAccountId);
        isAdmin = isSuperAdmin || isOnAllowlist;
        await db.insert(users).values({
          id: providerAccountId,
          username,
          status: "active",
          createdAt: new Date(),
          isAdmin,
          adminGrantedVia: isSuperAdmin
            ? "super_admin"
            : isOnAllowlist
              ? "bootstrap"
              : null,
        });
      } else {
        const existing = currentUser[0]!;
        const existingState = {
          isAdmin: existing.isAdmin,
          adminGrantedVia: existing.adminGrantedVia,
        };

        const isSuperAdmin = await enforceSuperAdmin(
          db,
          providerAccountId,
          existingState,
        );

        isAdmin = isSuperAdmin
          ? true
          : await reconcileBootstrapAdmin(
              db,
              providerAccountId,
              existingState,
              isOnAllowlist,
            );
      }

      await setUserSession(event, {
        user: {
          id: providerAccountId,
          username,
          provider: "google",
          isAdmin,
        },
      });

      const rawRedirectUrl = getCookie(event, "auth_redirect");
      deleteCookie(event, "auth_redirect", { path: "/" });

      const redirectUrl = sanitizeRedirectPath(rawRedirectUrl);

      return sendRedirect(event, redirectUrl);
    } catch (error) {
      console.error("Google OAuth post-login failure:", error);
      return sendRedirect(event, "/login?error=oauth_callback_failed");
    }
  },
  onError(event, error) {
    console.error("Google OAuth Error:", error);
    return sendRedirect(event, "/login?error=oauth_failed");
  },
});
