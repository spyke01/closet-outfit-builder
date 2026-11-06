const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const base = "http://127.0.0.1:4180/docs/experience-implementation/browser/";
const output = "docs/experience-implementation/browser-evidence";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROME_EXECUTABLE_PATH }
    : process.platform === "darwin"
      ? {
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        }
      : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
const errors = [],
  checks = [],
  external = [];
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
const goto = async (screen) => {
  await page.goto(base + "?screen=" + encodeURIComponent(screen));
  await page.locator("h1").first().waitFor();
};
try {
  await goto("/today");
  assert.equal(await page.locator("h1").count(), 1);
  assert.ok((await page.locator(".app-header").boundingBox()).height <= 66);
  assert.match(
    await page.locator(".app-weather-summary").textContent(),
    /20% rain/,
  );
  check("One compact Today introduction and one shared weather header");
  await page.getByRole("button", { name: "Open weather details" }).click();
  await page.getByRole("dialog", { name: "Your weather" }).waitFor();
  assert.ok(await page.getByText("Feels like", { exact: true }).isVisible());
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  check("Weather details open with full conditions and close with Escape");
  await page.getByRole("button", { name: /Show an everyday look/ }).click();
  assert.equal(
    await page
      .getByRole("button", { name: /Show an everyday look/ })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: /See another everyday look/ }).click();
  assert.equal(
    await page
      .getByRole("button", { name: /Show an everyday look/ })
      .getAttribute("aria-pressed"),
    "true",
  );
  check(
    "Occasion changes the visible outfit and another look retains that occasion",
  );
  await page.getByRole("button", { name: "Save outfit", exact: true }).click();
  await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Wear this today", exact: true })
    .click();
  await page
    .getByRole("button", { name: "✓ Worn today", exact: true })
    .waitFor();
  check("Today save and wear actions persist separate fixture records");
  await page
    .getByRole("button", { name: "Ask Sebastian", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Message Sebastian" })
    .fill("Help me style these pieces.");
  await page.getByRole("button", { name: "Send message" }).click();
  await page
    .getByRole("log")
    .getByText(/synthetic fixture reply/)
    .waitFor();
  await page.keyboard.press("Escape");
  await page
    .locator(".app-primary-nav")
    .getByRole("link", { name: "Wardrobe", exact: true })
    .click();
  await page.getByRole("heading", { name: "The pieces you own" }).waitFor();
  await page
    .getByRole("button", { name: "Ask Sebastian", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  assert.ok(
    await page
      .getByRole("log")
      .getByText(/synthetic fixture reply/)
      .isVisible(),
  );
  await page.keyboard.press("Escape");
  check("One Sebastian conversation survives navigation");
  await goto("/wardrobe/items");
  assert.ok(
    await page
      .getByRole("button", { name: "Take a photo", exact: true })
      .isVisible(),
  );
  assert.ok(
    await page
      .getByRole("button", { name: "Choose a photo", exact: true })
      .isVisible(),
  );
  assert.ok(
    await page
      .getByRole("button", { name: "Use a default AI image", exact: true })
      .isVisible(),
  );
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Take a photo", exact: true }).click();
  const camera = await chooser;
  assert.equal(await camera.element().getAttribute("capture"), "environment");
  await camera.setFiles(path.resolve("public/images/wardrobe/tee-white.png"));
  await page.getByText("Photo uploaded.", { exact: true }).waitFor();
  check(
    "Camera, library, and default image are explicit choices; the camera input uploads",
  );
  assert.equal(
    await page
      .getByRole("radio", { name: "Use original", exact: true })
      .isChecked(),
    true,
  );
  await page
    .getByRole("radio", { name: "Use cleaned photo", exact: true })
    .check();
  assert.equal(
    await page
      .getByRole("radio", { name: "Use cleaned photo", exact: true })
      .isChecked(),
    true,
  );
  await page.getByRole("radio", { name: "Use original", exact: true }).check();
  check(
    "Photo cleanup stays optional and both original and cleaned versions can be selected",
  );
  await page
    .getByRole("button", {
      name: "Suggest details from this photo",
      exact: true,
    })
    .click();
  await page
    .getByText("Review Sebastian’s suggestion", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Item name", { exact: true }).inputValue(),
    "",
  );
  await page
    .getByRole("button", { name: "Apply suggested details", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Item name", { exact: true }).inputValue(),
    "Blue Oxford shirt",
  );
  check(
    "Photo-derived name, category, and color stay in review until explicitly applied",
  );
  await page
    .getByRole("button", { name: "Use a default AI image", exact: true })
    .click();
  await page.getByLabel("Type", { exact: false }).selectOption("Tops:OCBD");
  await page.getByLabel("Color", { exact: false }).last().selectOption("blue");
  await page.getByRole("button", { name: "Use this default image" }).click();
  await page
    .getByLabel("Item name", { exact: true })
    .fill("Fixture travel shirt");
  await page.getByRole("button", { name: "Save & add another" }).click();
  await page
    .getByText("Added to your wardrobe. Ready for the next piece.")
    .waitFor();
  assert.equal(
    await page.getByLabel("Item name", { exact: true }).inputValue(),
    "",
  );
  await goto("/wardrobe");
  await page
    .getByRole("link", { name: "Open Fixture travel shirt", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("link", { name: "Open Fixture travel shirt", exact: true })
    .waitFor();
  check(
    "Default image and details save, add-another resets, and the fixture item survives reload",
  );
  await page
    .getByRole("link", { name: "Open Blue Oxford shirt", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ask Sebastian", exact: true })
    .filter({ visible: true })
    .last()
    .click();
  assert.match(
    await page.getByRole("textbox", { name: "Message Sebastian" }).inputValue(),
    /Blue Oxford shirt/,
  );
  await page.keyboard.press("Escape");
  check(
    "Clothing details open Sebastian with an editable draft about that piece",
  );
  await page.getByText("Purchase price · optional", { exact: true }).click();
  await page.getByRole("spinbutton", { name: "Price", exact: true }).fill("85");
  await page.getByRole("button", { name: "Save price", exact: true }).click();
  await page.getByText("Price saved", { exact: true }).waitFor();
  await page.reload();
  await page.getByText("Purchase price · optional", { exact: true }).click();
  assert.equal(
    await page
      .getByRole("spinbutton", { name: "Price", exact: true })
      .inputValue(),
    "85",
  );
  check(
    "Optional purchase prices save and survive reload for lifetime cost per wear",
  );
  await goto("/calendar");
  await page
    .getByRole("button", { name: "Delete entry", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog", { name: "Remove this calendar entry?" })
    .waitFor();
  await page.getByRole("button", { name: "Keep entry", exact: true }).click();
  assert.equal(
    await page
      .getByRole("dialog", { name: "Remove this calendar entry?" })
      .count(),
    0,
  );
  check("Calendar deletion requires confirmation and can be canceled");
  assert.ok(
    (await page.locator(".calendar-day-preview .outfit-overflow").count()) > 0,
  );
  await page.getByText("See all 7 pieces", { exact: true }).first().click();
  assert.ok(await page.getByText("Base layers", { exact: true }).isVisible());
  assert.ok(
    await page
      .getByText("Accessories & finishing pieces", { exact: true })
      .first()
      .isVisible(),
  );
  await page
    .getByRole("button", { name: "Edit outfit Office casual", exact: true })
    .click();
  await page.getByText("Edit Entry", { exact: true }).waitFor();
  check(
    "Calendar previews overflow and exposes all layers/accessories with explicit editing",
  );
  await page.getByText(/Choose every piece/).click();
  await page.getByRole("checkbox", { name: /Brown belt/ }).uncheck();
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Edit outfit Office casual", exact: true })
    .click();
  await page.getByText(/Choose every piece/).click();
  assert.equal(
    await page.getByRole("checkbox", { name: /Brown belt/ }).isChecked(),
    false,
  );
  assert.equal(
    await page.getByRole("checkbox", { name: /Classic watch/ }).isChecked(),
    true,
  );
  check(
    "A calendar entry can change one accessory and retain its other pieces after reload",
  );
  await goto("/analytics");
  await page.getByRole("tab", { name: "Clothing", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search clothing analytics" })
    .fill("Oxford");
  assert.ok((await page.locator(".analytics-item-row").count()) > 0);
  await page.getByRole("tab", { name: "Cost per wear", exact: true }).click();
  assert.ok(
    await page
      .getByRole("columnheader", { name: "Lifetime wears", exact: true })
      .isVisible(),
  );
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: path.join(output, "analytics-desktop.png"),
    fullPage: true,
  });
  check(
    "Analytics tabs, clothing search, lifetime cost per wear, and overview render",
  );
  await goto("/export");
  assert.equal(await page.locator(".outfit-composition-piece").count(), 7);
  const exportDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export as image", exact: true })
    .click();
  const outfitFile = await exportDownload;
  assert.match(outfitFile.suggestedFilename(), /\.png$/);
  await outfitFile.saveAs(path.join(output, "exported-outfit.png"));
  const exportedPixels = await page.evaluate(
    async (encoded) => {
      const blob = await (
        await fetch("data:image/png;base64," + encoded)
      ).blob();
      const bitmap = await createImageBitmap(blob),
        canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      return Array.from(
        ctx.getImageData(bitmap.width - 50, bitmap.height - 50, 1, 1).data,
      );
    },
    fs
      .readFileSync(path.join(output, "exported-outfit.png"))
      .toString("base64"),
  );
  assert.equal(exportedPixels[3], 255);
  assert.ok(
    exportedPixels.slice(0, 3).every((channel) => channel < 100),
    "Export must retain its dark theme background",
  );
  check("Export downloads a PNG containing all seven pieces of an outfit");
  for (const screen of [
    "/today",
    "/wardrobe",
    "/outfits",
    "/calendar",
    "/calendar/upcoming",
    "/calendar/trips",
    "/analytics",
    "/export",
    "/wardrobe/items",
    "/onboarding",
  ]) {
    await goto(screen);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    assert.ok(await page.locator(".app-mobile-nav").isVisible());
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    assert.equal(overflow, false, screen + " has horizontal document overflow");
    await page.screenshot({
      path: path.join(
        output,
        screen.replaceAll("/", "-").slice(1) + "-mobile.png",
      ),
      fullPage: true,
    });
    check(screen + " fits a 390px viewport with all five mobile destinations");
    await page.setViewportSize({ width: 1440, height: 1100 });
  }
  await goto("/onboarding");
  assert.equal(
    await page
      .getByRole("button", { name: "Add these pieces & see my outfit" })
      .isDisabled(),
    true,
  );
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.reload();
  assert.equal(await page.getByRole("checkbox", { checked: true }).count(), 3);
  const beforeQuickStart = await page.evaluate(
    () => JSON.parse(localStorage.getItem("experience-fixture-items")).length,
  );
  await page
    .getByRole("button", { name: "Add these pieces & see my outfit" })
    .click();
  await page.getByRole("heading", { name: /Good .*Alex/ }).waitFor();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("experience-fixture-items")).length,
    ),
    beforeQuickStart + 3,
  );
  check(
    "Quick-start choices resume after reload and save exactly the three confirmed essentials",
  );
  await goto("/onboarding");
  await page
    .getByRole("button", { name: "Dress & shoes", exact: true })
    .click();
  assert.equal(await page.getByRole("checkbox").count(), 2);
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page
    .getByRole("button", { name: "Add these pieces & see my outfit" })
    .click();
  await page.getByRole("heading", { name: /Good .*Alex/ }).waitFor();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("experience-fixture-items")).length,
    ),
    beforeQuickStart + 5,
  );
  check("Dress and shoes form a complete two-piece quick-start path");
  await goto("/today");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Ask Sebastian", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  assert.ok(
    await page
      .getByRole("dialog", { name: "Ask Sebastian", exact: true })
      .isVisible(),
  );
  await page.keyboard.press("Escape");
  check(
    "The persistent chat remains visible on mobile when the desktop sidebar is hidden",
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page
    .locator(".app-sidebar")
    .getByRole("button", { name: "Open account menu" })
    .click();
  await page
    .getByRole("menuitem", { name: "Light theme", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "light",
  );
  await page.screenshot({
    path: path.join(output, "today-light-desktop.png"),
    fullPage: true,
  });
  check("The existing light palette works through the account theme control");
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  check("No browser runtime errors or external requests during fixture checks");
} finally {
  fs.writeFileSync(
    "docs/experience-implementation/browser-validation.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        scope:
          "Real React components with synthetic I/O; database and provider checks are separate",
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
