/** Capture executed browser states and readable source, then add synthetic narration.
 * Requires ffmpeg with libflite and a Chromium executable (CHROMIUM_PATH).
 * These are automated narrated walkthroughs, not student microphone recordings.
 */
import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
const root = process.cwd(),
  raw = path.join(root, "videos/raw");
await fs.mkdir(raw, { recursive: true });
const parts = JSON.parse(await fs.readFile("docs/parts.json", "utf8"));
const notes = JSON.parse(await fs.readFile("docs/source-notes.json", "utf8"));
const server = spawn(
  "python3",
  ["-m", "uvicorn", "app.server:app", "--port", "8765"],
  { stdio: "ignore" },
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/tmp/cmpe-chromium",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const codePage = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
});
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
await new Promise((r) => setTimeout(r, 1400));
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const time = (s) => {
  const ms = Math.round(s * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};
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
const coreNarrations = [
  "The shared core declares the six topics, four modes and five allowed components. Validate first checks the number of nodes and the root. It tracks visiting and visited nodes so cycles and missing children cannot enter the renderer. The catalog is the application contract.",
  "The validation walk checks component names and exact property names. Every property must be a bounded string. Stack direction is an enum, and Button actions can only acknowledge. Only Stack can have children. The walk rejects unreachable nodes as well as excessive graph depth.",
  "Replay is explicitly a scripted agent. The application constructs a title, two metrics and the acknowledge action. Static mode preserves this layout. In other modes, compact removes the arrival metric and detailed adds a synthetic regional note. These keywords make layout differences reproducible.",
  "For open-ended and mixed mode, replay creates a custom HTML deployment map. User prompt text is escaped before insertion into this fixture. Open-ended replaces catalog content with the generated region. Mixed inserts the same artifact alongside the application components. These two contracts expose different amounts of freedom.",
  "Generate defaults to replay. Only the explicit openai provider loads the model client. The system prompt sends the catalog and an example graph, and requests a JSON result. A live result is parsed and validated before format adaptation. There is no silent switch from a failed model call to replay.",
  "The final checks enforce each live generation contract. Static cannot change its graph. Declarative forbids GeneratedView. Open-ended requires only structural Stack nodes and generated content. Mixed requires both catalog and generated content. The action endpoint separately authorizes the only permitted action.",
];
let manifest = {
  created_at: new Date().toISOString(),
  recording_type:
    "Automated browser execution capture and source walkthrough with synthetic speech",
  baseline: "deterministic replay; synthetic data; no live model calls",
  parts: [],
};
try {
  for (const part of parts) {
    const stem = `${String(part.number).padStart(2, "0")}-${part.slug}`,
      dir = path.join(raw, stem);
    await fs.mkdir(dir, { recursive: true });
    const scenes = [];
    let index = 0;
    async function scene(narration, images) {
      const id = String(index++).padStart(3, "0"),
        txt = path.join(dir, `${id}.txt`),
        wav = path.join(dir, `${id}.wav`);
      await fs.writeFile(txt, narration);
      execFileSync("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        `flite=textfile=${txt}:voice=slt`,
        "-y",
        wav,
      ]);
      const duration = Number(
        execFileSync(
          "ffprobe",
          [
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            wav,
          ],
          { encoding: "utf8" },
        ).trim(),
      );
      scenes.push({ narration, wav, duration, images });
    }
    async function card(
      title,
      body,
      footer = "Actual repository source · synthetic narration · replay baseline",
    ) {
      await codePage.setContent(
        `<html><style>body{margin:0;background:#102f29;color:#d6eddf;font:23px system-ui;padding:48px}h1{font-size:43px;margin:14px 0 30px}h2{font-size:21px;color:#91c8ad}p{line-height:1.6;max-width:1400px}pre{font:17px/1.45 'DejaVu Sans Mono',monospace;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:4;background:#0c241f;border:1px solid #345f4d;padding:20px;overflow:hidden}.line{color:#739a85;display:inline-block;width:54px}footer{font-size:15px;color:#83ac98;position:absolute;bottom:24px}</style><h2>CMPE297 · PART ${part.number} · ${escape(part.title)}</h2><h1>${escape(title)}</h1>${body}<footer>${escape(footer)}</footer></html>`,
      );
      await codePage.evaluate(() => {
        const p = document.querySelector("pre");
        if (!p) return;
        let size = 17;
        while (p.getBoundingClientRect().bottom > 946 && size > 10) {
          size -= 0.25;
          p.style.fontSize = size + "px";
        }
      });
      const image = path.join(
        dir,
        `screen-${String(index).padStart(3, "0")}.png`,
      );
      await codePage.screenshot({ path: image });
      return image;
    }
    await scene(
      `This is part ${part.number}, ${part.title}. This is an automated walkthrough with synthetic narration. The browser executes the repository code using deterministic replay and synthetic emergency resource data. No live model call or external application host is claimed. We will explain the implementation, execute static, declarative, open-ended and mixed modes, and inspect the actual results.`,
      [
        await card(
          "Four generation contracts",
          `<p>${escape(part.explanation)}</p><p>Static → Declarative → Open-ended → Mixed</p><p>Request → validate → adapt → render → authorize action</p>`,
        ),
      ],
    );
    // Show every line of shared core and the part-specific implementation.
    for (const file of [
      "app/core.py",
      ...extras[part.slug],
      "app/web/sandbox.mjs",
    ]) {
      const lines = (await fs.readFile(file, "utf8")).split("\n");
      for (let start = 0; start < lines.length; start += 34) {
        const content = lines
          .slice(start, start + 34)
          .map(
            (line, i) =>
              `<span class="line">${start + i + 1}</span>${escape(line)}`,
          )
          .join("\n");
        const shot = await card(
          `${file} · lines ${start + 1}–${Math.min(start + 34, lines.length)}`,
          `<pre>${content}</pre>`,
        );
        let narration =
          file === "app/core.py"
            ? coreNarrations[
                Math.min(Math.floor(start / 34), coreNarrations.length - 1)
              ]
            : `${file.split("/").at(-1)}, lines ${start + 1} through ${Math.min(start + 34, lines.length)}. ${notes[file]}`;
        // Long modules are explained at function boundaries in the written walkthrough too.
        await scene(narration, [shot]);
      }
    }
    // Shared route and UI orchestration are shown as actual source selections.
    for (const [file, needle, length, narration] of [
      [
        "app/server.py",
        "@app.post('/api/generate')",
        40,
        "The HTTP generation route checks topic and mode, runs the harness when selected, and otherwise generates a graph. A2UI and OpenUI receive their own adapters. AG-UI uses a separate event-stream endpoint. The action route checks authorization on the server. These are different delivery contracts around the same bounded task.",
      ],
      [
        "app/web/main.jsx",
        "async function run",
        48,
        "The browser run function clears the previous output and trace. MCP mode creates an app host. AG-UI consumes streamed events. Other topics post a generation request. Returned results and tool history become inspectable UI state. Later in this same module the surface selects the official renderer or the fixed static slots. The complete module is included in the written walkthrough.",
      ],
    ]) {
      const lines = (await fs.readFile(file, "utf8")).split("\n"),
        start = Math.max(
          0,
          lines.findIndex((l) => l.includes(needle)),
        );
      const shot = await card(
        `${file} · request orchestration`,
        `<pre>${lines
          .slice(start, start + Math.min(length, 34))
          .map(
            (l, i) => `<span class="line">${start + i + 1}</span>${escape(l)}`,
          )
          .join("\n")}</pre>`,
      );
      await scene(narration, [shot]);
    }
    await page.goto(`http://127.0.0.1:8765/?topic=${part.slug}`);
    for (const mode of ["static", "declarative", "open-ended", "mixed"]) {
      await page
        .getByRole("button", { name: new RegExp(`^0[1-4] · ${mode}$`) })
        .click();
      await page
        .locator("#prompt")
        .fill("Show a detailed emergency resource dashboard");
      await page.locator("#run").click();
      const images = [];
      for (let tick = 0; tick < 4; tick++) {
        await page.waitForTimeout(400);
        const image = path.join(dir, `${mode}-${tick}.png`);
        await page.screenshot({ path: image });
        images.push(image);
      }
      await page.waitForTimeout(600);
      if (["mixed", "open-ended"].includes(mode))
        await page.evaluate(() => window.scrollTo(0, 380));
      const last = path.join(dir, `${mode}-result.png`);
      await page.screenshot({ path: last });
      images.push(last);
      const modeText = {
        static:
          "Static mode retains the application-defined slots. The output shows twelve units and an eight minute arrival estimate. The agent cannot introduce a new layout in this contract.",
        declarative:
          "Declarative mode chooses a graph from the component catalog. The detailed request adds a regional note. Notice the source contract and the actual renderer. The same graph can travel over events or in a tool result.",
        "open-ended":
          "Open-ended mode displays a custom HTML deployment map. There are no catalog metric cards in this output. The generated region receives no scripts or network permission. This replay is real browser execution of a scripted output, not evidence of a model generating it.",
        mixed:
          "Mixed mode combines catalog content, the custom deployment map and the acknowledge action. Inspect both regions. The application validates the graph and separately isolates the generated document.",
      }[mode];
      const extra =
        part.slug === "a2ui"
          ? " The structured region is rendered by official A2UI Lit components; custom HTML remains outside the standard A2UI catalog."
          : part.slug === "agui"
            ? " The trace shows the official run lifecycle, tool arguments and state delta before RUN_FINISHED."
            : part.slug === "mcp-apps"
              ? " The local host discovers the tool, reads its resource, completes the app handshake, and delivers the tool result over the bridge."
              : part.slug === "openui"
                ? " The trace contains OpenUI Lang assignments consumed by the official parser and React renderer."
                : part.slug === "harness"
                  ? " The trace retains the assistant tool proposal, validated tool observation, final response and one-call budget."
                  : " The graph is rendered with the official json-render catalog and registry, except for the deliberately fixed static slots.";
      await scene(`${modeText}${extra}`, images);
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    // Execute a meaningful prompt variation and an action, not just screenshots.
    await page
      .getByRole("button", { name: "02 · declarative", exact: true })
      .click();
    await page.locator("#prompt").fill("Show a compact resource dashboard");
    await page.locator("#run").click();
    await page.waitForTimeout(1700);
    const compact = path.join(dir, "compact.png");
    await page.screenshot({ path: compact });
    await scene(
      "Now we change the declarative prompt to compact and run again. The arrival metric is removed and Stack changes direction. Static mode would preserve its fixed slots. This is a reproducible way to explain which decisions belong to the application and which decisions belong to the generated description.",
      [compact],
    );
    let actionButton = page
      .locator("#surface")
      .getByRole("button", { name: "Acknowledge plan", exact: true });
    if (part.slug === "mcp-apps")
      actionButton = page
        .frameLocator("iframe.mcp-frame")
        .getByRole("button", { name: "Acknowledge plan", exact: true });
    await actionButton.click();
    await page.waitForTimeout(600);
    await page
      .locator("#trace")
      .evaluate((e) => (e.scrollTop = e.scrollHeight));
    const actionImage = path.join(dir, "action.png");
    await page.screenshot({ path: actionImage });
    await scene(
      "The acknowledge button executes an authorized action and returns a real result. It affects only this synthetic demo session. A valid UI description is not permission to call any tool. The server and the MCP host both maintain allowlists. This action result comes from the application code, not from fabricated console output.",
      [actionImage],
    );
    const testText =
      (await fs.readFile("evidence/python-tests.txt", "utf8"))
        .split("\n")
        .slice(-9)
        .join("\n") +
      "\n" +
      (await fs.readFile("evidence/node-tests.txt", "utf8")) +
      "\n" +
      (await fs.readFile("evidence/mcp-stdio.txt", "utf8"));
    await scene(
      "The captured test output shows the Python contract tests, Node sandbox policy check, and the MCP stdio smoke test. The browser matrix separately rendered all twenty four topic and mode combinations with no page errors. These checks establish replay execution and local protocol behavior. Live model behavior and an external MCP Apps host remain untested.",
      [
        await card(
          "Actual execution evidence",
          `<pre>${escape(testText)}</pre>`,
        ),
      ],
    );
    await scene(
      `This completes ${part.title}. Review the full source walkthrough and this part's codelab README. The prepared narration is synthetic. Record your own explanation if required by the course, then upload one accessible YouTube video for this part and put its real URL in the manifest. The submission checker intentionally reports missing publication or student narration.`,
      [
        await card(
          "Deliverable and remaining publication",
          `<p>Code · four running modes · validation · action round trip</p><p>Full source: docs/WALKTHROUGH.md<br>Part guide: labs/${String(part.number).padStart(2, "0")}-${part.slug}/README.md</p><p>YouTube publication: pending<br>Student microphone explanation: not recorded</p>`,
        ),
      ],
    );
    let clock = 0,
      srt = "",
      transcript = `# Part ${part.number} · ${part.title}\n\nSynthetic narration over actual captured source and browser execution. Deterministic replay; no live model calls.\n\n`,
      imagesList = "",
      audioList = "",
      chapters = "";
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      srt += `${i + 1}\n${time(clock)} --> ${time(clock + s.duration)}\n${s.narration}\n\n`;
      transcript += `## ${time(clock).slice(0, 8)}\n\n${s.narration}\n\n`;
      chapters += `${time(clock).slice(0, 8)} Scene ${i + 1}\n`;
      const leading = s.images.length > 1 ? 0.4 : 0;
      for (let j = 0; j < s.images.length; j++)
        imagesList += `file '${s.images[j]}'\nduration ${j < s.images.length - 1 ? leading : Math.max(0.1, s.duration - leading * (s.images.length - 1))}\n`;
      audioList += `file '${s.wav}'\n`;
      clock += s.duration;
    }
    imagesList += `file '${scenes.at(-1).images.at(-1)}'\n`;
    await fs.writeFile(path.join(dir, "images.txt"), imagesList);
    await fs.writeFile(path.join(dir, "audio.txt"), audioList);
    await fs.writeFile(`videos/${stem}.srt`, srt);
    await fs.writeFile(`videos/${stem}-transcript.md`, transcript);
    await fs.writeFile(`videos/${stem}-chapters.txt`, chapters);
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
      { maxBuffer: 1024 * 1024 },
    );
    manifest.parts.push({
      number: part.number,
      title: part.title,
      file: `videos/${stem}.mp4`,
      captions: `videos/${stem}.srt`,
      transcript: `videos/${stem}-transcript.md`,
      duration_seconds: Math.round(clock),
      youtube_url: null,
      narration: "synthetic",
      student_explanation_recorded: false,
    });
    await fs.writeFile(
      "videos/manifest.json",
      JSON.stringify(manifest, null, 2) + "\n",
    );
    console.log(
      `Created ${stem}: ${Math.round(clock)} seconds, ${scenes.length} narrated scenes.`,
    );
  }
  if (pageErrors.length) throw Error(pageErrors.join("\n"));
} finally {
  await browser.close();
  server.kill();
}
