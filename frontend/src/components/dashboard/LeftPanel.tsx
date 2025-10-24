// src/components/dashboard/LeftPanel.tsx - FIXED
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
      {/* Summary Cards */}
      <section className="panel-section">
        <h2 className="section-title">📊 Results Summary</h2>
        <SummaryCards results={results} />
      </section>

      {/* Comparison Charts */}
      <section className="panel-section">
        <h2 className="section-title">📈 Detailed Analysis</h2>
        <ComparisonCharts results={results} />
      </section>

      {/* Graph List */}
      <section className="panel-section">
        <h2 className="section-title">📋 Graphs List</h2>
        <div className="graphs-list">
          {results.perGraph.map((graph, idx) => (
            <div
              key={graph.graph_index}
              className={`graph-list-item ${selectedGraph === idx ? 'selected' : ''}`}
              onClick={() => onSelectGraph(idx)}
            >
              <div className="graph-item-header">
                <span className="graph-name">Graph {graph.graph_index}</span>
                <span className="graph-badge">${(graph.stats?.final_cost || 0).toFixed(2)}</span>
              </div>
              <div className="graph-item-details">
                <div className="detail">
                  <span className="label">Iterations:</span>
                  <span className="value">{graph.stats?.iterations || 0}</span>
                </div>
                <div className="detail">
                  <span className="label">Time:</span>
                  <span className="value">{(graph.stats?.time_ms || 0).toFixed(0)}ms</span>
                </div>
                <div className="detail">
                  <span className="label">Routes:</span>
                  <span className="value">{graph.stats?.total_routes || 0}</span>
                </div>
              </div>
              {/* ✅ FIXED: Show MIREA samples count */}
              {graph.mirea_metric_samples && graph.mirea_metric_samples.length > 0 && (
                <div className="mirea-badge">
                  📡 {graph.mirea_metric_samples.length} samples
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}