import { describe, it, expect } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/sanity";

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

const projectId = runtimeEnv.SANITY_PROJECT_ID || "";
const writeToken = runtimeEnv.SANITY_WRITE_TOKEN || "";
const dataset = runtimeEnv.SANITY_DATASET || "preview";
const hasIntegrationEnv = Boolean(projectId && writeToken);

const sanityApiVersion = "2023-08-01";

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

async function sanityFetch<T>(query: string): Promise<T | null> {
  const url = new URL(
    `https://${projectId}.api.sanity.io/v${sanityApiVersion}/data/query/${dataset}`,
  );
  url.searchParams.set("query", query);

  const response = await fetch(url, {
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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${writeToken}`,
      },
      body: JSON.stringify({ mutations: [{ delete: { id } }] }),
    },
  );

  if (!response.ok) {
    if (response.status === 404 || response.status === 409) {
      return;
    }

    throw new Error(`Sanity delete failed (${response.status})`);
  }
}

async function waitForGuideById(id: string): Promise<PersistedGuide> {
  const query = `*[_id == "${id}"][0]{_id, content[]{children[]{text}}}`;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const guide = await sanityFetch<PersistedGuide>(query);
    if (guide?._id) {
      return guide;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error("Timed out waiting for guide document in Sanity preview");
}

describe.skipIf(!hasIntegrationEnv)(
  "Sanity preview integration: guide content fidelity",
  () => {
    it("submits a guide and preserves normalized plaintext content", async () => {
      const runId = globalThis.crypto.randomUUID().slice(0, 8);
      const idempotencyKey = `integration-${Date.now()}-${runId}`;
      const guideId = `guide-${idempotencyKey}`;
      const suggestedCategory = `Integration Preview Category ${runId}`;
      const categoryId = `category-suggested-integration-preview-category-${runId}`;

      const htmlContent = [
        "<h2>Search String 101</h2>",
        "<p>The search bar in your Pokemon storage can filter your collection instantly.</p>",
        "<ul>",
        "<li><strong>AND</strong>: shiny &amp; 4*</li>",
        "<li><strong>OR</strong>: fire,water</li>",
        "<li><strong>NOT</strong>: !legendary</li>",
        "</ul>",
        '<p>For complete lists, see <a href="https://example.com">official docs</a>.</p>',
      ].join("");

      const expectedText = [
        "Search String 101",
        "The search bar in your Pokemon storage can filter your collection instantly.",
        "AND: shiny & 4*",
        "OR: fire,water",
        "NOT: !legendary",
        "For complete lists, see official docs.",
      ].join("\n");

      const envelope = {
        version: 1,
        type: "guide",
        messageId: globalThis.crypto.randomUUID(),
        idempotencyKey,
        submittedAt: new Date().toISOString(),
        requestId: `integration-${runId}`,
        data: {
          title: `Integration Guide ${runId}`,
          description: "Content fidelity integration test",
          suggestedCategory,
          htmlContent,
        },
      };

      const debugProcessToken = "integration-test-debug-token";
      const env: Env = {
        SANITY_PROJECT_ID: projectId,
        SANITY_DATASET: dataset,
        SANITY_WRITE_TOKEN: writeToken,
        ENVIRONMENT: "preview",
        DEBUG_PROCESS_TOKEN: debugProcessToken,
      };

      try {
        const response = await worker.fetch(
          new Request("https://integration.test/__debug/process", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${debugProcessToken}`,
            },
            body: JSON.stringify(envelope),
          }),
          env,
          {} as never,
        );

        expect(response.status).toBe(200);

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
            `[sanity-preview-integration] cleanup encountered ${cleanupFailures.length} non-fatal error(s): ${cleanupFailures
              .map((failure) => String(failure.reason))
              .join(" | ")}`,
          );
        }
      }
    }, 20000);
  },
);
