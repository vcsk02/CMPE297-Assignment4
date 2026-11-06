import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { sandboxDocument } from "../app/web/sandbox.mjs";
const server = spawn(
  "python3",
  ["-m", "uvicorn", "app.server:app", "--port", "8765"],
  { stdio: "ignore" },
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/tmp/cmpe-chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage(),
  results = [];
try {
  await new Promise((r) => setTimeout(r, 1400));
  for (const topic of [
    "a2ui",
    "agui",
    "mcp-apps",
    "json-render",
    "openui",
    "harness",
  ]) {
    await page.goto(`http://127.0.0.1:8765/?topic=${topic}`);
    await page
      .getByRole("button", { name: "02 · declarative", exact: true })
      .click();
    await page.locator("#prompt").fill("Show a compact resource dashboard");
    await page.locator("#run").click();
    await page.waitForTimeout(1800);
    let surface = page.locator("#surface");
    if (topic === "mcp-apps") surface = page.frameLocator(".mcp-frame");
    if (await surface.getByText("Median arrival", { exact: false }).count())
      throw Error(topic + ": compact did not remove arrival metric");
    await surface
      .getByRole("button", { name: "Acknowledge plan", exact: true })
      .click();
    await page.waitForTimeout(350);
    const trace = await page.locator("#trace").innerText();
    if (!trace.includes("accepted"))
      throw Error(topic + ": action result missing");
    results.push({ topic, compact: true, action_round_trip: true });
  }
  const requests = [],
    failed = [],
    finished = [];
  page.on("request", (r) => {
    if (r.url().includes("example.com")) requests.push(r.url());
  });
  page.on("requestfailed", (r) => {
    if (r.url().includes("example.com")) failed.push(r.failure()?.errorText);
  });
  page.on("requestfinished", (r) => {
    if (r.url().includes("example.com")) finished.push(r.url());
  });
  await page.setContent('<main id="holder"></main>');
  await page.evaluate((doc) => {
    const f = document.createElement("iframe");
    f.sandbox = "";
    f.srcdoc = doc;
    document.querySelector("main").append(f);
  }, sandboxDocument('<script>window.__ran=true;parent.__escaped=true</script><img src="https://example.com/tracker">'));
  await page.waitForTimeout(300);

  if (
    finished.length ||
    failed.length !== requests.length ||
    failed.some((e) => e !== "csp" && !e.includes("BLOCKED_BY_CSP"))
  )
    throw Error("Generated resource was not blocked by CSP");
  if (await page.evaluate(() => window.__escaped))
    throw Error("Generated sandbox escaped");
  const generated = page.frames()[1];
  if (await generated.evaluate(() => window.__ran))
    throw Error("Generated script executed");
  await fs.writeFile(
    "evidence/interaction-results.json",
    JSON.stringify(
      {
        results,
        sandbox: {
          script_blocked: true,
          parent_access_blocked: true,
          network_blocked: true,
        },
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: six compact layouts, six action round trips, generated scripts and network blocked.",
  );
} finally {
  await browser.close();
  server.kill();
}
