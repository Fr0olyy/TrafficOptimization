import type { ValidationResult } from '../types';

const MAX_FILE_SIZE = 67108864; // 64MB in bytes
const ALLOWED_EXTENSIONS = ['csv', 'txt'];

/**
 * Validate uploaded file
 * Checks file extension and size
 */
export function validateFile(file: File): ValidationResult {
  const errors: string[] = [];

  // Check extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    errors.push(`Only ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()} files are supported`);
  }

  // Check size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
    errors.push(`File size must be less than ${sizeMB}MB`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
