import type { SubmitGuidePayload, SuggestionPayload } from "./validation";

function normalizeString(val: string | undefined | null): string {
  if (!val) return "";
  return val.trim();
}

function normalizeHtml(html: string | undefined | null): string {
  if (!html) return "";
  return html.trim().replace(/\r\n/g, "\n");
}

export async function generateGuideIdempotencyKey(
  data: SubmitGuidePayload,
): Promise<string> {
  const canonical = {
    title: normalizeString(data.title),
    description: normalizeString(data.description),
    htmlContent: normalizeHtml(data.htmlContent),
  };

  const serialized = JSON.stringify(canonical);
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serialized),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function generateSuggestionIdempotencyKey(
  data: SuggestionPayload,
  clientFingerprint: string,
  timeWindowMinutes: number = 60,
): Promise<string> {
  const now = new Date();
  const timeBucket = Math.floor(
    now.getTime() / (timeWindowMinutes * 60 * 1000),
  );

  const canonical = {
    guidePath: normalizeString(data.guidePath),
    content: normalizeString(data.content),
    clientFingerprint: normalizeString(clientFingerprint),
    timeBucket,
  };

  const serialized = JSON.stringify(canonical);
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serialized),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
