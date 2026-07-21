from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.agents.analyzer import analyzer_node
from app.agents.boss import boss_node
from app.agents.citations import citation_extractor_node
from app.agents.insights import key_insights_node
from app.agents.metadata import metadata_node
from app.agents.reviewer import (
    build_review_node,
    build_review_router,
    route_after_analysis_review,
)
from app.agents.summarizer import summarizer_node
from app.graph.state import ResearchState

review_analysis_node = build_review_node(
    "analysis", lambda state: str(state["analysis"])
)
review_summary_node = build_review_node("summary", lambda state: state["summary"])
review_citations_node = build_review_node(
    "citations", lambda state: str(state["citations"])
)
review_insights_node = build_review_node(
    "insights", lambda state: str(state["insights"])
)

route_after_summary_review = build_review_router("summary", "summarizer", "boss")
route_after_citations_review = build_review_router(
    "citations", "citation_extractor", "boss"
)
route_after_insights_review = build_review_router(
    "insights", "key_insights", "boss"
)


def build_graph() -> CompiledStateGraph:
    builder = StateGraph(ResearchState)

    builder.add_node("metadata", metadata_node)
    builder.add_node("analyzer", analyzer_node)
    builder.add_node("review_analysis", review_analysis_node)
    builder.add_node("summarizer", summarizer_node)
    builder.add_node("review_summary", review_summary_node)
    builder.add_node("citation_extractor", citation_extractor_node)
    builder.add_node("review_citations", review_citations_node)
    builder.add_node("key_insights", key_insights_node)
    builder.add_node("review_insights", review_insights_node)
    builder.add_node("boss", boss_node)

    builder.add_edge(START, "metadata")
    builder.add_edge("metadata", "analyzer")
    builder.add_edge("analyzer", "review_analysis")
    builder.add_conditional_edges(
        "review_analysis",
        route_after_analysis_review,
        ["analyzer", "summarizer", "citation_extractor", "key_insights"],
    )

    builder.add_edge("summarizer", "review_summary")
    builder.add_conditional_edges(
        "review_summary", route_after_summary_review, ["summarizer", "boss"]
    )

    builder.add_edge("citation_extractor", "review_citations")
    builder.add_conditional_edges(
        "review_citations", route_after_citations_review, ["citation_extractor", "boss"]
    )

    builder.add_edge("key_insights", "review_insights")
    builder.add_conditional_edges(
        "review_insights", route_after_insights_review, ["key_insights", "boss"]
    )

    builder.add_edge("boss", END)

    return builder.compile()


if __name__ == "__main__":
    print(build_graph().get_graph().draw_mermaid())
