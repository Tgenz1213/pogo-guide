import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import type { H3Event } from "h3";

// Mocks
const mockGetCookie = vi.fn();
const mockDeleteCookie = vi.fn();
const mockSendRedirect = vi.fn();

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    getCookie: (...args: unknown[]) => mockGetCookie(...args),
    deleteCookie: (...args: unknown[]) => mockDeleteCookie(...args),
    sendRedirect: (...args: unknown[]) => mockSendRedirect(...args),
  };
});

vi.mock("#imports", () => ({
  setUserSession: vi.fn().mockResolvedValue(true),
  useRuntimeConfig: () => ({ session: { password: "test-password" } }),
}));

vi.mock("../../../server/utils/db", () => ({
  useDB: () => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{}]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }),
}));

let googleHandler: unknown;
let discordHandler: unknown;

beforeAll(async () => {
  vi.stubGlobal("defineOAuthGoogleEventHandler", (config: unknown) => config);
  vi.stubGlobal("defineOAuthDiscordEventHandler", (config: unknown) => config);
  vi.stubGlobal("getCookie", (...args: unknown[]) => mockGetCookie(...args));
  vi.stubGlobal("deleteCookie", (...args: unknown[]) =>
    mockDeleteCookie(...args),
  );
  vi.stubGlobal("sendRedirect", (...args: unknown[]) =>
    mockSendRedirect(...args),
  );
  vi.stubGlobal("setUserSession", vi.fn().mockResolvedValue(true));
  vi.stubGlobal("useRuntimeConfig", () => ({
    session: { password: "test-password" },
  }));

  googleHandler = (await import("../../../server/routes/auth/google.get"))
    .default;
  discordHandler = (await import("../../../server/routes/auth/discord.get"))
    .default;
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("OAuth Callback Redirect Logic (Google)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should consume the auth_redirect cookie and redirect to its value", async () => {
    // Setup
    mockGetCookie.mockReturnValue("/custom-return-path");

    const mockEvent = {} as unknown as H3Event;
    const mockUser = { id: "123", email: "test@test.com" };

    // The handler exports the config object because of our mock
    const handlerConfig = googleHandler as unknown as {
      onSuccess: (
        event: H3Event,
        data: { user: typeof mockUser },
      ) => Promise<void>;
    };

    // Execute onSuccess
    await handlerConfig.onSuccess(mockEvent, { user: mockUser });

    // Assertions
    expect(mockGetCookie).toHaveBeenCalledWith(mockEvent, "auth_redirect");
    expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, "auth_redirect", {
      path: "/",
    });
    expect(mockSendRedirect).toHaveBeenCalledWith(
      mockEvent,
      "/custom-return-path",
    );
  });

  it("should fallback to '/' if no cookie is present", async () => {
    // Setup
    mockGetCookie.mockReturnValue(undefined);

    const mockEvent = {} as unknown as H3Event;
    const mockUser = { id: "123", email: "test@test.com" };

    const handlerConfig = googleHandler as unknown as {
      onSuccess: (
        event: H3Event,
        data: { user: typeof mockUser },
      ) => Promise<void>;
    };
    await handlerConfig.onSuccess(mockEvent, { user: mockUser });

    expect(mockSendRedirect).toHaveBeenCalledWith(mockEvent, "/");
  });

  it("should fallback to '/' if the cookie contains malicious bypass attempts", async () => {
    const maliciousPaths = [
      "https://evil.com",
      "//evil.com",
      "/%2F%2Fevil.com",
      "/test\rinjection",
    ];

    const mockEvent = {} as unknown as H3Event;
    const mockUser = { id: "123", email: "test@test.com" };
    const handlerConfig = googleHandler as unknown as {
      onSuccess: (
        event: H3Event,
        data: { user: typeof mockUser },
      ) => Promise<void>;
    };

    for (const path of maliciousPaths) {
      mockGetCookie.mockReturnValue(path);
      mockSendRedirect.mockClear();

      await handlerConfig.onSuccess(mockEvent, { user: mockUser });

      expect(mockSendRedirect).toHaveBeenCalledWith(mockEvent, "/");
    }
  });
});

describe("OAuth Callback Redirect Logic (Discord)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should consume the auth_redirect cookie and redirect to its value", async () => {
    // Setup
    mockGetCookie.mockReturnValue("/custom-return-path");

    const mockEvent = {} as unknown as H3Event;
    const mockUser = { id: "123", email: "test@test.com" };

    // The handler exports the config object because of our mock
    const handlerConfig = discordHandler as unknown as {
      onSuccess: (
        event: H3Event,
        data: { user: typeof mockUser },
      ) => Promise<void>;
    };

    // Execute onSuccess
    await handlerConfig.onSuccess(mockEvent, { user: mockUser });

    // Assertions
    expect(mockGetCookie).toHaveBeenCalledWith(mockEvent, "auth_redirect");
    expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, "auth_redirect", {
      path: "/",
    });
    expect(mockSendRedirect).toHaveBeenCalledWith(
      mockEvent,
      "/custom-return-path",
    );
  });

  it("should fallback to '/' if no cookie is present", async () => {
    // Setup
    mockGetCookie.mockReturnValue(undefined);

    const mockEvent = {} as unknown as H3Event;
    const mockUser = { id: "123", email: "test@test.com" };

    const handlerConfig = discordHandler as unknown as {
      onSuccess: (
        event: H3Event,
        data: { user: typeof mockUser },
      ) => Promise<void>;
    };
    await handlerConfig.onSuccess(mockEvent, { user: mockUser });

    expect(mockSendRedirect).toHaveBeenCalledWith(mockEvent, "/");
  });

  it("should fallback to '/' if the cookie contains malicious bypass attempts", async () => {
    const maliciousPaths = [
      "https://evil.com",
      "//evil.com",
      "/%2F%2Fevil.com",
      "/test\rinjection",
    ];

    const mockEvent = {} as unknown as H3Event;
    const mockUser = { id: "123", email: "test@test.com" };
    const handlerConfig = discordHandler as unknown as {
      onSuccess: (
        event: H3Event,
        data: { user: typeof mockUser },
      ) => Promise<void>;
    };

    for (const path of maliciousPaths) {
      mockGetCookie.mockReturnValue(path);
      mockSendRedirect.mockClear();

      await handlerConfig.onSuccess(mockEvent, { user: mockUser });

      expect(mockSendRedirect).toHaveBeenCalledWith(mockEvent, "/");
    }
  });
});
