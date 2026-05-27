import { z } from "zod";

const bodySchema = z.object({
  id: z.string().optional().default("e2e:testuser"),
  username: z.string().optional().default("TestUser"),
});

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);

  // Only allow this endpoint in E2E mode or development
  if (!config.public.e2eMode && !import.meta.dev) {
    throw createError({
      statusCode: 403,
      message: "Forbidden: E2E login is disabled",
    });
  }

  const { id, username } = await readValidatedBody(event, bodySchema.parse);

  await setUserSession(event, {
    user: {
      id,
      username,
      provider: "e2e",
    },
  });

  return { success: true, message: "Logged in via E2E mock" };
});
