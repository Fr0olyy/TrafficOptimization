// ============================================
// TYPE DEFINITIONS - Exact match with Go backend
// ============================================

export interface GraphMetrics {
  total_distance: number;
  opt_time_ms: number;
}

export interface AlgorithmMetrics {
  greedy: GraphMetrics;
  enhanced: GraphMetrics;
}

export interface ComparisonMetrics {
  delta_ms: number;
  quantum_speedup: number;
}

export interface GraphResult {
  graph_index: number;
  classical: AlgorithmMetrics;
  quantum: AlgorithmMetrics;
  compare: ComparisonMetrics;
}

export interface ProcessResponse {
  ok: boolean;
  perGraph: GraphResult[];
  downloads: {
    classical_csv: string;
    quantum_csv: string;
  };
  elapsed_ms: number;
}

export type TabType = 'metrics' | 'visualization' | 'maps';

export type ProcessingStage = 'parsing' | 'classical' | 'quantum' | 'comparing' | 'complete';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AppError {
  type: 'validation' | 'network' | 'processing' | 'unknown';
  message: string;
  details?: string;
}
