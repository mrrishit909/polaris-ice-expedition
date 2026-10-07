import { expect, test, type Page } from "@playwright/test";
const open = async (page: Page, url: string) => { await page.goto(url); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); await expect(page.locator(".app")).toHaveAttribute("data-intro", "done"); await expect(page.getByTestId("hud")).toHaveCSS("opacity", "1"); };
const num = async (page: Page, id: string) => Number((await page.getByTestId(id).textContent())!.replace(/[^0-9.\-]/g, ""));
type W = { __pLive: { camT: number; fog: number; routeGlow: number; crack: number; introRover: number } };

// Blueprint section 19, the demo script.
test("demo walk: whiteout intro, route planner, ice risk, compare routes, storm front, rover telemetry, replay", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByTestId("skip-intro")).toBeVisible(); await expect(page.getByTestId("intro")).toHaveAttribute("data-step", /[0-9]/);
  await page.getByTestId("skip-intro").click(); await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 40_000 });
  await expect(page.getByTestId("hud")).toHaveCSS("opacity", "1", { timeout: 10_000 }); // toBeVisible ignores opacity, so assert it
  const L = await page.evaluate(() => (window as unknown as W).__pLive); expect(L.camT).toBe(3); expect(L.routeGlow).toBe(1); expect(L.fog).toBeLessThan(0.01);
  await expect(page.getByRole("heading", { name: "Expedition map" })).toBeVisible();
  // ice risk overlay on the map
  await page.getByTestId("overlay-risk").check(); await expect(page.getByTestId("risk-overlay")).toBeVisible(); await page.getByTestId("overlay-risk").uncheck();
  // route planner: direct against safe ice
  await page.getByTestId("nav-routes").click(); await page.getByTestId("route-a").selectOption("direct"); await page.getByTestId("route-b").selectOption("safe");
  expect(await num(page, "cmp-a-dist")).toBeLessThan(await num(page, "cmp-b-dist")); expect(await num(page, "cmp-b-maxrisk")).toBeLessThan(await num(page, "cmp-a-maxrisk")); expect(await num(page, "cmp-b-minice")).toBeGreaterThan(await num(page, "cmp-a-minice")); await expect(page.getByTestId("route-verdict")).toContainText("is safer");
  await page.getByTestId("fly-b").click(); await expect(page.getByTestId("active-route")).toContainText("Safe ice"); await page.getByTestId("select-b").click();
  // weather: the front crosses the region and meets a late departure
  await page.getByTestId("nav-weather").click(); await page.getByTestId("hour").fill("10"); const calm = await num(page, "wx-storm"); await page.getByTestId("hour").fill("35"); expect(await num(page, "wx-storm")).toBeGreaterThan(calm + 0.5); expect(await num(page, "wx-vis")).toBeLessThan(10);
  await page.getByTestId("wx-route").selectOption("direct"); await page.getByTestId("depart").fill("20"); await expect(page.getByTestId("wx-exposure")).toContainText("inside the front"); const direct = await num(page, "wx-exposure"); void direct;
  await expect(page.getByTestId("arrival-A")).toBeVisible();
  // rovers: telemetry for the selected rover follows the hour
  await page.getByTestId("nav-rovers").click(); await page.getByTestId("veh-R3").click(); await page.getByTestId("hour").fill("27"); const fuel = await num(page, "tel-fuel"); await page.getByTestId("hour").fill("50"); expect(await num(page, "tel-fuel")).toBeLessThan(fuel); await expect(page.getByTestId("tel-status")).not.toBeEmpty();
  // replay the 2025 expedition
  await page.getByTestId("replay-toggle").check(); await expect(page.getByTestId("prev-line")).toBeVisible(); const d0 = await page.getByTestId("replay-date").textContent(); await page.getByTestId("replay-f").fill("0.6"); expect(await page.getByTestId("replay-date").textContent()).not.toBe(d0); expect(await num(page, "replay-change")).toBeLessThan(0);
  expect(errors).toEqual([]);
});
test("ice layers: the legend, the cell inspector and the sector table work from the DOM", async ({ page }) => {
  await open(page, "/?skip=1&view=ice"); await expect(page.getByTestId("sectors").locator("tbody tr")).toHaveCount(12); await page.getByTestId("layer").selectOption("risk"); await expect(page.getByTestId("legend")).toContainText("broken");
  await page.getByTestId("map").locator(".cell").nth(500).click(); await expect(page.getByTestId("cell-thickness")).toBeVisible(); const th = await num(page, "cell-thickness"); await expect(page.getByTestId("cell-safe")).toHaveAttribute("data-safe", String(th >= 30.6));
  await page.getByTestId("layer").selectOption("confidence"); await expect(page.getByTestId("legend")).toContainText("high");
});
test("the storm front moves with the hour and play advances time", async ({ page }) => {
  await open(page, "/?skip=1&view=weather&hour=30"); const h0 = await page.getByTestId("storm-front").getAttribute("data-hour"); await page.getByTestId("play").click(); await expect.poll(async () => Number(await page.getByTestId("storm-front").getAttribute("data-hour")), { timeout: 8000 }).toBeGreaterThan(Number(h0) + 1); await page.getByTestId("play").click();
});
test("custom route weights change the planned route", async ({ page }) => {
  await open(page, "/?skip=1&view=routes"); await page.getByTestId("route-a").selectOption("custom"); await page.getByTestId("w-risk").fill("0"); await page.getByTestId("w-support").fill("0"); const d0 = await num(page, "cmp-a-dist"), r0 = await num(page, "cmp-a-maxrisk"); await page.getByTestId("w-risk").fill("1"); expect(await num(page, "cmp-a-maxrisk")).toBeLessThan(r0); expect(await num(page, "cmp-a-dist")).toBeGreaterThan(d0);
});
test("satellite passes: sensors differ, cloud hides optical cells, the swath and difference layer show", async ({ page }) => {
  await open(page, "/?skip=1&view=satellite"); await page.getByTestId("pass-P1").click(); const sar = await num(page, "obs-mae"); await page.getByTestId("pass-P3").click(); expect(await num(page, "obs-mae")).toBeGreaterThan(sar); await page.getByTestId("pass-P5").click(); await expect(page.getByTestId("obs-seen")).toContainText("of"); await expect(page.getByTestId("swath")).toBeVisible(); await page.getByTestId("show-diff").check();
});
test("deep link opens a view at an hour", async ({ page }) => { await open(page, "/?view=rovers&hour=40"); await expect(page.getByTestId("hour-out")).toHaveText("40"); });
test("refresh mid-sequence restarts the intro cleanly", async ({ page }) => { await page.goto("/"); await page.waitForTimeout(1500); await page.reload(); await expect(page.getByTestId("intro")).toHaveAttribute("data-step", /[01]/); });
test("keyboard: views and the time slider are reachable without a pointer", async ({ page }) => {
  await open(page, "/?skip=1&view=map&hour=10"); await expect(async () => { await page.getByTestId("hour").focus(); await expect(page.getByTestId("hour")).toBeFocused({ timeout: 500 }); }).toPass({ timeout: 15_000 });
  const h0 = await num(page, "hour-out"); await expect(async () => { await page.getByTestId("hour").focus(); await page.keyboard.press("ArrowRight"); expect(await num(page, "hour-out")).toBeGreaterThan(h0); }).toPass({ timeout: 10_000 }); const h1 = await num(page, "hour-out"); await page.keyboard.press("ArrowRight"); await expect.poll(() => num(page, "hour-out")).toBeGreaterThan(h1);
});
test("choices made while the intro's last fade is still running are kept", async ({ page }) => {
  await page.goto("/"); await page.getByTestId("skip-intro").click(); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("nav-routes").click(); await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 40_000 }); await expect(page.getByRole("heading", { name: "Route planner" })).toBeVisible();
});
test("the intro's crack becomes the route: the glow is complete and the camera has reached the map", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => (window as unknown as W).__pLive?.crack > 0.2, null, { timeout: 40_000 }); const mid = await page.evaluate(() => (window as unknown as W).__pLive.routeGlow); expect(mid).toBeLessThan(1);
  await page.getByTestId("skip-intro").click(); await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 40_000 }); const L = await page.evaluate(() => (window as unknown as W).__pLive); expect(L.routeGlow).toBe(1); expect(L.camT).toBe(3); expect(L.introRover).toBe(0);
});
