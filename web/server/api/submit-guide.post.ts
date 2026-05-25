import sanitizeHtml from "sanitize-html";
import { submitGuideSchema } from "../../shared/utils/validation";
import { htmlToPortableTextBlocks } from "../utils/portableText";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const validation = submitGuideSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      data: validation.error.format(),
    });
  }

  const {
    title,
    description,
    categoryId,
    suggestedCategory,
    tagIds,
    suggestedTags,
    htmlContent,
    websiteAddress,
    turnstileToken,
  } = validation.data;

  // Validate category requirement based on sanity schema rules
  if (!categoryId && (!suggestedCategory || suggestedCategory.trim() === "")) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Either an existing category or a suggested category must be provided.",
    });
  }

  // 1. Honeypot check
  if (websiteAddress && websiteAddress.trim() !== "") {
    console.warn("Honeypot triggered, ignoring request.");
    return { success: true, mocked: true };
  }

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

  // 2. Turnstile Verification
  if (shouldVerifyTurnstile) {
    if (!turnstileToken) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid Turnstile token. Please try again.",
      });
    }

    const turnstileValidation = await verifyTurnstileToken(
      turnstileToken,
      event,
    );
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

  // 3. Rate Limiting (Basic memory-based for duplicate prevention in session, or rely on CF if configured)
  // For now, we will rely on CF rate limits and UI duplicate submission prevention.

  // 4. Content Validation & Sanitization
  const cleanHtml = sanitizeHtml(htmlContent, {
    allowedTags: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "ul",
      "ol",
      "li",
      "p",
      "br",
      "h2",
      "h3",
    ],
    allowedAttributes: {
      a: ["href"],
    },
  });

  // 5. HTML to Portable Text Conversion
  const blocks = htmlToPortableTextBlocks(cleanHtml);
  if (blocks.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Guide content is empty after sanitization.",
    });
  }

  // 6. Save to Sanity
  const writeToken = runtimeConfig.sanityWriteToken;
  const projectId = runtimeConfig.public.sanity?.projectId;
  const dataset = runtimeConfig.public.sanity?.dataset || "production";

  if (!projectId) {
    throw createError({
      statusCode: 500,
      statusMessage: "Sanity Project ID is missing from configuration",
    });
  }

  const isMockMode = !writeToken && process.env.NODE_ENV !== "production";
  if (isMockMode) {
    return {
      success: true,
      mocked: true,
      response: {
        transactionId: `mock-tx-${Date.now()}`,
        results: [{ id: `mock-doc-${Date.now()}`, operation: "create" }],
      },
    };
  }

  if (!writeToken) {
    throw createError({
      statusCode: 502,
      statusMessage: "Sanity Write Token is not configured",
    });
  }

  const mutationUrl = `https://${projectId}.api.sanity.io/v2024-03-01/data/mutate/${dataset}`;

  // Generate a random ID for the draft
  const draftId = `drafts.user-guide-${crypto.randomUUID()}`;

  // Build the guide payload
  interface GuideDocument {
    _id: string;
    _type: string;
    title: string;
    slug: { _type: "slug"; current: string };
    description?: string;
    isUserSubmitted: boolean;
    content: unknown[];
    category?: { _type: "reference"; _ref: string };
    suggestedCategory?: string;
    tags?: { _type: "reference"; _ref: string }[];
    suggestedTags?: string[];
  }

  const guideDoc: GuideDocument = {
    _id: draftId,
    _type: "guide",
    title,
    slug: {
      _type: "slug",
      current:
        title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
    },
    description,
    isUserSubmitted: true,
    content: blocks,
  };

  if (categoryId) {
    guideDoc.category = { _type: "reference", _ref: categoryId };
  }
  if (suggestedCategory && suggestedCategory.trim() !== "") {
    guideDoc.suggestedCategory = suggestedCategory;
  }

  if (tagIds && tagIds.length > 0) {
    guideDoc.tags = tagIds.map((id) => ({ _type: "reference", _ref: id }));
  }
  if (suggestedTags && suggestedTags.length > 0) {
    guideDoc.suggestedTags = suggestedTags;
  }

  const mutationPayload = {
    mutations: [
      {
        create: guideDoc,
      },
    ],
  };

  try {
    const response = await $fetch(mutationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${writeToken}`,
      },
      body: mutationPayload,
    });

    return { success: true, response };
  } catch (error) {
    const err = error as Record<string, unknown>;
    console.error("Sanity Mutation Error:", err.data || err.message || error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to submit guide to database",
    });
  }
});
