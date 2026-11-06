// Capture all modes again after a UI change; keep the existing narration timeline.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const parts = JSON.parse(await fs.readFile("docs/parts.json", "utf8"));
const server = spawn(
  "python3",
  ["-m", "uvicorn", "app.server:app", "--port", "8765"],
  { stdio: "ignore" },
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/tmp/cmpe-chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }),
  errors = [],
  results = [];
page.on("pageerror", (e) => errors.push(e.message));
await new Promise((r) => setTimeout(r, 1400));
try {
  for (const part of parts) {
    const stem = `${String(part.number).padStart(2, "0")}-${part.slug}`,
      dir = path.resolve("videos/raw", stem);
    await page.goto(`http://127.0.0.1:8765/?topic=${part.slug}`);
    for (const mode of ["static", "declarative", "open-ended", "mixed"]) {
      await page
        .getByRole("button", { name: new RegExp(`^0[1-4] · ${mode}$`) })
        .click();
      await page
        .locator("#prompt")
        .fill("Show a detailed emergency resource dashboard");
      await page.locator("#run").click();
      for (let tick = 0; tick < 4; tick++) {
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(dir, `${mode}-${tick}.png`) });
      }
      await page.waitForTimeout(500);
      const texts =
        (await page.locator("#surface *").allTextContents()).join(" ") +
        (
          await Promise.all(
            page
              .frames()
              .slice(1)
              .map((f) =>
                f
                  .locator("body")
                  .innerText()
                  .catch(() => ""),
              ),
          )
        ).join(" ");
      if (
        !texts.includes(
          mode === "open-ended"
            ? "Custom deployment map"
            : "Available response units",
        )
      )
        throw Error(stem + "/" + mode + " failed");
      if (
        ["mixed", "open-ended"].includes(mode) &&
        !texts.includes("Custom deployment map")
      )
        throw Error("Missing artifact");
      await page.screenshot({
        path: `evidence/${part.slug}-${mode}.png`,
        fullPage: true,
      });
      if (["mixed", "open-ended"].includes(mode))
        await page.evaluate(() => window.scrollTo(0, 380));
      await page.screenshot({ path: path.join(dir, `${mode}-result.png`) });
      await page.evaluate(() => window.scrollTo(0, 0));
      results.push({
        topic: part.slug,
        mode,
        rendered: true,
        frames: page.frames().length - 1,
      });
    }
    await page
      .getByRole("button", { name: "02 · declarative", exact: true })
      .click();
    await page.locator("#prompt").fill("Show a compact resource dashboard");
    await page.locator("#run").click();
    await page.waitForTimeout(1700);
    await page.screenshot({ path: path.join(dir, "compact.png") });
    let button = page
      .locator("#surface")
      .getByRole("button", { name: "Acknowledge plan", exact: true });
    if (part.slug === "mcp-apps")
      button = page
        .frameLocator("iframe.mcp-frame")
        .getByRole("button", { name: "Acknowledge plan", exact: true });
    await button.click();
    await page.waitForTimeout(400);
    if (!(await page.locator("#trace").innerText()).includes("accepted"))
      throw Error(part.slug + ": missing action result");
    await page
      .locator("#trace")
      .evaluate((e) => (e.scrollTop = e.scrollHeight));
    await page.screenshot({ path: path.join(dir, "action.png") });
    console.log("Captured modes and action for " + stem);
  }
  await fs.writeFile(
    "evidence/browser-results.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser.close();
  server.kill();
}
