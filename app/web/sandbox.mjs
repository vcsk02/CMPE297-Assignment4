// Generated content gets no scripts, network, forms, popups, or parent access.
// A sandbox limits browser capabilities; it does not validate factual content.
export function sandboxDocument(html) {
  const csp =
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${csp}">${html}`;
}
