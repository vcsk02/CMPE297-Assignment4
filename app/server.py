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
