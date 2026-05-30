import { describe, it, expect } from "vitest";
import { sanitizeGuideHtml } from "../src/sanitization";

describe("Sanitization", () => {
  it("removes dangerous tags", () => {
    const malicious = '<p>Hello <script>alert("XSS")</script></p>';
    const clean = sanitizeGuideHtml(malicious);

    expect(clean).toBe("<p>Hello </p>");
  });

  it("preserves allowed tags and formatting", () => {
    const valid =
      '<h2>Title</h2><p><b>Bold</b> and <a href="https://example.com" target="_blank">link</a></p>';
    const clean = sanitizeGuideHtml(valid);

    expect(clean).toBe(valid);
  });

  it("removes dangerous attributes like onclick", () => {
    const malicious =
      '<a href="https://example.com" onclick="stealCookies()">Link</a>';
    const clean = sanitizeGuideHtml(malicious);

    expect(clean).toBe('<a href="https://example.com">Link</a>');
  });
});
