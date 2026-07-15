import { describe, it, expect } from "vitest";
import {
  generateGuideIdempotencyKey,
  generateSuggestionIdempotencyKey,
} from "../src/idempotency";

describe("Idempotency Hashing", () => {
  describe("Guide Idempotency", () => {
    it("generates stable hash ignoring volatile metadata", async () => {
      const data1 = {
        title: "Guide Title",
        htmlContent: "<p>Content</p>",
        suggestedCategory: "Cat",
        turnstileToken: "",
      };

      const data2 = {
        title: " Guide Title  ",
        htmlContent: "  <p>Content</p>\r\n",
        suggestedCategory: "Cat",
        turnstileToken: "",
      };

      const hash1 = await generateGuideIdempotencyKey(data1);
      const hash2 = await generateGuideIdempotencyKey(data2);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex string
    });

    it("generates different hashes for different content", async () => {
      const data1 = {
        title: "Guide 1",
        htmlContent: "<p>Content</p>",
        suggestedCategory: "Cat",
        turnstileToken: "",
      };
      const data2 = {
        title: "Guide 2",
        htmlContent: "<p>Content</p>",
        suggestedCategory: "Cat",
        turnstileToken: "",
      };

      const hash1 = await generateGuideIdempotencyKey(data1);
      const hash2 = await generateGuideIdempotencyKey(data2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Suggestion Idempotency", () => {
    it("generates stable hash within the same time window", async () => {
      const data = {
        guidePath: "/guides/1",
        content: "Suggestion content",
        turnstileToken: "turnstile-token",
      };

      const hash1 = await generateSuggestionIdempotencyKey(
        data,
        "client-ip",
        60,
      );
      const hash2 = await generateSuggestionIdempotencyKey(
        data,
        "client-ip",
        60,
      );

      expect(hash1).toBe(hash2);
    });

    it("generates different hashes for different clients", async () => {
      const data = {
        guidePath: "/guides/1",
        content: "Suggestion content",
        turnstileToken: "turnstile-token",
      };

      const hash1 = await generateSuggestionIdempotencyKey(
        data,
        "client-A",
        60,
      );
      const hash2 = await generateSuggestionIdempotencyKey(
        data,
        "client-B",
        60,
      );

      expect(hash1).not.toBe(hash2);
    });
  });
});
