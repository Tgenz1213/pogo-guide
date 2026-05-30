import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MessageBatch, ExecutionContext } from "@cloudflare/workers-types";
import worker from "../src/index";
import type { Env } from "../src/sanity";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

type SanityMutation = {
  createIfNotExists?: {
    _id?: string;
    _type?: string;
    title?: string;
    category?: { _ref?: string };
    tags?: { _ref?: string }[];
  };
};

describe("Queue Consumer Worker", () => {
  const env: Env = {
    SANITY_PROJECT_ID: "test-project",
    SANITY_DATASET: "test-dataset",
    SANITY_WRITE_TOKEN: "test-token",
  };

  const createMessage = (body: Record<string, unknown>) => ({
    id: "msg-123",
    body,
    timestamp: new Date(),
    retry: vi.fn(),
    ack: vi.fn(),
    retryAll: vi.fn(),
    ackAll: vi.fn(),
  });

  const createBatch = (
    messages: ReturnType<typeof createMessage>[],
  ): MessageBatch<unknown> => ({
    queue: "pogo-queue",
    messages: messages as unknown as MessageBatch<unknown>["messages"],
    retryAll: vi.fn(),
    ackAll: vi.fn(),
    metadata: undefined as unknown as MessageBatch<unknown>["metadata"],
  });

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

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({ results: [] })),
    });
  });

  it("1. throws ConfigurationError immediately on missing env config", async () => {
    const invalidEnv = { ...env, SANITY_PROJECT_ID: "" };
    const batch = createBatch([createMessage(validGuidePayload)]);

    await expect(worker.queue(batch, invalidEnv, emptyCtx)).rejects.toThrow(
      "Missing SANITY_PROJECT_ID",
    );
  });

  it("2. calls message.retry() for PermanentMessageError (Schema validation fails)", async () => {
    const invalidMessage = createMessage({ version: 2, type: "guide" });
    const batch = createBatch([invalidMessage]);

    await worker.queue(batch, env, emptyCtx);
    expect(invalidMessage.retry).toHaveBeenCalled();
    expect(invalidMessage.ack).not.toHaveBeenCalled();
  });

  it("3. acks message on successful guide payload processing", async () => {
    const message = createMessage(validGuidePayload);
    const batch = createBatch([message]);

    await worker.queue(batch, env, emptyCtx);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(message.ack).toHaveBeenCalled();
  });

  it("4. acks message on successful suggestion payload processing", async () => {
    const suggestionPayload = {
      version: 1,
      type: "suggestion",
      messageId: "123e4567-e89b-12d3-a456-426614174000",
      idempotencyKey: "abc123hash",
      submittedAt: new Date().toISOString(),
      requestId: "req-123",
      data: {
        guidePath: "/guide",
        content: "Great guide!",
      },
    };
    const message = createMessage(suggestionPayload);
    const batch = createBatch([message]);

    await worker.queue(batch, env, emptyCtx);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(message.ack).toHaveBeenCalled();
  });

  it("5. handles 409 Duplicate idempotency collision as success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: vi.fn().mockResolvedValue("Conflict"),
    });

    const message = createMessage(validGuidePayload);
    const batch = createBatch([message]);

    await worker.queue(batch, env, emptyCtx);

    expect(message.ack).toHaveBeenCalled();
    expect(message.retry).not.toHaveBeenCalled();
  });

  it("6. retries on 429 transient rate limit", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: vi.fn().mockResolvedValue("Rate Limited"),
    });

    const message = createMessage(validGuidePayload);
    const batch = createBatch([message]);

    await worker.queue(batch, env, emptyCtx);

    expect(message.retry).toHaveBeenCalled();
  });

  it("7. retries on 5xx transient server error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue("Service Unavailable"),
    });

    const message = createMessage(validGuidePayload);
    const batch = createBatch([message]);

    await worker.queue(batch, env, emptyCtx);

    expect(message.retry).toHaveBeenCalled();
  });

  it("8. throws unhandled ConfigurationError on 401 auth failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue("Unauthorized"),
    });

    const message = createMessage(validGuidePayload);
    const batch = createBatch([message]);

    await expect(worker.queue(batch, env, emptyCtx)).rejects.toThrow(
      "Sanity Auth/Config Error (401)",
    );
  });

  it("9. retries on 400 DownstreamContractError to exhaust native retries", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue("Bad Request"),
    });

    const message = createMessage(validGuidePayload);
    const batch = createBatch([message]);

    await worker.queue(batch, env, emptyCtx);

    expect(message.retry).toHaveBeenCalled();
  });

  it("10. retries on completely unknown unhandled exception", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network disconnect"));

    const message = createMessage(validGuidePayload);
    const batch = createBatch([message]);

    await worker.queue(batch, env, emptyCtx);

    expect(message.retry).toHaveBeenCalled();
  });

  it("11. correctly builds sanity reference for existing category", async () => {
    const message = createMessage(validGuidePayload);
    const batch = createBatch([message]);

    await worker.queue(batch, env, emptyCtx);

    const fetchCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const mutations = fetchCallBody.mutations as SanityMutation[];
    const guideMutation = mutations.find(
      (m) => m.createIfNotExists?._type === "guide",
    );

    expect(guideMutation?.createIfNotExists?.category?._ref).toBe(
      "existing-cat",
    );
  });

  it("12. correctly generates new category document for suggested category", async () => {
    const payload = JSON.parse(JSON.stringify(validGuidePayload));
    delete payload.data.categoryId;
    payload.data.suggestedCategory = "New Category";

    const message = createMessage(payload);
    const batch = createBatch([message]);

    await worker.queue(batch, env, emptyCtx);

    const fetchCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const mutations = fetchCallBody.mutations as SanityMutation[];

    const catMutation = mutations.find(
      (m) => m.createIfNotExists?._type === "category",
    );
    expect(catMutation?.createIfNotExists?._id).toBe(
      "category-suggested-new-category",
    );
    expect(catMutation?.createIfNotExists?.title).toBe("New Category");
  });

  it("13. dedupes suggested tags colliding with existing tagIds", async () => {
    const payload = JSON.parse(JSON.stringify(validGuidePayload));
    payload.data.tagIds = ["existing-tag-1", "tag-suggested-foo"];
    payload.data.suggestedTags = ["Foo", "Bar", "bar"];

    const message = createMessage(payload);
    const batch = createBatch([message]);

    await worker.queue(batch, env, emptyCtx);

    const fetchCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const mutations = fetchCallBody.mutations as SanityMutation[];

    const tagMutations = mutations.filter(
      (m) => m.createIfNotExists?._type === "tag",
    );
    expect(tagMutations).toHaveLength(2); // Foo and Bar

    const guideMutation = mutations.find(
      (m) => m.createIfNotExists?._type === "guide",
    );
    const tagRefs = (guideMutation?.createIfNotExists?.tags ?? []).map(
      (t) => t._ref,
    );

    expect(tagRefs).toContain("existing-tag-1");
    expect(tagRefs).toContain("tag-suggested-foo");
    expect(tagRefs).toContain("tag-suggested-bar");
    expect(tagRefs).toHaveLength(3);
  });
});
