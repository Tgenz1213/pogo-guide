import { z } from "zod";
import sanitizeHtml from "sanitize-html";

interface PortableTextMarkDef {
  _key: string;
  _type: "link";
  href: string;
}

interface PortableTextSpan {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
}

interface PortableTextBlock {
  _type: "block";
  _key: string;
  style: "normal" | "h2" | "h3";
  listItem?: "bullet" | "number";
  level?: number;
  markDefs: PortableTextMarkDef[];
  children: PortableTextSpan[];
}

const createPortableTextKey = () =>
  crypto.randomUUID().replace(/-/g, "").slice(0, 12);

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ");

const stripTags = (value: string) =>
  decodeHtmlEntities(value.replace(/<[^>]+>/g, ""));

const splitTopLevelBlocks = (cleanHtml: string) => {
  const blockPattern = /<(p|h2|h3|ul|ol)\b[^>]*>[\s\S]*?<\/\1>|<br\s*\/?\s*>/gi;
  const matches = cleanHtml.match(blockPattern);

  if (!matches) {
    return cleanHtml.trim() ? ["<p>" + cleanHtml + "</p>"] : [];
  }

  return matches;
};

const createSpan = (text: string, marks: string[] = []): PortableTextSpan => ({
  _type: "span",
  _key: createPortableTextKey(),
  text,
  marks,
});

const parseInlineSegments = (
  html: string,
): { children: PortableTextSpan[]; markDefs: PortableTextMarkDef[] } => {
  const children: PortableTextSpan[] = [];
  const markDefs: PortableTextMarkDef[] = [];

  const appendText = (text: string, marks: string[] = []) => {
    const normalized = normalizeWhitespace(decodeHtmlEntities(text));
    if (!normalized.trim()) {
      return;
    }

    children.push(createSpan(normalized, marks));
  };

  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let lastIndex = 0;
  let linkMatch: RegExpExecArray | null;

  while ((linkMatch = linkPattern.exec(html)) !== null) {
    appendFormattedText(html.slice(lastIndex, linkMatch.index), appendText);

    const href = decodeHtmlEntities(linkMatch[1] ?? "");
    const markKey = createPortableTextKey();
    markDefs.push({
      _key: markKey,
      _type: "link",
      href,
    });
    appendFormattedText(linkMatch[2] ?? "", appendText, [markKey]);
    lastIndex = linkMatch.index + linkMatch[0].length;
  }

  appendFormattedText(html.slice(lastIndex), appendText);

  if (children.length === 0) {
    const fallbackText = stripTags(html).trim();
    if (fallbackText) {
      children.push(createSpan(fallbackText));
    }
  }

  return { children, markDefs };
};

const appendFormattedText = (
  html: string,
  appendText: (text: string, marks?: string[]) => void,
  extraMarks: string[] = [],
) => {
  const normalizedHtml = html.replace(/<br\s*\/?\s*>/gi, "\n");
  const tokenPattern =
    /<(strong|b)>([\s\S]*?)<\/\1>|<(em|i)>([\s\S]*?)<\/\3>|\n+|[^<\n]+/gi;

  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = tokenPattern.exec(normalizedHtml)) !== null) {
    if (tokenMatch[0].startsWith("<strong") || tokenMatch[0].startsWith("<b")) {
      appendText(stripTags(tokenMatch[2] ?? ""), [...extraMarks, "strong"]);
      continue;
    }

    if (tokenMatch[0].startsWith("<em") || tokenMatch[0].startsWith("<i")) {
      appendText(stripTags(tokenMatch[4] ?? ""), [...extraMarks, "em"]);
      continue;
    }

    if (tokenMatch[0].includes("\n")) {
      appendText(" ", extraMarks);
      continue;
    }

    appendText(tokenMatch[0], extraMarks);
  }
};

const createBlock = (
  innerHtml: string,
  style: PortableTextBlock["style"] = "normal",
  options?: Pick<PortableTextBlock, "listItem" | "level">,
): PortableTextBlock | null => {
  const { children, markDefs } = parseInlineSegments(innerHtml);
  if (children.length === 0) {
    return null;
  }

  return {
    _type: "block",
    _key: createPortableTextKey(),
    style,
    markDefs,
    children,
    ...(options?.listItem ? { listItem: options.listItem } : {}),
    ...(options?.level ? { level: options.level } : {}),
  };
};

const htmlToPortableTextBlocks = (cleanHtml: string): PortableTextBlock[] => {
  const blocks: PortableTextBlock[] = [];

  for (const blockHtml of splitTopLevelBlocks(cleanHtml)) {
    if (/^<br\s*\/?\s*>$/i.test(blockHtml)) {
      continue;
    }

    const paragraphMatch = blockHtml.match(/^<p\b[^>]*>([\s\S]*?)<\/p>$/i);
    if (paragraphMatch) {
      const block = createBlock(paragraphMatch[1] ?? "", "normal");
      if (block) {
        blocks.push(block);
      }
      continue;
    }

    const h2Match = blockHtml.match(/^<h2\b[^>]*>([\s\S]*?)<\/h2>$/i);
    if (h2Match) {
      const block = createBlock(h2Match[1] ?? "", "h2");
      if (block) {
        blocks.push(block);
      }
      continue;
    }

    const h3Match = blockHtml.match(/^<h3\b[^>]*>([\s\S]*?)<\/h3>$/i);
    if (h3Match) {
      const block = createBlock(h3Match[1] ?? "", "h3");
      if (block) {
        blocks.push(block);
      }
      continue;
    }

    const listMatch = blockHtml.match(/^<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>$/i);
    if (listMatch) {
      const listType =
        (listMatch[1] ?? "").toLowerCase() === "ul" ? "bullet" : "number";
      const itemPattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      const listContent = listMatch[2] ?? "";
      let itemMatch: RegExpExecArray | null;

      while ((itemMatch = itemPattern.exec(listContent)) !== null) {
        const block = createBlock(itemMatch[1] ?? "", "normal", {
          listItem: listType,
          level: 1,
        });
        if (block) {
          blocks.push(block);
        }
      }
      continue;
    }

    const fallbackBlock = createBlock(blockHtml, "normal");
    if (fallbackBlock) {
      blocks.push(fallbackBlock);
    }
  }

  return blocks;
};

const submitGuideSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().max(200).optional(),
  categoryId: z.string().optional(),
  suggestedCategory: z.string().max(50).optional(),
  tagIds: z.array(z.string()).optional(),
  suggestedTags: z.array(z.string().max(30)).optional(),
  htmlContent: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(50000),
  websiteAddress: z.string().optional(), // Honeypot
  turnstileToken: z.string().optional().default(""),
});

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
