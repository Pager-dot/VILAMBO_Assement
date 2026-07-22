// Live view of the source paper: native PDF render for uploads / PDF URLs,
// plain text for pasted or .txt input, a preview for generic web URLs.
export default function SourceViewer({ source, paperInfo }) {
  if (!source) return null;

  const isDoc = source.kind === "pdf";
  const link = source.original || source.url;

  return (
    <section className="card viewer-card">
      <div className="card-head">
        <h2>Source paper</h2>
        {paperInfo && (
          <span className="progress-note">
            {paperInfo.chars.toLocaleString()} chars extracted
          </span>
        )}
      </div>

      {isDoc ? (
        <div className="doc-frame-wrap">
          <iframe title="Source document" src={source.url} className="doc-frame" />
        </div>
      ) : (
        <pre className="source-text">
          {source.text || paperInfo?.preview || "No preview available."}
          {source.kind === "web" && "\n\n… (showing extracted preview)"}
        </pre>
      )}

      {link && (
        <a className="ghost-btn open-original" href={link} target="_blank" rel="noreferrer">
          Open original ↗
        </a>
      )}
    </section>
  );
}
