// Step-by-step execution tracker. Collapses the 10 graph nodes into the four
// human-facing stages and shows which one is live, with a progress bar.
const STAGES = [
  { label: "Metadata Agent", nodes: ["metadata"] },
  { label: "Analyze & Review", nodes: ["analyzer", "review_analysis"] },
  {
    label: "Summarize · Cite · Insights",
    nodes: [
      "summarizer",
      "review_summary",
      "citation_extractor",
      "review_citations",
      "key_insights",
      "review_insights",
    ],
  },
  { label: "Assemble Brief", nodes: ["boss"] },
];

function stageStatus(stage, nodeState, phase) {
  if (phase === "done") return "done";
  const statuses = stage.nodes.map((n) => nodeState[n]?.status ?? "pending");
  if (statuses.every((s) => s === "done")) return "done";
  if (statuses.some((s) => s === "running")) return "running";
  if (statuses.some((s) => s !== "pending")) return "running"; // partially complete
  return "pending";
}

export default function StageStepper({ nodeState, phase }) {
  const statuses = STAGES.map((st) => stageStatus(st, nodeState, phase));
  const doneCount = statuses.filter((s) => s === "done").length;
  const pct = phase === "done" ? 100 : (doneCount / STAGES.length) * 100;

  return (
    <section className="card stepper-card">
      <div className="stepper">
        {STAGES.map((st, i) => (
          <div className="step-group" key={st.label}>
            <div className={`step status-${statuses[i]}`}>
              <span className="step-num">
                {statuses[i] === "done" ? "✓" : i + 1}
              </span>
              <span className="step-label">{st.label}</span>
            </div>
            {i < STAGES.length - 1 && (
              <span
                className={`step-arrow ${statuses[i] === "done" ? "lit" : ""}`}
                aria-hidden
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
