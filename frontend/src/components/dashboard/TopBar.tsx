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
    <div className="top-bar">
      <div className="top-bar-content">
        <div className="file-info">
          <h2 className="filename">{filename}</h2>
          <span className="processing-time">{formatTime(processingTime)}</span>
        </div>

        <div className="actions">
          <button onClick={onNewAnalysis} className="btn-new-analysis">
            <Zap size={18} />
            <span>New Analysis</span>
          </button>

          <div className="download-dropdown">
            <button 
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="btn-download"
            >
              <Download size={18} />
              <span>Download</span>
              <ChevronDown size={16} className={`chevron ${showDownloadMenu ? 'open' : ''}`} />
            </button>

            {showDownloadMenu && (
              <div className="dropdown-menu">
                <button onClick={onDownloadClassical} className="dropdown-item">
                  Classical Results
                </button>
                <button onClick={onDownloadQuantum} className="dropdown-item">
                  Quantum Results
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}