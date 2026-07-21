import operator
from typing import Annotated, TypedDict


def merge_dicts(current: dict, update: dict) -> dict:
    return {**current, **update}


class ResearchState(TypedDict):
    paper_text: str
    metadata: dict
    analysis: dict | None
    summary: str | None
    citations: list | None
    # Summary and citation branches run in parallel and both write into these dicts —
    # a plain overwrite reducer would let one branch's write clobber the other's.
    review_scores: Annotated[dict, merge_dicts]
    review_feedback: Annotated[dict, merge_dicts]
    retry_counts: Annotated[dict, merge_dicts]
    flags: Annotated[list[str], operator.add]
    final_brief: str | None
