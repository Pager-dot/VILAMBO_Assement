import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { fetchGraph, analyze } from "./api.js";
import InputPanel from "./components/InputPanel.jsx";
import RunnerModal from "./components/RunnerModal.jsx";
import ResultView from "./components/ResultView.jsx";

const PRODUCER_NODES = new Set([
  "metadata",
  "analyzer",
  "summarizer",
  "citation_extractor",
  "key_insights",
]);

// Derive what the live Source viewer should show from the submitted input.
async function buildSource(input) {
  if (input.file) {
    const f = input.file;
    const isPdf = /\.pdf$/i.test(f.name) || f.type === "application/pdf";
    if (isPdf) return { kind: "pdf", url: URL.createObjectURL(f), name: f.name, blob: true };
    let text = "";
    try {
      text = await f.text();
    } catch {
      /* ignore */
    }
    return { kind: "text", text, name: f.name };
  }
  if (input.url) {
    let u = input.url.trim();
    const abs = u.match(/arxiv\.org\/abs\/(.+?)\/?$/i);
    if (abs) u = `https://arxiv.org/pdf/${abs[1]}`;
    const isPdf = /\.pdf(\?|$)/i.test(u) || /arxiv\.org\/pdf\//i.test(u);
    return { kind: isPdf ? "pdf" : "web", url: u, original: input.url.trim() };
  }
  if (input.text) return { kind: "text", text: input.text };
  return null;
}

export default function App() {
  const [graph, setGraph] = useState(null);
  const [graphError, setGraphError] = useState(null);

  const [phase, setPhase] = useState("idle"); // idle | running | done | error
  const [nodeState, setNodeState] = useState({}); // id -> { status, runs }
  const [history, setHistory] = useState([]); // review iteration records
  const [scores, setScores] = useState({}); // field -> latest score
  const [flags, setFlags] = useState([]);
  const [brief, setBrief] = useState("");
  const [error, setError] = useState(null);
  const [paperInfo, setPaperInfo] = useState(null); // { chars, preview }
  const [source, setSource] = useState(null); // live viewer source
  const sourceUrlRef = useRef(null); // object URL to revoke on the next run

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("live"); // live | review

  useEffect(() => {
    fetchGraph()
      .then(setGraph)
      .catch((e) => setGraphError(e.message));
  }, []);

  const config = graph?.config ?? { pass_threshold: 7, max_retries: 2 };
  const threshold = config.pass_threshold;

  const reviewerFor = useMemo(() => {
    const map = {};
    graph?.nodes?.forEach((n) => {
      if (n.kind === "reviewer" && n.reviews) map[n.id] = n.reviews;
    });
    return map;
  }, [graph]);

  const resetRun = useCallback(() => {
    setPhase("running");
    setNodeState({});
    setHistory([]);
    setScores({});
    setFlags([]);
    setBrief("");
    setError(null);
    setPaperInfo(null);
  }, []);

  const handleEvent = useCallback(
    (evt) => {
      switch (evt.event) {
        case "start":
          setPaperInfo({ chars: evt.paper_chars, preview: evt.paper_preview });
          break;

        case "node_running":
          setNodeState((prev) => {
            const cur = prev[evt.node] ?? { status: "pending", runs: 0 };
            const runs = PRODUCER_NODES.has(evt.node) ? cur.runs + 1 : cur.runs;
            return { ...prev, [evt.node]: { status: "running", runs } };
          });
          break;

        case "node_done": {
          setNodeState((prev) => {
            const cur = prev[evt.node] ?? { status: "pending", runs: 0 };
            return { ...prev, [evt.node]: { ...cur, status: "done" } };
          });

          const field = reviewerFor[evt.node];
          if (field) {
            const r = evt.result || {};
            const score = r.review_scores?.[field];
            if (score != null) {
              const retry = r.retry_counts?.[field] ?? 0;
              const feedback = r.review_feedback?.[field] ?? "";
              setScores((s) => ({ ...s, [field]: score }));
              setHistory((h) => [
                ...h,
                {
                  field,
                  score,
                  passed: score >= threshold,
                  retry,
                  feedback,
                  attempt: h.filter((x) => x.field === field).length + 1,
                },
              ]);
            }
          }
          break;
        }

        case "final":
          setBrief(evt.brief || "");
          setFlags(evt.state?.flags || []);
          setPhase("done");
          break;

        case "error":
          setError(evt.message || "Unknown error");
          setPhase("error");
          break;

        default:
          break;
      }
    },
    [reviewerFor, threshold]
  );

  const onSubmit = useCallback(
    async (input) => {
      resetRun();
      setModalMode("live");
      setModalOpen(true);

      // Free the previous PDF blob URL before making a new one.
      if (sourceUrlRef.current) {
        URL.revokeObjectURL(sourceUrlRef.current);
        sourceUrlRef.current = null;
      }
      const src = await buildSource(input);
      if (src?.blob) sourceUrlRef.current = src.url;
      setSource(src);

      try {
        await analyze(input, handleEvent);
      } catch (e) {
        setError(e.message);
        setPhase("error");
      }
    },
    [handleEvent, resetRun]
  );

  const running = phase === "running";
  const showResult = brief && !modalOpen;

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <div className="brand-mark">❦</div>
            <h1>The Research Paper Analyzer</h1>
            <p>A multi-agent reading pipeline — orchestrator &amp; review-gated sub-agents</p>
          </div>
          <div className="config-badges">
            <span
              className="badge"
              tabIndex={0}
              data-tip={`The Review agent scores each output 1–10 against the source paper. Anything below ${threshold} is sent back to its sub-agent for another attempt.`}
            >
              Review threshold <strong>{threshold}</strong>/10
            </span>
            <span
              className="badge"
              tabIndex={0}
              data-tip={`Each field gets at most ${config.max_retries} revisions. If it still hasn't reached the threshold, it's flagged in the brief instead of looping forever.`}
            >
              Max <strong>{config.max_retries}</strong> retries per field
            </span>
          </div>
        </div>
      </header>

      {graphError && (
        <div className="wrap">
          <div className="alert error">
            Could not reach the API: {graphError}.
          </div>
        </div>
      )}

      <main className="wrap">
        <InputPanel onSubmit={onSubmit} running={running} paperInfo={paperInfo} />

        {showResult && (
          <ResultView
            source={source}
            paperInfo={paperInfo}
            brief={brief}
            onDetails={() => {
              setModalMode("review");
              setModalOpen(true);
            }}
          />
        )}
      </main>

      {modalOpen && (
        <RunnerModal
          phase={phase}
          mode={modalMode}
          nodes={graph?.nodes ?? []}
          nodeState={nodeState}
          scores={scores}
          history={history}
          threshold={threshold}
          flags={flags}
          error={error}
          onViewBrief={() => setModalOpen(false)}
          onClose={() => setModalOpen(false)}
        />
      )}

      <footer className="foot">
        Built for the Vilambo AI Agent Developer Intern assignment · LangGraph ·
        FastAPI · React
      </footer>
    </div>
  );
}
