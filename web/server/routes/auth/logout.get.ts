import { clearUserSession, sendRedirect, defineEventHandler } from "#imports";

export default defineEventHandler(async (event) => {
  await clearUserSession(event);
  return sendRedirect(event, "/");
});
