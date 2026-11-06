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
