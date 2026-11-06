# Part 3 · MCP Apps

Synthetic narration over actual captured source and browser execution. Deterministic replay; no live model calls.

## 00:00:00

This is part 3, MCP Apps. This is an automated walkthrough with synthetic narration. The browser executes the repository code using deterministic replay and synthetic emergency resource data. No live model call or external application host is claimed. We will explain the implementation, execute static, declarative, open-ended and mixed modes, and inspect the actual results.

## 00:00:23

The shared core declares the six topics, four modes and five allowed components. Validate first checks the number of nodes and the root. It tracks visiting and visited nodes so cycles and missing children cannot enter the renderer. The catalog is the application contract.

## 00:00:39

The validation walk checks component names and exact property names. Every property must be a bounded string. Stack direction is an enum, and Button actions can only acknowledge. Only Stack can have children. The walk rejects unreachable nodes as well as excessive graph depth.

## 00:00:55

Replay is explicitly a scripted agent. The application constructs a title, two metrics and the acknowledge action. Static mode preserves this layout. In other modes, compact removes the arrival metric and detailed adds a synthetic regional note. These keywords make layout differences reproducible.

## 00:01:12

For open-ended and mixed mode, replay creates a custom HTML deployment map. User prompt text is escaped before insertion into this fixture. Open-ended replaces catalog content with the generated region. Mixed inserts the same artifact alongside the application components. These two contracts expose different amounts of freedom.

## 00:01:33

mcp_server.py, lines 1 through 31. FastMCP registers the HTML resource and its MIME type. show_dashboard advertises the resource URI in tool metadata. acknowledge_plan is app-visible and calls the same server action allowlist. The module entry point starts the actual stdio server.

## 00:01:55

mcp-host.jsx, lines 1 through 34. The host discovers the UI metadata before reading the resource. It calls the tool through a real MCP client, mounts the HTML in an opaque-origin iframe, validates event.source, completes initialization, and forwards input/results. Only acknowledge_plan is callable from the app frame.

## 00:02:17

mcp-host.jsx, lines 35 through 68. The host discovers the UI metadata before reading the resource. It calls the tool through a real MCP client, mounts the HTML in an opaque-origin iframe, validates event.source, completes initialization, and forwards input/results. Only acknowledge_plan is callable from the app frame.

## 00:02:40

mcp-host.jsx, lines 69 through 88. The host discovers the UI metadata before reading the resource. It calls the tool through a real MCP client, mounts the HTML in an opaque-origin iframe, validates event.source, completes initialization, and forwards input/results. Only acknowledge_plan is callable from the app frame.

## 00:03:02

mcp-view.html, lines 1 through 34. The trusted app resource has an inline script policy and no network access. It initializes with the host over JSON-RPC postMessage, receives tool results, and renders the bounded teaching graph. Generated HTML is placed in another iframe with an empty sandbox. Its button asks the host to call the approved tool.

## 00:03:25

mcp-view.html, lines 35 through 68. The trusted app resource has an inline script policy and no network access. It initializes with the host over JSON-RPC postMessage, receives tool results, and renders the bounded teaching graph. Generated HTML is placed in another iframe with an empty sandbox. Its button asks the host to call the approved tool.

## 00:03:48

mcp-view.html, lines 69 through 102. The trusted app resource has an inline script policy and no network access. It initializes with the host over JSON-RPC postMessage, receives tool results, and renders the bounded teaching graph. Generated HTML is placed in another iframe with an empty sandbox. Its button asks the host to call the approved tool.

## 00:04:12

mcp-view.html, lines 103 through 119. The trusted app resource has an inline script policy and no network access. It initializes with the host over JSON-RPC postMessage, receives tool results, and renders the bounded teaching graph. Generated HTML is placed in another iframe with an empty sandbox. Its button asks the host to call the approved tool.

## 00:04:36

sandbox.mjs, lines 1 through 8. The restrictive CSP is prepended before untrusted markup. Together with sandbox="", this blocks scripts, parent access, network requests and form submission in generated regions. It does not verify factual claims in their content.

## 00:04:52

The HTTP generation route checks topic and mode, runs the harness when selected, and otherwise generates a graph. A2UI and OpenUI receive their own adapters. AG-UI uses a separate event-stream endpoint. The action route checks authorization on the server. These are different delivery contracts around the same bounded task.

## 00:05:12

The browser run function clears the previous output and trace. MCP mode creates an app host. AG-UI consumes streamed events. Other topics post a generation request. Returned results and tool history become inspectable UI state. Later in this same module the surface selects the official renderer or the fixed static slots. The complete module is included in the written walkthrough.

## 00:05:34

Static mode retains the application-defined slots. The output shows twelve units and an eight minute arrival estimate. The agent cannot introduce a new layout in this contract. The local host discovers the tool, reads its resource, completes the app handshake, and delivers the tool result over the bridge.

## 00:05:52

Declarative mode chooses a graph from the component catalog. The detailed request adds a regional note. Notice the source contract and the actual renderer. The same graph can travel over events or in a tool result. The local host discovers the tool, reads its resource, completes the app handshake, and delivers the tool result over the bridge.

## 00:06:11

Open-ended mode displays a custom HTML deployment map. There are no catalog metric cards in this output. The generated region receives no scripts or network permission. This replay is real browser execution of a scripted output, not evidence of a model generating it. The local host discovers the tool, reads its resource, completes the app handshake, and delivers the tool result over the bridge.

## 00:06:35

Mixed mode combines catalog content, the custom deployment map and the acknowledge action. Inspect both regions. The application validates the graph and separately isolates the generated document. The local host discovers the tool, reads its resource, completes the app handshake, and delivers the tool result over the bridge.

## 00:06:54

Now we change the declarative prompt to compact and run again. The arrival metric is removed and Stack changes direction. Static mode would preserve its fixed slots. This is a reproducible way to explain which decisions belong to the application and which decisions belong to the generated description.

## 00:07:11

The acknowledge button executes an authorized action and returns a real result. It affects only this synthetic demo session. A valid UI description is not permission to call any tool. The server and the MCP host both maintain allowlists. This action result comes from the application code, not from fabricated console output.

## 00:07:30

The captured test output shows the Python contract tests, Node sandbox policy check, and the MCP stdio smoke test. The browser matrix separately rendered all twenty four topic and mode combinations with no page errors. These checks establish replay execution and local protocol behavior. Live model behavior and an external MCP Apps host remain untested.

## 00:07:52

This completes MCP Apps. Review the full source walkthrough and this part's codelab README. The prepared narration is synthetic. Record your own explanation if required by the course, then upload one accessible YouTube video for this part and put its real URL in the manifest. The submission checker intentionally reports missing publication or student narration.

