import SourceViewer from "./SourceViewer.jsx";
import BriefView from "./BriefView.jsx";

// Shown once the runner popup is dismissed: the paper and the generated brief
// side by side, plus ways to ask questions and re-open the execution detail.
export default function ResultView({ source, paperInfo, brief, onDetails, onAsk }) {
  return (
    <>
      <div className="result-bar">
        <div>
          <span className="result-title">Research brief ready</span>
          <span className="result-hint">— highlight any text to ask about it</span>
        </div>
        <button className="ghost-btn" onClick={onDetails}>
          ▤ View execution details
        </button>
      </div>

      <div className="result-grid">
        <SourceViewer source={source} paperInfo={paperInfo} />
        <BriefView brief={brief} onAskSelection={(text, auto) => onAsk(text, auto)} />
      </div>
    </>
  );
}
