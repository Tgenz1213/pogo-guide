import { useDB } from "../../utils/db";
import { guideSubmissions } from "../../db/schema";
import { eq } from "drizzle-orm";
import {
  SANITY_WEBHOOK_SIGNATURE_HEADER,
  verifySanityWebhookSignature,
} from "../../utils/sanityWebhook";

export default defineEventHandler(async (event) => {
  // Security-critical ordering: verify the signature over the raw body
  // *before* any parsing or D1 access. See
  // docs/adr/0010-inter-service-endpoint-authentication.md -- this endpoint
  // must fail closed (401, no side effects) on missing/invalid signatures
  // or an unconfigured secret.
  const rawBody = await readRawBody(event);
  const signatureHeader = getHeader(event, SANITY_WEBHOOK_SIGNATURE_HEADER);
  const { sanityWebhookSecret } = useRuntimeConfig(event);

  const isValidSignature = await verifySanityWebhookSignature(
    rawBody,
    signatureHeader,
    sanityWebhookSecret,
  );

  if (!isValidSignature) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid or missing webhook signature",
    });
  }

  let body: { _type?: unknown; _id?: unknown; isHiddenByModeration?: unknown };
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    body = {};
  }

  if (body?._type === "guide" && body._id) {
    const db = useDB(event);

    // Determine D1 status based on Sanity state
    const newStatus = body.isHiddenByModeration ? "rejected" : "published";

    await db
      .update(guideSubmissions)
      .set({ status: newStatus })
      .where(eq(guideSubmissions.sanityDocId, body._id as string));
  }

  return { success: true };
});
