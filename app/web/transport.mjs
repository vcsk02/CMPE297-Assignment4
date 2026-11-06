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
