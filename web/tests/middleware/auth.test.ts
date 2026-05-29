import { describe, it, expect, vi, beforeEach } from "vitest";

const mockNavigateTo = vi.fn();
const mockUseUserSession = vi.fn();

vi.stubGlobal("defineNuxtRouteMiddleware", (fn: unknown) => fn);
vi.stubGlobal("useUserSession", () => mockUseUserSession());
vi.stubGlobal("navigateTo", (args: unknown) => mockNavigateTo(args));

// Dynamically import to ensure globals are stubbed first
const { default: authMiddleware } = await import("../../app/middleware/auth");

describe("auth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect unauthenticated users to /login with the redirect query parameter", () => {
    mockUseUserSession.mockReturnValue({ loggedIn: { value: false } });

    const to = { fullPath: "/protected-route" };
    const from = {};

    // The middleware is the function passed to defineNuxtRouteMiddleware
    if (typeof authMiddleware === "function") {
      (authMiddleware as (to: { fullPath: string }, from: unknown) => void)(
        to,
        from,
      );
    }

    expect(mockNavigateTo).toHaveBeenCalledWith({
      path: "/login",
      query: { redirect: "/protected-route" },
    });
  });

  it("should not redirect if the user is authenticated", () => {
    mockUseUserSession.mockReturnValue({ loggedIn: { value: true } });

    const to = { fullPath: "/protected-route" };
    const from = {};

    if (typeof authMiddleware === "function") {
      (authMiddleware as (to: { fullPath: string }, from: unknown) => void)(
        to,
        from,
      );
    }

    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});
