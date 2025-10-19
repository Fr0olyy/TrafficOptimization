import type { ProcessResponse, TabType } from '../../types';


interface RightPanelProps {
    results: ProcessResponse;
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    selectedGraph: number | null;
}

export function RightPanel({ results, activeTab, onTabChange }: RightPanelProps) {
    const tabs: { id: TabType; label: string }[] = [
        { id: 'metrics', label: 'Metrics' },
        { id: 'visualization', label: 'Visualization' },
        { id: 'maps', label: 'Maps' },
    ];

    return (
        <div className="p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`px-6 py-3 font-medium transition-colors relative ${activeTab === tab.id
                                ? 'text-primary'
                                : 'text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'metrics' && (
                    <div className="glass-effect rounded-xl p-6">
                        <h3 className="text-xl font-semibold mb-4">Detailed Metrics Table</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-3">Graph</th>
                                        <th className="text-right py-2 px-3">Class Time</th>
                                        <th className="text-right py-2 px-3">Quant Time</th>
                                        <th className="text-right py-2 px-3">Speedup</th>
                                        <th className="text-right py-2 px-3">Class Dist</th>
                                        <th className="text-right py-2 px-3">Quant Dist</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.perGraph.map(g => (
                                        <tr key={g.graph_index} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-2 px-3 font-medium">{g.graph_index}</td>
                                            <td className="text-right py-2 px-3 font-mono">
                                                {typeof g.classical.enhanced.opt_time_ms === 'number'
                                                    ? g.classical.enhanced.opt_time_ms.toFixed(0) + "ms"
                                                    : "N/A"
                                                }
                                            </td>
                                            <td className="text-right py-2 px-3 font-mono text-quantum">
                                                {typeof g.quantum.enhanced.opt_time_ms === 'number'
                                                    ? g.quantum.enhanced.opt_time_ms.toFixed(0) + "ms"
                                                    : "N/A"
                                                }
                                            </td>
                                            <td className={`text-right py-2 px-3 font-mono ${g.compare.quantum_speedup > 1 ? 'text-success' : 'text-error'}`}>
                                                {typeof g.compare.quantum_speedup === 'number'
                                                    ? g.compare.quantum_speedup.toFixed(2) + "x"
                                                    : "N/A"
                                                }
                                            </td>
                                            <td className="text-right py-2 px-3 font-mono">
                                                {typeof g.classical.enhanced.total_distance === 'number'
                                                    ? g.classical.enhanced.total_distance.toFixed(1)
                                                    : "N/A"
                                                }
                                            </td>
                                            <td className="text-right py-2 px-3 font-mono text-quantum">
                                                {typeof g.quantum.enhanced.total_distance === 'number'
                                                    ? g.quantum.enhanced.total_distance.toFixed(1)
                                                    : "N/A"
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'visualization' && (
                    <div className="glass-effect rounded-xl p-12 text-center">
                        <div className="text-6xl mb-6">📊</div>
                        <h3 className="text-2xl font-semibold mb-4">Graph Visualization</h3>
                        <p className="text-gray-400 mb-6 max-w-md mx-auto">
                            Install vis-network to enable interactive graph visualization with highlighted routes.
                        </p>
                        <code className="bg-bg-elevated px-4 py-2 rounded text-sm">
                            npm install vis-network vis-data
                        </code>
                    </div>
                )}

                {activeTab === 'maps' && (
                    <div className="glass-effect rounded-xl p-12 text-center">
                        <div className="text-6xl mb-6">🗺️</div>
                        <h3 className="text-2xl font-semibold mb-4">Geographic Visualization</h3>
                        <p className="text-gray-400 mb-6 max-w-md mx-auto">
                            Add latitude/longitude columns to your CSV to display routes on Yandex Maps with real-time traffic data.
                        </p>
                        <div className="text-left max-w-md mx-auto bg-bg-elevated rounded-lg p-4 text-sm">
                            <p className="mb-2 font-medium">Example CSV format:</p>
                            <pre className="text-xs text-gray-400">
                                node_id,latitude,longitude{'\n'}
                                0,55.7558,37.6173{'\n'}
                                1,55.7522,37.6156
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
