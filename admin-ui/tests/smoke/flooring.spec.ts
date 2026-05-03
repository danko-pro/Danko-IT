import { execFileSync } from "node:child_process";

import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

const apiBaseUrl = process.env.ADMIN_API_BASE_URL ?? "http://127.0.0.1:8000";
const smokeProjectPrefix = "SMOKE UI flooring";

test.afterEach(() => {
  cleanupSmokeProjects();
});

test("opens calculator flooring stage with seeded zoned estimate", async ({ page, request }) => {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const project = await postJson(request, "/api/calculator/projects", {
    name: `${smokeProjectPrefix} ${stamp}`,
    note: "temporary playwright smoke project",
  });
  const projectId = Number(project.project.id);
  const coveringId = Number(project.flooring.coverings[0].id);
  const preparationId = Number(project.flooring.preparations[0].id);
  const layoutId = Number(project.flooring.layouts[0].id);
  const wallFinishCoveringId = Number(project.wall_finishes.coverings[0].id);

  const room = await postJson(request, `/api/calculator/projects/${projectId}/rooms`, {
    name: "Smoke room",
    ceiling_height_m: 2.7,
    auto_perimeter_calc: true,
    perimeter_factor: 1.15,
  });
  const roomId = Number(room.room.id);

  await patchJson(request, `/api/calculator/rooms/${roomId}`, {
    name: "Smoke room",
    ceiling_height_m: 2.7,
    manual_floor_area_m2: 18.5,
    auto_perimeter_calc: true,
    perimeter_factor: 1.15,
    note: "smoke",
    walls_m: [4.2, 4.2, 3.5, 3.5],
    floor_sections: [],
    openings: [],
  });

  await patchJson(request, `/api/calculator/projects/${projectId}/flooring`, {
    include_underlay: true,
    include_plinth: true,
    include_demolition: true,
    include_preparation: true,
    default_preparation_id: preparationId,
    demolition_price_per_m2: 150,
    underlay_price_per_m2: 120,
    plinth_material_price_per_m: 180,
    plinth_install_price_per_m: 250,
    threshold_profile_count: 2,
    threshold_profile_price: 900,
    global_items: [
      {
        kind: "work",
        title: "Smoke fixed work",
        mode: "fixed",
        rate: 1234,
        quantity: 1,
        enabled: true,
      },
    ],
    rooms: [
      {
        room_id: roomId,
        selected: true,
        covering_id: coveringId,
        preparation_id: preparationId,
        layout_id: layoutId,
        area_m2_override: 18.5,
        perimeter_m_override: 15.4,
        plinth_m_override: 14.2,
        note: "main room",
        zones: [
          {
            covering_id: coveringId,
            preparation_id: preparationId,
            layout_id: layoutId,
            area_m2: 10.0,
            note: "zone A",
          },
          {
            covering_id: coveringId,
            preparation_id: preparationId,
            layout_id: layoutId,
            area_m2: 8.5,
            note: "zone B",
          },
        ],
      },
    ],
  });

  await patchJson(request, `/api/calculator/projects/${projectId}/wall-finishes`, {
    include_preparation: false,
    include_demolition: false,
    demolition_price_per_m2: 140,
    rooms: [
      {
        room_id: roomId,
        selected: true,
        covering_id: wallFinishCoveringId,
      },
    ],
  });

  await page.addInitScript(() => window.sessionStorage.clear());
  await page.goto("/");
  await expect(page.locator('[data-screen="dashboard"]')).toBeVisible();
  await page.getByTestId("nav-calculator").click();
  await expect(page.locator('[data-screen="calculator"]')).toBeVisible();
  await expect(page.getByTestId(`calculator-project-${projectId}`)).toBeVisible();
  await page.getByTestId(`calculator-project-${projectId}`).click();
  await expect(page.locator(".calculator-header")).toContainText("18.5");
  await page.getByTestId("calculator-stage-flooring").click();
  await expectExplicitTransition(page, ".calculator-scene-stage", "height");
  await expectExplicitTransition(page, ".calculator-stage-settings", "transform");

  await expect(page.getByTestId("calculator-header-flooring-total").locator("strong")).not.toHaveText(/^0\s/);
  await expect(page.getByTestId("calculator-header-object-total")).not.toHaveText(/^0\s/);
  const flooringHeaderTotal = await page.getByTestId("calculator-header-flooring-total").locator("strong").innerText();
  const objectHeaderTotal = await page.getByTestId("calculator-header-object-total").innerText();
  await page.getByTestId("calculator-stage-warmfloor").click();
  await expect(page.getByTestId("calculator-header-flooring-total").locator("strong")).toHaveText(flooringHeaderTotal);
  await expect(page.getByTestId("calculator-header-object-total")).toHaveText(objectHeaderTotal);
  await page.getByTestId("calculator-stage-flooring").click();
  await expect(page.getByTestId("calculator-header-flooring-total").locator("strong")).toHaveText(flooringHeaderTotal);
  await expect(page.getByTestId("calculator-header-object-total")).toHaveText(objectHeaderTotal);
  await expect(page.locator(".flooring-summary-panel")).toBeVisible();
  await expect(page.locator(".calculator-stage-section-title").filter({ hasText: "Итог" })).toBeVisible();
  await expect(page.getByTestId("flooring-summary-area")).toContainText("18.5");
  await expect(page.getByTestId("flooring-summary-grand-total")).not.toHaveText("0 ₽");

  await page.getByTestId("calculator-stage-wallfinish").click();
  await expect(page.getByTestId("wall-finish-summary-area")).not.toContainText("0");
  await expect(page.getByTestId("wall-finish-summary-grand-total")).not.toHaveText(/^0\s/);
  await page.getByRole("button", { name: "Помещение" }).click();
  await expect(page.locator(".flooring-room-params-panel")).toBeVisible();
  await page.getByRole("button", { name: "+ Участок" }).click();
  await expect(page.locator(".flooring-zone-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Техкарта" }).click();
  await expect(page.locator(".flooring-catalog-panel")).toBeVisible();
  await expect(page.locator(".flooring-techmap-form")).toBeVisible();
  await expectExplicitTransition(page, ".warmfloor-panel-scene-stage", "height");
  await expectExplicitTransition(page, ".flooring-techmap-tab", "transform");
  await page.locator(".flooring-techmap-form .calculator-nav-add.warmfloor-material-add").click();
  await expect(page.locator(".flooring-techmap-consumable-row-custom")).toBeVisible();
  await page.getByRole("button", { name: "Смета" }).click();
  await expect(page.locator(".flooring-estimate-document")).toBeVisible();
});

async function expectExplicitTransition(page: Page, selector: string, expectedProperty: string) {
  const transitionProperty = await page.locator(selector).first().evaluate((element) => getComputedStyle(element).transitionProperty);
  expect(transitionProperty).toContain(expectedProperty);
  expect(transitionProperty).not.toContain("all");
}

async function postJson(request: APIRequestContext, path: string, data: unknown) {
  const response = await request.post(`${apiBaseUrl}${path}`, { data });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function patchJson(request: APIRequestContext, path: string, data: unknown) {
  const response = await request.patch(`${apiBaseUrl}${path}`, { data });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

function cleanupSmokeProjects() {
  const script = [
    "import sqlite3",
    "from pathlib import Path",
    "path = Path('../data/supply_bot.sqlite3')",
    "with sqlite3.connect(path) as conn:",
    "    conn.execute('PRAGMA foreign_keys = ON')",
    "    ids = conn.execute(\"SELECT id FROM estimate_projects WHERE name LIKE 'SMOKE UI flooring %'\").fetchall()",
    "    conn.executemany('DELETE FROM estimate_projects WHERE id = ?', ids)",
    "    conn.commit()",
  ].join("\n");
  execFileSync("python", ["-c", script], { stdio: "ignore" });
}
