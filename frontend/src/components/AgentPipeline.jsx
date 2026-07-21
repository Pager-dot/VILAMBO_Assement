import AgentCard from "./AgentCard.jsx";

// Explicit visual layout mirroring the LangGraph structure:
//   metadata → analyzer → review → (summary branch ‖ citation branch) → boss
export default function AgentPipeline({ nodes, nodeState, scores, threshold, phase }) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const card = (id) => {
    const node = byId[id];
    if (!node) return null;
    const field = node.reviews;
    return (
      <AgentCard
        node={node}
        state={nodeState[id]}
        score={field ? scores[field] : null}
        threshold={threshold}
      />
    );
  };

  const doneCount = Object.values(nodeState).filter((s) => s.status === "done").length;

  return (
    <section className="card pipeline-card">
      <div className="card-head">
        <h2><span className="sec-no">§ 2</span> Agent pipeline</h2>
        <span className="progress-note">
          {phase === "done"
            ? "Pipeline complete"
            : phase === "error"
            ? "Halted"
            : `${doneCount}/${nodes.length} stages complete`}
        </span>
      </div>

      <p className="figure-caption">
        <b>Figure 1.</b> The review-gated multi-agent workflow — each sub-agent's
        output is scored against the source paper and revised until it passes.
      </p>

      <div className="pipeline">
        <div className="stage">
          <span className="stage-tag">1 · Metadata</span>
          <div className="stage-row">{card("metadata")}</div>
        </div>

        <Arrow />

        <div className="stage">
          <span className="stage-tag">2 · Analyze &amp; review</span>
          <div className="stage-row">
            {card("analyzer")}
            <MiniArrow />
            {card("review_analysis")}
          </div>
        </div>

        <Arrow label="fan-out on pass" branch />

        <div className="stage parallel">
          <span className="stage-tag">3 · Parallel branches (each review-gated)</span>
          <div className="branch-grid">
            <div className="branch">
              <span className="branch-tag">Summary branch</span>
              <div className="stage-row">
                {card("summarizer")}
                <MiniArrow />
                {card("review_summary")}
              </div>
            </div>
            <div className="branch">
              <span className="branch-tag">Citations branch</span>
              <div className="stage-row">
                {card("citation_extractor")}
                <MiniArrow />
                {card("review_citations")}
              </div>
            </div>
            <div className="branch">
              <span className="branch-tag">Key-insights branch</span>
              <div className="stage-row">
                {card("key_insights")}
                <MiniArrow />
                {card("review_insights")}
              </div>
            </div>
          </div>
        </div>

        <Arrow label="fan-in" />

        <div className="stage">
          <span className="stage-tag">4 · Assemble</span>
          <div className="stage-row">{card("boss")}</div>
        </div>
      </div>

      <div className="legend">
        <span><i className="lg subagent" /> Sub-agent</span>
        <span><i className="lg reviewer" /> Review agent (retries on score &lt; {threshold})</span>
        <span><i className="lg boss" /> Boss / orchestrator</span>
      </div>
    </section>
  );
}

function Arrow({ label, branch }) {
  return (
    <div className={`flow-arrow ${branch ? "branch" : ""}`}>
      <span className="arrow-line" />
      {label && <span className="arrow-label">{label}</span>}
      <span className="arrow-head">▼</span>
    </div>
  );
}

function MiniArrow() {
  return <span className="mini-arrow">→</span>;
}
