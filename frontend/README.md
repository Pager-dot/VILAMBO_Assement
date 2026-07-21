# Research Paper Analyzer — Web UI

A modern React interface for the multi-agent research-paper pipeline. Upload a
PDF (or paste a URL / raw text) and watch the agents work in real time: which
agent is currently running, the review score each output receives, the full
retry/iteration history, and the final assembled brief.

## What it shows

- **Input** — drag-and-drop PDF/`.txt`, a paper URL (arXiv `/abs/` links are
  auto-resolved to the PDF), or pasted text.
- **Agent workflow** — the live LangGraph pipeline (metadata → analyzer →
  parallel summary, citation & key-insights branches → boss), each node lighting
  up as it runs, with a `×N` badge when a sub-agent is retried.
- **Review & iterations** — per-field scores (pass ≥ 7/10), a chronological
  timeline of every review attempt with its feedback, and any flags raised when
  a field exhausts its retry budget.
- **Research brief** — the final markdown, rendered or raw, copy/download-able.

## Architecture

```
React (Vite, :5173)  ──/api──▶  FastAPI (app/server.py, :8000)  ──▶  LangGraph pipeline
        ▲                              │
        └────── Server-Sent Events ────┘   (live agent progress: task / task_result)
```

The backend runs the graph with `stream_mode="debug"`, which emits a `task`
event when each node starts and a `task_result` when it finishes — those map
directly to the "running" / "done" states and review scores in the UI.

## Run it

Two processes. From the repo root:

```bash
# 1. Backend (needs GOOGLE_API_KEY in .env — see the main README)
pip install -r requirements.txt
# run via `python3 -m uvicorn` so it uses the same interpreter as your deps
# (a bare `uvicorn` on PATH may point at a different Python version)
python3 -m uvicorn app.server:app --reload --port 8000

# 2. Frontend
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. The Vite dev server proxies `/api` to the
backend on `:8000`, so there's nothing else to configure.

## Build for production

```bash
npm run build      # outputs to frontend/dist/
npm run preview    # serve the build locally
```

For a real deployment, serve `dist/` from any static host and point it at the
FastAPI service (the backend already sends permissive CORS headers).

## Structure

```
src/
  App.jsx                  state + SSE event handling
  api.js                   fetch + SSE stream parser
  components/
    InputPanel.jsx         upload / URL / paste
    AgentPipeline.jsx      the visual workflow
    AgentCard.jsx          one agent node (status, score, retry badge)
    ReviewPanel.jsx        score tiles + iteration timeline + flags
    BriefView.jsx          rendered / raw markdown output
  styles.css               all styling (no CSS framework)
```
