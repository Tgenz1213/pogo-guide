declare const defineNuxtRouteMiddleware: (...args: unknown[]) => unknown;
declare const useUserSession: (...args: unknown[]) => unknown;
declare const navigateTo: (...args: unknown[]) => unknown;

declare const defineEventHandler: (...args: unknown[]) => unknown;
declare const getUserSession: (...args: unknown[]) => unknown;
declare const createError: (...args: unknown[]) => unknown;
declare const getQuery: (...args: unknown[]) => unknown;
declare const readBody: (...args: unknown[]) => unknown;
declare const getRouterParam: (...args: unknown[]) => unknown;
declare const useRuntimeConfig: (...args: unknown[]) => unknown;
declare const $fetch: (...args: unknown[]) => unknown;

declare const defineOAuthGoogleEventHandler: (...args: unknown[]) => unknown;
declare const defineOAuthDiscordEventHandler: (...args: unknown[]) => unknown;
declare const setUserSession: (...args: unknown[]) => unknown;
declare const getCookie: (...args: unknown[]) => unknown;
declare const deleteCookie: (...args: unknown[]) => unknown;
declare const sendRedirect: (...args: unknown[]) => unknown;

declare module "*.vue" {
  const component: unknown;
  export default component;
}
