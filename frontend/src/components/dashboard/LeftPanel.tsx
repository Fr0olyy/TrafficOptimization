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
    <div className="left-panel">
      <SummaryCards results={results} />

      <div className="graphs-section">
        <h3 className="section-title">Graph Analysis</h3>

        <div className="graphs-list">
          {results.perGraph.map((graph, idx) => {
            const isSelected = selectedGraph === idx;
            const hasQuantumAdvantage = graph.compare.quantum_speedup > 1;

            return (
              <button
                key={idx}
                onClick={() => onSelectGraph(isSelected ? null : idx)}
                className={`graph-card ${isSelected ? 'selected' : ''} ${hasQuantumAdvantage ? 'advantage' : ''}`}
              >
                <div className="graph-header">
                  <span className="graph-badge">Graph {graph.graph_index}</span>
                  <span className={`speedup-badge ${hasQuantumAdvantage ? 'positive' : 'negative'}`}>
                    {graph.compare.quantum_speedup.toFixed(2)}x
                  </span>
                </div>

                <div className="metrics-grid">
                  <div className="metric-group">
                    <span className="metric-label">Classical</span>
                    <div className="metric-values">
                      <span className="metric-value">{graph.classical.enhanced.total_distance.toFixed(1)}</span>
                      <span className="metric-time">{graph.classical.enhanced.opt_time_ms}ms</span>
                    </div>
                  </div>

                  <div className="metric-group">
                    <span className="metric-label">Quantum</span>
                    <div className="metric-values">
                      <span className="metric-value">{graph.quantum.enhanced.total_distance.toFixed(1)}</span>
                      <span className="metric-time">{graph.quantum.enhanced.opt_time_ms}ms</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="charts-section">
        <h3 className="section-title">Performance Metrics</h3>
        <ComparisonCharts results={results} />
      </div>
    </div>
  );
}