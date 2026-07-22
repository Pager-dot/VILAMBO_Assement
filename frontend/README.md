# Research Paper Analyzer — Web UI

A modern React interface for the multi-agent research-paper pipeline. Upload a
PDF (or paste a URL / raw text) and watch the agents work in real time: which
agent is currently running, the review score each output receives, the full
retry/iteration history, and the final assembled brief.

## What it shows

- **Input** — drag-and-drop PDF/`.txt`, a paper URL (arXiv `/abs/` links are
  auto-resolved to the PDF), or pasted text.
- **Guided run** (`RunnerModal`) — a popup steps through the four stages
  (Metadata → Analyze & Review → Summarize · Cite · Insights → Assemble), showing
  the agent currently processing and a `×N` badge when a sub-agent is retried,
  then a peer-review summary (scores + revision timeline).
- **Result** (`ResultView`) — the source paper (`SourceViewer`, native PDF render)
  and the generated brief (`BriefView`) shown side by side.
- **Grounded Q&A** (`AskPanel`) — highlight text in the brief for a floating
  Ask / Explain toolbar; answers come strictly from the source paper.
- **Execution details** — re-open the full pipeline (`AgentPipeline` +
  `ReviewPanel`): per-field scores (pass ≥ 7/10), every review attempt with its
  feedback, and any flags raised when a field exhausts its retry budget.

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
npm run preview    # serve the build locally (uses .env.production → deployed backend)
```

`npm run build`/`preview` read `.env.production`, which sets `VITE_API_BASE` to the
deployed backend URL so the built site calls it directly. In dev that var is unset
and the Vite proxy forwards `/api` to `localhost:8000`. Deploy `dist/` to any static
host; the backend sends permissive CORS headers.

## Structure

```
src/
  App.jsx                  UI state machine + SSE event handling
  api.js                   fetch + SSE stream parser + askQuestion()
  components/
    InputPanel.jsx         upload / URL / paste
    RunnerModal.jsx        the guided popup: stage stepper + live agent detail
    ResultView.jsx         source paper ‖ brief, side by side
    SourceViewer.jsx       native PDF render / text preview of the source
    BriefView.jsx          rendered / raw brief + text-selection Ask toolbar
    AskPanel.jsx           grounded Q&A chat over the paper
    AgentPipeline.jsx      detailed agent/sub-agent diagram (in "view details")
    AgentCard.jsx          one agent node (status, score, retry badge)
    ReviewPanel.jsx        score tiles + iteration timeline + flags
  styles.css               all styling (no CSS framework)
```
