import logging

from app.config import ANALYZER_MODEL, MAX_CONTEXT_CHARS
from app.graph.state import ResearchState
from app.schemas.models import PaperAnalysis
from app.utils.llm import get_llm, invoke_with_retry

logger = logging.getLogger(__name__)

ANALYZER_PROMPT = """You are a research paper analyst. Given the paper text below, extract:
- methodology: the methods/approach used
- hypothesis: the core hypothesis or research question
- experiments: what experiments/evaluations were run
- key_findings: a list of the main findings/results

Paper text:
{paper_text}
"""


def analyzer_node(state: ResearchState) -> dict:
    retry_count = state["retry_counts"].get("analysis", 0)
    logger.info("analyzer_node: start (retry=%d)", retry_count)

    llm = get_llm(ANALYZER_MODEL).with_structured_output(PaperAnalysis)
    text = state["paper_text"][:MAX_CONTEXT_CHARS]
    prompt = ANALYZER_PROMPT.format(paper_text=text)

    feedback = state["review_feedback"].get("analysis")
    if feedback:
        prompt += f"\n\nA previous attempt was reviewed with this feedback — address it:\n{feedback}"

    result: PaperAnalysis = invoke_with_retry(llm, prompt)
    logger.info("analyzer_node: done")
    return {"analysis": result.model_dump()}
