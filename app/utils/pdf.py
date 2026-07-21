from pathlib import Path


def extract_text(pdf_path: str) -> str:
    from marker.converters.pdf import PdfConverter
    from marker.models import create_model_dict
    from marker.output import text_from_rendered

    converter = PdfConverter(artifact_dict=create_model_dict())
    rendered = converter(str(Path(pdf_path)))
    text, _, _ = text_from_rendered(rendered)
    return text
