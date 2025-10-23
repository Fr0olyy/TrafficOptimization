import { useState, useRef, useEffect } from 'react';
import { Zap, Download, ChevronDown, FileText, Play, Cpu } from 'lucide-react';
import { formatTime } from '../../utils/calculations';
import './TopBar.css';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="top-bar">
      <div className="top-bar-content">
        <div className="file-info">
          <div className="file-icon-wrapper">
            <FileText className="file-icon" size={20} />
          </div>
          <div className="file-details">
            <h2 className="filename">{filename}</h2>
            <div className="file-meta">
              <span className="processing-time">
                <Cpu className="time-icon" size={14} />
                {formatTime(processingTime)}
              </span>
              <span className="file-badge">Processed</span>
            </div>
          </div>
        </div>

        <div className="actions">
          <button onClick={onNewAnalysis} className="btn-new-analysis">
            <Play className="btn-icon" size={18} />
            <span>New Analysis</span>
            <div className="btn-glow"></div>
          </button>

          <div className="download-dropdown" ref={dropdownRef}>
            <button 
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className={`btn-download ${showDownloadMenu ? 'active' : ''}`}
            >
              <Download className="btn-icon" size={18} />
              <span>Export Results</span>
              <ChevronDown className={`chevron ${showDownloadMenu ? 'open' : ''}`} size={16} />
              <div className="btn-pulse"></div>
            </button>

            {showDownloadMenu && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <Zap className="dropdown-icon" size={16} />
                  <span>Export Data</span>
                </div>
                <button onClick={onDownloadClassical} className="dropdown-item">
                  <div className="item-icon classical"></div>
                  <div className="item-content">
                    <span className="item-title">Classical Results</span>
                    <span className="item-subtitle">Traditional algorithm data</span>
                  </div>
                </button>
                <button onClick={onDownloadQuantum} className="dropdown-item">
                  <div className="item-icon quantum"></div>
                  <div className="item-content">
                    <span className="item-title">Quantum Results</span>
                    <span className="item-subtitle">Quantum optimization data</span>
                  </div>
                </button>
                <div className="dropdown-footer">
                  <span>CSV format</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}