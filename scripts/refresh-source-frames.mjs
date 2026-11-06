// Refit code capture cards to the video viewport, then remux original execution captures and narration.
import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
const parts = JSON.parse(await fs.readFile("docs/parts.json", "utf8"));
const extras = {
  a2ui: ["app/adapters/formats.py", "app/web/a2ui.jsx"],
  agui: ["app/adapters/events.py", "app/web/transport.mjs"],
  "mcp-apps": [
    "app/mcp_server.py",
    "app/web/mcp-host.jsx",
    "app/web/mcp-view.html",
  ],
  "json-render": ["app/web/catalog.jsx"],
  openui: ["app/adapters/formats.py", "app/web/catalog.jsx"],
  harness: ["app/harness.py", "app/web/catalog.jsx"],
};
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/tmp/cmpe-chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
try {
  for (const part of parts) {
    const stem = `${String(part.number).padStart(2, "0")}-${part.slug}`,
      dir = path.resolve("videos/raw", stem);
    let index = 1;
    async function source(file, start, lines, title) {
      await page.setContent(
        `<style>body{margin:0;background:#102f29;color:#d6eddf;font:22px system-ui;padding:40px 48px}h1{font-size:34px;margin:10px 0 22px}h2{font-size:20px;color:#91c8ad}pre{font:17px/1.3 'DejaVu Sans Mono',monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#0c241f;border:1px solid #345f4d;padding:16px}.line{color:#739a85;display:inline-block;width:52px}footer{font-size:14px;color:#83ac98;position:absolute;bottom:20px}</style><h2>CMPE297 · PART ${part.number} · ${escape(part.title)}</h2><h1>${escape(title)}</h1><pre>${lines.map((line, i) => `<span class="line">${start + i + 1}</span>${escape(line)}`).join("\n")}</pre><footer>Actual repository source · synthetic narration · replay baseline</footer>`,
      );
      await page.evaluate(() => {
        const p = document.querySelector("pre");
        let size = 17;
        while (p.getBoundingClientRect().bottom > 946 && size > 10) {
          size -= 0.25;
          p.style.fontSize = size + "px";
        }
      });
      const box = await page.locator("pre").boundingBox();
      if (box.y + box.height > 946) throw Error("Code card overflows: " + file);
      await page.screenshot({
        path: path.join(dir, `screen-${String(index++).padStart(3, "0")}.png`),
      });
    }
    for (const file of [
      "app/core.py",
      ...extras[part.slug],
      "app/web/sandbox.mjs",
    ]) {
      const lines = (await fs.readFile(file, "utf8")).split("\n");
      for (let start = 0; start < lines.length; start += 34)
        await source(
          file,
          start,
          lines.slice(start, start + 34),
          `${file} · lines ${start + 1}–${Math.min(start + 34, lines.length)}`,
        );
    }
    for (const [file, needle] of [
      ["app/server.py", "@app.post('/api/generate')"],
      ["app/web/main.jsx", "async function run"],
    ]) {
      const lines = (await fs.readFile(file, "utf8")).split("\n"),
        start = Math.max(
          0,
          lines.findIndex((l) => l.includes(needle)),
        );
      await source(
        file,
        start,
        lines.slice(start, start + 34),
        `${file} · request orchestration`,
      );
    }
    execFileSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        path.join(dir, "images.txt"),
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        path.join(dir, "audio.txt"),
        "-vf",
        "fps=8,scale=1600:1000,format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "25",
        "-c:a",
        "aac",
        "-b:a",
        "80k",
        "-movflags",
        "+faststart",
        "-shortest",
        "-y",
        `videos/${stem}.mp4`,
      ],
      { maxBuffer: 1048576 },
    );
    console.log(`Verified source frames fit and rebuilt ${stem}`);
  }
} finally {
  await browser.close();
}
