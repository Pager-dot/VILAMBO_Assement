import logging
from typing import Callable

from langgraph.types import Send

from app.config import (
    MAX_CONTEXT_CHARS,
    MAX_RETRIES_PER_FIELD,
    REVIEW_PASS_THRESHOLD,
    REVIEWER_MODEL,
)
from app.graph.state import ResearchState
from app.schemas.models import ReviewOutput
from app.utils.llm import get_llm, invoke_with_retry

logger = logging.getLogger(__name__)

REVIEW_PROMPT = """You are reviewing the "{field}" output of a research paper analysis \
pipeline for accuracy, completeness, and clarity.

Source paper (ground truth — the output must be checked against this, not just judged \
on its own):
{source}

Content to review:
{content}

Score it from 1 (poor) to 10 (excellent). Treat any claim in the content that is not \
supported by, or contradicts, the source paper as a serious accuracy problem and reflect \
that in the score. Give brief, actionable feedback, calling out any specific claim that \
doesn't match the source.
"""


def build_review_node(
    field: str, content_getter: Callable[[ResearchState], str]
) -> Callable[[ResearchState], dict]:
    """Factory for one generic, reusable review node parameterized by which state
    field it reviews — used for analysis, summary, and citations."""

    def review_node(state: ResearchState) -> dict:
        content = content_getter(state)
        source = state["paper_text"][:MAX_CONTEXT_CHARS]
        llm = get_llm(REVIEWER_MODEL).with_structured_output(ReviewOutput)
        prompt = REVIEW_PROMPT.format(field=field, content=content, source=source)
        result: ReviewOutput = invoke_with_retry(llm, prompt)
        passed = result.score >= REVIEW_PASS_THRESHOLD

        logger.info(
            "review_node[%s]: score=%d passed=%s feedback=%r",
            field,
            result.score,
            passed,
            result.feedback,
        )

        update = {
            "review_scores": {field: result.score},
            "review_feedback": {field: result.feedback},
        }

        if not passed:
            new_count = state["retry_counts"].get(field, 0) + 1
            update["retry_counts"] = {field: new_count}
            if new_count > MAX_RETRIES_PER_FIELD:
                update["flags"] = [
                    f"{field} did not pass review after {MAX_RETRIES_PER_FIELD} "
                    f"retries (last score {result.score}/10): {result.feedback}"
                ]

        return update

    return review_node


def build_review_router(field: str, retry_target: str, proceed_target):
    """Router for a single-target proceed path (used by the summary/citation
    branches, which converge on the boss node)."""

    def router(state: ResearchState) -> str:
        if state["review_scores"].get(field, 0) >= REVIEW_PASS_THRESHOLD:
            return proceed_target
        if state["retry_counts"].get(field, 0) <= MAX_RETRIES_PER_FIELD:
            return retry_target
        return proceed_target

    return router


def route_after_analysis_review(state: ResearchState) -> str | list[Send]:
    """Router for the analysis stage, which fans out to the two parallel branches
    once analysis passes (or its retry budget is exhausted)."""
    fan_out = [Send("summarizer", state), Send("citation_extractor", state)]

    if state["review_scores"].get("analysis", 0) >= REVIEW_PASS_THRESHOLD:
        return fan_out
    if state["retry_counts"].get("analysis", 0) <= MAX_RETRIES_PER_FIELD:
        return "analyzer"
    return fan_out
