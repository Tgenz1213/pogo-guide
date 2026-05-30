import sanitizeHtml from "sanitize-html";

export function sanitizeGuideHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "p",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "br",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
  });
}
