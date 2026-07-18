import { describe, it, expect, vi, beforeEach } from "vitest";

const mockNavigateTo = vi.fn();
const mockUseUserSession = vi.fn();

vi.stubGlobal("defineNuxtRouteMiddleware", (fn: unknown) => fn);
vi.stubGlobal("useUserSession", () => mockUseUserSession());
vi.stubGlobal("navigateTo", (args: unknown) => mockNavigateTo(args));

// Dynamically import to ensure globals are stubbed first
const { default: adminMiddleware } = await import("../../app/middleware/admin");

describe("admin middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a logged-in non-admin user to the home page", () => {
    mockUseUserSession.mockReturnValue({
      user: { value: { id: "discord:1", isAdmin: false } },
    });

    if (typeof adminMiddleware === "function") {
      (adminMiddleware as (to: unknown, from: unknown) => void)({}, {});
    }

    expect(mockNavigateTo).toHaveBeenCalledWith("/");
  });

  it("redirects when there is no user at all", () => {
    mockUseUserSession.mockReturnValue({ user: { value: null } });

    if (typeof adminMiddleware === "function") {
      (adminMiddleware as (to: unknown, from: unknown) => void)({}, {});
    }

    expect(mockNavigateTo).toHaveBeenCalledWith("/");
  });

  it("does not redirect an admin user", () => {
    mockUseUserSession.mockReturnValue({
      user: { value: { id: "discord:1", isAdmin: true } },
    });

    if (typeof adminMiddleware === "function") {
      (adminMiddleware as (to: unknown, from: unknown) => void)({}, {});
    }

    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});
