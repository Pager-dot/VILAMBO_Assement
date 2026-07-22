import SourceViewer from "./SourceViewer.jsx";
import BriefView from "./BriefView.jsx";

// Shown once the runner popup is dismissed: the paper and the generated brief
// side by side, plus a way to re-open the full execution detail.
export default function ResultView({ source, paperInfo, brief, onDetails }) {
  return (
    <>
      <div className="result-bar">
        <span className="result-title">Research brief ready</span>
        <button className="ghost-btn" onClick={onDetails}>
          ▤ View execution details
        </button>
      </div>

      <div className="result-grid">
        <SourceViewer source={source} paperInfo={paperInfo} />
        <BriefView brief={brief} />
      </div>
    </>
  );
}
