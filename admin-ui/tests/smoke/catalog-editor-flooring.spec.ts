import { expect, test } from "@playwright/test";

test("flooring catalog cards do not open the assembly builder", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("catalog-editor:section-tab", JSON.stringify("floors"));
    window.sessionStorage.clear();
  });

  await page.goto("/catalog-editor");
  await expect(page.locator(".flooring-catalog-panel")).toBeVisible();
  await expect(page.locator(".ce-flooring-assembly")).toHaveCount(0);

  const coveringCards = page
    .locator(".ce-flooring-catalog-sidebar-section")
    .first()
    .locator(".ce-flooring-catalog-card-main");
  await expect(coveringCards.first()).toBeVisible();
  await coveringCards.first().click();

  await expect(page.locator(".ce-flooring-form")).toBeVisible();
  await expect(page.locator(".ce-flooring-assembly")).toHaveCount(0);

  await page.locator(".ce-flooring-form-toolbar .ce-btn").first().click();
  await expect(page.locator(".ce-flooring-assembly")).toBeVisible();

  await coveringCards.nth(1).click();
  await expect(page.locator(".ce-flooring-form")).toBeVisible();
  await expect(page.locator(".ce-flooring-assembly")).toHaveCount(0);
});
