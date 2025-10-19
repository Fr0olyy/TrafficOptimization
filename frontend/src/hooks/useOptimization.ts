import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { ProcessResponse, AppError } from '../types';

/**
 * Main hook for optimization workflow
 * Handles file processing, state management, and downloads
 */
export function useOptimization() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await api.processFile(file);
      setResults(response);
      setUploadedFile(file);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Categorize error type
      if (errorMessage.includes('Connection failed')) {
        setError({
          type: 'network',
          message: 'Connection failed',
          details: 'Please check if the server is running on port 9000',
        });
      } else if (errorMessage.includes('Server error')) {
        setError({
          type: 'processing',
          message: 'Processing failed',
          details: errorMessage,
        });
      } else {
        setError({
          type: 'unknown',
          message: errorMessage,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const downloadClassical = useCallback(async () => {
    if (!results?.downloads.classical_csv) return;
    try {
      await api.downloadFile(results.downloads.classical_csv, 'classical_routes.csv');
    } catch (err) {
      setError({
        type: 'unknown',
        message: 'Failed to download classical results',
      });
    }
  }, [results]);

  const downloadQuantum = useCallback(async () => {
    if (!results?.downloads.quantum_csv) return;
    try {
      await api.downloadFile(results.downloads.quantum_csv, 'quantum_routes.csv');
    } catch (err) {
      setError({
        type: 'unknown',
        message: 'Failed to download quantum results',
      });
    }
  }, [results]);

  const reset = useCallback(() => {
    setUploadedFile(null);
    setResults(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  return {
    uploadedFile,
    isProcessing,
    results,
    error,
    processFile,
    downloadClassical,
    downloadQuantum,
    reset,
    setError,
  };
}
