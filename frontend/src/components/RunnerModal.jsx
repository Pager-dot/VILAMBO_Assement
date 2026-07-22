import { useMemo } from "react";
import AgentPipeline from "./AgentPipeline.jsx";
import ReviewPanel from "./ReviewPanel.jsx";

// The four human-facing stages, mapped onto the underlying graph nodes.
export const STAGES = [
  { key: "metadata", label: "Metadata", sub: "Extract title, authors, year, venue", nodes: ["metadata"] },
  { key: "analyze", label: "Analyze & Review", sub: "Methodology, hypothesis, experiments, findings — scored vs. the paper", nodes: ["analyzer", "review_analysis"] },
  { key: "synth", label: "Summarize · Cite · Insights", sub: "Three sub-agents run in parallel, each independently reviewed", nodes: ["summarizer", "review_summary", "citation_extractor", "review_citations", "key_insights", "review_insights"] },
  { key: "assemble", label: "Assemble Brief", sub: "The Boss orchestrator combines all approved outputs", nodes: ["boss"] },
];

function stageStatus(stage, nodeState, phase) {
  if (phase === "done") return "done";
  const s = stage.nodes.map((n) => nodeState[n]?.status ?? "pending");
  if (s.every((x) => x === "done")) return "done";
  if (s.some((x) => x === "running")) return "running";
  if (s.some((x) => x !== "pending")) return "running";
  return "pending";
}

export default function RunnerModal({
  phase, mode, nodes, nodeState, scores, history, threshold, flags, error,
  onViewBrief, onClose,
}) {
  const nodeMeta = useMemo(
    () => Object.fromEntries(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  const statuses = STAGES.map((st) => stageStatus(st, nodeState, phase));
  let current = statuses.findIndex((s) => s !== "done");
  if (current === -1) current = STAGES.length - 1;

  const running = phase === "running";
  const review = mode === "review";
  const stage = STAGES[current];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        {!running && (
          <button
            className="modal-close"
            onClick={review ? onClose : onViewBrief}
            aria-label="Close"
          >
            ×
          </button>
        )}

        <div className="modal-stepper">
          {STAGES.map((st, i) => (
            <div className="step-group" key={st.key}>
              <div className={`mstep status-${statuses[i]} ${i === current && running ? "current" : ""}`}>
                <span className="step-num">{statuses[i] === "done" ? "✓" : i + 1}</span>
                <span className="mstep-label">{st.label}</span>
              </div>
              {i < STAGES.length - 1 && (
                <span className={`step-arrow ${statuses[i] === "done" ? "lit" : ""}`} aria-hidden>
                  →
                </span>
              )}
            </div>
          ))}
        </div>

        {error && <div className="alert error modal-alert">{error}</div>}

        {/* LIVE: focus on the stage currently processing */}
        {running && !error && (
          <div className="stage-detail" key={current}>
            <span className="stage-index">Step {current + 1} of {STAGES.length}</span>
            <h3 className="stage-title">{stage.label}</h3>
            <p className="stage-sub">{stage.sub}</p>
            <div className="processing">
              <span className="spinner" /> Processing…
            </div>
            <ul className="agent-live-list">
              {stage.nodes.map((id) => {
                const meta = nodeMeta[id];
                const st = nodeState[id]?.status ?? "pending";
                const field = meta?.reviews;
                const score = field ? scores[field] : null;
                return (
                  <li key={id} className={`ali status-${st}`}>
                    <span className={`ali-dot ${st}`} />
                    <span className="ali-label">{meta?.label ?? id}</span>
                    {score != null && (
                      <span className={`ali-score ${score >= threshold ? "pass" : "fail"}`}>
                        {score}/10
                      </span>
                    )}
                    <span className="ali-status">
                      {st === "running" ? "running…" : st === "done" ? "done" : "queued"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* LIVE DONE: the peer-review summary, then hand off to the brief */}
        {!running && !error && !review && (
          <div className="completion">
            <div className="completion-head">
              <span className="done-check">✓</span>
              <div>
                <h3>Pipeline complete</h3>
                <p>All four stages finished. Here's how the quality review went.</p>
              </div>
            </div>
            <ReviewPanel history={history} scores={scores} threshold={threshold} flags={flags} />
            <button className="run-btn modal-primary" onClick={onViewBrief}>
              See research brief →
            </button>
          </div>
        )}

        {/* REVIEW: everything that was done, on demand */}
        {!running && review && (
          <div className="review-detail">
            <AgentPipeline
              nodes={nodes}
              nodeState={nodeState}
              scores={scores}
              threshold={threshold}
              phase={phase}
            />
            <ReviewPanel history={history} scores={scores} threshold={threshold} flags={flags} />
            <button className="run-btn modal-primary" onClick={onClose}>
              Close
            </button>
          </div>
        )}

        {error && (
          <button className="run-btn modal-primary" onClick={onViewBrief}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
