def extract_text(pdf_path: str) -> str:
    from docling.document_converter import DocumentConverter

    result = DocumentConverter().convert(pdf_path)
    return result.document.export_to_markdown()
