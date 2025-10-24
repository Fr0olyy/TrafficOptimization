// src/components/dashboard/RightPanel.tsx
import { useState } from 'react';
import type { ProcessResponse, TabType } from '../../types';
import {
  getTotalGraphs,
  getAverageQuantumTime,
  getTotalFinalCost,
  getMireaMetricsCount,
  getAverageIterations,
  formatTime,
  formatNumber,
} from '../../utils/calculations';
import './RightPanel.css';

interface RightPanelProps {
  results: ProcessResponse | null;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedGraph: number | null;
  onGraphSelect?: (graphIndex: number | null) => void;
}

export function RightPanel({
  results,
  activeTab,
  onTabChange,
  selectedGraph,
  onGraphSelect,
}: RightPanelProps) {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'metrics', label: 'Metrics', icon: '📊' },
    { id: 'routes', label: 'Routes', icon: '🛣️' },
    { id: 'visualization', label: 'Visualization', icon: '🔍' },
    { id: 'maps', label: 'Maps', icon: '🗺️' },
  ];

  if (!results) {
    return (
      <div className="right-panel">
        <div className="panel-content">
          <p className="text-center text-gray-400">⏳ Waiting for results...</p>
        </div>
      </div>
    );
  }

  const renderMetrics = () => {
    if (selectedGraph === null) {
      return (
        <div className="metrics-section">
          <h3 className="section-title">📊 Overall Summary</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total Graphs</div>
              <div className="metric-value">{getTotalGraphs(results)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Final Cost</div>
              <div className="metric-value">{formatNumber(getTotalFinalCost(results), 2)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Avg Time (ms)</div>
              <div className="metric-value">
                {formatNumber(getAverageQuantumTime(results), 0)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">MIREA Samples</div>
              <div className="metric-value">{getMireaMetricsCount(results)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Avg Iterations</div>
              <div className="metric-value">
                {formatNumber(getAverageIterations(results), 0)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Time</div>
              <div className="metric-value">{formatTime(results.elapsed_ms)}</div>
            </div>
          </div>

          <h3 className="section-title mt-6">📈 Graphs List</h3>
          <div className="graphs-list">
            {results.perGraph?.map((graph) => (
              <div
                key={graph.graph_index}
                className={`graph-item ${selectedGraph === graph.graph_index ? 'selected' : ''}`}
                onClick={() => onGraphSelect?.(graph.graph_index)}
              >
                <div className="graph-header">
                  <span className="graph-name">Graph {graph.graph_index}</span>
                  <span className="graph-cost">${graph.stats?.final_cost?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="graph-details">
                  <span>Routes: {graph.stats?.total_routes || 0}</span>
                  <span>Time: {formatTime(graph.stats?.time_ms || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ✅ FIXED: Get graph safely
    const graph = results.perGraph?.[selectedGraph];
    if (!graph) {
      return (
        <div className="error-section">
          <p>❌ Graph data not found</p>
        </div>
      );
    }

    return (
      <div className="metrics-section">
        <div className="graph-header-large">
          <h3>Graph #{graph.graph_index} Details</h3>
          <button
            className="close-btn"
            onClick={() => onGraphSelect?.(null)}
          >
            ✕
          </button>
        </div>

        <div className="detailed-metrics">
          <div className="metric-row">
            <span className="metric-key">Final Cost</span>
            <span className="metric-val-large">
              ${graph.stats?.final_cost?.toFixed(2) || 'N/A'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-key">Iterations</span>
            <span className="metric-val">{graph.stats?.iterations || 0}</span>
          </div>
          <div className="metric-row">
            <span className="metric-key">Execution Time</span>
            <span className="metric-val">{formatTime(graph.stats?.time_ms || 0)}</span>
          </div>
          <div className="metric-row">
            <span className="metric-key">Total Routes</span>
            <span className="metric-val">{graph.stats?.total_routes || 0}</span>
          </div>
          <div className="metric-row border-t">
            <span className="metric-key">MIREA Samples</span>
            <span className="metric-val highlight">
              {graph.mirea_metric_samples?.length || 0}
            </span>
          </div>
        </div>

        {/* ✅ MIREA Metrics Details */}
        {graph.mirea_metric_samples && graph.mirea_metric_samples.length > 0 && (
          <div className="mirea-section">
            <h4 className="section-title">📡 MIREA Quantum Metrics</h4>
            <div className="mirea-samples">
              {graph.mirea_metric_samples.slice(0, 10).map((sample, idx) => (
                <div key={idx} className="mirea-item">
                  <div className="mirea-header">
                    <span className="route-badge">Route {sample.route_index_sampled}</span>
                    <span className={`status-badge ${sample.mirea_metrics.success ? 'success' : 'failed'}`}>
                      {sample.mirea_metrics.success ? '✅ Success' : '❌ Failed'}
                    </span>
                  </div>
                  <div className="mirea-details">
                    <div>Time: {sample.mirea_metrics.time.toFixed(2)}ms</div>
                    <div>Shots: {sample.mirea_metrics.shots}</div>
                    <div>Algorithm: {sample.mirea_metrics.algorithm}</div>
                  </div>
                </div>
              ))}
              {(graph.mirea_metric_samples?.length || 0) > 10 && (
                <div className="more-items">
                  ... and {(graph.mirea_metric_samples?.length || 0) - 10} more samples
                </div>
              )}
            </div>
          </div>
        )}

        {/* Parameters */}
        <div className="parameters-section mt-4">
          <h4 className="section-title">⚙️ Processing Parameters</h4>
          <div className="param-list">
            <div className="param-item">
              <span>Solver Iterations:</span>
              <span className="param-val">{results.parameters.solver_iterations}</span>
            </div>
            <div className="param-item">
              <span>Reroute Fraction:</span>
              <span className="param-val">{results.parameters.reroute_fraction.toFixed(2)}</span>
            </div>
            <div className="param-item">
              <span>MIREA Samples Requested:</span>
              <span className="param-val">{results.summary.mirea_samples_requested}</span>
            </div>
            <div className="param-item">
              <span>Total Graphs:</span>
              <span className="param-val">{results.summary.total_graphs}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="right-panel">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="panel-content">
        {activeTab === 'metrics' && renderMetrics()}

        {activeTab === 'routes' && (
          <div className="routes-section">
            <h3 className="section-title">🛣️ Optimized Routes</h3>
            <p className="text-center text-gray-400">Route optimization details will be displayed here</p>
          </div>
        )}

        {activeTab === 'visualization' && (
          <div className="visualization-section">
            <h3 className="section-title">🔍 Graph Visualization</h3>
            <p className="text-center text-gray-400">Graph visualization will be displayed here</p>
          </div>
        )}

        {activeTab === 'maps' && (
          <div className="maps-section">
            <h3 className="section-title">🗺️ Map View</h3>
            <p className="text-center text-gray-400">Map visualization will be displayed here</p>
          </div>
        )}
      </div>
    </div>
  );
}