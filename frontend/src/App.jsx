import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { fetchGraph, analyze } from "./api.js";
import InputPanel from "./components/InputPanel.jsx";
import AgentPipeline from "./components/AgentPipeline.jsx";
import ReviewPanel from "./components/ReviewPanel.jsx";
import BriefView from "./components/BriefView.jsx";

const PRODUCER_NODES = new Set([
  "metadata",
  "analyzer",
  "summarizer",
  "citation_extractor",
]);

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
            <span className="badge">Vol. 1 — LangGraph edition</span>
            <span className="badge">
              acceptance ≥ <strong>{threshold}</strong>/10
            </span>
            <span className="badge">
              up to <strong>{config.max_retries}</strong> revisions
            </span>
          </div>
        </div>
      </header>

      {graphError && (
        <div className="wrap">
          <div className="alert error">
            Could not reach the API: {graphError}. Is the backend running on
            :8000? (<code>uvicorn app.server:app --port 8000</code>)
          </div>
        </div>
      )}

      <main className="wrap">
        <InputPanel onSubmit={onSubmit} running={running} paperInfo={paperInfo} />

        {phase !== "idle" && (
          <>
            <AgentPipeline
              nodes={graph?.nodes ?? []}
              nodeState={nodeState}
              scores={scores}
              threshold={threshold}
              phase={phase}
            />

            <ReviewPanel
              history={history}
              scores={scores}
              threshold={threshold}
              flags={flags}
            />

            {error && <div className="alert error">{error}</div>}

            {(brief || phase === "done") && <BriefView brief={brief} />}
          </>
        )}
      </main>

      <footer className="foot">
        Prepared for the Vilambo AI Agent Developer Intern assignment · Set in a
        multi-agent pipeline of LangGraph, FastAPI &amp; React
      </footer>
    </div>
  );
}
