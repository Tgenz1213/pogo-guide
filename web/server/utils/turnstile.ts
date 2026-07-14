import type { H3Event } from "h3";

/**
 * Verifies a Turnstile token for a public content-submission endpoint
 * (submit-guide, submit-suggestion), per docs/adr/0011-rate-limiting-bot-protection.md.
 *
 * Verification (and the misconfiguration guard) is skipped when
 * `NUXT_PUBLIC_E2E_MODE=true`, matching the sanctioned E2E bypass. It is also
 * only enforced in production and only when both the server secret and the
 * public site key are configured, so local/dev environments without
 * Turnstile credentials keep working.
 *
 * Throws (via `createError`) on misconfiguration or a missing/invalid token;
 * resolves silently when verification passes or is skipped.
 */
export async function verifySubmissionTurnstile(
  event: H3Event,
  turnstileToken: string | undefined,
): Promise<void> {
  const runtimeConfig = useRuntimeConfig();
  const isE2eMode = runtimeConfig.public.e2eMode;
  const hasTurnstileSecret = Boolean(runtimeConfig.turnstile?.secretKey);
  const hasTurnstileSiteKey = Boolean(runtimeConfig.public.turnstileSiteKey);
  const isProduction = process.env.NODE_ENV === "production";

  if (
    !isE2eMode &&
    isProduction &&
    hasTurnstileSecret !== hasTurnstileSiteKey
  ) {
    throw createError({
      statusCode: 500,
      statusMessage: "Turnstile is misconfigured on the server.",
    });
  }

  const shouldVerifyTurnstile =
    !isE2eMode && isProduction && hasTurnstileSecret && hasTurnstileSiteKey;

  if (!shouldVerifyTurnstile) {
    return;
  }

  if (!turnstileToken) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Turnstile token. Please try again.",
    });
  }

  const turnstileValidation = await verifyTurnstileToken(turnstileToken, event);
  if (!turnstileValidation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Turnstile token. Please try again.",
      data: {
        turnstile: turnstileValidation,
      },
    });
  }
}
