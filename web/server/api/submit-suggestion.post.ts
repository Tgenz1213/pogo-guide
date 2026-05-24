import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";

const suggestionSchema = z.object({
  guidePath: z.string().min(1, "Guide path is required"),
  content: z
    .string()
    .min(10, "Suggestion must be at least 10 characters")
    .max(2000, "Suggestion must not exceed 2000 characters"),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const validation = suggestionSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      data: validation.error.format(),
    });
  }

  const { guidePath, content } = validation.data;

  const runtimeConfig = useRuntimeConfig();
  const writeToken = runtimeConfig.sanityWriteToken;
  const projectId = runtimeConfig.public.sanity?.projectId;
  const dataset = runtimeConfig.public.sanity?.dataset || "production";

  if (!projectId) {
    throw createError({
      statusCode: 500,
      statusMessage: "Sanity Project ID is missing from configuration",
    });
  }

  // Stub Mode to prevent API limit exhaustion on routine PR pipelines when no write token is provided
  const isMockMode =
    runtimeConfig.public.testMode === "mock" ||
    (!writeToken && process.env.NODE_ENV !== "production");
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

  const mutationPayload = {
    mutations: [
      {
        create: {
          _type: "suggestion",
          guidePath,
          content,
          submittedAt: new Date().toISOString(),
        },
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
      statusMessage: "Failed to submit suggestion to database",
    });
  }
});
