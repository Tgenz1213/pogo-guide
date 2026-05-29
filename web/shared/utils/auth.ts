import { parseURL } from "ufo";

/**
 * Safely decodes a URI component without throwing errors on malformed input.
 */
function safeDecodeURIComponent(str: string): string {
  let decoded = str;
  for (let i = 0; i < 5; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break; // Stop decoding on error to allow downstream regex to catch raw malicious segments
    }
  }
  return decoded;
}

export function sanitizeRedirectPath(path: string | undefined | null): string {
  if (
    !path ||
    typeof path !== "string" ||
    path.length > 1024 ||
    path.startsWith("//")
  ) {
    return "/";
  }

  // 1. Fail fast on obvious injection patterns in the raw input string
  const maliciousPattern = /[\r\n\\]|%0d|%0a|%5c/i;
  if (maliciousPattern.test(path)) {
    return "/";
  }

  // 2. Lookahead Defense: Check if the decoded form introduces structural exploits like // or \
  const decodedPath = safeDecodeURIComponent(path);
  if (
    decodedPath.startsWith("//") ||
    decodedPath.includes("\\") ||
    /[\r\n]/.test(decodedPath)
  ) {
    return "/";
  }

  try {
    const parsed = parseURL(path);

    // 3. Block protocol-relative (//example.com) or absolute URLs
    if (parsed.host || parsed.protocol) {
      return "/";
    }

    // 4. Reconstruct components
    const safePath =
      parsed.pathname + (parsed.search || "") + (parsed.hash || "");

    // 5. Secondary defense: Ensure no bypass variants made it through parsing
    if (maliciousPattern.test(safePath)) {
      return "/";
    }

    const decodedSafePath = safeDecodeURIComponent(safePath);
    if (
      maliciousPattern.test(decodedSafePath) ||
      !safePath.startsWith("/") ||
      safePath.startsWith("//") ||
      !decodedSafePath.startsWith("/") ||
      decodedSafePath.startsWith("//")
    ) {
      return "/";
    }

    return safePath;
  } catch {
    return "/";
  }
}
