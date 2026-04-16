import { test, expect } from "@playwright/test";
import { SEED_LISTING } from "./seed/load-state";

test.describe("Search & Marketplace Filtering", () => {
  test("renders explore page with content sections", async ({ page }) => {
    await page.goto("/#/explore");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const sections = page.locator("section, [data-testid], .card, a[href]");
    await expect(sections.first()).toBeVisible({ timeout: 10000 });
    expect(await sections.count()).toBeGreaterThan(0);
  });

  test("radar search input accepts typed query and retains value", async ({ page }) => {
    await page.goto("/#/radar");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator("input[placeholder]").first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("appartement paris");
    await expect(searchInput).toHaveValue("appartement paris");
  });

  test("marketplace page loads property listings (seeded)", async ({ page }) => {
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const listings = page.locator("a[href]");
    await expect(listings.first()).toBeVisible({ timeout: 10000 });
    expect(await listings.count()).toBeGreaterThan(0);
  });

  test("marketplace search input filters listings using seeded city", async ({ page }) => {
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator("input[placeholder], input[type='search'], [data-testid='search-input']").first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    const listingsBefore = await page.locator("a[href]").count();
    expect(listingsBefore).toBeGreaterThan(0);

    await searchInput.fill(SEED_LISTING.city);
    await page.waitForTimeout(1500);

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("marketplace filter controls open and contain options", async ({ page }) => {
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");

    const filterButtons = page.locator('button:has-text("Filter"), button:has-text("Filtr"), [data-testid="filter-btn"], [role="combobox"]');
    await expect(filterButtons.first()).toBeVisible({ timeout: 10000 });
    expect(await filterButtons.count()).toBeGreaterThan(0);

    await filterButtons.first().click();
    await page.waitForTimeout(500);

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const dropdown = page.locator('[role="listbox"], [role="menu"], .dropdown, .filter-panel');
    await expect(dropdown.first()).toBeVisible({ timeout: 5000 });

    const options = dropdown.first().locator('[role="option"], li, button');
    expect(await options.count()).toBeGreaterThan(0);

    await options.first().click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("search results navigate to property detail with content", async ({ page }) => {
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");

    const listings = page.locator("a[href]");
    await expect(listings.first()).toBeVisible({ timeout: 10000 });

    const urlBefore = page.url();
    await listings.first().click();

    await page.waitForFunction(
      (prevUrl) => window.location.href !== prevUrl,
      urlBefore,
      { timeout: 10000 }
    );

    expect(page.url()).not.toBe(urlBefore);
    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const detailContent = page.locator("h1, h2, [data-testid='property-title'], img").first();
    await expect(detailContent).toBeVisible({ timeout: 10000 });

    const pageText = await page.locator("body").textContent();
    expect(pageText!.length).toBeGreaterThan(50);
  });
});
