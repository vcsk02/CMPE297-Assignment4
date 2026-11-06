import React, { useEffect, useRef } from "react";
import { MessageProcessor } from "@a2ui/web_core/v0_9";
import { injectBasicCatalogStyles } from "@a2ui/web_core/v0_9/basic_catalog";
import { A2uiSurface, basicCatalog, Context } from "@a2ui/lit/v0_9";
import { ContextProvider } from "@lit/context";
import { renderMarkdown } from "@a2ui/markdown-it";
import { Generated, performAction } from "./catalog.jsx";

export function A2Surface({ payload }) {
  const ref = useRef();
  useEffect(() => {
    const host = ref.current;
    host.replaceChildren();
    const processor = new MessageProcessor([basicCatalog], (event) =>
      performAction(event.name),
    );
    injectBasicCatalogStyles();
    new ContextProvider(host, {
      context: Context.markdown,
      initialValue: renderMarkdown,
    });
    processor.onSurfaceCreated((surface) => {
      const node = new A2uiSurface();
      node.surface = surface;
      host.append(node);
    });
    payload.messages.forEach((message) => processor.processMessages([message]));
    window.a2processor = processor;
    return () => host.replaceChildren();
  }, [payload]);
  return (
    <>
      <div ref={ref} />
      {payload.artifacts.map((html, i) => (
        <Generated key={i} html={html} />
      ))}
    </>
  );
}
