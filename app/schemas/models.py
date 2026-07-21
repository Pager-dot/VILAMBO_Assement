from pydantic import BaseModel, Field


class PaperMetadata(BaseModel):
    title: str = ""
    authors: list[str] = Field(default_factory=list)
    year: str = ""
    venue: str = ""


class PaperAnalysis(BaseModel):
    methodology: str
    hypothesis: str
    experiments: str
    key_findings: list[str]


class Citation(BaseModel):
    text: str
    is_key_related_work: bool = False


class CitationExtraction(BaseModel):
    citations: list[Citation]


class SummaryOutput(BaseModel):
    summary: str


class KeyInsightsOutput(BaseModel):
    insights: list[str]


# passed/fail is computed in code from the configured threshold, not trusted from the LLM
class ReviewOutput(BaseModel):
    score: int = Field(ge=1, le=10)
    feedback: str


class ResearchBrief(BaseModel):
    metadata: PaperMetadata
    analysis: PaperAnalysis
    summary: str
    citations: list[Citation]
    insights: list[str] = Field(default_factory=list)
    review_scores: dict[str, int]
    review_feedback: dict[str, str]
    flags: list[str] = Field(default_factory=list)
