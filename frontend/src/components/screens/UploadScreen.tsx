import { useState, useCallback } from 'react';
import { FileText, X, Zap } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-quantum)' }}>
              <span className="text-3xl">⚛️</span>
            </div>
            <h1 className="text-4xl font-bold gradient-text">
              Quantum Traffic Optimizer
            </h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Hybrid Classical-Quantum Route Solver for Advanced Traffic Optimization
          </p>
        </div>

        {/* Upload Zone */}
        <div
          className={`glass-effect rounded-2xl p-8 transition-all duration-300 ${
            isDragging ? 'glow-effect scale-105' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <label className="cursor-pointer block">
              <input
                type="file"
                className="hidden"
                accept=".csv,.txt"
                onChange={handleFileInput}
              />
              
              <div className="border-2 border-dashed rounded-xl p-16 text-center transition-all duration-300 hover:border-opacity-80"
                style={{ borderColor: 'rgba(102, 126, 234, 0.5)' }}>
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center" 
                    style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                    <span className="text-5xl">📁</span>
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-3">
                  Drag & Drop CSV/TXT File or click to browse
                </h3>
                <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <p>✓ Max size: 64MB</p>
                  <p>✓ Formats: .csv, .txt</p>
                </div>
              </div>
            </label>
          ) : (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between rounded-xl p-6 mb-6"
                style={{ background: 'var(--color-bg-elevated)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(102, 126, 234, 0.2)' }}>
                    <FileText className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{selectedFile.name}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClearFile}
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                  <X className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
                </button>
              </div>

              <button
                onClick={handleAnalyze}
                className="w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
                <Zap className="w-5 h-5" />
                Analyze with Quantum AI
              </button>
            </div>
          )}

          {errors.length > 0 && (
            <div className="mt-4 p-4 rounded-lg border-2 animate-fade-in"
              style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--color-error)' }}>
              {errors.map((error, i) => (
                <p key={i} className="text-sm" style={{ color: 'var(--color-error)' }}>
                  ⚠️ {error}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 glass-effect rounded-xl p-6 animate-fade-in delay-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <span>What we do:</span>
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <li className="flex items-center gap-2">
              <span style={{ color: 'var(--color-success)' }}>✓</span>
              Parse graph adjacency matrix from your data
            </li>
            <li className="flex items-center gap-2">
              <span style={{ color: 'var(--color-success)' }}>✓</span>
              Run classical algorithms (Dijkstra, Greedy)
            </li>
            <li className="flex items-center gap-2">
              <span style={{ color: 'var(--color-success)' }}>✓</span>
              Execute quantum optimization (QUBO + QAOA)
            </li>
            <li className="flex items-center gap-2">
              <span style={{ color: 'var(--color-success)' }}>✓</span>
              Compare results and visualize improvements
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}