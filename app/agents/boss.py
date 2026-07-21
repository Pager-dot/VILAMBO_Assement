import logging

from app.graph.state import ResearchState
from app.schemas.models import Citation, PaperAnalysis, PaperMetadata, ResearchBrief

logger = logging.getLogger(__name__)


def _to_markdown(brief: ResearchBrief) -> str:
    lines = [
        f"# {brief.metadata.title or 'Untitled Paper'}",
        "",
        f"**Authors:** {', '.join(brief.metadata.authors) or 'Unknown'}  ",
        f"**Year:** {brief.metadata.year or 'Unknown'}  ",
        f"**Venue:** {brief.metadata.venue or 'Unknown'}",
        "",
        "## Executive Summary",
        brief.summary,
        "",
        "## Analysis",
        f"**Hypothesis:** {brief.analysis.hypothesis}",
        "",
        f"**Methodology:** {brief.analysis.methodology}",
        "",
        f"**Experiments:** {brief.analysis.experiments}",
        "",
        "**Key Findings:**",
        *[f"- {finding}" for finding in brief.analysis.key_findings],
        "",
        "## Key Insights",
        *[f"- {insight}" for insight in brief.insights],
        "",
        "## Citations",
        *[
            f"- {'**[key]** ' if c.is_key_related_work else ''}{c.text}"
            for c in brief.citations
        ],
        "",
        "## Review Scores",
        *[f"- {field}: {score}/10" for field, score in brief.review_scores.items()],
    ]
    if brief.flags:
        lines += ["", "## Flags", *[f"- {flag}" for flag in brief.flags]]
    return "\n".join(lines)


def boss_node(state: ResearchState) -> dict:
    logger.info(
        "boss_node: assembling final brief (scores=%s, flags=%d)",
        state["review_scores"],
        len(state["flags"]),
    )

    brief = ResearchBrief(
        metadata=PaperMetadata(**state["metadata"]),
        analysis=PaperAnalysis(**state["analysis"]),
        summary=state["summary"],
        citations=[Citation(**c) for c in state["citations"]],
        insights=state["insights"] or [],
        review_scores=state["review_scores"],
        review_feedback=state["review_feedback"],
        flags=state["flags"],
    )

    logger.info("boss_node: done")
    return {"final_brief": _to_markdown(brief)}
