"""Exercise the actual stdio process transport, independent of the browser host."""
import asyncio
import json
import sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    params = StdioServerParameters(command=sys.executable, args=['-m', 'app.mcp_server'])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            assert any(t.name == 'show_dashboard' for t in tools.tools)
            result = await session.call_tool('show_dashboard', {'mode': 'mixed'})
            assert not result.isError
            spec = json.loads(result.content[0].text)['spec']
            assert 'artifact' in spec['elements']
            print('PASS: MCP stdio initialize, tools/list, tools/call, mixed-mode result')

asyncio.run(main())
