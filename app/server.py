"""FastAPI server exposing the research-paper pipeline to the React frontend.

Streams live agent progress over Server-Sent Events (SSE) so the UI can show
which agent is currently running, review scores as they land, and iteration
history — then delivers the final assembled brief.

Run with:  uvicorn app.server:app --reload --port 8000
"""

import json
import logging
import tempfile
from pathlib import Path

import httpx
from fastapi import FastAPI, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from app.config import REVIEW_PASS_THRESHOLD, MAX_RETRIES_PER_FIELD
from app.graph.build import build_graph
from app.utils.logging_config import setup_logging
from app.utils.pdf import extract_text

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="Research Paper Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compile the graph once at startup — it's stateless per invocation.
GRAPH = build_graph()

# Presentation metadata for the frontend: how the raw graph nodes map to
# human-facing agents, roles, and which "team" they belong to.
NODES = [
    {"id": "metadata", "label": "Metadata Agent", "role": "Extracts title, authors, year, venue", "kind": "subagent", "reviews": None},
    {"id": "analyzer", "label": "Paper Analyzer", "role": "Methodology, hypothesis, experiments, findings", "kind": "subagent", "reviews": None},
    {"id": "review_analysis", "label": "Review · Analysis", "role": "Scores analysis vs. source paper", "kind": "reviewer", "reviews": "analysis"},
    {"id": "summarizer", "label": "Summary Generator", "role": "150–200 word executive summary", "kind": "subagent", "reviews": None},
    {"id": "review_summary", "label": "Review · Summary", "role": "Scores summary vs. source paper", "kind": "reviewer", "reviews": "summary"},
    {"id": "citation_extractor", "label": "Citation Extractor", "role": "All references + key related work", "kind": "subagent", "reviews": None},
    {"id": "review_citations", "label": "Review · Citations", "role": "Scores citations vs. source paper", "kind": "reviewer", "reviews": "citations"},
    {"id": "boss", "label": "Boss Orchestrator", "role": "Assembles the final brief (no LLM)", "kind": "boss", "reviews": None},
]


@app.get("/api/graph")
def get_graph():
    """Static description of the agent pipeline for the frontend to render."""
    return {
        "nodes": NODES,
        "config": {
            "pass_threshold": REVIEW_PASS_THRESHOLD,
            "max_retries": MAX_RETRIES_PER_FIELD,
        },
    }


def _extract_from_url(url: str) -> str:
    """Fetch a paper from a URL. Handles PDFs (incl. arXiv /abs/ links) and
    plain text/HTML."""
    # arXiv abstract pages -> the actual PDF
    if "arxiv.org/abs/" in url:
        url = url.replace("/abs/", "/pdf/")

    with httpx.Client(follow_redirects=True, timeout=60.0) as client:
        resp = client.get(url, headers={"User-Agent": "ResearchPaperAnalyzer/1.0"})
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "").lower()

        is_pdf = "application/pdf" in content_type or url.lower().endswith(".pdf")
        if is_pdf:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(resp.content)
                tmp_path = tmp.name
            try:
                return extract_text(tmp_path)
            finally:
                Path(tmp_path).unlink(missing_ok=True)

        # Fall back to text; strip tags crudely for HTML.
        text = resp.text
        if "html" in content_type:
            import re

            text = re.sub(r"<script.*?</script>", " ", text, flags=re.S | re.I)
            text = re.sub(r"<style.*?</style>", " ", text, flags=re.S | re.I)
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text)
        return text


def _resolve_paper_text(file: UploadFile | None, url: str | None, text: str | None) -> str:
    if text and text.strip():
        return text
    if url and url.strip():
        return _extract_from_url(url.strip())
    if file is not None:
        raw = file.file.read()
        name = (file.filename or "").lower()
        if name.endswith(".txt"):
            return raw.decode("utf-8", errors="replace")
        # Everything else: treat as PDF via docling.
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(raw)
            tmp_path = tmp.name
        try:
            return extract_text(tmp_path)
        finally:
            Path(tmp_path).unlink(missing_ok=True)
    raise ValueError("Provide a file, a URL, or pasted text.")


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"


def _run_stream(paper_text: str):
    """Sync generator yielding SSE lines as the graph executes."""
    initial_state = {
        "paper_text": paper_text,
        "metadata": {},
        "analysis": None,
        "summary": None,
        "citations": None,
        "review_scores": {},
        "review_feedback": {},
        "retry_counts": {},
        "flags": [],
        "final_brief": None,
    }

    yield _sse({
        "event": "start",
        "paper_chars": len(paper_text),
        "paper_preview": paper_text[:600],
    })

    final_brief = None
    latest = {}  # accumulated view of the reviewy state fields

    try:
        for chunk in GRAPH.stream(initial_state, stream_mode="debug"):
            ctype = chunk.get("type")
            payload = chunk.get("payload", {})
            name = payload.get("name")
            step = chunk.get("step")

            if ctype == "task":
                yield _sse({"event": "node_running", "node": name, "step": step})

            elif ctype == "task_result":
                result = payload.get("result") or {}
                # result may be a dict of channel updates.
                if isinstance(result, list):
                    result = {k: v for k, v in result}

                # Accumulate review-related fields for iteration history.
                for key in ("review_scores", "review_feedback", "retry_counts"):
                    if key in result and isinstance(result[key], dict):
                        latest.setdefault(key, {}).update(result[key])
                if "flags" in result and isinstance(result["flags"], list):
                    latest.setdefault("flags", [])
                    latest["flags"].extend(result["flags"])
                if "final_brief" in result and result["final_brief"]:
                    final_brief = result["final_brief"]

                yield _sse({
                    "event": "node_done",
                    "node": name,
                    "step": step,
                    "result": _slim_result(result),
                    "state": latest,
                })

        yield _sse({
            "event": "final",
            "brief": final_brief or "",
            "state": latest,
        })
    except Exception as exc:  # surface pipeline/LLM errors to the UI
        logger.exception("pipeline failed")
        yield _sse({"event": "error", "message": f"{type(exc).__name__}: {exc}"})


def _slim_result(result: dict) -> dict:
    """Keep result payloads small/serializable for the wire."""
    out = {}
    for k, v in result.items():
        if k == "paper_text":
            continue
        out[k] = v
    return out


@app.post("/api/analyze")
async def analyze(
    file: UploadFile | None = None,
    url: str | None = Form(None),
    text: str | None = Form(None),
):
    try:
        paper_text = _resolve_paper_text(file, url, text)
    except Exception as exc:
        logger.exception("input resolution failed")
        return JSONResponse(status_code=400, content={"error": f"{type(exc).__name__}: {exc}"})

    return StreamingResponse(
        _run_stream(paper_text),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
