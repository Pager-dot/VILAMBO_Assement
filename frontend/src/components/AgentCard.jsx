const KIND_ICON = {
  subagent: "◆",
  reviewer: "◎",
  boss: "★",
};

const KIND_LABEL = {
  subagent: "Sub-agent",
  reviewer: "Review agent",
  boss: "Orchestrator",
};

export default function AgentCard({ node, state, score, threshold }) {
  const status = state?.status ?? "pending";
  const runs = state?.runs ?? 0;
  const isReviewer = node.kind === "reviewer";
  const passed = score != null && score >= threshold;

  return (
    <div className={`agent-card ${node.kind} status-${status}`}>
      <div className="ac-top">
        <span className="ac-icon">{KIND_ICON[node.kind]}</span>
        <span className="ac-kind">{KIND_LABEL[node.kind]}</span>
        <StatusPill status={status} />
      </div>

      <h4 className="ac-label">
        {node.label}
        {runs > 1 && <span className="run-badge" title={`${runs} runs`}>×{runs}</span>}
      </h4>
      <p className="ac-role">{node.role}</p>

      {isReviewer && score != null && (
        <div className={`ac-score ${passed ? "pass" : "fail"}`}>
          <span className="score-num">{score}</span>
          <span className="score-den">/10</span>
          <span className="score-tag">{passed ? "PASS" : "RETRY"}</span>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: { t: "Idle", c: "pending" },
    running: { t: "Running", c: "running" },
    done: { t: "Done", c: "done" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`pill ${s.c}`}>
      {status === "running" && <span className="dot-pulse" />}
      {s.t}
    </span>
  );
}
