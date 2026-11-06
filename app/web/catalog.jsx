import React from "react";
import { z } from "zod";
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { defineRegistry, Renderer, JSONUIProvider } from "@json-render/react";
import {
  createLibrary,
  defineComponent,
  Renderer as OpenRenderer,
} from "@openuidev/react-lang";
import { sandboxDocument } from "./sandbox.mjs";

export async function performAction(name) {
  const response = await fetch(`/api/action/${encodeURIComponent(name)}`, {
    method: "POST",
  });
  if (!response.ok) throw Error(await response.text());
  window.dispatchEvent(
    new CustomEvent("ui-action", { detail: await response.json() }),
  );
}
export function Generated({ html }) {
  return (
    <iframe
      className="generated"
      title="Generated deployment map"
      sandbox=""
      srcDoc={sandboxDocument(html)}
    />
  );
}
export const props = {
  Stack: z.object({ direction: z.enum(["column", "row"]) }),
  Text: z.object({ text: z.string() }),
  Metric: z.object({ label: z.string(), value: z.string() }),
  Button: z.object({ label: z.string(), action: z.literal("acknowledge") }),
  GeneratedView: z.object({ html: z.string() }),
};
export const views = {
  Stack: ({ props: p, children }) => (
    <div className={`stack ${p.direction}`}>{children}</div>
  ),
  Text: ({ props: p }) => <p className="copy">{p.text}</p>,
  Metric: ({ props: p }) => (
    <div className="metric">
      <span>{p.label}</span>
      <strong>{p.value}</strong>
      <small>SYNTHETIC SCENARIO</small>
    </div>
  ),
  Button: ({ props: p }) => (
    <button
      className="action"
      onClick={() => performAction(p.action).catch((e) => alert(e.message))}
    >
      {p.label}
    </button>
  ),
  GeneratedView: ({ props: p }) => <Generated html={p.html} />,
};
export const catalog = defineCatalog(schema, {
  components: Object.fromEntries(
    Object.entries(props).map(([name, p]) => [
      name,
      { props: p, description: `${name} in the bounded dashboard catalog` },
    ]),
  ),
  actions: {},
});
export const { registry } = defineRegistry(catalog, { components: views });
export function JSONSurface({ spec }) {
  return (
    <JSONUIProvider registry={registry}>
      <Renderer spec={spec} registry={registry} />
    </JSONUIProvider>
  );
}
export function StaticSurface({ spec }) {
  // Fixed component slots; the agent cannot introduce component types here.
  const nodes = spec.elements;
  return (
    <div className="stack column">
      <p>{nodes.title.props.text}</p>
      {["units", "eta"].map((key) => (
        <div className="metric" key={key}>
          <span>{nodes[key].props.label}</span>
          <strong>{nodes[key].props.value}</strong>
        </div>
      ))}
      <button onClick={() => performAction("acknowledge")}>
        Acknowledge plan
      </button>
    </div>
  );
}
const components = Object.entries(props).map(([name, p]) =>
  defineComponent({
    name,
    description: `${name} dashboard primitive`,
    props:
      name === "Stack"
        ? z.object({
            children: z.array(z.any()),
            direction: z.enum(["column", "row"]),
          })
        : p,
    component: ({ props: p, renderNode }) =>
      React.createElement(
        views[name],
        { props: p },
        name === "Stack" ? renderNode(p.children) : null,
      ),
  }),
);
export const library = createLibrary({ components, root: "Stack" });
export function OpenSurface({ program }) {
  return (
    <OpenRenderer response={program} library={library} isStreaming={false} />
  );
}
