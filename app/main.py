import argparse
import logging
from pathlib import Path

from app.graph.build import build_graph
from app.utils.logging_config import setup_logging
from app.utils.pdf import extract_text

logger = logging.getLogger(__name__)


def run(input_path: str, output_path: str | None) -> str:
    path = Path(input_path)
    paper_text = path.read_text(encoding="utf-8") if path.suffix == ".txt" else extract_text(input_path)

    initial_state = {
        "paper_text": paper_text,
        "metadata": {},
        "analysis": None,
        "summary": None,
        "citations": None,
        "review_scores": {},
        "review_feedback": {},
        "retry_counts": {},
        "flags": [],
        "final_brief": None,
    }

    graph = build_graph()
    result = graph.invoke(initial_state)
    brief = result["final_brief"]

    if output_path:
        Path(output_path).write_text(brief, encoding="utf-8")
        logger.info("Wrote research brief to %s", output_path)

    return brief


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze a research paper (PDF or .txt)")
    parser.add_argument("input", help="Path to a PDF or .txt file")
    parser.add_argument("-o", "--output", help="Path to write the markdown brief", default=None)
    args = parser.parse_args()

    setup_logging()
    brief = run(args.input, args.output)
    if not args.output:
        print(brief)
