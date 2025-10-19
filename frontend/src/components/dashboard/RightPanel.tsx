import type { ProcessResponse, TabType } from '../../types';

interface RightPanelProps {
  results: ProcessResponse;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedGraph: number | null;
}

export function RightPanel({ results, activeTab, onTabChange, selectedGraph }: RightPanelProps) {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'metrics', label: 'Metrics', icon: '📊' },
    { id: 'visualization', label: 'Visualization', icon: '🔮' },
    { id: 'maps', label: 'Maps', icon: '🗺️' },
  ];

  return (
    <div className="right-panel">
      <div className="tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'metrics' && (
          <div className="metrics-tab">
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Graph</th>
                    <th>Classical Time</th>
                    <th>Quantum Time</th>
                    <th>Speedup</th>
                    <th>Classical Dist</th>
                    <th>Quantum Dist</th>
                  </tr>
                </thead>
                <tbody>
                  {results.perGraph.map((g) => (
                    <tr key={g.graph_index} className={selectedGraph === g.graph_index ? 'selected-row' : ''}>
                      <td className="graph-id">
                        <span className="badge">#{g.graph_index}</span>
                      </td>
                      <td>{typeof g.classical.enhanced.opt_time_ms === 'number' ? `${g.classical.enhanced.opt_time_ms.toFixed(0)}ms` : 'N/A'}</td>
                      <td>{typeof g.quantum.enhanced.opt_time_ms === 'number' ? `${g.quantum.enhanced.opt_time_ms.toFixed(0)}ms` : 'N/A'}</td>
                      <td>
                        <span className={`speedup-value ${g.compare.quantum_speedup > 1 ? 'positive' : 'negative'}`}>
                          {typeof g.compare.quantum_speedup === 'number' ? `${g.compare.quantum_speedup.toFixed(2)}x` : 'N/A'}
                        </span>
                      </td>
                      <td>{typeof g.classical.enhanced.total_distance === 'number' ? g.classical.enhanced.total_distance.toFixed(1) : 'N/A'}</td>
                      <td>{typeof g.quantum.enhanced.total_distance === 'number' ? g.quantum.enhanced.total_distance.toFixed(1) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'visualization' && (
          <div className="visualization-tab">
            <div className="info-card">
              <div className="info-icon">🔮</div>
              <h4>Interactive Visualization</h4>
              <p>Install <code>vis-network</code> to enable interactive graph visualization with highlighted routes.</p>
              <div className="code-snippet">
                <code>npm install vis-network vis-data</code>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maps' && (
          <div className="maps-tab">
            <div className="info-card">
              <div className="info-icon">🗺️</div>
              <h4>Yandex Maps Integration</h4>
              <p>Add latitude/longitude columns to your CSV to display routes on Yandex Maps with real-time traffic data.</p>
              <div className="example-section">
                <h5>Example CSV format:</h5>
                <div className="code-snippet">
                  <code>
                    node_id,latitude,longitude{`
`}
                    0,55.7558,37.6173{`
`}
                    1,55.7522,37.6156
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}