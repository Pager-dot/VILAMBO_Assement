import os

from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

# Defaults match .env.example: gemini-2.0-*/2.5-* 404 as "no longer available to new users"
# on newly created keys, so the safe fallback is gemini-3.5-flash-lite. Override per node in .env.
ANALYZER_MODEL = os.environ.get("ANALYZER_MODEL", "gemini-3.5-flash-lite")
SUMMARIZER_MODEL = os.environ.get("SUMMARIZER_MODEL", "gemini-3.5-flash-lite")
CITATION_MODEL = os.environ.get("CITATION_MODEL", "gemini-3.5-flash-lite")
INSIGHTS_MODEL = os.environ.get("INSIGHTS_MODEL", "gemini-3.5-flash-lite")
REVIEWER_MODEL = os.environ.get("REVIEWER_MODEL", "gemini-3.5-flash-lite")
QA_MODEL = os.environ.get("QA_MODEL", "gemini-3.5-flash-lite")

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# PDF extraction backend: "pypdf" (light, deploy-friendly) or "docling" (heavy, higher fidelity).
PDF_BACKEND = os.environ.get("PDF_BACKEND", "pypdf")

REVIEW_PASS_THRESHOLD = 7
MAX_RETRIES_PER_FIELD = 2

# Rough character cap on paper_text sent to any single LLM call, to guard the context window.
MAX_CONTEXT_CHARS = 60_000
