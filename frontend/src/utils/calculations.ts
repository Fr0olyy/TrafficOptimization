// src/utils/calculations.ts
import type { ProcessResponse, GraphResult } from '../types';

/**
 * Calculate total graphs processed
 */
export function getTotalGraphs(results: ProcessResponse): number {
  return results.perGraph?.length ?? 0;
}

/**
 * Calculate average quantum execution time
 */
export function getAverageQuantumTime(results: ProcessResponse): number {
  if (!results.perGraph || results.perGraph.length === 0) return 0;
  const sum = results.perGraph.reduce((acc, graph) => acc + (graph.stats?.time_ms ?? 0), 0);
  return sum / results.perGraph.length;
}

/**
 * Calculate total final cost
 */
export function getTotalFinalCost(results: ProcessResponse): number {
  if (!results.perGraph || results.perGraph.length === 0) return 0;
  return results.perGraph.reduce((acc, graph) => acc + (graph.stats?.final_cost ?? 0), 0);
}

/**
 * Get MIREA metrics count
 */
export function getMireaMetricsCount(results: ProcessResponse): number {
  if (!results.perGraph || results.perGraph.length === 0) return 0;
  return results.perGraph.reduce(
    (acc, graph) => acc + (graph.mirea_metric_samples?.length ?? 0),
    0
  );
}

/**
 * Get average iterations across graphs
 */
export function getAverageIterations(results: ProcessResponse): number {
  if (!results.perGraph || results.perGraph.length === 0) return 0;
  const sum = results.perGraph.reduce((acc, graph) => acc + (graph.stats?.iterations ?? 0), 0);
  return sum / results.perGraph.length;
}

/**
 * Format time in milliseconds to human-readable string
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}