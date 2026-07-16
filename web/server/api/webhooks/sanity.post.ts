import { useDB } from "../../utils/db";
import { guideSubmissions } from "../../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  SANITY_WEBHOOK_SIGNATURE_HEADER,
  verifySanityWebhookSignature,
} from "../../utils/sanity-webhook";

const sanityWebhookPayloadSchema = z.object({
  _type: z.string().optional(),
  _id: z.string().optional(),
  isHiddenByModeration: z.boolean().optional(),
});

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

  let parsedBody: unknown;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Malformed webhook payload",
    });
  }

  const validation = sanityWebhookPayloadSchema.safeParse(parsedBody);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      data: validation.error.format(),
    });
  }
  const body = validation.data;

  if (body._type === "guide" && body._id) {
    const db = useDB(event);

    // Determine D1 status based on Sanity state
    const newStatus = body.isHiddenByModeration ? "rejected" : "published";

    await db
      .update(guideSubmissions)
      .set({ status: newStatus })
      .where(eq(guideSubmissions.sanityDocId, body._id));
  }

  return { success: true };
});
