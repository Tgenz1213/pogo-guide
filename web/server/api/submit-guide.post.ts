import sanitizeHtml from "sanitize-html";
import {
  submitGuideSchema,
  htmlToPortableTextBlocks,
} from "@pogo/shared-utils";

// Use a runtime-agnostic UUID generator to ensure compatibility across Node, Edge, and Cloudflare Workers
async function resolveRuntimeCrypto() {
  if (
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    return globalThis.crypto;
  }

  try {
    const nodeCrypto = await import("node:crypto");

    if (nodeCrypto.webcrypto) {
      return nodeCrypto.webcrypto as Crypto;
    }

    if (typeof nodeCrypto.randomUUID === "function") {
      return {
        randomUUID: nodeCrypto.randomUUID,
        getRandomValues<T extends ArrayBufferView | null>(typedArray: T): T {
          if (!typedArray || !(typedArray instanceof Uint8Array)) {
            throw new Error("Typed array must be a Uint8Array.");
          }

          typedArray.set(nodeCrypto.randomBytes(typedArray.length));
          return typedArray;
        },
      } as unknown as Crypto;
    }
  } catch {
    // Non-Node runtimes without global crypto will fail below with a clear message.
  }

  throw new Error("Secure random generator is unavailable in this runtime.");
}

async function generateId() {
  const runtimeCrypto = await resolveRuntimeCrypto();

  if (typeof runtimeCrypto.getRandomValues !== "function") {
    throw new Error("Secure random generator is unavailable in this runtime.");
  }

  if (typeof runtimeCrypto.randomUUID === "function") {
    return runtimeCrypto.randomUUID();
  }

  // RFC 4122 v4 UUID fallback using cryptographically secure random bytes.
  const bytes = runtimeCrypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

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
  } = validation.data;

  // 1. Honeypot check
  if (websiteAddress && websiteAddress.trim() !== "") {
    console.warn("Honeypot triggered, ignoring request.");
    return { success: true };
  }

  const runtimeConfig = useRuntimeConfig();

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

  // Generate a stable published document ID (no drafts. prefix)
  const guideId = `user-guide-${await generateId()}`;

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
    tags?: { _type: "reference"; _ref: string }[];
  }

  const slugSuffix = (await generateId()).slice(0, 8);

  const guideDoc: GuideDocument = {
    _id: guideId,
    _type: "guide",
    title,
    slug: {
      _type: "slug",
      current:
        (title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "guide").replace(
          /^-+|-+$/g,
          "",
        ) +
        "-" +
        slugSuffix,
    },
    description,
    isUserSubmitted: true,
    content: blocks,
  };

  interface CategoryDocument {
    _id: string;
    _type: "category";
    title: string;
    slug: { _type: "slug"; current: string };
    description: string;
    isUserSubmitted: boolean;
  }

  interface TagDocument {
    _id: string;
    _type: "tag";
    name: string;
    isUserSubmitted: boolean;
  }

  type SanityMutation =
    | { create: GuideDocument }
    | { createIfNotExists: CategoryDocument | TagDocument };

  const mutations: SanityMutation[] = [];

  if (categoryId && categoryId.trim() !== "") {
    guideDoc.category = { _type: "reference", _ref: categoryId.trim() };
  } else if (suggestedCategory && suggestedCategory.trim() !== "") {
    const normalizedSuggestedCategory = suggestedCategory
      .trim()
      .substring(0, 50);
    const categorySlugPrefix = (
      normalizedSuggestedCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
      "category"
    ).replace(/^-+|-+$/g, "");

    const catId = `category-suggested-${categorySlugPrefix}`;
    mutations.push({
      createIfNotExists: {
        _id: catId,
        _type: "category",
        title: normalizedSuggestedCategory,
        slug: {
          _type: "slug",
          current: categorySlugPrefix,
        },
        description: "Category suggested by user during guide submission.",
        isUserSubmitted: true,
      },
    });
    guideDoc.category = { _type: "reference", _ref: catId };
  }

  const seenTagIds = new Set<string>();

  if (tagIds && tagIds.length > 0) {
    const cleanedTagIds = tagIds
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    const uniqueTagIds = Array.from(new Set(cleanedTagIds));
    guideDoc.tags = uniqueTagIds.map((id) => {
      seenTagIds.add(id);
      return {
        _type: "reference",
        _ref: id,
      };
    });
  }

  if (suggestedTags && suggestedTags.length > 0) {
    if (!guideDoc.tags) guideDoc.tags = [];
    const uniqueSuggestedTags = Array.from(
      new Set(suggestedTags.map((t) => t.trim()).filter((t) => t !== "")),
    );

    for (const tagStr of uniqueSuggestedTags) {
      const tagSlugPrefix = (
        tagStr.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "tag"
      ).replace(/^-+|-+$/g, "");

      const tagId = `tag-suggested-${tagSlugPrefix}`;

      if (seenTagIds.has(tagId)) {
        continue;
      }
      seenTagIds.add(tagId);

      mutations.push({
        createIfNotExists: {
          _id: tagId,
          _type: "tag",
          name: tagStr,
          isUserSubmitted: true,
        },
      });
      guideDoc.tags.push({ _type: "reference", _ref: tagId });
    }
  }

  mutations.push({ create: guideDoc });

  const mutationPayload = {
    mutations,
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
