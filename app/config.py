import os

from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

ANALYZER_MODEL = os.environ.get("ANALYZER_MODEL", "gemini-2.5-flash-lite")
SUMMARIZER_MODEL = os.environ.get("SUMMARIZER_MODEL", "gemini-2.5-flash-lite")
CITATION_MODEL = os.environ.get("CITATION_MODEL", "gemini-2.5-flash-lite")
INSIGHTS_MODEL = os.environ.get("INSIGHTS_MODEL", "gemini-2.5-flash-lite")
REVIEWER_MODEL = os.environ.get("REVIEWER_MODEL", "gemini-2.5-flash-lite")

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

REVIEW_PASS_THRESHOLD = 7
MAX_RETRIES_PER_FIELD = 2

# Rough character cap on paper_text sent to any single LLM call, to guard the context window.
MAX_CONTEXT_CHARS = 60_000
