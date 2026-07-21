import logging

from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import GOOGLE_API_KEY

logger = logging.getLogger(__name__)


def get_llm(model: str, temperature: float = 0.0) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=GOOGLE_API_KEY,
        temperature=temperature,
    )


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=1, min=2, max=20),
    reraise=True,
    before_sleep=lambda retry_state: logger.warning(
        "LLM call failed (attempt %d), retrying: %s",
        retry_state.attempt_number,
        retry_state.outcome.exception(),
    ),
)
def invoke_with_retry(llm, prompt: str):
    return llm.invoke(prompt)
