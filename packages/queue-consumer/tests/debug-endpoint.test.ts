import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ExecutionContext } from "@cloudflare/workers-types";
import worker from "../src/index";
import type { Env } from "../src/sanity";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

describe("/__debug/process auth gating", () => {
  const baseEnv: Env = {
    SANITY_PROJECT_ID: "test-project",
    SANITY_DATASET: "test-dataset",
    SANITY_WRITE_TOKEN: "test-token",
  };

  const validGuidePayload = {
    version: 1,
    type: "guide",
    messageId: "123e4567-e89b-12d3-a456-426614174000",
    idempotencyKey: "abc123hash",
    submittedAt: new Date().toISOString(),
    requestId: "req-123",
    data: {
      title: "Valid Guide",
      htmlContent: "<p>Content</p>",
      categoryId: "existing-cat",
    },
  };

  const emptyCtx = {} as ExecutionContext;

  const makeRequest = (body: unknown, token?: string) =>
    new Request("https://queue-consumer.example.com/__debug/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ results: [] })),
    });
  });

  it("mirrors the generic catch-all response in production when no token is configured and none is provided", async () => {
    const env: Env = { ...baseEnv, ENVIRONMENT: "production" };
    const request = makeRequest(validGuidePayload);
    const unmatchedRouteResponse = await worker.fetch(
      new Request("https://queue-consumer.example.com/some-other-path"),
      env,
      emptyCtx,
    );

    const response = await worker.fetch(request, env, emptyCtx);

    expect(response.status).toBe(unmatchedRouteResponse.status);
    expect(await response.text()).toBe(await unmatchedRouteResponse.text());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("mirrors the generic catch-all response in production when a token is configured but the request provides the wrong one", async () => {
    const env: Env = {
      ...baseEnv,
      ENVIRONMENT: "production",
      DEBUG_PROCESS_TOKEN: "correct-secret",
    };
    const request = makeRequest(validGuidePayload, "wrong-secret");
    const unmatchedRouteResponse = await worker.fetch(
      new Request("https://queue-consumer.example.com/some-other-path"),
      env,
      emptyCtx,
    );

    const response = await worker.fetch(request, env, emptyCtx);

    expect(response.status).toBe(unmatchedRouteResponse.status);
    expect(await response.text()).toBe(await unmatchedRouteResponse.text());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns the same generic response for GET /__debug/process as for any other unmatched route, in production", async () => {
    const env: Env = { ...baseEnv, ENVIRONMENT: "production" };
    const unmatchedRouteResponse = await worker.fetch(
      new Request("https://queue-consumer.example.com/some-other-path"),
      env,
      emptyCtx,
    );

    const response = await worker.fetch(
      new Request("https://queue-consumer.example.com/__debug/process", {
        method: "GET",
      }),
      env,
      emptyCtx,
    );

    expect(response.status).toBe(unmatchedRouteResponse.status);
    expect(await response.text()).toBe(await unmatchedRouteResponse.text());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("processes normally in production when the correct token is provided", async () => {
    const env: Env = {
      ...baseEnv,
      ENVIRONMENT: "production",
      DEBUG_PROCESS_TOKEN: "correct-secret",
    };
    const request = makeRequest(validGuidePayload, "correct-secret");

    const response = await worker.fetch(request, env, emptyCtx);
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 401 (not 404) in a non-production env when no token is provided", async () => {
    const env: Env = {
      ...baseEnv,
      ENVIRONMENT: "preview",
      DEBUG_PROCESS_TOKEN: "dev-secret",
    };
    const request = makeRequest(validGuidePayload);

    const response = await worker.fetch(request, env, emptyCtx);

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("processes normally in a non-production env when the correct token is provided", async () => {
    const env: Env = {
      ...baseEnv,
      ENVIRONMENT: "development",
      DEBUG_PROCESS_TOKEN: "dev-secret",
    };
    const request = makeRequest(validGuidePayload, "dev-secret");

    const response = await worker.fetch(request, env, emptyCtx);
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
