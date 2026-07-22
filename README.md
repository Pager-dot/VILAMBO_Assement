# Research Paper Analyzer

AI-powered multi-agent system that reads a research paper (PDF or text) and produces a
structured research brief: metadata, methodology/findings analysis, an executive summary,
organized citations, and actionable key insights — each stage quality-checked and retried
automatically before the final brief is assembled.

Built for the Vilambo Private Limited AI Agent Developer Intern technical assignment.

## Architecture

Built with [LangGraph](https://github.com/langchain-ai/langgraph) as a state graph — not a
linear script. A **Boss Agent** (a deterministic combiner node, no LLM call needed for pure
assembly) orchestrates four specialized sub-agents, each gated by a shared, generic
**Review Agent** that scores outputs 1–10 and triggers retries below threshold.

```mermaid
graph TD;
	__start__([<p>__start__</p>]):::first
	metadata(metadata)
	analyzer(analyzer)
	review_analysis(review_analysis)
	summarizer(summarizer)
	review_summary(review_summary)
	citation_extractor(citation_extractor)
	review_citations(review_citations)
	key_insights(key_insights)
	review_insights(review_insights)
	boss(boss)
	__end__([<p>__end__</p>]):::last
	__start__ --> metadata;
	analyzer --> review_analysis;
	citation_extractor --> review_citations;
	key_insights --> review_insights;
	metadata --> analyzer;
	review_analysis -.-> analyzer;
	review_analysis -.-> citation_extractor;
	review_analysis -.-> key_insights;
	review_analysis -.-> summarizer;
	review_citations -.-> boss;
	review_citations -.-> citation_extractor;
	review_insights -.-> boss;
	review_insights -.-> key_insights;
	review_summary -.-> boss;
	review_summary -.-> summarizer;
	summarizer --> review_summary;
	boss --> __end__;
	classDef default fill:#f2f0ff,line-height:1.2
	classDef first fill-opacity:0
	classDef last fill:#bfb6fc
```

*(Generated directly from the compiled graph via `graph.get_graph().draw_mermaid()` —
see `app/graph/build.py`'s `__main__` block to regenerate.)*

Solid arrows are fixed transitions; dashed arrows are the conditional
retry/proceed routing chosen at runtime based on review scores.

**Flow:**
1. `metadata` — one-shot extraction of title/authors/year/venue (not review-gated; low-stakes factual lookup)
2. `analyzer` → `review_analysis` — extracts methodology/hypothesis/experiments/findings, scored against the source paper; retries (max 2) if score < 7
3. Once analysis passes (or exhausts retries), it fans out in parallel to `summarizer`, `citation_extractor`, and `key_insights`, each with its own independent review/retry loop
4. All three branches converge on `boss`, which deterministically assembles the final markdown brief — no LLM call needed for pure combination
5. Any field that never passes review after its retry budget is flagged in the final brief rather than looping forever

### Agents

| Agent | File | Role |
|---|---|---|
| Boss (Orchestrator) | `app/agents/boss.py` | Deterministic combiner — assembles the final `ResearchBrief` from all approved outputs, no LLM call |
| Paper Analyzer | `app/agents/analyzer.py` | Extracts methodology, hypothesis, experiments, key findings |
| Summary Generator | `app/agents/summarizer.py` | 150–200 word executive summary (problem, approach, results) |
| Citation Extractor | `app/agents/citations.py` | All citations/references + flags key related work |
| Key Insights | `app/agents/insights.py` | Actionable takeaways, practical implications, and potential applications |
| Review Agent | `app/agents/reviewer.py` | **One** generic, reusable node parameterized by which field it's reviewing — not four separate review agents. Scores against the *source paper* (not just the output in isolation), returns `{score, feedback}`; threshold ≥7 passes, max 2 retries per field |
| Metadata | `app/agents/metadata.py` | One-shot title/authors/year/venue extraction (not review-gated) |

### State

`app/graph/state.py` — a `TypedDict` (`ResearchState`) with merge-reducers on the dicts/list
that the parallel summary and citation branches both write into (`review_scores`,
`review_feedback`, `retry_counts`, `flags`), since a plain overwrite reducer would let one
parallel branch's write clobber the other's.

## Setup

Requires Python 3.11+ (see [Known Limitations](#known-limitations) re: 3.14).

```bash
pip install -r requirements.txt
cp .env.example .env
# then edit .env and set GOOGLE_API_KEY (get one at https://aistudio.google.com/apikey)
```

`.env` model names are read per-node so they can be swapped without touching code — see
`.env.example` for current recommended values and why (some Gemini model generations have
been retired for new API keys; the file documents what's confirmed working).

## Usage

```bash
# .txt input
python -m app.main samples/input/attention_is_all_you_need.txt -o samples/output/attention_brief.md

# PDF input (extracted with pypdf by default; set PDF_BACKEND=docling for higher fidelity)
python -m app.main samples/input/2607.18100v1.pdf -o samples/output/2607.18100v1_brief.md

# print to stdout instead of a file
python -m app.main samples/input/attention_is_all_you_need.txt
```

## Web UI

A React frontend (in `frontend/`) wraps the pipeline: upload a PDF, paste a
paper URL, or paste raw text, then watch the agents run live — which agent is
currently active, each review score, the full retry/iteration history, and the
final brief. It talks to a FastAPI server (`app/server.py`) that streams agent
progress over Server-Sent Events.

```bash
# terminal 1 — API (streams live agent progress)
# NB: run via `python3 -m uvicorn` so it uses the interpreter your deps are
# installed under — a bare `uvicorn` may resolve to a different Python.
python3 -m uvicorn app.server:app --reload --port 8000

# terminal 2 — UI
cd frontend && npm install && npm run dev   # http://localhost:5173
```

See [`frontend/README.md`](frontend/README.md) for details.

Logging is at INFO level on every node entry/exit, including review scores and retry
counts — this is the audit trail for how many iterations each field went through.

## Sample input/output

- Input: `samples/input/attention_is_all_you_need.txt` (small — cheap to test with)
- Input: `samples/input/2607.18100v1.pdf` (real arXiv PDF, exercises the PDF-extraction path)
- Output: `samples/output/attention_brief.md`, `samples/output/2607.18100v1_brief.md`

## Known Limitations

- **UI is dev-oriented.** The React frontend + FastAPI server (see [Web UI](#web-ui))
  cover upload/URL/paste, live agent progress, review scores, iteration history,
  and the final brief. Runs as two local processes with a Vite dev proxy; not
  yet packaged as a single deployable service.
- **PDF extraction has two backends (`PDF_BACKEND`).** Default `pypdf` is light and
  deploy-friendly (no ML deps, instant start) — the right choice for small/free hosted
  instances. `docling` is higher fidelity (layout/table/OCR) but heavy: it pulls in PyTorch
  and downloads model weights on first run (~1 min for a typical paper, cached after), and
  isn't installed by default (`pip install docling` to use it locally). `marker-pdf` was
  ruled out — it pins an older Pillow that won't compile on Python 3.14.
- **Context handling is truncation, not chunking.** `MAX_CONTEXT_CHARS` (in `app/config.py`)
  caps how much of the paper text is sent per LLM call. Fine for typical papers; a very
  long paper could lose content past the cutoff rather than being summarized in chunks.
- **Gemini model availability shifts.** Several model generations (`gemini-2.0-*`,
  `gemini-2.5-*`) return 404 "no longer available to new users" on newly created API keys,
  even with billing enabled — this isn't a quota issue, the models are retired for new
  projects. `.env.example` documents which model names are confirmed working and how to
  check what's available on a given key.
- **No automated test suite.** Validation so far has been manual end-to-end runs (small
  text sample + real PDF), which exercise the retry-cap / fan-out / fan-in logic — e.g. the
  key-insights branch reliably triggers a real review-and-retry cycle on the sample paper.
