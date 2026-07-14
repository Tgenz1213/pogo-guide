import { z } from "zod";
import { requireAdmin } from "../../../utils/admin";

const bodySchema = z.object({
  suggestionId: z.string().min(1),
  action: z.enum(["reviewed", "dismissed"]),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readBody(event);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? "Invalid request body",
    });
  }

  const { suggestionId, action } = parsed.data;

  const runtimeConfig = useRuntimeConfig();
  const writeToken = runtimeConfig.sanityWriteToken;
  const projectId = runtimeConfig.public.sanity?.projectId;
  const dataset = runtimeConfig.public.sanity?.dataset || "production";

  // Stub Mode to prevent API limit exhaustion on routine PR pipelines when no write token is provided
  const isMockMode = !writeToken && process.env.NODE_ENV !== "production";
  if (isMockMode) {
    return { success: true, mocked: true };
  }

  if (!projectId || !writeToken) {
    throw createError({
      statusCode: 500,
      message: "Sanity write token or project ID is missing",
    });
  }

  const mutationUrl = `https://${projectId}.api.sanity.io/v2024-03-01/data/mutate/${dataset}`;
  const mutationPayload = {
    mutations: [
      {
        patch: {
          id: suggestionId,
          set: {
            status: action,
          },
        },
      },
    ],
  };

  try {
    await $fetch(mutationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${writeToken}`,
      },
      body: mutationPayload,
    });
    return { success: true };
  } catch (err) {
    console.error("Sanity Mutation Error:", err);
    throw createError({
      statusCode: 500,
      message: "Failed to update suggestion",
    });
  }
});
