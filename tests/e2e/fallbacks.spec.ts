import { expect, test } from "@playwright/test";
test("reduced motion: static story, no timeline, same planner", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" }), page = await ctx.newPage(); await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Opening story" })).toContainText("whiteout", { ignoreCase: true }); await expect(page.getByTestId("pause-motion")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("skip-intro").click(); await expect(page.getByRole("heading", { name: "Expedition map" })).toBeVisible(); await page.getByTestId("nav-routes").click(); await expect(page.getByTestId("compare")).toBeVisible(); await ctx.close();
});
test("graphics failure: the poster still, and every view still works from the DOM", async ({ page }) => {
  await page.goto("/?gfx=off&skip=1&view=routes"); await expect(page.getByTestId("poster")).toBeVisible(); await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByTestId("route-b").selectOption("supported"); await expect(page.getByTestId("compare")).toBeVisible(); await page.getByTestId("nav-weather").click(); await page.getByTestId("hour").fill("35"); await expect(page.getByTestId("storm-front")).toBeVisible(); await page.getByTestId("nav-rovers").click(); await expect(page.getByTestId("tel-fuel")).toBeVisible(); await page.getByTestId("nav-satellite").click(); await expect(page.getByTestId("passes")).toBeVisible();
});
test("WebGL context loss falls back to the poster", async ({ page }) => {
  await page.goto("/?skip=1&view=map"); await expect(page.locator("canvas")).toHaveCount(1, { timeout: 30_000 }); await page.waitForFunction(() => typeof (window as unknown as { __polarisStats?: unknown }).__polarisStats === "function");
  await page.evaluate(() => document.querySelector("canvas")!.dispatchEvent(new Event("webglcontextlost", { cancelable: true }))); await expect(page.getByTestId("poster")).toBeVisible(); await page.getByTestId("nav-ice").click(); await expect(page.getByTestId("sectors")).toBeVisible();
});
test("phone width: nothing scrolls sideways and the panel stays reachable", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true }), page = await ctx.newPage(); await page.goto("/?skip=1&view=map&gfx=off");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0); await expect(page.getByTestId("nav-ice")).toBeVisible(); await page.getByTestId("nav-ice").click(); await expect(page.getByTestId("map")).toBeVisible(); await ctx.close();
});
test("pause motion stops the ambient animation", async ({ page }) => { await page.goto("/?skip=1&view=map"); await page.getByTestId("pause-motion").click(); await expect(page.getByTestId("pause-motion")).toHaveAttribute("aria-pressed", "true"); });
