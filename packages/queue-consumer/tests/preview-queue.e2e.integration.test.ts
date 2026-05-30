import { describe, it, expect } from "vitest";
import {
  generateGuideIdempotencyKey,
  type SubmitGuidePayload,
} from "@pogo/shared-utils";

interface SanityBlockChild {
  text?: string;
}

interface SanityBlock {
  children?: SanityBlockChild[];
}

interface PersistedGuide {
  _id: string;
  content?: SanityBlock[];
}

const runtimeEnv =
  (
    globalThis as unknown as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env ?? {};

const previewBaseUrl = runtimeEnv.PREVIEW_WEB_BASE_URL || "";
const projectId = runtimeEnv.SANITY_PROJECT_ID || "";
const writeToken = runtimeEnv.SANITY_WRITE_TOKEN || "";
const dataset = runtimeEnv.SANITY_DATASET || "preview";

const hasQueueE2eEnv = Boolean(previewBaseUrl && projectId && writeToken);
const sanityApiVersion = "2023-08-01";
const fetchTimeoutMs = 20000;

const sanitizeLine = (value: string) => value.replace(/\s+/g, " ").trim();

const flattenPortableText = (content: SanityBlock[] | undefined): string => {
  if (!content || content.length === 0) {
    return "";
  }

  return content
    .map((block) =>
      sanitizeLine(
        (block.children ?? []).map((child) => child.text ?? "").join(""),
      ),
    )
    .filter(Boolean)
    .join("\n");
};

async function sanityFetch<T>(
  query: string,
  params?: Record<string, string>,
): Promise<T | null> {
  const url = new URL(
    `https://${projectId}.api.sanity.io/v${sanityApiVersion}/data/query/${dataset}`,
  );
  url.searchParams.set("query", query);

  if (params && Object.keys(params).length > 0) {
    url.searchParams.set("$", JSON.stringify(params));
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      Authorization: `Bearer ${writeToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Sanity query failed (${response.status})`);
  }

  const json = (await response.json()) as { result?: T | null };
  return (json.result ?? null) as T | null;
}

async function sanityDeleteById(id: string): Promise<void> {
  const response = await fetch(
    `https://${projectId}.api.sanity.io/v${sanityApiVersion}/data/mutate/${dataset}`,
    {
      signal: AbortSignal.timeout(fetchTimeoutMs),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${writeToken}`,
      },
      body: JSON.stringify({ mutations: [{ delete: { id } }] }),
    },
  );

  if (!response.ok) {
    throw new Error(`Sanity delete failed (${response.status})`);
  }
}

async function waitForGuideById(id: string): Promise<PersistedGuide> {
  const query = "*[_id == $id][0]{_id, content[]{children[]{text}}}";

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const guide = await sanityFetch<PersistedGuide>(query, { id });
    if (guide?._id) {
      return guide;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    "Timed out waiting for queue-consumed guide in preview Sanity",
  );
}

describe.skipIf(!hasQueueE2eEnv)(
  "Preview queue E2E: producer to consumer",
  () => {
    it("submits through preview web API and preserves normalized content", async () => {
      const runId = globalThis.crypto.randomUUID().slice(0, 8);
      const suggestedCategory = `Queue E2E Category ${runId}`;

      const payload: SubmitGuidePayload = {
        title: `Queue E2E Guide ${runId}`,
        description: "Queue E2E content fidelity assertion",
        suggestedCategory,
        htmlContent: [
          "<h2>Search String 101</h2>",
          "<p>The search bar in your Pokemon storage can filter your entire collection.</p>",
          "<ul>",
          "<li><strong>AND</strong>: shiny &amp; 4*</li>",
          "<li><strong>OR</strong>: fire,water</li>",
          "<li><strong>NOT</strong>: !legendary</li>",
          "</ul>",
          '<p>For complete lists, check <a href="https://example.com">official docs</a>.</p>',
        ].join(""),
      };

      const idempotencyKey = await generateGuideIdempotencyKey(payload);
      const guideId = `guide-${idempotencyKey}`;
      const categoryId = `category-suggested-queue-e2e-category-${runId}`;

      const expectedText = [
        "Search String 101",
        "The search bar in your Pokemon storage can filter your entire collection.",
        "AND: shiny & 4*",
        "OR: fire,water",
        "NOT: !legendary",
        "For complete lists, check official docs.",
      ].join("\n");

      try {
        const submitResponse = await fetch(
          new URL("/api/submit-guide", previewBaseUrl),
          {
            signal: AbortSignal.timeout(fetchTimeoutMs),
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        expect(submitResponse.status).toBe(202);

        const savedGuide = await waitForGuideById(guideId);
        const persistedText = flattenPortableText(savedGuide.content);
        expect(persistedText).toBe(expectedText);
      } finally {
        const cleanupResults = await Promise.allSettled([
          sanityDeleteById(guideId),
          sanityDeleteById(categoryId),
        ]);

        const cleanupFailures = cleanupResults.filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        );

        if (cleanupFailures.length > 0) {
          console.warn(
            `[queue-e2e] cleanup encountered ${cleanupFailures.length} non-fatal error(s): ${cleanupFailures
              .map((failure) => String(failure.reason))
              .join(" | ")}`,
          );
        }
      }
    });
  },
);
