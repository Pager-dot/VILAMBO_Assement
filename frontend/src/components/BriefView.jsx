import { useMemo, useState } from "react";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

export default function BriefView({ brief }) {
  const [view, setView] = useState("rendered"); // rendered | markdown
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
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="markdown-raw">{brief}</pre>
      )}
    </section>
  );
}
