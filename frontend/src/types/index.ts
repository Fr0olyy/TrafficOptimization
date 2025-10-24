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

// ⭐ NEW: Route detail from backend
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

// ⭐ NEW: Graph statistics
export interface GraphStats {
  processed_routes: number;
  total_routes: number;
  successful: number;
  pure_quantum_time: number;
  mirea_time: number | null;
}

// ⭐ UPDATED: GraphResult with routes and stats
export interface GraphResult {
  graph_index: number;
  classical: AlgorithmMetrics;
  quantum: AlgorithmMetrics;
  compare: ComparisonMetrics;
  num_nodes: number;
  num_vehicles: number;
  routes?: RouteDetail[];  // ⭐ NEW
  stats?: GraphStats;       // ⭐ NEW
}

export interface ProcessResponse {
  ok: boolean;
  perGraph: GraphResult[];
  downloads: {
    submission_csv: string;
  };
  elapsed_ms: number;
}

export type TabType = 'metrics' | 'routes' | 'visualization' | 'maps';  // ⭐ добавил routes
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