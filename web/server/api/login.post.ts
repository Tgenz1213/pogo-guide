import { setUserSession, useRuntimeConfig } from "#imports";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);

  // Only allow this endpoint in E2E mode or development
  if (!config.public.e2eMode && !import.meta.dev) {
    throw createError({
      statusCode: 403,
      message: "Forbidden: E2E login is disabled",
    });
  }

  const body = await readBody(event);

  await setUserSession(event, {
    user: {
      id: body.id || "e2e:testuser",
      username: body.username || "TestUser",
      provider: "e2e",
    },
  });

  return { success: true, message: "Logged in via E2E mock" };
});
