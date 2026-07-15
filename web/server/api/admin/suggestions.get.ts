import { requireAdmin } from "../../utils/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const status = (query.status as string) || "all";
  const limit = 20;
  const offset = (page - 1) * limit;

  const runtimeConfig = useRuntimeConfig();
  const projectId = runtimeConfig.public.sanity?.projectId;
  const dataset = runtimeConfig.public.sanity?.dataset || "production";

  if (!projectId) {
    throw createError({
      statusCode: 500,
      message: "Sanity project ID missing",
    });
  }

  let statusFilter = "";
  if (status === "pending") {
    statusFilter = `&& (!defined(status) || status == "pending")`;
  } else if (status === "reviewed") {
    statusFilter = `&& status == "reviewed"`;
  } else if (status === "dismissed") {
    statusFilter = `&& status == "dismissed"`;
  }

  const groqQuery = `{
    "suggestions": *[_type == "suggestion" ${statusFilter}] | order(submittedAt desc) [${offset}...${offset + limit}] {
      _id,
      guidePath,
      content,
      status,
      submittedAt
    },
    "total": count(*[_type == "suggestion" ${statusFilter}])
  }`;

  const queryUrl = `https://${projectId}.api.sanity.io/v2024-03-01/data/query/${dataset}?query=${encodeURIComponent(groqQuery)}`;

  try {
    const response = await $fetch<{
      result: { suggestions: Record<string, unknown>[]; total: number };
    }>(queryUrl);

    return {
      suggestions: response.result.suggestions,
      total: response.result.total,
      page,
      totalPages: Math.ceil(response.result.total / limit),
    };
  } catch (err) {
    console.error("Sanity Query Error:", err);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch suggestions",
    });
  }
});
