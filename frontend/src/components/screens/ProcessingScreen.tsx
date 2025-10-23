import { useEffect, useState } from 'react';
import { Loader2, FileText, Cpu, Zap, BarChart3 } from 'lucide-react';

export function ProcessingScreen() {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);

  const stages = [
    { 
      icon: <FileText className="w-5 h-5" />, 
      label: 'Parsing graph data', 
      duration: 5, 
      gradient: 'linear-gradient(135deg, #003274, #4495D1)'
    },
    { 
      icon: <Cpu className="w-5 h-5" />, 
      label: 'Running classical algorithms', 
      duration: 30, 
      gradient: 'linear-gradient(135deg, #15256D, #003274)'
    },
    { 
      icon: <Zap className="w-5 h-5" />, 
      label: 'Executing quantum optimization', 
      duration: 50, 
      gradient: 'linear-gradient(135deg, #4495D1, #3b82f6)'
    },
    { 
      icon: <BarChart3 className="w-5 h-5" />, 
      label: 'Comparing results', 
      duration: 15, 
      gradient: 'linear-gradient(135deg, #259789, #0d9488)'
    },
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
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="processing-header mb-8">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
            style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}
          >
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#003274' }}>Processing Your Data</h2>
          <p className="text-gray-600">This may take a few moments...</p>
        </div>

        <div className="progress-bar-container mb-8">
          <div className="w-full h-2 bg-gray-200 rounded-full mb-2">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #4495D1, #003274)'
              }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600">{Math.round(progress)}%</span>
        </div>

        <div className="stages-list space-y-3">
          {stages.map((s, i) => (
            <div 
              key={i} 
              className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all ${
                i === stage 
                  ? 'border-blue-300 shadow-md scale-[1.02]' 
                  : i < stage 
                    ? 'border-green-200' 
                    : 'border-gray-200'
              }`}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0"
                style={{ background: s.gradient }}
              >
                <span className="text-white">
                  {s.icon}
                </span>
              </div>
              <div className="flex-1 flex justify-between items-center">
                <span className={`font-medium ${
                  i === stage ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {s.label}
                </span>
                <span className={`text-sm font-medium ${
                  i < stage 
                    ? 'text-green-600' 
                    : i === stage 
                      ? 'text-blue-600' 
                      : 'text-gray-400'
                }`}>
                  {i < stage && 'Completed'}
                  {i === stage && 'In progress...'}
                  {i > stage && 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}