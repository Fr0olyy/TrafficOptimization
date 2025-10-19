import { SummaryCards } from './SummaryCards';
import { ComparisonCharts } from './ComparisonCharts';
import type { ProcessResponse } from '../../types';

interface LeftPanelProps {
  results: ProcessResponse;
  selectedGraph: number | null;
  onSelectGraph: (index: number | null) => void;
}

export function LeftPanel({ results, selectedGraph, onSelectGraph }: LeftPanelProps) {
  return (
    <div className="pb-6">
      <SummaryCards results={results} />
      <ComparisonCharts results={results} />
      
      {/* Graph Details Accordion */}
      <div className="px-6 space-y-2">
        <h3 className="text-lg font-semibold mb-3">📋 Per-Graph Details</h3>
        {results.perGraph.map((graph) => (
          <div
            key={graph.graph_index}
            className="glass-effect rounded-lg overflow-hidden"
          >
            <button
              onClick={() => onSelectGraph(
                selectedGraph === graph.graph_index ? null : graph.graph_index
              )}
              className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
            >
              <span className="font-medium">Graph {graph.graph_index}</span>
              <span className="text-sm text-gray-400">
                {selectedGraph === graph.graph_index ? '▼' : '▶'}
              </span>
            </button>

            {selectedGraph === graph.graph_index && (
              <div className="px-4 pb-4 space-y-3 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-classical/10 border border-classical/30 rounded p-3">
                    <p className="text-xs text-gray-400 mb-1">Classical Enhanced</p>
                    <p className="text-lg font-semibold">{graph.classical.enhanced.total_distance.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">{graph.classical.enhanced.opt_time_ms}ms</p>
                  </div>
                  <div className="bg-quantum/10 border border-quantum/30 rounded p-3">
                    <p className="text-xs text-gray-400 mb-1">Quantum Enhanced</p>
                    <p className="text-lg font-semibold">{graph.quantum.enhanced.total_distance.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">{graph.quantum.enhanced.opt_time_ms}ms</p>
                  </div>
                </div>

                <div className="bg-bg-elevated rounded p-3">
                  <p className="text-sm font-medium mb-2">Performance Metrics:</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time Delta:</span>
                      <span className={graph.compare.delta_ms < 0 ? 'text-success' : 'text-warning'}>
                        {graph.compare.delta_ms > 0 ? '+' : ''}{graph.compare.delta_ms}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Speedup:</span>
                      <span className={graph.compare.quantum_speedup > 1 ? 'text-success' : 'text-error'}>
                        {graph.compare.quantum_speedup.toFixed(2)}x
                      </span>
                    </div>
                  </div>
                </div>

                {graph.compare.quantum_speedup > 1 && (
                  <div className="text-center py-2">
                    <span className="text-success font-semibold">🏆 Quantum Winner!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
