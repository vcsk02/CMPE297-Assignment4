# 02 · AG-UI

## Outcome

The official event models and EventEncoder frame RUN_STARTED, STATE_SNAPSHOT, tool events, STATE_DELTA and RUN_FINISHED as server-sent events. The frontend applies the accepted patches. The event protocol carries UI state; it does not define its component catalog.

## Start

Complete the root README setup, then open http://127.0.0.1:8765/?topic=agui. Keep UI_PROVIDER=replay for the recorded baseline. All figures are synthetic.

## Step-by-step execution

1. Select **static**, enter `Show a detailed emergency resource dashboard`, and click **Run example**. Fixed application slots: title, two metrics, and acknowledge button. Changing detailed to compact must leave the layout unchanged. Inspect the trace alongside the rendered surface.
2. Select **declarative**, enter `Show a detailed emergency resource dashboard`, and click **Run example**. A bounded component graph: detailed adds a note and compact removes one metric and selects a row. No generated HTML is allowed. Inspect the trace alongside the rendered surface.
3. Select **open-ended**, enter `Show a detailed emergency resource dashboard`, and click **Run example**. Only a Stack and GeneratedView remain. The custom deployment map appears in a sandbox with no script or network permission. Inspect the trace alongside the rendered surface.
4. Select **mixed**, enter `Show a detailed emergency resource dashboard`, and click **Run example**. Catalog metrics and the acknowledge button surround the generated deployment map. Inspect both boundaries. Inspect the trace alongside the rendered surface.
5. Repeat declarative with `Show a compact resource dashboard`. Compare the removed metric and changed direction.
6. In a mode with a button, click **Acknowledge plan**. Inspect the returned action result. The action affects only this demo session.
7. Try the invalid-action check below. Explain why a valid UI spec is insufficient permission to execute arbitrary tools.

```bash
python -m unittest discover -s tests -v
npm test
```

## Full code walkthrough

Read in this order. The root walkthrough expands every source file in full.

- [app/core.py](../../app/core.py)
- [app/adapters/events.py](../../app/adapters/events.py)
- [app/server.py](../../app/server.py)
- [app/web/main.jsx](../../app/web/main.jsx)
- [app/web/sandbox.mjs](../../app/web/sandbox.mjs)

## Observations to explain in your recording

- Which decisions are fixed in static mode?
- Where does this codelab validate layout and props?
- Which layer describes the UI, and which layer carries it?
- What changes when arbitrary HTML becomes possible?
- What did the actual execution prove, and which live integration was not exercised?

## Video

[Prepared walkthrough MP4](../../videos/02-agui.mp4). Narration is synthetic; replay is explicit. The YouTube publication status is recorded in [videos/manifest.json](../../videos/manifest.json). Record your own explanation if the course requires the student to narrate.
