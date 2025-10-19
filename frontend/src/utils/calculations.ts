import type { ProcessResponse, GraphResult } from '../types';

/**
 * Calculate average quantum speedup across all graphs
 */
export function calculateAverageSpeedup(results: ProcessResponse): number {
  if (!results.perGraph || results.perGraph.length === 0) return 0;
  
  const sum = results.perGraph.reduce(
    (acc, graph) => acc + graph.compare.quantum_speedup,
    0
  );
  
  return sum / results.perGraph.length;
}

/**
 * Calculate average distance improvement
 * Returns percentage: (classical - quantum) / classical * 100
 */
export function calculateAverageImprovement(results: ProcessResponse): number {
  if (!results.perGraph || results.perGraph.length === 0) return 0;
  
  const improvements = results.perGraph.map(graph => {
    const classicalDist = graph.classical.enhanced.total_distance;
    const quantumDist = graph.quantum.enhanced.total_distance;
    return ((classicalDist - quantumDist) / classicalDist) * 100;
  });
  
  const sum = improvements.reduce((acc, val) => acc + val, 0);
  return sum / improvements.length;
}

/**
 * Get winner for a specific graph
 */
export function getWinner(graph: GraphResult): 'classical' | 'quantum' {
  return graph.compare.quantum_speedup > 1 ? 'quantum' : 'classical';
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
