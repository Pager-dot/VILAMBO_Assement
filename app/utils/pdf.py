"""PDF text extraction.

Two backends, selected by the PDF_BACKEND env var (see app/config.py):

- "pypdf"   (default) — lightweight, pure-Python, no heavy ML deps. Deploy-friendly
             (fits small instances like Render's free tier), starts instantly.
- "docling" — higher-fidelity layout/table/OCR extraction, but pulls in PyTorch and
             downloads model weights on first run (~GB). Better locally; too heavy for
             a small hosted instance.

Both expose the same extract_text(path) -> markdown/plain-text string.
"""

import logging

from app.config import PDF_BACKEND

logger = logging.getLogger(__name__)


def _extract_pypdf(pdf_path: str) -> str:
    from pypdf import PdfReader

    reader = PdfReader(pdf_path)
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages).strip()


def _extract_docling(pdf_path: str) -> str:
    from docling.document_converter import DocumentConverter

    result = DocumentConverter().convert(pdf_path)
    return result.document.export_to_markdown()


def extract_text(pdf_path: str) -> str:
    backend = PDF_BACKEND.lower()
    logger.info("extract_text: backend=%s path=%s", backend, pdf_path)
    if backend == "docling":
        return _extract_docling(pdf_path)
    return _extract_pypdf(pdf_path)
