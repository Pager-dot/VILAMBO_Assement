import logging

from app.config import MAX_CONTEXT_CHARS, SUMMARIZER_MODEL
from app.graph.state import ResearchState
from app.schemas.models import SummaryOutput
from app.utils.llm import get_llm, invoke_with_retry

logger = logging.getLogger(__name__)

SUMMARY_PROMPT = """Write a 150-200 word executive summary of this paper covering the \
problem it addresses, the approach taken, and the key results. Write for a reader who \
will not read the full paper.

Paper text:
{paper_text}
"""


def summarizer_node(state: ResearchState) -> dict:
    retry_count = state["retry_counts"].get("summary", 0)
    logger.info("summarizer_node: start (retry=%d)", retry_count)

    llm = get_llm(SUMMARIZER_MODEL).with_structured_output(SummaryOutput)
    text = state["paper_text"][:MAX_CONTEXT_CHARS]
    prompt = SUMMARY_PROMPT.format(paper_text=text)

    feedback = state["review_feedback"].get("summary")
    if feedback:
        prompt += f"\n\nA previous attempt was reviewed with this feedback — address it:\n{feedback}"

    result: SummaryOutput = invoke_with_retry(llm, prompt)
    logger.info("summarizer_node: done")
    return {"summary": result.summary}
