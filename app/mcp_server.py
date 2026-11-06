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
