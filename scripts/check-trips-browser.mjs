import { strict as assert } from "node:assert";
import fs from "node:fs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "darwin"
    ? {
        executablePath:
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage(),
  errors = [],
  external = [],
  checks = [];
const base =
  "http://127.0.0.1:4180/docs/experience-implementation/browser/?screen=%2Fcalendar%2Ftrips";
const output = "docs/experience-implementation/browser-evidence";
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (
    /^https?:/.test(request.url()) &&
    !request.url().startsWith("http://127.0.0.1:4180/")
  )
    external.push(request.url());
});
const check = (name) => {
  checks.push({ name, passed: true });
  console.log("PASS " + name);
};
try {
  await page.goto(base);
  await page
    .getByRole("heading", { name: "Trips & packing", exact: true })
    .waitFor();
  await page.locator("#trip-day-panel .trip-outfit-card").waitFor();
  const initialTrip = await page
    .getByRole("combobox", { name: "Choose a trip" })
    .inputValue();
  assert.equal(await page.locator('.trip-day-strip [role="tab"]').count(), 3);
  assert.equal(
    await page.locator("#trip-day-panel .trip-outfit-card").count(),
    1,
  );
  assert.equal(
    await page.locator(".trip-outfit-card .outfit-composition-piece").count(),
    7,
  );
  await page
    .getByRole("region", { name: "Weather for selected trip day" })
    .getByText("20%", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Rebuild Checklist", exact: true })
      .count(),
    0,
  );
  await page.screenshot({
    path: output + "/trips-desktop.png",
    fullPage: true,
  });
  check(
    "Trip overview, weather day strip, and one focused seven-piece look replace stacked planners",
  );
  await page.getByRole("tab", { name: /^Day 3,/ }).click();
  await page
    .getByRole("button", { name: "Choose saved outfit", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search saved outfits" })
    .fill("Weekend");
  await page
    .getByRole("dialog", { name: "Choose a saved outfit" })
    .getByRole("button", { name: /Weekend favorites/ })
    .click();
  await page
    .locator(".trip-outfit-card")
    .getByRole("heading", { name: "Weekend favorites", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: /^Packing list/ }).click();
  assert.equal(
    await page.getByRole("checkbox", { name: /Blue Oxford shirt/ }).count(),
    1,
  );
  const sharedPiece = page.getByRole("checkbox", {
    name: /White Oxford shirt/,
  });
  await sharedPiece.check();
  await page
    .getByRole("textbox", { name: "Add another essential" })
    .fill("Travel adapter");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByText("Travel adapter", { exact: true }).waitFor();
  await page.reload();
  await page.getByRole("tab", { name: /^Packing list/ }).click();
  assert.equal(
    await page
      .getByRole("checkbox", { name: /White Oxford shirt/ })
      .isChecked(),
    true,
  );
  await page.getByText("Travel adapter", { exact: true }).waitFor();
  await page.screenshot({
    path: output + "/trips-packing-desktop.png",
    fullPage: true,
  });
  check(
    "Saved looks update packing automatically; shared pieces, packed state, and manual essentials survive reload",
  );
  await page.getByRole("tab", { name: /^Outfits by day/ }).click();
  await page
    .getByRole("button", { name: "Add another look", exact: true })
    .click();
  await page.getByRole("button", { name: "Look 3", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Look 3", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page
    .getByRole("button", { name: "Remove Look 3 look", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Remove this look?" })
    .getByRole("button", { name: "Keep it", exact: true })
    .click();
  assert.ok(
    await page.getByRole("button", { name: "Look 3", exact: true }).isVisible(),
  );
  check(
    "Additional daily looks remain available and removal requires confirmation",
  );
  await page.getByRole("button", { name: "Trip details", exact: true }).click();
  const start = await page
    .getByLabel("Trip start date", { exact: true })
    .inputValue();
  await page.getByLabel("Trip end date", { exact: true }).fill(start);
  await page
    .getByRole("checkbox", { name: /Remove 2 planned looks outside/ })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Save trip details", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByRole("dialog", { name: "Trip details" })
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.getByRole("button", { name: "Trip details", exact: true }).click();
  assert.notEqual(
    await page.getByLabel("Trip end date", { exact: true }).inputValue(),
    start,
  );
  await page
    .getByRole("button", { name: "Delete this trip", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Delete this trip?" })
    .getByRole("button", { name: "Keep it", exact: true })
    .click();
  assert.equal(
    await page.getByRole("combobox", { name: "Choose a trip" }).inputValue(),
    initialTrip,
  );
  check(
    "Shortening dates discloses lost looks, Cancel discards the draft, and trip deletion requires confirmation",
  );
  await page
    .getByRole("button", { name: /^(Plan trip outfits|Fill unplanned days)$/ })
    .click();
  await page
    .getByRole("dialog", { name: "Plan trip outfits", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("combobox", { name: "Which looks?", exact: true })
      .inputValue(),
    "skip",
  );
  await page.getByText("More planning options", { exact: true }).click();
  assert.equal(
    await page
      .getByRole("checkbox", {
        name: "Also add planned outfits to my calendar",
        exact: true,
      })
      .isChecked(),
    false,
  );
  await page.keyboard.press("Escape");
  check(
    "Trip planning keeps existing looks by default and calendar syncing requires an explicit choice",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  await page.screenshot({
    path: output + "/trips-redesign-mobile.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: /^Packing list/ }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  await page.screenshot({
    path: output + "/trips-packing-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  check(
    "Both trip workspaces fit a phone with no browser errors or external calls",
  );
} finally {
  fs.writeFileSync(
    "docs/experience-implementation/trips-browser-validation.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        scope:
          "Real trip components, synthetic persisted I/O; no hosted database or paid provider calls",
        checks,
        errors,
        externalRequests: external,
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}
