# Record and publish each part

The assignment requires a YouTube video for each part, with your step-by-step code explanation and actual execution. The prepared recordings use a synthetic voice. They are useful rehearsal material, but they cannot establish that you personally explained the work.

1. Start the application using the root README. Open the part's README and rehearse its source walkthrough.
2. Use OBS Studio or your preferred screen recorder. Include your microphone, editor and browser. Record at 1080p or higher and keep code readable.
3. Explain the source files in the part's walkthrough. Trace the request through validation, representation/transport, rendering and action handling. Identify replay mode or explicitly configure live mode and show the provider label.
4. Execute all four modes. Change detailed to compact, show the contract difference, and click the action. In MCP Apps show discovery, resource reading, iframe initialization and tool-result notification. In AG-UI explain the state delta. In harness integration inspect tool history and budget.
5. Run the tests in a terminal and show their real output. Explain untested live and external host paths.
6. Export one video per part. Upload each to your YouTube channel, choose the appropriate visibility, and verify that the course grader can access it.
7. Add each real `https://youtu.be/...` or `https://www.youtube.com/watch?v=...` URL to its `youtube_url` in `videos/manifest.json`. Also update `narration` and `student_explanation_recorded` truthfully if you replace the prepared videos.
8. Run `python scripts/check-submission.py`, commit the manifest, and push. Watch the six published videos once to verify readable code, audible explanation, and visible execution.

No YouTube upload is represented as complete until a real URL is recorded. This environment has no connected YouTube publishing tool or channel session.
