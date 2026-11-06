# Complete source walkthrough

Read the codelabs in order, executing each mode as you go. This is an author walkthrough; no learner predictions or teach-back were tested. The recorded baseline uses deterministic replay and synthetic data.

## app/core.py

The catalog is the boundary. validate walks the graph before rendering and rejects bad props, unknown actions, cycles, missing children, unreachable nodes and excessive size/depth. replay defines the four contracts with a synthetic scenario. generate explicitly separates scripted replay from optional paid provider calls. action is a server-side allowlist.

```python
"""One task, four generation contracts. Replay is deterministic; live is opt-in."""
import html
import json
import os

TOPICS = ('a2ui', 'agui', 'mcp-apps', 'json-render', 'openui', 'harness')
MODES = ('static', 'declarative', 'open-ended', 'mixed')
CATALOG = {
    'Stack': {'direction': 'column | row'},
    'Text': {'text': 'string'},
    'Metric': {'label': 'string', 'value': 'string'},
    'Button': {'label': 'string', 'action': 'acknowledge'},
    'GeneratedView': {'html': 'string (sandboxed HTML)'},
}


def validate(spec):
    """Validate graph, props, bounds, and actions before any renderer sees it."""
    elements = spec.get('elements', {})
    if not isinstance(elements, dict) or not 1 <= len(elements) <= 50:
        raise ValueError('Expected 1..50 elements')
    if spec.get('root') not in elements:
        raise ValueError('Missing root')
    visiting, visited = set(), set()

    def visit(key, depth=0):
        if depth > 15 or key in visiting or key not in elements:
            raise ValueError('Cycle, missing child, or excessive depth')
        if key in visited:
            return
        visiting.add(key)
        el = elements[key]
        kind, props = el.get('type'), el.get('props', {})
        if kind not in CATALOG or not isinstance(props, dict):
            raise ValueError('Unknown component')
        if set(props) != set(CATALOG[kind]):
            raise ValueError('Unexpected or missing props')
        if any(not isinstance(v, str) or len(v) > 20000 for v in props.values()):
            raise ValueError('Props must be bounded strings')
        if kind == 'Stack' and props['direction'] not in ('column', 'row'):
            raise ValueError('Invalid direction')
        if kind == 'Button' and props['action'] != 'acknowledge':
            raise ValueError('Action not allowed')
        children = el.get('children', [])
        if not isinstance(children, list) or any(not isinstance(c, str) for c in children):
            raise ValueError('Invalid children')
        if children and kind != 'Stack':
            raise ValueError('Only Stack accepts children')
        for child in children:
            visit(child, depth + 1)
        visiting.remove(key)
        visited.add(key)

    visit(spec['root'])
    if visited != set(elements):
        raise ValueError('Unreachable elements')
    return spec


def replay(prompt, mode):
    """An explicit scripted agent, not an LLM. Prompt keywords change layout."""
    detailed = 'detail' in prompt.lower()
    compact = 'compact' in prompt.lower()
    nodes = {}

    def add(key, kind, props, children=None):
        nodes[key] = {'type': kind, 'props': props, 'children': children or []}
        return key

    # Static contract: the application owns this exact layout and all slots.
    children = [add('title', 'Text', {'text': 'Emergency resource dashboard'}),
                add('units', 'Metric', {'label': 'Available response units', 'value': '12'}),
                add('eta', 'Metric', {'label': 'Median arrival', 'value': '8 min'})]
    if mode != 'static':
        if compact:
            children.remove('eta')
            del nodes['eta']
        if detailed:
            children.append(add('detail', 'Text', {'text': 'North: 5 units · South: 7 units · data is synthetic.'}))
    action = add('ack', 'Button', {'label': 'Acknowledge plan', 'action': 'acknowledge'})
    children.append(action)
    if mode in ('open-ended', 'mixed'):
        artifact = ('<!doctype html><html><head></head><body><style>'
                    'body{font:18px system-ui;background:#eafbf6;color:#123b32;padding:24px}'
                    '.route{display:flex;gap:20px;align-items:center}.unit{border:2px solid #147d64;'
                    'border-radius:50%;padding:20px}button{padding:12px;background:#147d64;color:white;border:0}'
                    '</style><h2>Custom deployment map</h2><p>' + html.escape(prompt[:160]) +
                    '</p><div class="route"><div class="unit">North · 5</div><b>→</b>'
                    '<div class="unit">Incident</div><b>←</b><div class="unit">South · 7</div></div>'
                    '<p>Synthetic scenario. Generated markup is isolated from host tools.</p></body></html>')
        generated = add('artifact', 'GeneratedView', {'html': artifact})
        if mode == 'open-ended':
            nodes = {generated: nodes[generated]}
            children = [generated]
        else:
            children.insert(-1, generated)
    add('root', 'Stack', {'direction': 'row' if compact and mode != 'static' else 'column'}, children)
    return validate({'root': 'root', 'elements': nodes})


def generate(prompt, mode):
    if mode not in MODES:
        raise ValueError('Unknown mode')
    provider = os.getenv('UI_PROVIDER', 'replay')
    if provider == 'replay':
        return replay(prompt, mode), 'deterministic replay (no model call)'
    if provider != 'openai':
        raise ValueError('Unknown UI_PROVIDER')
    from openai import OpenAI
    template = replay(prompt, mode)
    rules = f'Catalog: {json.dumps(CATALOG)}. Example schema: {json.dumps(template)}. '
    rules += ('Preserve exact element ids, types, children; change only text and metric values.' if mode == 'static' else
              'Use GeneratedView only in open-ended/mixed. In open-ended use only Stack and GeneratedView. In mixed include GeneratedView and catalog components.')
    response = OpenAI().chat.completions.create(
        model=os.environ['OPENAI_MODEL'], response_format={'type': 'json_object'},
        messages=[{'role': 'system', 'content': 'Return one valid UI spec JSON object. ' + rules},
                  {'role': 'user', 'content': prompt}], max_completion_tokens=3000)
    spec = validate(json.loads(response.choices[0].message.content))
    signature = lambda graph: {k: (v['type'], v.get('children', [])) for k, v in graph['elements'].items()}
    if mode == 'static' and signature(spec) != signature(template):
        raise ValueError('Static layout changed')
    kinds = {v['type'] for v in spec['elements'].values()}
    if mode == 'declarative' and 'GeneratedView' in kinds:
        raise ValueError('Declarative mode forbids generated HTML')
    if mode == 'open-ended' and (not kinds <= {'Stack', 'GeneratedView'} or 'GeneratedView' not in kinds):
        raise ValueError('Open-ended mode requires generated HTML')
    if mode == 'mixed' and ('GeneratedView' not in kinds or not kinds - {'Stack', 'GeneratedView'}):
        raise ValueError('Mixed mode requires both kinds')
    return spec, f'live model: {response.model}'


def action(name):
    if name != 'acknowledge':
        raise ValueError('Action not allowed')
    return {'accepted': True, 'message': 'Plan acknowledged in this demo session.'}

```

## app/adapters/formats.py

a2ui translates Stack/Text/Metric/Button into basic-catalog components and emits the three ordered envelopes. GeneratedView is deliberately removed from the standard catalog surface and returned as a separate host artifact. openui emits root first and forward references afterward; property insertion order matches library component signatures.

```python
"""Translate the shared teaching graph into real library input formats."""
import json

A2UI_CATALOG = 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json'


def a2ui(spec):
    """Basic A2UI has no arbitrary HTML: artifacts remain a host-side region."""
    components, artifacts = [], []
    def convert(key):
        node = spec['elements'][key]
        kind, p = node['type'], node['props']
        if kind == 'GeneratedView':
            artifacts.append(p['html'])
            return None
        result = {'id': key}
        if kind == 'Stack':
            children = [c for child in node['children'] if (c := convert(child))]
            result.update(component='Row' if p['direction'] == 'row' else 'Column', children=children)
        elif kind == 'Metric':
            result.update(component='Text', text=f"{p['label']}: {p['value']}", variant='h3')
        elif kind == 'Text':
            result.update(component='Text', text=p['text'])
        elif kind == 'Button':
            label = key + '-label'
            components.append({'id': label, 'component': 'Text', 'text': p['label']})
            result.update(component='Button', child=label, action={'event': {'name': p['action'], 'context': {}}})
        components.append(result)
        return key
    convert(spec['root'])
    return {'messages': [
        {'version': 'v0.9', 'createSurface': {'surfaceId': 'dashboard', 'catalogId': A2UI_CATALOG}},
        {'version': 'v0.9', 'updateComponents': {'surfaceId': 'dashboard', 'components': components}},
        {'version': 'v0.9', 'updateDataModel': {'surfaceId': 'dashboard', 'path': '/', 'value': {'scenario': 'synthetic'}}}],
        'artifacts': artifacts}


def openui(spec):
    """Forward references: root appears before the components it references."""
    lines = []
    for key in [spec['root']] + [k for k in spec['elements'] if k != spec['root']]:
        node = spec['elements'][key]
        args = ([f"[{', '.join(node['children'])}]", json.dumps(node['props']['direction'])]
                if node['type'] == 'Stack' else [json.dumps(v) for v in node['props'].values()])
        lines.append(f"{key} = {node['type']}({', '.join(args)})")
    return '\n'.join(lines)

```

## app/adapters/events.py

events yields the official AG-UI lifecycle, snapshot, tool-call argument stream, state delta and finish. encode delegates SSE framing to EventEncoder. The browser reducer accepts only the two supported replace paths.

```python
"""Official AG-UI event models and encoder; the UI format stays separate."""
import json
import uuid
from ag_ui.core import (RunStartedEvent, RunFinishedEvent, StateSnapshotEvent,
                        StateDeltaEvent, ToolCallStartEvent, ToolCallArgsEvent, ToolCallEndEvent)
from ag_ui.encoder import EventEncoder


def events(spec, thread='demo-thread'):
    run = str(uuid.uuid4())
    yield RunStartedEvent(thread_id=thread, run_id=run)
    yield StateSnapshotEvent(snapshot={'ui': None, 'status': 'building'})
    yield ToolCallStartEvent(tool_call_id='render-1', tool_call_name='render_ui')
    yield ToolCallArgsEvent(tool_call_id='render-1', delta=json.dumps({'spec': spec}))
    yield ToolCallEndEvent(tool_call_id='render-1')
    yield StateDeltaEvent(delta=[{'op': 'replace', 'path': '/ui', 'value': spec},
                                 {'op': 'replace', 'path': '/status', 'value': 'ready'}])
    yield RunFinishedEvent(thread_id=thread, run_id=run)


def encode(spec):
    encoder = EventEncoder(accept='text/event-stream')
    return [encoder.encode(e) for e in events(spec)]

```

## app/harness.py

run records the user request, constructs the render_ui tool proposal, executes the allowlisted validator, saves its observation, and finishes. The single-call budget bounds execution. This is an intentionally small UI tool harness; it does not invoke a shell.

```python
"""A bounded tool loop: propose -> validate -> execute -> observe -> finish."""
from app.core import generate, validate


def run(prompt, mode):
    spec, provider = generate(prompt, mode)
    history = [{'role': 'user', 'content': prompt},
               {'role': 'assistant', 'tool_call': {'name': 'render_ui', 'arguments': {'spec': spec}}}]
    tools = {'render_ui': lambda spec: {'rendered': True, 'spec': validate(spec)}}
    call = history[-1]['tool_call']
    result = tools[call['name']](**call['arguments'])
    history.append({'role': 'tool', 'name': call['name'], 'result': result})
    history.append({'role': 'assistant', 'content': 'Dashboard ready. Awaiting an authorized user action.'})
    return {'spec': result['spec'], 'provider': provider, 'history': history,
            'budget': {'tool_calls': 1, 'maximum': 1}}

```

## app/mcp_server.py

FastMCP registers the HTML resource and its MIME type. show_dashboard advertises the resource URI in tool metadata. acknowledge_plan is app-visible and calls the same server action allowlist. The module entry point starts the actual stdio server.

```python
"""An actual MCP server. Run standalone with python -m app.mcp_server."""
import json
from pathlib import Path
from mcp.server.fastmcp import FastMCP
from app.core import generate, action

URI = 'ui://cmpe297/dashboard.html'
mcp = FastMCP('CMPE297 resource dashboard')


@mcp.resource(URI, mime_type='text/html;profile=mcp-app')
def dashboard_view() -> str:
    return Path(__file__).with_name('web').joinpath('mcp-view.html').read_text()


@mcp.tool(meta={'ui': {'resourceUri': URI}})
def show_dashboard(prompt: str = 'Show a resource dashboard', mode: str = 'declarative') -> str:
    """Return a UI spec with an associated MCP Apps HTML resource."""
    spec, provider = generate(prompt, mode)
    return json.dumps({'spec': spec, 'provider': provider})


@mcp.tool(meta={'ui': {'visibility': ['app']}})
def acknowledge_plan() -> str:
    """Acknowledge this synthetic plan. No external system is modified."""
    return json.dumps(action('acknowledge'))


if __name__ == '__main__':
    mcp.run(transport='stdio')

```

## app/server.py

Request bounds input. The generation endpoint dispatches representations and harness execution. AG-UI streams encoded events. The MCP proxy creates a real ClientSession over paired memory streams and allows only known methods and tool names. The source viewer serves only allowlisted repository paths.

```python
"""Local teaching host. HTTP serves the UI; MCP itself runs over stdio."""
import asyncio
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from app.core import TOPICS, MODES, generate, action
from app.adapters.formats import a2ui, openui
from app.adapters.events import encode
from app.harness import run

ROOT = Path(__file__).resolve().parent.parent
app = FastAPI(title='CMPE297 · Generative UI')


class Request(BaseModel):
    topic: str
    mode: str
    prompt: str = Field(default='Show a resource dashboard', max_length=2000)


def check(req):
    if req.topic not in TOPICS or req.mode not in MODES:
        raise HTTPException(422, 'Unknown topic or mode')


@app.post('/api/generate')
def generate_ui(req: Request):
    check(req)
    try:
        if req.topic == 'harness':
            return run(req.prompt, req.mode)
        spec, provider = generate(req.prompt, req.mode)
        return {'spec': spec, 'provider': provider,
                'a2ui': a2ui(spec) if req.topic == 'a2ui' else None,
                'program': openui(spec) if req.topic == 'openui' else None}
    except (ValueError, KeyError) as exc:
        raise HTTPException(422, str(exc)) from exc


@app.post('/api/agui')
def agui(req: Request):
    check(req)
    spec, provider = generate(req.prompt, req.mode)
    async def stream():
        for event in encode(spec):
            yield event
            await asyncio.sleep(0.15)
    return StreamingResponse(stream(), media_type='text/event-stream', headers={'X-UI-Provider': provider})


@app.post('/api/action/{name}')
def perform_action(name: str):
    try:
        return action(name)
    except ValueError as exc:
        raise HTTPException(403, str(exc)) from exc


@app.post('/api/mcp')
async def mcp_proxy(body: dict):
    """Local host allowlist proxies JSON-RPC requests through a real MCP ClientSession."""
    from app.mcp_server import mcp
    from mcp.shared.memory import create_connected_server_and_client_session
    method, params = body.get('method'), body.get('params', {})
    if not (method == 'tools/list' or
            (method == 'resources/read' and params.get('uri') == 'ui://cmpe297/dashboard.html') or
            (method == 'tools/call' and params.get('name') in ('show_dashboard', 'acknowledge_plan'))):
        raise HTTPException(403, 'Host denied this MCP operation')
    # In-memory streams use the same MCP session/handshake as an external client.
    async with create_connected_server_and_client_session(mcp._mcp_server) as client:
        if method == 'tools/list':
            result = await client.list_tools()
        elif method == 'resources/read' and params.get('uri') == 'ui://cmpe297/dashboard.html':
            result = await client.read_resource(params['uri'])
        elif method == 'tools/call' and params.get('name') in ('show_dashboard', 'acknowledge_plan'):
            result = await client.call_tool(params['name'], params.get('arguments', {}))
        return result.model_dump(mode='json', by_alias=True, exclude_none=True)


@app.get('/api/source')
def source(path: str):
    allowed = {p.relative_to(ROOT).as_posix(): p for directory in ('app', 'tests', 'labs')
               for p in (ROOT / directory).rglob('*') if p.is_file() and p.suffix in ('.py', '.mjs', '.jsx', '.html', '.md') and 'dist' not in p.parts and '__pycache__' not in p.parts}
    if path not in allowed:
        raise HTTPException(404)
    return PlainTextResponse(allowed[path].read_text())


@app.get('/')
def home():
    return FileResponse(ROOT / 'app/web/index.html')


app.mount('/web', StaticFiles(directory=ROOT / 'app/web'), name='web')

```

## app/web/catalog.jsx

Zod schemas feed json-render defineCatalog and defineRegistry. JSONUIProvider supplies renderer contexts. StaticSurface fixes application slots. The OpenUI library uses the same primitives, but Stack adds positional children before direction. GeneratedView always uses an iframe and the common CSP wrapper.

```javascript
import React from "react";
import { z } from "zod";
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { defineRegistry, Renderer, JSONUIProvider } from "@json-render/react";
import {
  createLibrary,
  defineComponent,
  Renderer as OpenRenderer,
} from "@openuidev/react-lang";
import { sandboxDocument } from "./sandbox.mjs";

export async function performAction(name) {
  const response = await fetch(`/api/action/${encodeURIComponent(name)}`, {
    method: "POST",
  });
  if (!response.ok) throw Error(await response.text());
  window.dispatchEvent(
    new CustomEvent("ui-action", { detail: await response.json() }),
  );
}
export function Generated({ html }) {
  return (
    <iframe
      className="generated"
      title="Generated deployment map"
      sandbox=""
      srcDoc={sandboxDocument(html)}
    />
  );
}
export const props = {
  Stack: z.object({ direction: z.enum(["column", "row"]) }),
  Text: z.object({ text: z.string() }),
  Metric: z.object({ label: z.string(), value: z.string() }),
  Button: z.object({ label: z.string(), action: z.literal("acknowledge") }),
  GeneratedView: z.object({ html: z.string() }),
};
export const views = {
  Stack: ({ props: p, children }) => (
    <div className={`stack ${p.direction}`}>{children}</div>
  ),
  Text: ({ props: p }) => <p className="copy">{p.text}</p>,
  Metric: ({ props: p }) => (
    <div className="metric">
      <span>{p.label}</span>
      <strong>{p.value}</strong>
      <small>SYNTHETIC SCENARIO</small>
    </div>
  ),
  Button: ({ props: p }) => (
    <button
      className="action"
      onClick={() => performAction(p.action).catch((e) => alert(e.message))}
    >
      {p.label}
    </button>
  ),
  GeneratedView: ({ props: p }) => <Generated html={p.html} />,
};
export const catalog = defineCatalog(schema, {
  components: Object.fromEntries(
    Object.entries(props).map(([name, p]) => [
      name,
      { props: p, description: `${name} in the bounded dashboard catalog` },
    ]),
  ),
  actions: {},
});
export const { registry } = defineRegistry(catalog, { components: views });
export function JSONSurface({ spec }) {
  return (
    <JSONUIProvider registry={registry}>
      <Renderer spec={spec} registry={registry} />
    </JSONUIProvider>
  );
}
export function StaticSurface({ spec }) {
  // Fixed component slots; the agent cannot introduce component types here.
  const nodes = spec.elements;
  return (
    <div className="stack column">
      <p>{nodes.title.props.text}</p>
      {["units", "eta"].map((key) => (
        <div className="metric" key={key}>
          <span>{nodes[key].props.label}</span>
          <strong>{nodes[key].props.value}</strong>
        </div>
      ))}
      <button onClick={() => performAction("acknowledge")}>
        Acknowledge plan
      </button>
    </div>
  );
}
const components = Object.entries(props).map(([name, p]) =>
  defineComponent({
    name,
    description: `${name} dashboard primitive`,
    props:
      name === "Stack"
        ? z.object({
            children: z.array(z.any()),
            direction: z.enum(["column", "row"]),
          })
        : p,
    component: ({ props: p, renderNode }) =>
      React.createElement(
        views[name],
        { props: p },
        name === "Stack" ? renderNode(p.children) : null,
      ),
  }),
);
export const library = createLibrary({ components, root: "Stack" });
export function OpenSurface({ program }) {
  return (
    <OpenRenderer response={program} library={library} isStreaming={false} />
  );
}

```

## app/web/a2ui.jsx

The official MessageProcessor receives the basic catalog and an action callback. The official A2uiSurface is mounted when a surface is created. Each payload message is processed in order. Generated artifacts are mounted outside that A2UI surface.

```javascript
import React, { useEffect, useRef } from "react";
import { MessageProcessor } from "@a2ui/web_core/v0_9";
import { injectBasicCatalogStyles } from "@a2ui/web_core/v0_9/basic_catalog";
import { A2uiSurface, basicCatalog, Context } from "@a2ui/lit/v0_9";
import { ContextProvider } from "@lit/context";
import { renderMarkdown } from "@a2ui/markdown-it";
import { Generated, performAction } from "./catalog.jsx";

export function A2Surface({ payload }) {
  const ref = useRef();
  useEffect(() => {
    const host = ref.current;
    host.replaceChildren();
    const processor = new MessageProcessor([basicCatalog], (event) =>
      performAction(event.name),
    );
    injectBasicCatalogStyles();
    new ContextProvider(host, {
      context: Context.markdown,
      initialValue: renderMarkdown,
    });
    processor.onSurfaceCreated((surface) => {
      const node = new A2uiSurface();
      node.surface = surface;
      host.append(node);
    });
    payload.messages.forEach((message) => processor.processMessages([message]));
    window.a2processor = processor;
    return () => host.replaceChildren();
  }, [payload]);
  return (
    <>
      <div ref={ref} />
      {payload.artifacts.map((html, i) => (
        <Generated key={i} html={html} />
      ))}
    </>
  );
}

```

## app/web/transport.mjs

post checks HTTP failures. agui uses a streaming UTF-8 decoder and buffers frames across network chunk boundaries. It reads official event types, applies only expected state patches, raises RUN_ERROR, and rejects a stream missing RUN_FINISHED.

```javascript
export async function post(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw Error(await response.text());
  return response.json();
}

// SSE chunk boundaries need not coincide with event boundaries or UTF-8 characters.
export async function agui(body, onEvent) {
  const response = await fetch("/api/agui", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw Error(await response.text());
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    finished = false,
    state = {};
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    let end;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = frame
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      const event = JSON.parse(data);
      onEvent(event);
      if (event.type === "STATE_SNAPSHOT") state = event.snapshot;
      if (event.type === "STATE_DELTA")
        for (const patch of event.delta) {
          if (
            patch.op !== "replace" ||
            !["/ui", "/status"].includes(patch.path)
          )
            throw Error("Unsupported state patch");
          state[patch.path.slice(1)] = patch.value;
        }
      if (event.type === "RUN_ERROR") throw Error(event.message);
      if (event.type === "RUN_FINISHED") finished = true;
    }
    if (done) break;
  }
  if (!finished) throw Error("Stream ended without RUN_FINISHED");
  return { spec: state.ui, provider: response.headers.get("X-UI-Provider") };
}

```

## app/web/mcp-host.jsx

The host discovers the UI metadata before reading the resource. It calls the tool through a real MCP client, mounts the HTML in an opaque-origin iframe, validates event.source, completes initialization, and forwards input/results. Only acknowledge_plan is callable from the app frame.

```javascript
import React, { useEffect, useRef } from "react";
import { post } from "./transport.mjs";

export function MCPHost({ input, onLog }) {
  const ref = useRef();
  useEffect(() => {
    let alive = true,
      initialized = false,
      toolResult;
    const frame = ref.current;
    const send = (message) =>
      frame.contentWindow.postMessage({ jsonrpc: "2.0", ...message }, "*");
    const listener = async (event) => {
      // Sandboxed srcdoc has opaque origin: pin the exact source window.
      if (event.source !== frame.contentWindow || !alive) return;
      const message = event.data;
      if (!message || message.jsonrpc !== "2.0") return;
      onLog(message);
      if (message.method === "ui/initialize") {
        send({
          id: message.id,
          result: {
            protocolVersion: "2026-01-26",
            hostInfo: { name: "CMPE297 local teaching host", version: "1.0.0" },
            hostCapabilities: { serverTools: {} },
            hostContext: { theme: "light" },
          },
        });
      } else if (message.method === "ui/notifications/initialized") {
        initialized = true;
        send({
          method: "ui/notifications/tool-input",
          params: { arguments: input },
        });
        send({ method: "ui/notifications/tool-result", params: toolResult });
      } else if (message.method === "tools/call" && initialized) {
        try {
          if (message.params?.name !== "acknowledge_plan")
            throw Error("App tool denied");
          const result = await post("/api/mcp", {
            method: "tools/call",
            params: { name: "acknowledge_plan", arguments: {} },
          });
          send({ id: message.id, result });
          onLog({ action: result });
        } catch (e) {
          send({ id: message.id, error: { code: -32601, message: e.message } });
        }
      } else if (message.id !== undefined)
        send({
          id: message.id,
          error: { code: -32601, message: "Host method denied" },
        });
    };
    window.addEventListener("message", listener);
    (async () => {
      const tools = await post("/api/mcp", { method: "tools/list" });
      onLog({ tools });
      const tool = tools.tools.find((t) => t.name === "show_dashboard");
      const uri = tool._meta?.ui?.resourceUri;
      if (uri !== "ui://cmpe297/dashboard.html")
        throw Error("Unexpected UI resource");
      const resource = await post("/api/mcp", {
        method: "resources/read",
        params: { uri },
      });
      toolResult = await post("/api/mcp", {
        method: "tools/call",
        params: { name: "show_dashboard", arguments: input },
      });
      if (toolResult.isError) throw Error(JSON.stringify(toolResult));
      if (alive) frame.srcdoc = resource.contents[0].text;
    })().catch((e) => onLog({ error: e.message }));
    return () => {
      alive = false;
      window.removeEventListener("message", listener);
    };
  }, [input]);
  return (
    <iframe
      ref={ref}
      sandbox="allow-scripts"
      className="mcp-frame"
      title="MCP App resource"
    />
  );
}

```

## app/web/mcp-view.html

The trusted app resource has an inline script policy and no network access. It initializes with the host over JSON-RPC postMessage, receives tool results, and renders the bounded teaching graph. Generated HTML is placed in another iframe with an empty sandbox. Its button asks the host to call the approved tool.

```html
<!doctype html><meta charset="utf-8" />
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'"
/>
<style>
  body {
    font: 17px system-ui;
    color: #143b36;
    padding: 16px;
  }
  .stack {
    display: flex;
    gap: 16px;
  }
  .column {
    flex-direction: column;
  }
  .row {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .metric {
    padding: 22px;
    background: #edf6f3;
    border-radius: 12px;
  }
  strong {
    display: block;
    font-size: 32px;
  }
  button {
    background: #16775f;
    color: white;
    border: 0;
    padding: 14px;
    border-radius: 8px;
  }
  iframe {
    border: 0;
    width: 100%;
    height: 320px;
  }
  #status {
    font-size: 13px;
    color: #54756c;
  }
</style>
<p id="status">MCP Apps · waiting for host initialization</p>
<main id="app"></main>
<script>
  let nextId = 1,
    ready = false;
  const send = (method, params = {}) =>
    parent.postMessage({ jsonrpc: "2.0", id: nextId++, method, params }, "*");
  function draw(spec, key) {
    const n = spec.elements[key],
      p = n.props;
    if (n.type === "GeneratedView") {
      const frame = document.createElement("iframe");
      frame.title = "Generated deployment map";
      frame.sandbox = "";
      frame.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">${p.html}`;
      return frame;
    }
    const node = document.createElement(
      n.type === "Button" ? "button" : n.type === "Text" ? "p" : "div",
    );
    if (n.type === "Stack") {
      node.className = "stack " + p.direction;
      n.children.forEach((c) => node.append(draw(spec, c)));
    }
    if (n.type === "Text") node.textContent = p.text;
    if (n.type === "Metric") {
      node.className = "metric";
      node.textContent = p.label;
      const value = document.createElement("strong");
      value.textContent = p.value;
      node.append(value);
    }
    if (n.type === "Button") {
      node.textContent = p.label;
      node.onclick = () =>
        send("tools/call", { name: "acknowledge_plan", arguments: {} });
    }
    return node;
  }
  addEventListener("message", (event) => {
    if (event.source !== parent || event.data?.jsonrpc !== "2.0") return;
    const m = event.data;
    if (m.id === 1 && m.result && !ready) {
      ready = true;
      parent.postMessage(
        { jsonrpc: "2.0", method: "ui/notifications/initialized" },
        "*",
      );
    }
    if (m.method === "ui/notifications/tool-result") {
      const data = JSON.parse(
        m.params.content.find((c) => c.type === "text").text,
      );
      document
        .getElementById("app")
        .replaceChildren(draw(data.spec, data.spec.root));
      document.getElementById("status").textContent =
        "MCP resource mounted · " + data.provider;
    }
    if (m.id > 1)
      document.getElementById("status").textContent = m.error
        ? m.error.message
        : "Action returned: " + JSON.stringify(m.result);
  });
  send("ui/initialize", {
    protocolVersion: "2026-01-26",
    appInfo: { name: "Resource dashboard", version: "1.0.0" },
    appCapabilities: {},
  });
</script>

```

## app/web/sandbox.mjs

The restrictive CSP is prepended before untrusted markup. Together with sandbox="", this blocks scripts, parent access, network requests and form submission in generated regions. It does not verify factual claims in their content.

```javascript
// Generated content gets no scripts, network, forms, popups, or parent access.
// A sandbox limits browser capabilities; it does not validate factual content.
export function sandboxDocument(html) {
  const csp =
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${csp}">${html}`;
}

```

## app/web/main.jsx

App tracks topic, mode, prompt, results, trace and source selection. run dispatches MCP hosting, AG-UI streaming or JSON generation. The surface chooses the official A2UI/OpenUI renderer, fixed static slots or the official json-render surface. The trace and full source viewer keep the contracts inspectable.

```javascript
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

```

## tests/test_contracts.py

Tests check all 24 API combinations, mode invariants, rejected graphs and actions, AG-UI event lifecycle and MCP discovery/resource MIME/tool execution. Browser checks separately establish actual library rendering; stdio smoke checks the process transport.

```python
"""Behavioral checks for mode boundaries, validation, actions and real SDK paths."""
import copy
import json
import unittest
from fastapi.testclient import TestClient
from app.server import app
from app.core import MODES, TOPICS, replay, validate


class Contracts(unittest.TestCase):
    def test_all_topics_and_modes(self):
        with TestClient(app) as client:
            for topic in TOPICS:
                for mode in MODES:
                    with self.subTest(topic=topic, mode=mode):
                        r = client.post('/api/generate', json={'topic': topic, 'mode': mode, 'prompt': 'detailed dashboard'})
                        self.assertEqual(r.status_code, 200, r.text)
                        validate(r.json()['spec'])

    def test_mode_boundaries(self):
        self.assertEqual(replay('compact', 'static'), replay('detailed', 'static'))
        self.assertNotEqual(replay('compact', 'declarative'), replay('detailed', 'declarative'))
        for mode in MODES:
            kinds = {e['type'] for e in replay('dashboard', mode)['elements'].values()}
            self.assertEqual('GeneratedView' in kinds, mode in ('open-ended', 'mixed'))
        self.assertEqual({e['type'] for e in replay('dashboard', 'open-ended')['elements'].values()}, {'Stack', 'GeneratedView'})

    def test_reject_invalid_graphs_and_actions(self):
        original = replay('dashboard', 'static')
        for mutate in [lambda s: s['elements']['root']['children'].append('missing'),
                       lambda s: s['elements']['root']['children'].append('root'),
                       lambda s: s['elements']['ack']['props'].update(action='delete_all'),
                       lambda s: s['elements']['units'].update(type='script')]:
            spec = copy.deepcopy(original)
            mutate(spec)
            with self.assertRaises(ValueError):
                validate(spec)
        with TestClient(app) as c:
            self.assertEqual(c.post('/api/action/delete_all').status_code, 403)
            self.assertTrue(c.post('/api/action/acknowledge').json()['accepted'])

    def test_agui_lifecycle_and_state(self):
        with TestClient(app) as c:
            r = c.post('/api/agui', json={'topic': 'agui', 'mode': 'mixed', 'prompt': 'dashboard'})
            events = [json.loads(line[6:]) for line in r.text.splitlines() if line.startswith('data: ')]
            self.assertEqual(events[0]['type'], 'RUN_STARTED')
            self.assertEqual(events[-1]['type'], 'RUN_FINISHED')
            patch = next(e for e in events if e['type'] == 'STATE_DELTA')
            validate(patch['delta'][0]['value'])

    def test_mcp_resource_metadata_and_tool_execution(self):
        with TestClient(app) as c:
            tools = c.post('/api/mcp', json={'method': 'tools/list'}).json()['tools']
            tool = next(t for t in tools if t['name'] == 'show_dashboard')
            uri = tool['_meta']['ui']['resourceUri']
            resource = c.post('/api/mcp', json={'method': 'resources/read', 'params': {'uri': uri}}).json()
            self.assertEqual(resource['contents'][0]['mimeType'], 'text/html;profile=mcp-app')
            for mode in MODES:
                r = c.post('/api/mcp', json={'method': 'tools/call', 'params': {'name': 'show_dashboard', 'arguments': {'mode': mode}}}).json()
                self.assertFalse(r.get('isError'), r)
                validate(json.loads(r['content'][0]['text'])['spec'])
            self.assertEqual(c.post('/api/mcp', json={'method': 'tools/call', 'params': {'name': 'shell'}}).status_code, 403)


if __name__ == '__main__':
    unittest.main(verbosity=2)

```

