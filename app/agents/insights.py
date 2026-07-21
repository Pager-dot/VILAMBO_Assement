import logging

from app.config import INSIGHTS_MODEL, MAX_CONTEXT_CHARS
from app.graph.state import ResearchState
from app.schemas.models import KeyInsightsOutput
from app.utils.llm import get_llm, invoke_with_retry

logger = logging.getLogger(__name__)

INSIGHTS_PROMPT = """You are a research strategist. Given the paper below, produce a short \
list of actionable key insights — the practical takeaways, implications, and potential \
applications a reader should walk away with. Focus on what someone could *do* with this \
work (who benefits, what it enables, what to watch out for), not a restatement of the \
findings. Give 3-6 concise, self-contained bullet points.

Paper text:
{paper_text}
"""


def key_insights_node(state: ResearchState) -> dict:
    retry_count = state["retry_counts"].get("insights", 0)
    logger.info("key_insights_node: start (retry=%d)", retry_count)

    llm = get_llm(INSIGHTS_MODEL).with_structured_output(KeyInsightsOutput)
    text = state["paper_text"][:MAX_CONTEXT_CHARS]
    prompt = INSIGHTS_PROMPT.format(paper_text=text)

    feedback = state["review_feedback"].get("insights")
    if feedback:
        prompt += f"\n\nA previous attempt was reviewed with this feedback — address it:\n{feedback}"

    result: KeyInsightsOutput = invoke_with_retry(llm, prompt)
    logger.info("key_insights_node: done (%d insights)", len(result.insights))
    return {"insights": result.insights}
