import { expect, test } from "@playwright/test";

const publicRoutes = [
  { path: "/", selector: "#public-hero-title", label: "landing" },
  { path: "/estimate", selector: "#public-estimate-title", label: "estimate" },
  { path: "/estimate/", selector: "#public-estimate-title", label: "estimate trailing slash" },
  { path: "/privacy", selector: ".public-privacy-page", label: "privacy" },
  { path: "/privacy/", selector: ".public-privacy-page", label: "privacy trailing slash" },
] as const;

for (const route of publicRoutes) {
  test(`${route.label} opens at ${route.path}`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.locator(route.selector)).toBeVisible();
  });
}

test("landing primary CTA points to /estimate", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".public-hero-primary")).toHaveAttribute("href", "/estimate");
});
