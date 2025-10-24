import { SummaryCards } from './SummaryCards';
import { ComparisonCharts } from './ComparisonCharts';
import type { ProcessResponse } from '../../types';
import './LeftPanel.css';

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
        <div className="section-header">
          <h3 className="section-title">Graph Analysis</h3>
          <div className="section-badge">
            {results.perGraph.length} graphs
          </div>
        </div>

        <div className="graphs-list">
          {results.perGraph.map((graph, idx) => {
            const isSelected = selectedGraph === idx;
            const hasQuantumAdvantage = graph.compare.quantum_speedup > 1;

            const improvement = ((graph.classical.enhanced.total_distance - graph.quantum.enhanced.total_distance) / 
                               graph.classical.enhanced.total_distance) * 100;

            // Получаем информацию о маршрутах
            const routeCount = graph.routes?.length || 0;
            const successfulRoutes = graph.stats?.successful || 0;

            return (
              <button
                key={idx}
                onClick={() => onSelectGraph(isSelected ? null : idx)}
                className={`graph-card ${isSelected ? 'selected' : ''} ${hasQuantumAdvantage ? 'advantage' : ''}`}
              >
                <div className="graph-header">
                  <div className="graph-identity">
                    <div className={`graph-icon ${hasQuantumAdvantage ? 'icon-quantum' : 'icon-classical'}`}>
                      {hasQuantumAdvantage ? '⚡' : '🔷'}
                    </div>
                    <div>
                      <span className="graph-badge">Graph {graph.graph_index + 1}</span>
                      <div className="graph-subtitle">
                        {graph.num_nodes} nodes • {graph.num_vehicles} vehicles
                      </div>
                    </div>
                  </div>
                  <div className="graph-performance">
                    <span className={`speedup-badge ${hasQuantumAdvantage ? 'positive' : 'negative'}`}>
                      {hasQuantumAdvantage ? '⚡' : '🔷'} {graph.compare.quantum_speedup.toFixed(2)}x
                    </span>
                    {improvement > 0 && (
                      <span className="improvement-badge">
                        📈 {improvement.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="metrics-grid">
                  <div className="metric-group">
                    <span className="metric-label">Classical Algorithm</span>
                    <div className="metric-values">
                      <span className="metric-value">{graph.classical.enhanced.total_distance.toFixed(1)}</span>
                      <span className="metric-time">{graph.classical.enhanced.opt_time_ms}ms</span>
                    </div>
                    <div className="metric-path">
                      Routes: {routeCount} total
                    </div>
                  </div>

                  <div className="metric-group">
                    <span className="metric-label">Quantum Algorithm</span>
                    <div className="metric-values">
                      <span className="metric-value quantum-value">
                        {graph.quantum.enhanced.total_distance.toFixed(1)}
                      </span>
                      <span className="metric-time quantum-time">
                        {graph.quantum.enhanced.opt_time_ms}ms
                      </span>
                    </div>
                    <div className="metric-path">
                      Successful: {successfulRoutes} routes
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="graph-details">
                    <div className="detail-row">
                      <span className="detail-label">Time Delta:</span>
                      <span className="detail-value">
                        {graph.compare.delta_ms}ms
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Quantum Speedup:</span>
                      <span className="detail-value quantum-value">
                        {graph.compare.quantum_speedup.toFixed(2)}x
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Processed Routes:</span>
                      <span className="detail-value">
                        {graph.stats?.processed_routes || 0} / {graph.stats?.total_routes || 0}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="charts-section">
        <div className="section-header">
          <h3 className="section-title">Performance Analytics</h3>
          <div className="section-badge">
            Real-time comparison
          </div>
        </div>
        <ComparisonCharts results={results} />
      </div>
    </div>
  );
}