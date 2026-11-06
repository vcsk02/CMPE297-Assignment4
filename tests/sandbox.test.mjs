import { test } from "node:test";
import assert from "node:assert/strict";
import { sandboxDocument } from "../app/web/sandbox.mjs";
test("policy precedes generated markup and blocks network and scripts", () => {
  const doc = sandboxDocument('<script>fetch("https://example.com")</script>');
  assert.ok(doc.indexOf("Content-Security-Policy") < doc.indexOf("<script>"));
  assert.ok(doc.includes("default-src 'none'"));
  assert.ok(!doc.includes("script-src 'unsafe-inline'"));
});
