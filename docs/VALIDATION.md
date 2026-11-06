# Validation and limits

Baseline: November 6, 2026. Replay provider, synthetic data, Python 3.12, Node 24, Chromium 138. Actual outputs are committed in `evidence/`.

| Check | Result | What it establishes |
|---|---|---|
| Python contract suite | 5 test methods pass | 24 API combinations, mode boundaries, invalid graphs/actions, AG-UI lifecycle, actual MCP SDK resource/tool behavior |
| Node policy check | Pass | CSP precedes generated markup and does not grant script execution |
| Browser render matrix | 24/24, no page errors | Six topics × four modes render using the shipped libraries and local host |
| Compact layouts and actions | 6/6 each | Prompt variation changes declarative layouts and acknowledge actions return to the application |
| Browser sandbox probe | Pass | Injected script does not execute, parent variable is not changed, external image request fails under CSP |
| MCP stdio smoke | Pass | A real child process initializes and executes tools through the MCP Python client |
| Optional live model provider | Not run | Requires the user's chosen model and credentials |
| External MCP Apps host | Not run | The recorded host is this project's minimal local host |
| YouTube publication | Pending | No URLs have been invented |
| Student microphone explanation | Not recorded | Prepared videos use a synthetic voice |

These six original codelabs cover the requested six topics and four generation contracts. They do not claim completion of all 23 independent lessons in the reference repository. The code walkthrough explains how these examples work; it is not a live-model benchmark or a test of learner understanding.

The browser video files combine captured execution states with readable source frames and synthetic narration. They are automatically assembled walkthroughs, not continuous recordings of a student operating the computer. If your course requires a personal recording, use them for rehearsal and record your own walkthrough.

The submission checker is expected to fail until the six real YouTube links and the student-explanation status are supplied truthfully. That expected failure is separate from the passing application checks.
