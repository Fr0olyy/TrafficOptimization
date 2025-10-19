import { useState } from 'react';
import { Zap, Download, ChevronDown } from 'lucide-react';
import { formatTime } from '../../utils/calculations';

interface TopBarProps {
  filename: string;
  processingTime: number;
  onNewAnalysis: () => void;
  onDownloadClassical: () => void;
  onDownloadQuantum: () => void;
}

export function TopBar({
  filename,
  processingTime,
  onNewAnalysis,
  onDownloadClassical,
  onDownloadQuantum,
}: TopBarProps) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  return (
    <div className="glass-effect sticky top-0 z-10 px-6 py-4 border-b border-white/10">
      <div className="flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Quantum Traffic Optimizer</h1>
            <p className="text-xs text-gray-400">
              {filename} • {formatTime(processingTime)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNewAnalysis}
            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors text-sm font-medium"
          >
            🆕 New Analysis
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 rounded-lg transition-opacity text-sm font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
              <ChevronDown className="w-4 h-4" />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-48 glass-effect rounded-lg border border-white/10 shadow-xl">
                <button
                  onClick={() => {
                    onDownloadClassical();
                    setShowDownloadMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors rounded-t-lg text-sm"
                >
                  Classical CSV
                </button>
                <button
                  onClick={() => {
                    onDownloadQuantum();
                    setShowDownloadMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors rounded-b-lg text-sm"
                >
                  Quantum CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
