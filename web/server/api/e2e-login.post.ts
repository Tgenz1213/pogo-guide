import { timingSafeEqualStrings } from "../utils/e2eAuth";

const BEARER_TOKEN_REGEX = /^Bearer\s+(.+)$/;

/**
 * Test-harness-only login for the queue-preview-e2e CI job, which exercises
 * the real deployed preview worker and needs a session cookie to pass
 * submit-guide's auth check. Gated by a private NUXT_E2E_LOGIN_TOKEN secret
 * that is only ever provisioned on the preview worker (never production).
 * Unlike `login.post.ts` (gated by the *public* e2eMode flag for
 * local/Playwright use, and which accepts an arbitrary id/isAdmin body),
 * this route mints a session for one fixed, non-admin identity only, since
 * it's reachable on real deployed infrastructure.
 *
 * Fails closed to a 404 -- not 401/403 -- on any missing/unconfigured/wrong
 * token, so the route's existence isn't discoverable by an unauthenticated
 * prober, matching Nitro's default shape for a genuinely unmatched route.
 */
export default defineEventHandler(async (event) => {
  const { e2eLoginToken } = useRuntimeConfig(event);

  const authHeader = getHeader(event, "authorization") ?? "";
  const match = BEARER_TOKEN_REGEX.exec(authHeader);
  const providedToken = match?.[1];

  if (
    !e2eLoginToken ||
    !providedToken ||
    !timingSafeEqualStrings(providedToken, e2eLoginToken)
  ) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  await setUserSession(event, {
    user: {
      id: "e2e:preview-test",
      username: "Preview E2E Tester",
      provider: "e2e",
      isAdmin: false,
    },
  });

  return { success: true, message: "Logged in via E2E preview token" };
});
