# Part 1 · A2UI

Synthetic narration over actual captured source and browser execution. Deterministic replay; no live model calls.

## 00:00:00

This is part 1, A2UI. This is an automated walkthrough with synthetic narration. The browser executes the repository code using deterministic replay and synthetic emergency resource data. No live model call or external application host is claimed. We will explain the implementation, execute static, declarative, open-ended and mixed modes, and inspect the actual results.

## 00:00:22

The shared core declares the six topics, four modes and five allowed components. Validate first checks the number of nodes and the root. It tracks visiting and visited nodes so cycles and missing children cannot enter the renderer. The catalog is the application contract.

## 00:00:38

The validation walk checks component names and exact property names. Every property must be a bounded string. Stack direction is an enum, and Button actions can only acknowledge. Only Stack can have children. The walk rejects unreachable nodes as well as excessive graph depth.

## 00:00:54

Replay is explicitly a scripted agent. The application constructs a title, two metrics and the acknowledge action. Static mode preserves this layout. In other modes, compact removes the arrival metric and detailed adds a synthetic regional note. These keywords make layout differences reproducible.

## 00:01:12

For open-ended and mixed mode, replay creates a custom HTML deployment map. User prompt text is escaped before insertion into this fixture. Open-ended replaces catalog content with the generated region. Mixed inserts the same artifact alongside the application components. These two contracts expose different amounts of freedom.

## 00:01:32

formats.py, lines 1 through 34. a2ui translates Stack/Text/Metric/Button into basic-catalog components and emits the three ordered envelopes. GeneratedView is deliberately removed from the standard catalog surface and returned as a separate host artifact. openui emits root first and forward references afterward; property insertion order matches library component signatures.

## 00:01:58

formats.py, lines 35 through 47. a2ui translates Stack/Text/Metric/Button into basic-catalog components and emits the three ordered envelopes. GeneratedView is deliberately removed from the standard catalog surface and returned as a separate host artifact. openui emits root first and forward references afterward; property insertion order matches library component signatures.

## 00:02:24

a2ui.jsx, lines 1 through 34. The official MessageProcessor receives the basic catalog and an action callback. The official A2uiSurface is mounted when a surface is created. Each payload message is processed in order. Generated artifacts are mounted outside that A2UI surface.

## 00:02:42

a2ui.jsx, lines 35 through 40. The official MessageProcessor receives the basic catalog and an action callback. The official A2uiSurface is mounted when a surface is created. Each payload message is processed in order. Generated artifacts are mounted outside that A2UI surface.

## 00:03:01

sandbox.mjs, lines 1 through 8. The restrictive CSP is prepended before untrusted markup. Together with sandbox="", this blocks scripts, parent access, network requests and form submission in generated regions. It does not verify factual claims in their content.

## 00:03:17

The HTTP generation route checks topic and mode, runs the harness when selected, and otherwise generates a graph. A2UI and OpenUI receive their own adapters. AG-UI uses a separate event-stream endpoint. The action route checks authorization on the server. These are different delivery contracts around the same bounded task.

## 00:03:36

The browser run function clears the previous output and trace. MCP mode creates an app host. AG-UI consumes streamed events. Other topics post a generation request. Returned results and tool history become inspectable UI state. Later in this same module the surface selects the official renderer or the fixed static slots. The complete module is included in the written walkthrough.

## 00:03:59

Static mode retains the application-defined slots. The output shows twelve units and an eight minute arrival estimate. The agent cannot introduce a new layout in this contract. The structured region is rendered by official A2UI Lit components; custom HTML remains outside the standard A2UI catalog.

## 00:04:18

Declarative mode chooses a graph from the component catalog. The detailed request adds a regional note. Notice the source contract and the actual renderer. The same graph can travel over events or in a tool result. The structured region is rendered by official A2UI Lit components; custom HTML remains outside the standard A2UI catalog.

## 00:04:38

Open-ended mode displays a custom HTML deployment map. There are no catalog metric cards in this output. The generated region receives no scripts or network permission. This replay is real browser execution of a scripted output, not evidence of a model generating it. The structured region is rendered by official A2UI Lit components; custom HTML remains outside the standard A2UI catalog.

## 00:05:02

Mixed mode combines catalog content, the custom deployment map and the acknowledge action. Inspect both regions. The application validates the graph and separately isolates the generated document. The structured region is rendered by official A2UI Lit components; custom HTML remains outside the standard A2UI catalog.

## 00:05:23

Now we change the declarative prompt to compact and run again. The arrival metric is removed and Stack changes direction. Static mode would preserve its fixed slots. This is a reproducible way to explain which decisions belong to the application and which decisions belong to the generated description.

## 00:05:39

The acknowledge button executes an authorized action and returns a real result. It affects only this synthetic demo session. A valid UI description is not permission to call any tool. The server and the MCP host both maintain allowlists. This action result comes from the application code, not from fabricated console output.

## 00:05:58

The captured test output shows the Python contract tests, Node sandbox policy check, and the MCP stdio smoke test. The browser matrix separately rendered all twenty four topic and mode combinations with no page errors. These checks establish replay execution and local protocol behavior. Live model behavior and an external MCP Apps host remain untested.

## 00:06:21

This completes A2UI. Review the full source walkthrough and this part's codelab README. The prepared narration is synthetic. Record your own explanation if required by the course, then upload one accessible YouTube video for this part and put its real URL in the manifest. The submission checker intentionally reports missing publication or student narration.

