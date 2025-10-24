// src/types/index.ts
export interface GraphMetrics {
  total_distance: number;
  opt_time_ms: number;
  routes_optimized?: number[][];
}

export interface AlgorithmMetrics {
  greedy: GraphMetrics;
  enhanced: GraphMetrics;
}

export interface ComparisonMetrics {
  delta_ms: number;
  quantum_speedup: number;
}

// ⭐ Route detail from backend
export interface RouteDetail {
  route_index: number;
  start: number;
  end: number;
  quantum: {
    path: number[];
    cost: number;
    time: number;
    qubits: number;
    p_layers: number;
    algorithm: string;
  };
  mirea: {
    path: number[];
    cost: number;
    time: number;
  } | null;
}

// ⭐ Graph statistics - MATCHES BACKEND SWAGGER
export interface GraphStats {
  final_cost: number;
  iterations: number;
  time_ms: number;
  total_routes: number;
}

// ⭐ MIREA Metric Sample
export interface MireaMetricSample {
  route_index_sampled: number;
  start: number;
  end: number;
  mirea_metrics: {
    success: boolean;
    measurements: Record<string, number>;
    time: number;
    shots: number;
    algorithm: string;
    error?: string;
  };
}

// ⭐ UPDATED: GraphResult MATCHES BACKEND SWAGGER
export interface GraphResult {
  graph_index: number;
  stats: GraphStats; // ✅ This is what backend returns!
  mirea_metric_samples: MireaMetricSample[]; // ✅ This is what backend returns!
}

// ⭐ ProcessResponse MATCHES BACKEND SWAGGER EXACTLY
export interface ProcessResponse {
  ok: boolean;
  downloads: {
    submission_csv: string; // ✅ Only this field!
  };
  elapsed_ms: number;
  parameters: {
    reroute_fraction: number;
    solver_iterations: number;
  };
  perGraph: GraphResult[]; // ✅ Uses new GraphResult
  summary: {
    mirea_samples_requested: number;
    solver_iterations: number;
    total_graphs: number;
  };
}

export type TabType = 'metrics' | 'routes' | 'visualization' | 'maps';
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