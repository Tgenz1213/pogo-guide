import sanitizeHtml from "sanitize-html";

function repairMalformedHtmlTagFragments(input: string): string {
  // Some upstream editors paste pseudo-tags like `p>` or `/p>` without `<`.
  // Recover a safe subset so sanitization can treat them as real tags.
  return input.replace(
    /(^|[\s\n\r\t>\-*:;,.([])(\/?(?:p|h2|h3|ul|ol|li|b|i|em|strong|a))>/gi,
    "$1<$2>",
  );
}

export function sanitizeGuideHtml(html: string): string {
  const repairedHtml = repairMalformedHtmlTagFragments(html);

  return sanitizeHtml(repairedHtml, {
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
