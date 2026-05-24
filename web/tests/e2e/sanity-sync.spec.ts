import { test, expect } from "@playwright/test";
import { createClient } from "@sanity/client";
import { randomUUID } from "crypto";

const testRunId = `test-run-${randomUUID()}`;

// 1. Initialize private test client pointing strictly to 'test' dataset
const sanityClient = createClient({
  projectId: "84tfhiiz",
  dataset: "test", // Isolated test dataset
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: "2024-03-01",
});

test.describe("Sanity decoupled Read/Write Sync", () => {
  // Teardown block: Purges dummy test suggestion data immediately to prevent limit depletion
  test.afterAll(async () => {
    if (process.env.SANITY_WRITE_TOKEN) {
      try {
        await sanityClient.delete({
          query: `*[_type == "suggestion" && content match $testRunId]`,
          params: { testRunId },
        });
      } catch (err) {
        console.error("Failed to run test dataset cleanup mutations:", err);
      }
    }
  });

  test("Read: Should successfully fetch and render a guide page from Sanity test dataset", async ({
    page,
  }) => {
    // Navigates to a guide on our localhost dev server
    await page.goto("/guides/test-guide-slug");

    // Assert Nuxt correctly renders Sanity-provided heading and titleTemplate
    await expect(page.locator("h1")).toContainText("Wayfarer review criteria");
    await expect(page).toHaveTitle("Wayfarer review criteria - pogo.guide");
  });

  test("Read Preview: Should support draft perspective and visual previews via preview token parameter", async ({
    page,
  }) => {
    // Intercept/mock data calls or load with preview token to test Presentation Tool draft perspectives
    await page.goto(
      "/guides/test-guide-slug?preview=true&token=test-preview-token",
    );

    // Validate preview drafts are fetched side-by-side
    await expect(page.locator("[data-testid='preview-banner']")).toBeVisible();
  });

  test("Write Success: Should accept suggestions and write mutations cleanly to isolated test dataset", async ({
    page,
  }) => {
    await page.goto("/guides/test-guide-slug?test=true");

    // Wait for Vue hydration: button becomes enabled only after onMounted fires
    const submitButton = page.locator("button[type='submit']");
    await expect(submitButton).toBeEnabled();

    // Now fill the form — hydration is complete, v-model is wired up
    const textarea = page.locator("textarea");
    await textarea.fill(
      `Automated testing feedback suggestion content - ${testRunId}`,
    );

    await submitButton.click();

    await expect(page.locator(".text-green-400")).toContainText(
      "Thank you for your suggestion",
    );
  });

  test("Write Resiliency: Handles rate limits or API key rejections gracefully", async ({
    page,
  }) => {
    // 1. Stub/simulate an API Key Rejection / 502 from the backend (which would happen if Sanity rejected it)
    await page.route("**/api/submit-suggestion", (route) =>
      route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          statusMessage: "Failed to submit suggestion to database",
        }),
      }),
    );

    // Navigate and set up — wait for Vue hydration before filling form
    await page.goto("/guides/test-guide-slug?test=true");
    const submitButton = page.locator("button[type='submit']");
    await expect(submitButton).toBeEnabled();

    const textarea = page.locator("textarea");
    await textarea.fill(
      `Resiliency test payload - API Key rejection - ${testRunId}`,
    );

    await submitButton.click();

    // Wait for the UI to display the error message we mocked
    await expect(page.locator(".text-red-400")).toContainText(
      "Failed to submit suggestion to database",
    );

    // 2. We can also test the 400 Bad Request (e.g., Turnstile failure)
    await page.route("**/api/submit-suggestion", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          statusMessage: "Invalid Turnstile token. Please try again.",
        }),
      }),
    );

    await textarea.fill(`Resiliency test payload - Rate limit - ${testRunId}`);
    await submitButton.click();

    await expect(page.locator(".text-red-400")).toContainText(
      "Invalid Turnstile token",
    );
  });
});
