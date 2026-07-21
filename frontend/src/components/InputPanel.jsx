import { useRef, useState } from "react";

const TABS = [
  { id: "file", label: "Upload PDF / TXT" },
  { id: "url", label: "Paper URL" },
  { id: "text", label: "Paste text" },
];

export default function InputPanel({ onSubmit, running, paperInfo }) {
  const [tab, setTab] = useState("file");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);

  const canSubmit =
    !running &&
    ((tab === "file" && file) ||
      (tab === "url" && url.trim()) ||
      (tab === "text" && text.trim().length > 40));

  const submit = () => {
    if (!canSubmit) return;
    if (tab === "file") onSubmit({ file });
    else if (tab === "url") onSubmit({ url: url.trim() });
    else onSubmit({ text });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  return (
    <section className="card input-card">
      <div className="card-head">
        <h2><span className="sec-no">§ 1</span> Submit a paper</h2>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
              disabled={running}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "file" && (
        <div
          className={`dropzone ${dragging ? "drag" : ""} ${file ? "has-file" : ""}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.txt"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="dz-icon">{file ? "📄" : "⬆"}</div>
          {file ? (
            <div>
              <strong>{file.name}</strong>
              <p>{(file.size / 1024).toFixed(0)} KB · click to replace</p>
            </div>
          ) : (
            <div>
              <strong>Drop a PDF or .txt here</strong>
              <p>or click to browse</p>
            </div>
          )}
        </div>
      )}

      {tab === "url" && (
        <div className="field">
          <input
            type="url"
            placeholder="https://arxiv.org/abs/1706.03762  or a direct PDF link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={running}
          />
          <p className="hint">
            arXiv abstract links are auto-resolved to the PDF. Direct PDF and
            plain-text URLs also work.
          </p>
        </div>
      )}

      {tab === "text" && (
        <div className="field">
          <textarea
            rows={6}
            placeholder="Paste the full paper text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={running}
          />
        </div>
      )}

      <div className="input-footer">
        <button className="run-btn" onClick={submit} disabled={!canSubmit}>
          {running ? (
            <>
              <span className="spinner" /> Analyzing…
            </>
          ) : (
            <>Generate research brief →</>
          )}
        </button>
        {paperInfo && (
          <span className="paper-meta">
            {paperInfo.chars.toLocaleString()} characters extracted
          </span>
        )}
      </div>
    </section>
  );
}
