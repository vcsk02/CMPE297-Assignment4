import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
const server = spawn(
  "python3",
  ["-m", "uvicorn", "app.server:app", "--port", "8765"],
  { stdio: "ignore" },
);
process.on("exit", () => server.kill());
await new Promise((r) => setTimeout(r, 1700));
const executablePath = process.env.CHROMIUM_PATH || "/tmp/cmpe-chromium";
const browser = await chromium.launch({
  executablePath,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [],
  results = [];
page.on("pageerror", (e) => errors.push(e.message));
for (const topic of [
  "a2ui",
  "agui",
  "mcp-apps",
  "json-render",
  "openui",
  "harness",
]) {
  await page.goto(`http://127.0.0.1:8765/?topic=${topic}`);
  for (const mode of ["static", "declarative", "open-ended", "mixed"]) {
    await page
      .getByRole("button", { name: new RegExp(`^0[1-4] · ${mode}$`) })
      .click();
    await page.locator("#run").click();
    await page.waitForTimeout(topic === "agui" ? 1800 : 1200);
    const surface = await page.locator("#surface").innerText();
    const frames = page.frames();
    const frameTexts = await Promise.all(
      frames.slice(1).map((f) =>
        f
          .locator("body")
          .innerText()
          .catch(() => ""),
      ),
    );
    const shadow = (await page.locator("#surface *").allTextContents()).join(
      " ",
    );
    const all = surface + " " + shadow + " " + frameTexts.join(" ");
    if (
      !all.includes(
        mode === "open-ended"
          ? "Custom deployment map"
          : "Available response units",
      )
    )
      throw Error(`${topic}/${mode}: blank or wrong surface: ${all}`);
    if (
      ["mixed", "open-ended"].includes(mode) &&
      !all.includes("Custom deployment map")
    )
      throw Error(`${topic}/${mode}: missing artifact`);
    await page.screenshot({
      path: `evidence/${topic}-${mode}.png`,
      fullPage: true,
    });
    results.push({ topic, mode, rendered: true, frames: frames.length - 1 });
  }
}
await fs.writeFile(
  "evidence/browser-results.json",
  JSON.stringify({ results, errors }, null, 2),
);
await browser.close();
server.kill();
if (errors.length) throw Error(errors.join("\n"));
console.log(`PASS: ${results.length} browser cases; no page errors.`);
