import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { JSONSurface, OpenSurface, StaticSurface } from "./catalog.jsx";
import { A2Surface } from "./a2ui.jsx";
import { MCPHost } from "./mcp-host.jsx";
import { post, agui } from "./transport.mjs";
const topics = ["a2ui", "agui", "mcp-apps", "json-render", "openui", "harness"];
const names = {
  a2ui: "A2UI",
  agui: "AG-UI",
  "mcp-apps": "MCP Apps",
  "json-render": "json-render",
  openui: "OpenUI Lang",
  harness: "Harness integration",
};
const explanations = {
  static: "The application fixes the layout. The agent fills existing slots.",
  declarative:
    "The agent chooses a layout from a validated component catalog. Try “compact” or “detailed”.",
  "open-ended":
    "The agent supplies custom HTML. A sandboxed iframe limits its capabilities.",
  mixed:
    "Validated catalog components surround a custom HTML region. Each boundary is visible.",
};
function App() {
  const query = new URLSearchParams(location.search);
  const [topic, setTopic] = useState(query.get("topic") || "a2ui"),
    [mode, setMode] = useState("static"),
    [prompt, setPrompt] = useState(
      "Show a detailed emergency resource dashboard",
    );
  const [result, setResult] = useState(null),
    [log, setLog] = useState([]),
    [busy, setBusy] = useState(false),
    [mcp, setMcp] = useState(null),
    [source, setSource] = useState(""),
    [code, setCode] = useState("");
  const note = (entry) => setLog((rows) => [...rows, entry]);
  useEffect(() => {
    const handler = (e) => note(e.detail);
    window.addEventListener("ui-action", handler);
    return () => window.removeEventListener("ui-action", handler);
  }, []);
  async function run() {
    setBusy(true);
    setResult(null);
    setMcp(null);
    setLog([]);
    try {
      const input = { topic, mode, prompt };
      if (topic === "mcp-apps") {
        setMcp({ prompt, mode });
      } else {
        const data =
          topic === "agui"
            ? await agui(input, note)
            : await post("/api/generate", input);
        setResult(data);
        note({ provider: data.provider });
        if (data.history) data.history.forEach(note);
      }
    } catch (e) {
      note({ error: e.message });
    } finally {
      setBusy(false);
    }
  }
  const files = [
    "app/core.py",
    "app/adapters/formats.py",
    "app/adapters/events.py",
    "app/harness.py",
    "app/mcp_server.py",
    "app/server.py",
    "app/web/catalog.jsx",
    "app/web/a2ui.jsx",
    "app/web/transport.mjs",
    "app/web/mcp-host.jsx",
    "app/web/mcp-view.html",
    "app/web/sandbox.mjs",
    "tests/test_contracts.py",
  ];
  return (
    <>
      <header>
        <span className="brand">CMPE 297 / ASSIGNMENT 4</span>
        <span>Vineeth Chandra Sai Kandukuri</span>
      </header>
      <div className="layout">
        <nav>
          <p className="eyebrow">SIX CODELABS</p>
          {topics.map((t, i) => (
            <button
              key={t}
              className={topic === t ? "selected" : ""}
              onClick={() => {
                setTopic(t);
                setResult(null);
                setMcp(null);
                setLog([]);
              }}
            >
              <span>0{i + 1}</span>
              {names[t]}
            </button>
          ))}
          <p className="navnote">
            One synthetic scenario.
            <br />
            Four generation contracts.
            <br />
            Real libraries and local protocols.
          </p>
        </nav>
        <main>
          <p className="eyebrow">PROGRESSIVE GENERATIVE UI</p>
          <h1>{names[topic]}</h1>
          <p className="subtitle">
            Trace the request, inspect the contract, and execute the interface.
          </p>
          <div className="modes">
            {Object.keys(explanations).map((m, i) => (
              <button
                key={m}
                className={mode === m ? "selected" : ""}
                onClick={() => {
                  setMode(m);
                  setResult(null);
                  setMcp(null);
                }}
              >
                0{i + 1} · {m}
              </button>
            ))}
          </div>
          <p id="explanation">{explanations[mode]}</p>
          <div className="prompt">
            <input
              id="prompt"
              aria-label="Request"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button id="run" disabled={busy} onClick={run}>
              {busy ? "Executing…" : "Run example →"}
            </button>
          </div>
          <p className="provider">
            Default: deterministic replay. Synthetic data. Live model mode is
            opt-in on the server.
          </p>
          {topic === "a2ui" && ["open-ended", "mixed"].includes(mode) && (
            <p className="boundary">
              A2UI basic catalog handles the structured region. Generated HTML
              is a separate host region; it is not a standard A2UI component.
            </p>
          )}
          <div className="panels">
            <section>
              <h2>Rendered output</h2>
              <div id="surface">
                {mcp ? (
                  <MCPHost input={mcp} onLog={note} />
                ) : result ? (
                  topic === "a2ui" ? (
                    <A2Surface payload={result.a2ui} />
                  ) : topic === "openui" ? (
                    <OpenSurface program={result.program} />
                  ) : mode === "static" ? (
                    <StaticSurface spec={result.spec} />
                  ) : (
                    <JSONSurface spec={result.spec} />
                  )
                ) : (
                  <div className="empty">
                    Run an example to inspect its output.
                  </div>
                )}
              </div>
            </section>
            <section>
              <h2>Contract & execution trace</h2>
              <pre id="trace">
                {JSON.stringify(
                  {
                    provider: result?.provider,
                    contract: result?.program || result?.a2ui || result?.spec,
                    events: log,
                  },
                  null,
                  2,
                )}
              </pre>
            </section>
          </div>
          <details id="code-panel" open={!!source}>
            <summary>Full code walkthrough</summary>
            <select
              aria-label="Source file"
              value={source}
              onChange={async (e) => {
                setSource(e.target.value);
                setCode(
                  await (
                    await fetch(
                      "/api/source?path=" + encodeURIComponent(e.target.value),
                    )
                  ).text(),
                );
              }}
            >
              <option value="">Select a source file</option>
              {files.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <pre id="code">
              {code.split("\n").map((line, i) => (
                <div key={i}>
                  <span className="line">{String(i + 1).padStart(3)}</span>
                  {line || " "}
                </div>
              ))}
            </pre>
          </details>
        </main>
      </div>
    </>
  );
}
createRoot(document.getElementById("app")).render(<App />);
