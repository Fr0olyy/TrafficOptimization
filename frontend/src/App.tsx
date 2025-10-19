import { useState } from 'react';
import { UploadScreen } from './components/screens/UploadScreen';
import { ProcessingScreen } from './components/screens/ProcessingScreen';
import { ResultsDashboard } from './components/screens/ResultsDashboard';
import { useOptimization } from './hooks/useOptimization';

type AppScreen = 'upload' | 'processing' | 'results';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('upload');
  const {
    uploadedFile,
    results,
    error,
    processFile,
    downloadClassical,
    downloadQuantum,
    reset,
    setError,
  } = useOptimization();

  const handleFileSelect = async (file: File) => {
    setScreen('processing');
    await processFile(file);
    setScreen('results');
  };

  const handleNewAnalysis = () => {
    reset();
    setScreen('upload');
  };

  // Error handling
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md glass-effect rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-error">Error</h2>
          <p className="text-gray-300 mb-4">{error.message}</p>
          {error.details && (
            <p className="text-sm text-gray-400 mb-6">{error.details}</p>
          )}
          <button
            onClick={() => {
              setError(null);
              setScreen('upload');
            }}
            className="px-6 py-2 bg-primary rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {screen === 'upload' && (
        <UploadScreen onFileSelect={handleFileSelect} />
      )}

      {screen === 'processing' && <ProcessingScreen />}

      {screen === 'results' && results && uploadedFile && (
        <ResultsDashboard
          results={results}
          filename={uploadedFile.name}
          onNewAnalysis={handleNewAnalysis}
          onDownloadClassical={downloadClassical}
          onDownloadQuantum={downloadQuantum}
        />
      )}
    </>
  );
}
