import { useState, useCallback } from 'react';
import { FileText, X, Zap, CheckCircle, Upload, Cpu, BarChart3 } from 'lucide-react';
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
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}
            >
              <span className="text-2xl text-white">⚛️</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: '#003274' }}>
              UrbanQ
            </h1>
          </div>
          <p className="text-lg font-medium" style={{ color: '#4495D1' }}>Quantum Traffic Optimizer</p>
          <p className="text-gray-600 mt-2">Hybrid Classical-Quantum Route Solver for Advanced Traffic Optimization</p>
        </header>

        {/* Upload Zone */}
        <div className="mb-8">
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-input"
                accept=".csv,.txt"
                onChange={handleFileInput}
                className="hidden"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto"
                  style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}
                >
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#003274' }}>Drag & Drop CSV/TXT File</h3>
                <p className="text-gray-600 mb-4">or click to browse</p>
                <div className="flex justify-center gap-6 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #56C02B, #059669)' }}
                    >
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    Max size: 64MB
                  </span>
                  <span className="flex items-center gap-1">
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #56C02B, #059669)' }}
                    >
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    Formats: .csv, .txt
                  </span>
                </div>
              </label>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #56C02B, #059669)' }}
                >
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate" style={{ color: '#003274' }}>{selectedFile.name}</h4>
                  <p className="text-gray-600 text-sm">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button 
                  onClick={handleClearFile} 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
              <button 
                onClick={handleAnalyze} 
                className="w-full text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white bg-opacity-20">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span>Analyze with Quantum AI</span>
              </button>
            </div>
          )}

          {errors.length > 0 && (
            <div className="mt-4 space-y-2">
              {errors.map((error, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #E20072, #dc2626)' }}
                  >
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-semibold mb-4" style={{ color: '#003274' }}>What we do:</h3>
          <ul className="space-y-4">
            <li className="flex items-center gap-4">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}
              >
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-700">Parse graph adjacency matrix from your data</span>
            </li>
            <li className="flex items-center gap-4">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #15256D, #003274)' }}
              >
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-700">Run classical algorithms (Dijkstra, Greedy)</span>
            </li>
            <li className="flex items-center gap-4">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4495D1, #3b82f6)' }}
              >
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-700">Execute quantum optimization (QUBO + QAOA)</span>
            </li>
            <li className="flex items-center gap-4">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #259789, #0d9488)' }}
              >
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-700">Compare results and visualize improvements</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}