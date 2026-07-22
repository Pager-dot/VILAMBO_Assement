"""Grounded question-answering over an already-extracted paper.

Stateless: the caller passes the paper text (the frontend keeps the copy it
received on the `final` event), so no server-side session storage is needed.
"""

import logging

from app.config import MAX_CONTEXT_CHARS, QA_MODEL
from app.utils.llm import get_llm, invoke_with_retry

logger = logging.getLogger(__name__)

QA_PROMPT = """You are a research assistant answering a question about ONE specific paper.
Answer using ONLY the paper text below. If the answer is not in the paper, say so plainly
rather than guessing. Be concise, precise, and cite specifics (numbers, section names,
method names) from the paper where relevant.

Paper:
{paper}
"""


def answer_question(
    paper_text: str,
    question: str,
    selection: str | None = None,
    history: list[dict] | None = None,
) -> str:
    prompt = QA_PROMPT.format(paper=paper_text[:MAX_CONTEXT_CHARS])

    if selection:
        prompt += (
            "\nThe reader highlighted this excerpt from the generated brief and is asking "
            f'specifically about it:\n"{selection.strip()}"\n'
        )

    if history:
        prior = "\n".join(
            f"Q: {turn.get('question', '')}\nA: {turn.get('answer', '')}"
            for turn in history[-4:]
            if turn.get("question")
        )
        if prior:
            prompt += f"\nEarlier in this conversation:\n{prior}\n"

    prompt += f"\nQuestion: {question.strip()}\n\nAnswer:"

    logger.info("answer_question: q=%r selection=%s", question[:80], bool(selection))
    llm = get_llm(QA_MODEL)
    result = invoke_with_retry(llm, prompt)
    return _text_of(getattr(result, "content", result))


def _text_of(content) -> str:
    """Normalize an LLM message's content to plain text. Newer providers return
    a list of content blocks (dicts with a "text" key) rather than a string."""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = [
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in content
        ]
        return "".join(parts).strip()
    return str(content).strip()
