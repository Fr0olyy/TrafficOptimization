import type { ProcessResponse } from '../types';

/**
 * API Client for Quantum Traffic Optimizer Backend
 * Handles all communication with Go server on port 9000
 */
export class OptimizationAPI {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:9000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Process uploaded file and run optimization
   * @param file - CSV or TXT file
   * @returns Promise with optimization results
   */
  async processFile(file: File): Promise<ProcessResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${this.baseUrl}/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }

      const data: ProcessResponse = await response.json();
      
      if (!data.ok) {
        throw new Error('Processing failed on server');
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Connection failed. Is the server running on port 9000?');
      }
      throw error;
    }
  }

  /**
   * Get download URL for optimized CSV
   * @param id - Download ID from process response
   * @returns Full download URL
   */
  getDownloadUrl(id: string): string {
    return `${this.baseUrl}/download?id=${id}`;
  }

  /**
   * Download CSV file
   * @param id - Download ID
   * @param filename - Desired filename
   */
  async downloadFile(id: string, filename: string): Promise<void> {
    try {
      const response = await fetch(this.getDownloadUrl(id));
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      throw new Error('Failed to download file');
    }
  }
}

// Export singleton instance
export const api = new OptimizationAPI();
