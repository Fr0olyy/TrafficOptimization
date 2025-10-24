import { useState } from 'react';
import { GraphVisualization } from "../visualization/GraphVisualization";
import { YandexMapsVisualization } from "../visualization/YandexMapsVisualization";
import type { ProcessResponse, TabType } from "../../types";
import './RightPanel.css';

interface RightPanelProps {
  results: ProcessResponse;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedGraph: number | null;
}

export function RightPanel({
  results,
  activeTab,
  onTabChange,
  selectedGraph,
}: RightPanelProps) {
  const [isLoading, setIsLoading] = useState(false);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "metrics", label: "Metrics", icon: "📊" },
    { id: "routes", label: "Routes", icon: "🛣️" },
    { id: "visualization", label: "Graph View", icon: "🔍" },
    { id: "maps", label: "Map View", icon: "🗺️" },
  ];

  // Mock graph data - replace with actual data from your backend
  const graphData = {
    nodes: Array.from({ length: 10 }, (_, i) => ({ 
      id: i, 
      label: `Node ${i}`
    })),
    edges: [
      { from: 0, to: 1, weight: 10 },
      { from: 0, to: 2, weight: 15 },
      { from: 1, to: 3, weight: 12 },
      { from: 2, to: 3, weight: 10 },
      { from: 3, to: 4, weight: 8 },
      { from: 4, to: 5, weight: 9 },
      { from: 5, to: 6, weight: 11 },
      { from: 6, to: 7, weight: 7 },
      { from: 7, to: 8, weight: 13 },
      { from: 8, to: 9, weight: 6 },
    ],
  };

  const coordinates = [
    { id: 0, lat: 55.7558, lon: 37.6173, label: "Kremlin" },
    { id: 1, lat: 55.7522, lon: 37.6156, label: "Red Square" },
    { id: 2, lat: 55.7489, lon: 37.6201, label: "GUM" },
    { id: 3, lat: 55.7508, lon: 37.6170, label: "St. Basil's" },
    { id: 4, lat: 55.7575, lon: 37.6190, label: "Bolshoi" },
    { id: 5, lat: 55.7605, lon: 37.6186, label: "Lubjanka" },
    { id: 6, lat: 55.7635, lon: 37.6215, label: "KGB Museum" },
    { id: 7, lat: 55.7665, lon: 37.6250, label: "Pushkin Sq" },
    { id: 8, lat: 55.7690, lon: 37.6300, label: "Tverskaya" },
    { id: 9, lat: 55.7720, lon: 37.6350, label: "Mayakovskaya" },
  ];

  // Получаем пути из данных или используем mock данные
  const getClassicalPath = (): number[] => {
    if (selectedGraph !== null && results.perGraph[selectedGraph]?.routes?.[0]?.mirea?.path) {
      return results.perGraph[selectedGraph].routes[0].mirea.path;
    }
    return [0, 1, 3, 4]; // fallback path
  };

  const getQuantumPath = (): number[] => {
    if (selectedGraph !== null && results.perGraph[selectedGraph]?.routes?.[0]?.quantum?.path) {
      return results.perGraph[selectedGraph].routes[0].quantum.path;
    }
    return [0, 2, 3, 4]; // fallback path
  };

  const handleTabChange = (tab: TabType) => {
    setIsLoading(true);
    onTabChange(tab);
    setTimeout(() => setIsLoading(false), 500);
  };

  const renderMetricsTable = () => {
    if (selectedGraph === null) {
      const avgSpeedup = results.perGraph.length > 0 
        ? results.perGraph.reduce((acc, g) => acc + g.compare.quantum_speedup, 0) / results.perGraph.length
        : 0;

      return (
        <div className="metrics-overview">
          <h4 className="metrics-title">Overall Performance Summary</h4>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">⚡</div>
              <div className="metric-content">
                <div className="metric-value">
                  {avgSpeedup.toFixed(2)}x
                </div>
                <div className="metric-label">Average Speedup</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">📈</div>
              <div className="metric-content">
                <div className="metric-value">
                  {results.perGraph.filter(g => g.compare.quantum_speedup > 1).length}
                </div>
                <div className="metric-label">Quantum Advantages</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">⏱️</div>
              <div className="metric-content">
                <div className="metric-value">
                  {results.elapsed_ms}ms
                </div>
                <div className="metric-label">Total Processing</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const graph = results.perGraph[selectedGraph];
    return (
      <div className="detailed-metrics">
        <div className="metrics-header">
          <h4>Graph {graph.graph_index + 1} - Detailed Analysis</h4>
          <div className={`performance-badge ${graph.compare.quantum_speedup > 1 ? 'positive' : 'neutral'}`}>
            {graph.compare.quantum_speedup > 1 ? 'Quantum Advantage' : 'Classical Optimal'}
          </div>
        </div>

        <div className="metrics-comparison">
          <div className="algorithm-metrics classical">
            <h5>Classical Algorithm</h5>
            <div className="metric-row">
              <span>Distance:</span>
              <strong>{graph.classical.enhanced.total_distance.toFixed(2)}</strong>
            </div>
            <div className="metric-row">
              <span>Time:</span>
              <strong>{graph.classical.enhanced.opt_time_ms}ms</strong>
            </div>
            <div className="metric-row">
              <span>Routes:</span>
              <strong>{graph.stats?.successful || 0} successful</strong>
            </div>
          </div>

          <div className="algorithm-metrics quantum">
            <h5>Quantum Algorithm</h5>
            <div className="metric-row">
              <span>Distance:</span>
              <strong className="quantum-value">{graph.quantum.enhanced.total_distance.toFixed(2)}</strong>
            </div>
            <div className="metric-row">
              <span>Time:</span>
              <strong className="quantum-value">{graph.quantum.enhanced.opt_time_ms}ms</strong>
            </div>
            <div className="metric-row">
              <span>Routes:</span>
              <strong className="quantum-value">{graph.stats?.processed_routes || 0} processed</strong>
            </div>
          </div>
        </div>

        <div className="speedup-analysis">
          <h5>Performance Analysis</h5>
          <div className="analysis-grid">
            <div className="analysis-item">
              <span>Speedup Factor:</span>
              <strong className={graph.compare.quantum_speedup > 1 ? 'positive' : 'neutral'}>
                {graph.compare.quantum_speedup.toFixed(2)}x
              </strong>
            </div>
            <div className="analysis-item">
              <span>Time Delta:</span>
              <strong className="positive">
                {graph.compare.delta_ms}ms
              </strong>
            </div>
            <div className="analysis-item">
              <span>Success Rate:</span>
              <strong className="positive">
                {graph.stats ? ((graph.stats.successful / graph.stats.total_routes) * 100).toFixed(1) : '0'}%
              </strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRoutesTable = () => {
    if (selectedGraph === null) {
      return (
        <div className="no-selection">
          <div className="no-selection-icon">🛣️</div>
          <h4>Select a Graph to View Routes</h4>
          <p>Choose a graph from the left panel to see detailed route information</p>
        </div>
      );
    }

    const graph = results.perGraph[selectedGraph];
    const routes = graph.routes || [];

    return (
      <div className="routes-tab">
        <div className="routes-header">
          <h4>Route Details - Graph {graph.graph_index + 1}</h4>
          <div className="routes-stats">
            <span className="stat-item">
              <strong>{routes.length}</strong> routes
            </span>
            <span className="stat-item">
              <strong>{graph.stats?.successful || 0}</strong> successful
            </span>
          </div>
        </div>

        <div className="routes-list">
          {routes.map((route, index) => (
            <div key={index} className="route-card">
              <div className="route-header">
                <span className="route-title">Route {route.route_index + 1}</span>
                <span className="route-endpoints">
                  {route.start} → {route.end}
                </span>
              </div>
              
              <div className="route-comparison">
                <div className="route-algorithm quantum">
                  <h6>Quantum Solution</h6>
                  <div className="route-details">
                    <span>Path: {route.quantum.path.join(' → ')}</span>
                    <span>Cost: {route.quantum.cost}</span>
                    <span>Time: {route.quantum.time}ms</span>
                    <span>Qubits: {route.quantum.qubits}</span>
                  </div>
                </div>
                
                {route.mirea && (
                  <div className="route-algorithm classical">
                    <h6>Classical Solution</h6>
                    <div className="route-details">
                      <span>Path: {route.mirea.path.join(' → ')}</span>
                      <span>Cost: {route.mirea.cost}</span>
                      <span>Time: {route.mirea.time}ms</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="right-panel">
      <div className="tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {activeTab === tab.id && <div className="tab-indicator" />}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading {tabs.find(t => t.id === activeTab)?.label}...</p>
          </div>
        ) : (
          <>
            {activeTab === "metrics" && (
              <div className="metrics-tab">
                {renderMetricsTable()}
              </div>
            )}

            {activeTab === "routes" && (
              <div className="routes-tab">
                {renderRoutesTable()}
              </div>
            )}

            {activeTab === "visualization" && (
              <GraphVisualization
                graphData={graphData}
                classicalPath={getClassicalPath()}
                quantumPath={getQuantumPath()}
              />
            )}

            {activeTab === "maps" && (
              <YandexMapsVisualization
                apiKey="bbbcfa5a-fe28-4f09-aa62-dece34cbc32d"
                coordinates={coordinates}
                classicalRoute={getClassicalPath()}
                quantumRoute={getQuantumPath()}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}