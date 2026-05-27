export default defineNuxtRouteMiddleware((_to, _from) => {
  const { loggedIn } = useUserSession();

  if (!loggedIn.value) {
    return navigateTo("/login");
  }
});
