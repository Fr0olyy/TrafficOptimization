import { useState, useCallback } from 'react';
import { FileText, X, Zap, CheckCircle } from 'lucide-react';
import { validateFile, formatFileSize } from '../../utils/validators';

interface UploadScreenProps {
  onFileSelect: (file: File) => void;
}

export function UploadScreen({ onFileSelect }: UploadScreenProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    const file = files && files.length > 0 ? files[0] : null;

    if (file) {
      const validation = validateFile(file);
      if (validation.valid) {
        setSelectedFile(file);
        setErrors([]);
      } else {
        setErrors(validation.errors);
      }
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files && files.length > 0 ? files[0] : null;

    if (file) {
      const validation = validateFile(file);
      if (validation.valid) {
        setSelectedFile(file);
        setErrors([]);
      } else {
        setErrors(validation.errors);
      }
    }
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setErrors([]);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [selectedFile, onFileSelect]);

  return (
    <div className="upload-screen">
      <div className="upload-container">
        {/* Header */}
        <header className="upload-header">
          <div className="logo">
            <span className="logo-icon">⚛️</span>
            <h1 className="logo-text">Quantum Traffic Optimizer</h1>
          </div>
          <p className="subtitle">Hybrid Classical-Quantum Route Solver for Advanced Traffic Optimization</p>
        </header>

        {/* Upload Zone */}
        <div className="upload-zone-wrapper">
          {!selectedFile ? (
            <div
              className={`upload-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-input"
                accept=".csv,.txt"
                onChange={handleFileInput}
                className="file-input-hidden"
              />
              <label htmlFor="file-input" className="upload-label">
                <FileText className="upload-icon" size={48} />
                <h3 className="upload-title">Drag & Drop CSV/TXT File</h3>
                <p className="upload-subtitle">or click to browse</p>
                <div className="upload-info">
                  <span className="info-item">✓ Max size: 64MB</span>
                  <span className="info-item">✓ Formats: .csv, .txt</span>
                </div>
              </label>
            </div>
          ) : (
            <div className="file-selected">
              <div className="file-info">
                <FileText className="file-icon" size={32} />
                <div className="file-details">
                  <h4 className="file-name">{selectedFile.name}</h4>
                  <p className="file-size">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button onClick={handleClearFile} className="clear-button" aria-label="Remove file">
                  <X size={20} />
                </button>
              </div>
              <button onClick={handleAnalyze} className="analyze-button">
                <Zap size={20} />
                <span>Analyze with Quantum AI</span>
              </button>
            </div>
          )}

          {errors.length > 0 && (
            <div className="errors-container">
              {errors.map((error, i) => (
                <div key={i} className="error-message">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="info-section">
          <h3 className="info-title">What we do:</h3>
          <ul className="info-list">
            <li className="info-list-item">
              <CheckCircle className="check-icon" size={20} />
              <span>Parse graph adjacency matrix from your data</span>
            </li>
            <li className="info-list-item">
              <CheckCircle className="check-icon" size={20} />
              <span>Run classical algorithms (Dijkstra, Greedy)</span>
            </li>
            <li className="info-list-item">
              <CheckCircle className="check-icon" size={20} />
              <span>Execute quantum optimization (QUBO + QAOA)</span>
            </li>
            <li className="info-list-item">
              <CheckCircle className="check-icon" size={20} />
              <span>Compare results and visualize improvements</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}