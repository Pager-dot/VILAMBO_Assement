const FIELD_LABEL = {
  analysis: "Analysis",
  summary: "Summary",
  citations: "Citations",
};

export default function ReviewPanel({ history, scores, threshold, flags }) {
  const fields = ["analysis", "summary", "citations"];

  return (
    <section className="card review-card">
      <div className="card-head">
        <h2><span className="sec-no">§ 3</span> Peer review &amp; revisions</h2>
        <span className="progress-note">Every score and revision, in order</span>
      </div>

      <div className="score-grid">
        {fields.map((f) => {
          const s = scores[f];
          const passed = s != null && s >= threshold;
          const attempts = history.filter((h) => h.field === f).length;
          return (
            <div key={f} className={`score-tile ${s == null ? "empty" : passed ? "pass" : "fail"}`}>
              <span className="st-field">{FIELD_LABEL[f]}</span>
              <span className="st-score">{s == null ? "—" : `${s}/10`}</span>
              <span className="st-meta">
                {s == null
                  ? "pending"
                  : `${passed ? "passed" : "flagged"} · ${attempts} attempt${attempts === 1 ? "" : "s"}`}
              </span>
            </div>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="timeline">
          <h3>Iteration history</h3>
          <ol>
            {history.map((h, i) => (
              <li key={i} className={h.passed ? "pass" : "fail"}>
                <span className="tl-dot" />
                <div className="tl-body">
                  <div className="tl-head">
                    <strong>{FIELD_LABEL[h.field]}</strong>
                    <span className="tl-attempt">attempt {h.attempt}</span>
                    <span className={`tl-score ${h.passed ? "pass" : "fail"}`}>
                      {h.score}/10 {h.passed ? "PASS" : "→ retry"}
                    </span>
                  </div>
                  {h.feedback && <p className="tl-feedback">{h.feedback}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {flags.length > 0 && (
        <div className="flags">
          <h3>⚑ Flags</h3>
          <ul>
            {flags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
