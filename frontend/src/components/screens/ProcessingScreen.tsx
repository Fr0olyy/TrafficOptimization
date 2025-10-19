import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export function ProcessingScreen() {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);

  const stages = [
    { icon: '📊', label: 'Parsing graph data', duration: 5, color: '#3b82f6' },
    { icon: '🔄', label: 'Running classical algorithms', duration: 30, color: '#21808d' },
    { icon: '⚛️', label: 'Executing quantum optimization', duration: 50, color: '#32b8c6' },
    { icon: '📈', label: 'Comparing results', duration: 15, color: '#10b981' },
  ];

  useEffect(() => {
    const totalDuration = stages.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 0.1;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(newProgress);

      let cumulativeDuration = 0;
      for (let i = 0; i < stages.length; i++) {
        cumulativeDuration += stages[i].duration;
        if (elapsed < cumulativeDuration) {
          setStage(i);
          break;
        }
      }

      if (elapsed >= totalDuration) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="processing-screen">
      <div className="processing-container">
        <div className="processing-header">
          <Loader2 className="spinner" size={48} />
          <h2 className="processing-title">Processing Your Data</h2>
          <p className="processing-subtitle">This may take a few moments...</p>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${stages[stage]?.color || '#3b82f6'}, ${stages[stage]?.color || '#3b82f6'}dd)`
              }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>

        <div className="stages-list">
          {stages.map((s, i) => (
            <div 
              key={i} 
              className={`stage-item ${i < stage ? 'completed' : i === stage ? 'active' : 'pending'}`}
            >
              <div className="stage-icon-wrapper">
                <span className="stage-icon">{s.icon}</span>
              </div>
              <div className="stage-content">
                <span className="stage-label">{s.label}</span>
                {i < stage && (
                  <span className="stage-status completed">Completed</span>
                )}
                {i === stage && (
                  <span className="stage-status active">In progress...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}