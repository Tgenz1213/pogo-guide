import { describe, it, expect } from "vitest";
import { sanitizeRedirectPath } from "../../../shared/utils/auth";

describe("sanitizeRedirectPath", () => {
  it("should return the original path if it is a valid local path", () => {
    expect(sanitizeRedirectPath("/resources")).toBe("/resources");
    expect(sanitizeRedirectPath("/submit-guide")).toBe("/submit-guide");
    expect(sanitizeRedirectPath("/resources?x=1#top")).toBe(
      "/resources?x=1#top",
    );
    expect(sanitizeRedirectPath("/")).toBe("/");
  });

  it("should return '/' if the path is not a string", () => {
    expect(sanitizeRedirectPath(undefined)).toBe("/");
    expect(sanitizeRedirectPath(null)).toBe("/");
    expect(sanitizeRedirectPath(123 as unknown as string)).toBe("/");
  });

  it("should return '/' if the path does not start with '/'", () => {
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/");
    expect(sanitizeRedirectPath("resources")).toBe("/");
  });

  it("should return '/' if the path starts with '//' or encoded variants", () => {
    expect(sanitizeRedirectPath("//evil.com")).toBe("/");
    expect(sanitizeRedirectPath("///evil.com")).toBe("/");
    expect(sanitizeRedirectPath("/%2F%2Fevil.com")).toBe("/");
    expect(sanitizeRedirectPath("%2F%2Fevil.com")).toBe("/");
    expect(sanitizeRedirectPath("/%2fevil.com")).toBe("/");
    expect(sanitizeRedirectPath("/%252F%252Fevil.com")).toBe("/");
  });

  it("should return '/' if the path contains CRLF characters (raw or encoded)", () => {
    expect(sanitizeRedirectPath("/test\r\ninjection")).toBe("/");
    expect(sanitizeRedirectPath("/test\ninjection")).toBe("/");
    expect(sanitizeRedirectPath("/test\rinjection")).toBe("/");
    expect(sanitizeRedirectPath("/test%0D%0Ainjection")).toBe("/");
    expect(sanitizeRedirectPath("/test%250D%250Ainjection")).toBe("/");
  });

  it("should return '/' if the path contains backslashes or encoded backslashes", () => {
    expect(sanitizeRedirectPath("/\\evil.com")).toBe("/");
    expect(sanitizeRedirectPath("\\evil.com")).toBe("/");
    expect(sanitizeRedirectPath("/%5Cevil.com")).toBe("/");
    expect(sanitizeRedirectPath("/%5cevil.com")).toBe("/");
    expect(sanitizeRedirectPath("/%255Cevil.com")).toBe("/");
  });

  it("should return '/' if the path is too long", () => {
    const longPath = "/" + "a".repeat(1025);
    expect(sanitizeRedirectPath(longPath)).toBe("/");
  });
});
