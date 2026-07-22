import { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

export default function BriefView({ brief, onAskSelection }) {
  const [view, setView] = useState("rendered"); // rendered | markdown
  const [sel, setSel] = useState(null); // { text, x, y } for the floating chip
  const html = useMemo(() => (brief ? marked.parse(brief) : ""), [brief]);

  const copy = () => navigator.clipboard?.writeText(brief);
  const download = () => {
    const blob = new Blob([brief], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "research_brief.md";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Detect a text selection inside the brief and place the "Ask" chip near it.
  const onMouseUp = useCallback(() => {
    if (!onAskSelection) return;
    const s = window.getSelection();
    const text = s?.toString().trim() ?? "";
    if (text.length < 3) {
      setSel(null);
      return;
    }
    try {
      const rect = s.getRangeAt(0).getBoundingClientRect();
      setSel({ text, x: rect.left + rect.width / 2, y: rect.top });
    } catch {
      setSel(null);
    }
  }, [onAskSelection]);

  // Hide the chip when the user scrolls the selection away.
  useEffect(() => {
    if (!sel) return;
    const clear = () => setSel(null);
    window.addEventListener("scroll", clear, true);
    return () => window.removeEventListener("scroll", clear, true);
  }, [sel]);

  return (
    <section className="card brief-card">
      <div className="card-head">
        <h2><span className="sec-no">§ 4</span> Research brief</h2>
        <div className="brief-actions">
          <div className="tabs small">
            <button
              className={`tab ${view === "rendered" ? "active" : ""}`}
              onClick={() => setView("rendered")}
            >
              Rendered
            </button>
            <button
              className={`tab ${view === "markdown" ? "active" : ""}`}
              onClick={() => setView("markdown")}
            >
              Markdown
            </button>
          </div>
          <button className="ghost-btn" onClick={copy} disabled={!brief}>
            Copy
          </button>
          <button className="ghost-btn" onClick={download} disabled={!brief}>
            Download .md
          </button>
        </div>
      </div>

      {!brief ? (
        <div className="brief-pending">
          <span className="spinner" /> Waiting for the Boss agent to assemble the
          final brief…
        </div>
      ) : view === "rendered" ? (
        <article
          className="markdown-body"
          onMouseUp={onMouseUp}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="markdown-raw" onMouseUp={onMouseUp}>
          {brief}
        </pre>
      )}

      {sel &&
        createPortal(
          <div
            className="sel-toolbar"
            style={{ left: sel.x, top: sel.y - 48 }}
            onMouseDown={(e) => e.preventDefault()} // keep the selection alive
          >
            <button
              onClick={() => {
                onAskSelection(sel.text, "");
                setSel(null);
              }}
            >
              💬 Ask
            </button>
            <span className="sel-div" />
            <button
              onClick={() => {
                onAskSelection(sel.text, "Explain this excerpt in simple, clear terms.");
                setSel(null);
              }}
            >
              ✦ Explain
            </button>
          </div>,
          document.body
        )}
    </section>
  );
}
