// src/hooks/useOptimization.ts
import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { ProcessResponse, AppError } from '../types';

/**
 * Main hook for optimization workflow
 * Handles file processing, state management, and downloads
 * 
 * COMPATIBLE WITH:
 * - Backend swagger: returns submission_csv (NOT classical_csv + quantum_csv)
 * - Frontend screens: maintains same interface for compatibility
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

  /**
   * Download the submission.csv (optimized results)
   * Backend swagger provides ONLY submission_csv, not separate classical/quantum files
   */
  const downloadSubmission = useCallback(async () => {
    if (!results?.downloads.submission_csv) {
      setError({
        type: 'unknown',
        message: 'No submission file available',
      });
      return;
    }

    try {
      await api.downloadFile(results.downloads.submission_csv, 'submission_optimized.csv');
    } catch (err) {
      setError({
        type: 'unknown',
        message: 'Failed to download submission results',
      });
    }
  }, [results]);

  /**
   * Legacy function for backwards compatibility
   * Now just calls downloadSubmission
   */
  const downloadClassical = useCallback(async () => {
    await downloadSubmission();
  }, [downloadSubmission]);

  /**
   * Legacy function for backwards compatibility
   * Now just calls downloadSubmission
   */
  const downloadQuantum = useCallback(async () => {
    await downloadSubmission();
  }, [downloadSubmission]);

  const reset = useCallback(() => {
    setUploadedFile(null);
    setResults(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  return {
    // State
    uploadedFile,
    isProcessing,
    results,
    error,
    
    // Actions
    processFile,
    downloadClassical, // Legacy - downloads submission_csv
    downloadQuantum,   // Legacy - downloads submission_csv
    downloadSubmission, // New - downloads submission_csv
    reset,
    setError,
  };
}