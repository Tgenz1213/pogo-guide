import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("home page renders critical UI", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("main")).toContainText(
      "Your Complete Pokémon GO",
    );
  });
});
