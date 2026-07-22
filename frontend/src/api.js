// Thin client for the FastAPI backend.
//
// In dev, VITE_API_BASE is unset and requests go to "/api/..." which the Vite
// proxy forwards to localhost:8000. In production, set VITE_API_BASE to the
// deployed backend URL (e.g. https://vilambo-assement.onrender.com) at build
// time and requests hit it directly (CORS is open on the server).
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export async function fetchGraph() {
  const res = await fetch(`${API_BASE}/api/graph`);
  if (!res.ok) throw new Error(`Failed to load graph (${res.status})`);
  return res.json();
}

/** Ask a grounded question about an already-analyzed paper. */
export async function askQuestion({ paperText, question, selection, history }) {
  const res = await fetch(`${API_BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paper_text: paperText,
      question,
      selection: selection || null,
      history: history || null,
    }),
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const data = await res.json();
  return data.answer;
}

/**
 * POST an analysis request and consume the Server-Sent Events stream.
 * `input` is one of { file }, { url }, or { text }.
 * `onEvent(evt)` is called for every parsed JSON event as it arrives.
 */
export async function analyze(input, onEvent, signal) {
  const form = new FormData();
  if (input.file) form.append("file", input.file);
  if (input.url) form.append("url", input.url);
  if (input.text) form.append("text", input.text);

  const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: form, signal });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        onEvent(JSON.parse(json));
      } catch {
        /* skip malformed frame */
      }
    }
  }
}
