import logging

from app.config import ANALYZER_MODEL, MAX_CONTEXT_CHARS
from app.graph.state import ResearchState
from app.schemas.models import PaperMetadata
from app.utils.llm import get_llm, invoke_with_retry

logger = logging.getLogger(__name__)

METADATA_PROMPT = """Extract the title, authors, publication year, and venue \
(journal/conference) from the first part of this paper. Use "" for any field \
you cannot determine.

{text}
"""


def metadata_node(state: ResearchState) -> dict:
    logger.info("metadata_node: start")
    llm = get_llm(ANALYZER_MODEL).with_structured_output(PaperMetadata)
    text = state["paper_text"][:MAX_CONTEXT_CHARS]
    result: PaperMetadata = invoke_with_retry(llm, METADATA_PROMPT.format(text=text))
    logger.info("metadata_node: done title=%r", result.title)
    return {"metadata": result.model_dump()}
