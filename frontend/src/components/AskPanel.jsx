import { useState, useRef, useEffect } from "react";
import { askQuestion } from "../api.js";

// Grounded Q&A over the analyzed paper. Conversation + selection are lifted to
// App so they survive closing/reopening the panel (e.g. to highlight new text).
export default function AskPanel({
  paperText,
  autoQuestion,
  turns,
  setTurns,
  selection,
  setSelection,
  onClose,
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const endRef = useRef(null);
  const autoSent = useRef(false);
  const hasPaper = Boolean(paperText);

  const send = async (questionText, sel) => {
    const question = (questionText ?? "").trim();
    if (!question || loading || !hasPaper) return;
    const useSel = sel !== undefined ? sel : selection;
    const prior = turns
      .filter((t) => t.answer)
      .map((t) => ({ question: t.question, answer: t.answer }));

    setLoading(true);
    setErr(null);
    setQ("");
    setTurns((cur) => [...cur, { question, answer: null, selection: useSel }]);

    try {
      const answer = await askQuestion({
        paperText,
        question,
        selection: useSel,
        history: prior,
      });
      setTurns((cur) => {
        const c = [...cur];
        c[c.length - 1] = { ...c[c.length - 1], answer };
        return c;
      });
    } catch (e) {
      setErr(e.message);
      setTurns((cur) => cur.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // Fire the "Explain"-style auto question once, on open.
  useEffect(() => {
    if (autoQuestion && hasPaper && !autoSent.current) {
      autoSent.current = true;
      send(autoQuestion, selection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(q);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card ask-card">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="ask-head">
          <h3>Ask the paper</h3>
          <p>Answers are grounded strictly in the source paper.</p>
        </div>

        {!hasPaper && (
          <div className="alert error ask-err">
            The paper text isn't available for this result. Re-run an analysis
            (with the latest backend deployed) to enable Q&amp;A.
          </div>
        )}

        <div className="ask-body">
          {turns.length === 0 && !loading && hasPaper && (
            <div className="ask-empty">
              Highlight text in the brief and choose <b>Ask</b> or <b>Explain</b>,
              or just type a question below.
            </div>
          )}

          {turns.map((t, i) => (
            <div className="ask-turn" key={i}>
              {t.selection && <div className="ask-quote">“{t.selection}”</div>}
              <div className="ask-q">{t.question}</div>
              <div className="ask-a">
                {t.answer == null ? (
                  <span className="ask-thinking">
                    <span className="spinner" /> thinking…
                  </span>
                ) : (
                  t.answer
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {err && <div className="alert error ask-err">{err}</div>}

        {selection && (
          <div className="ask-sel-chip">
            <span className="ask-sel-text">Regarding: “{selection}”</span>
            <button onClick={() => setSelection("")} aria-label="Clear selection">
              ×
            </button>
          </div>
        )}

        <div className="ask-input-row">
          <textarea
            rows={2}
            placeholder="Ask a question about the paper…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading || !hasPaper}
          />
          <button
            className="run-btn"
            onClick={() => send(q)}
            disabled={loading || !hasPaper || !q.trim()}
          >
            {loading ? <span className="spinner" /> : "Ask →"}
          </button>
        </div>
      </div>
    </div>
  );
}
