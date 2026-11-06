# CMPE297 Assignment 4 · Progressive Generative UI

**Vineeth Chandra Sai Kandukuri**

Six runnable codelabs, each demonstrating **static → declarative → open-ended → mixed** UX with the same synthetic emergency-resource scenario. Each lab has code, execution evidence, a step-by-step guide, and a prepared narrated video.

**Publication status:** the local walkthroughs use **synthetic narration and deterministic replay**. They are not recordings of a live model, an external MCP Apps host, or a student speaking. YouTube links must be supplied after upload; see [video status](videos/manifest.json). If the instructor requires your own recorded explanation, record it using the supplied walkthrough and scripts. Do not submit this as complete until those requirements are met.

## Run locally

Use Python 3.12+ and Node 22+.

```bash
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell instead: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
npm ci
npm run build
python -m uvicorn app.server:app --host 127.0.0.1 --port 8765
```

Open http://127.0.0.1:8765. Select a topic, choose each mode, and click **Run example**. Try `Show a compact resource dashboard` versus `Show a detailed emergency resource dashboard` in declarative mode. Click **Acknowledge plan** and inspect the trace. All data is synthetic; no emergency system is contacted.

## Parts and generation modes

| Part | Guide | Static | Declarative | Open-ended | Mixed |
|---|---|---|---|---|---|
| 1 | [A2UI](labs/01-a2ui/README.md) | Fixed graph → official Lit renderer | Catalog graph → A2UI envelopes | Host HTML region alongside empty surface | A2UI structured surface + host HTML region |
| 2 | [AG-UI](labs/02-agui/README.md) | Fixed slots delivered in state | Catalog graph delivered in state | HTML region delivered in state | Catalog + HTML delivered in state |
| 3 | [MCP Apps](labs/03-mcp-apps/README.md) | Fixed view in UI resource | Catalog graph in tool result | Nested sandbox in UI resource | Catalog + nested sandbox |
| 4 | [json-render](labs/04-json-render/README.md) | Fixed application renderer | Official catalog and React renderer | Custom GeneratedView component | Official renderer + GeneratedView |
| 5 | [OpenUI Lang](labs/05-openui/README.md) | Fixed assignments | Official parser and React renderer | Custom GeneratedView component | Library primitives + GeneratedView |
| 6 | [Harness integration](labs/06-harness/README.md) | Fixed spec via render_ui | Validated graph via render_ui | HTML artifact via render_ui | Both regions in one tool result |

A2UI, OpenUI Lang and json-render describe/render UI. AG-UI transports run events and state. MCP Apps embeds a resource in a host. The harness orchestrates a bounded tool loop. The four generation modes are application choices, not four native features of every protocol.

## Read and explain the complete code

[Full source walkthrough](docs/WALKTHROUGH.md) includes every application source file and its explanation. The in-app **Full code walkthrough** also displays the source with line numbers.

The application owns validation in [app/core.py](app/core.py): allowed components, typed props, graph bounds, cycle checks, and the acknowledge action. [app/web/sandbox.mjs](app/web/sandbox.mjs) places a restrictive CSP before generated markup; generated iframes receive an empty sandbox permission list. The trusted MCP view has scripts but no same-origin permission and proxies only one allowed app tool. This is a local teaching host, not a complete production host or security certification.

## Verify

```bash
python -m unittest discover -s tests -v
npm test
python scripts/mcp-smoke.py
```

For the browser matrix, set `CHROMIUM_PATH` to an installed Chromium executable, then run:

```bash
node scripts/browser-check.mjs
```

The script starts its own local server and captures the 24 rendered cases. In this environment, the Chromium executable was extracted from the pinned `@sparticuz/chromium` package because the Playwright CDN download failed. [Execution evidence](evidence/) contains actual run outputs and browser captures. No live model or external GUI host validation is claimed.

## Optional live model generation

Replay is the default and requires no key. To exercise actual generation, set these environment variables on the server process, then restart it:

```bash
export UI_PROVIDER=openai
export OPENAI_API_KEY=your_local_key
export OPENAI_MODEL=your_available_model
# Optional: OPENAI_BASE_URL for an OpenAI-compatible endpoint.
```

PowerShell uses `$env:UI_PROVIDER="openai"` and the same pattern for the other variables. The server calls the provider for a bounded JSON graph, validates it, and translates the result for the selected lab. Static mode enforces its fixed graph. Invalid output raises an error; there is no hidden fallback to replay. This path requires your model credentials and can incur provider charges. **It was not run for the recorded baseline.**

## YouTube delivery

Each part has a local MP4, transcript and captions, plus a row in [videos/manifest.json](videos/manifest.json). See [publication instructions](docs/YOUTUBE.md) to upload or replace these with your own narrated recordings and insert the six real YouTube URLs. A checked submission validator intentionally fails until all URLs are present:

```bash
python scripts/check-submission.py
```

## Reference and attribution

Inspired by [dlmastery/simple-coding-harness/genui](https://github.com/dlmastery/simple-coding-harness/tree/main/genui), inspected at commit `fabd4c7` on November 6, 2026. This is an original compact six-part implementation, not a copy or claim to have completed all 23 upstream lessons. The source walkthrough explains the same progression and the distinction between representation and transport. Dependencies retain their respective licenses.

Official references: [A2UI](https://a2ui.org/), [AG-UI](https://docs.ag-ui.com/), [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview), [json-render](https://github.com/vercel-labs/json-render), [OpenUI](https://github.com/thesysdev/openui).
