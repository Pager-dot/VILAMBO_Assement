# CLAUDE.md — Research Paper Analyzer (Vilambo Assignment)

## Project

AI-powered multi-agent Research Paper Analyzer, built as the technical assignment for the
AI Agent Developer Intern role at Vilambo Private Limited.

- **Deadline:** 24 July 2026, 11:59 PM IST (mandatory for interview shortlisting)
- **Deliverables:** public GitHub repo, ≤3-min demo video, optional deployed UI

## Tech Stack (locked in — do not swap without asking)

- **Orchestration:** LangGraph (state graph, nodes, conditional edges)
- **LLM:** Gemini API via `langchain-google-genai`
  - Dev/testing: `gemini-2.5-flash-lite` (cheap)
  - Demo/quality runs: `gemini-2.5-flash` or `gemini-flash-latest`
  - Model name must be read from an env var, never hardcoded, so it's easy to swap per node
- **PDF → text:** `marker` (marker-pdf)
- **Structured outputs:** Pydantic models passed to `.with_structured_output(...)`
- **Secrets:** `.env` + `python-dotenv`, `.env` in `.gitignore`, never hardcoded

## Required Agent Architecture

- **Boss Agent (Orchestrator/Combiner):** delegates work, tracks progress, assembles the
  final `ResearchBrief` from approved outputs. Does not need its own LLM call — a
  deterministic assembly node is acceptable and cleaner.
- **Paper Analyzer:** extracts methodology, hypothesis, experiments, key findings.
- **Summary Generator:** 150–200 word executive summary (problem, approach, results).
- **Citation Extractor:** all citations/references + key related work.
- **Key Insights Agent:** **NOT implemented in this pass** — explicitly deferred. Do not
  build unless asked; note it as a known limitation in the README instead.
- **Review Agent:** one generic, reusable node parameterized by which field it's
  reviewing (not four separate review agents). Returns `{score: int, feedback: str,
  passed: bool}`. Threshold: score ≥ 7 passes. Max 2 retries per field, then proceed
  anyway and flag it in the final brief rather than looping forever.

## Workflow / Graph Shape

```
Input (PDF/text) → marker extraction
  → Paper Analyzer → Review → (retry analyzer | proceed)
  → fan out: Summary Generator, Citation Extractor (parallel)
       each → its own Review pass → (retry that agent | proceed)
  → fan-in: Boss combines all approved outputs
  → Output: final ResearchBrief (markdown/JSON)
```

## State Schema (reference — implement as `TypedDict` or Pydantic)

```python
class ResearchState(TypedDict):
    paper_text: str
    metadata: dict          # title, authors, year, venue
    analysis: dict | None
    summary: str | None
    citations: list | None
    review_scores: dict     # {"analysis": 8, "summary": 6, ...}
    review_feedback: dict   # {"summary": "too vague on results"}
    retry_counts: dict      # {"analysis": 0, "summary": 1, ...}
    final_brief: str | None
```

## Coding Conventions

- Every Gemini call wrapped in retry-with-backoff (transient errors / rate limits) —
  don't let one node crash the whole graph run.
- `logging` at INFO level on every node entry/exit, including review scores — this
  doubles as the iteration-history evidence for the video/README.
- Prefer small, testable node functions: `(state) -> partial_state_update`.
- Long papers: guard against blowing the context window — truncate/chunk before
  sending to the LLM if `marker` output is very large.
- README must include: setup steps, an architecture diagram (generate via
  `graph.get_graph().draw_mermaid()` off the real graph, not hand-drawn), a sample
  input/output pair committed to the repo, and a "Known Limitations" section.

## Priority Order (matches grading weights: Architecture 30%, LLM Integration 25%,
Review & Iteration 20%, Code Quality 15%, Presentation 10%, bonus extra)

1. Working graph with a real review/retry loop
2. Clean README + accurate mermaid diagram
3. Demo video
4. Optional UI (Streamlit) / Key Insights agent — only if time remains before the deadline