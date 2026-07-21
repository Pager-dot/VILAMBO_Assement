import logging

from app.config import CITATION_MODEL, MAX_CONTEXT_CHARS
from app.graph.state import ResearchState
from app.schemas.models import CitationExtraction
from app.utils.llm import get_llm, invoke_with_retry

logger = logging.getLogger(__name__)

CITATION_PROMPT = """Extract every citation/reference from this paper. For each one, \
give the citation text as it appears (or as close as you can reconstruct), and mark \
is_key_related_work true for the handful most central to the paper's argument.

Paper text:
{paper_text}
"""


def citation_extractor_node(state: ResearchState) -> dict:
    retry_count = state["retry_counts"].get("citations", 0)
    logger.info("citation_extractor_node: start (retry=%d)", retry_count)

    llm = get_llm(CITATION_MODEL).with_structured_output(CitationExtraction)
    text = state["paper_text"][:MAX_CONTEXT_CHARS]
    prompt = CITATION_PROMPT.format(paper_text=text)

    feedback = state["review_feedback"].get("citations")
    if feedback:
        prompt += f"\n\nA previous attempt was reviewed with this feedback — address it:\n{feedback}"

    result: CitationExtraction = invoke_with_retry(llm, prompt)
    logger.info("citation_extractor_node: done (%d citations)", len(result.citations))
    return {"citations": [c.model_dump() for c in result.citations]}
