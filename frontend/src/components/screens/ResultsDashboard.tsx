import { useState, useMemo } from 'react';
import { Download, RefreshCw, Timer, Zap, TrendingDown, BarChart3 } from 'lucide-react';
import type { ProcessResponse } from '../../types';
import { calculateAverageSpeedup, calculateAverageImprovement } from '../../utils/calculations';
import { GraphVisualization } from '../visualization/GraphVisualization';
import { YandexMapsVisualization } from '../visualization/YandexMapsVisualization';
import { generateGraphCoordinates, generateCircularCoordinates } from '../../utils/coordinateGenerator';
import { RoutesList } from '../dashboard/RoutesList';  // ⭐ NEW IMPORT

interface ResultsDashboardProps {
  results: ProcessResponse;
  filename: string;
  onNewAnalysis: () => void;
  onDownloadClassical: () => void;
  onDownloadQuantum: () => void;
}

export function ResultsDashboard({
  results,
  filename,
  onNewAnalysis,
  onDownloadClassical,
  onDownloadQuantum,
}: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'routes' | 'visualization' | 'maps'>('metrics');  // ⭐ добавил routes
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [selectedGraphIndex, setSelectedGraphIndex] = useState(0);

  const avgSpeedup = calculateAverageSpeedup(results);
  const avgImprovement = calculateAverageImprovement(results);

  const currentGraph = results.perGraph[selectedGraphIndex];

  // Подготовка данных для GraphVisualization
  const graphData = useMemo(() => {
    if (!currentGraph) return null;

    const numNodes = currentGraph.num_nodes || 100;
    
    const nodes = Array.from({ length: numNodes }, (_, i) => ({
      id: i,
      label: `${i}`
    }));

    const edges: Array<{ from: number; to: number; weight: number }> = [];
    const edgeSet = new Set<string>();

    // ⭐ UPDATED: Собираем рёбра из routes если они есть
    if (currentGraph.routes) {
      currentGraph.routes.forEach(route => {
        const path = route.quantum.path;
        for (let i = 0; i < path.length - 1; i++) {
          const from = Math.min(path[i], path[i + 1]);
          const to = Math.max(path[i], path[i + 1]);
          const key = `${from}-${to}`;
          if (!edgeSet.has(key) && from < numNodes && to < numNodes) {
            edgeSet.add(key);
            edges.push({ from, to, weight: 1 });
          }
        }
      });
    }

    // Fallback: старый способ из routes_optimized
    const addEdgesFromRoutes = (routes: number[][] | undefined) => {
      if (!routes) return;
      routes.forEach((route: number[]) => {
        for (let i = 0; i < route.length - 1; i++) {
          const from = Math.min(route[i], route[i + 1]);
          const to = Math.max(route[i], route[i + 1]);
          const key = `${from}-${to}`;
          if (!edgeSet.has(key) && from < numNodes && to < numNodes) {
            edgeSet.add(key);
            edges.push({ from, to, weight: 1 });
          }
        }
      });
    };

    if (edges.length === 0) {
      addEdgesFromRoutes(currentGraph.classical?.enhanced?.routes_optimized);
      addEdgesFromRoutes(currentGraph.quantum?.enhanced?.routes_optimized);
    }

    return { nodes, edges };
  }, [currentGraph]);

  // ⭐ UPDATED: Пути из routes или fallback
  const classicalPath = useMemo(() => {
    return currentGraph?.classical?.enhanced?.routes_optimized?.[0] || [];
  }, [currentGraph]);

  const quantumPath = useMemo(() => {
    if (currentGraph?.routes && currentGraph.routes.length > 0) {
      return currentGraph.routes[0].quantum.path;
    }
    return currentGraph?.quantum?.enhanced?.routes_optimized?.[0] || [];
  }, [currentGraph]);

  // Генерация координат автоматически
  const coordinates = useMemo(() => {
    if (!graphData) return [];

    const seed = currentGraph?.graph_index || 0;

    if (graphData.edges.length > 0) {
      return generateGraphCoordinates(graphData.nodes, graphData.edges, {
        centerLat: 55.7558,
        centerLon: 37.6173,
        radiusKm: 8,
        seed: seed + 42
      });
    } else {
      return generateCircularCoordinates(graphData.nodes, {
        centerLat: 55.7558,
        centerLon: 37.6173,
        radiusKm: 5
      });
    }
  }, [graphData, currentGraph]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Top Bar */}
      <div className="glass-effect sticky top-0 z-10 px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-quantum)' }}>
              <span className="text-2xl">⚛️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">Quantum Traffic Optimizer</h1>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {filename} • {(results.elapsed_ms / 1000).toFixed(2)}s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNewAnalysis}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80"
              style={{ background: 'rgba(102, 126, 234, 0.2)', color: 'var(--color-primary)' }}>
              <RefreshCw className="w-4 h-4" />
              New Analysis
            </button>

            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
                <Download className="w-4 h-4" />
                Download
              </button>

              {showDownloadMenu && (
                <div className="absolute right-0 mt-2 w-48 glass-effect rounded-lg border shadow-xl overflow-hidden"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <button
                    onClick={() => { onDownloadClassical(); setShowDownloadMenu(false); }}
                    className="w-full px-4 py-2 text-left hover:bg-white hover:bg-opacity-5 transition-colors text-sm">
                    Classical CSV
                  </button>
                  <button
                    onClick={() => { onDownloadQuantum(); setShowDownloadMenu(false); }}
                    className="w-full px-4 py-2 text-left hover:bg-white hover:bg-opacity-5 transition-colors text-sm">
                    Quantum CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Left Panel - 40% */}
        <div className="w-[40%] p-6 space-y-6 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Time */}
            <div className="glass-effect rounded-xl p-5 hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                  <Timer className="w-6 h-6" style={{ color: 'var(--color-classical)' }} />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 font-mono gradient-text">
                {(results.elapsed_ms / 1000).toFixed(2)}s
              </div>
              <div className="text-sm font-medium">Total Processing Time</div>
            </div>

            {/* Quantum Speedup */}
            <div className="glass-effect rounded-xl p-5 hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: avgSpeedup > 1 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
                  <Zap className="w-6 h-6" style={{ color: avgSpeedup > 1 ? 'var(--color-success)' : 'var(--color-error)' }} />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 font-mono"
                style={{ color: avgSpeedup > 1 ? 'var(--color-success)' : 'var(--color-error)' }}>
                {avgSpeedup.toFixed(2)}x
              </div>
              <div className="text-sm font-medium">Quantum Speedup</div>
            </div>

            {/* Distance Improvement */}
            <div className="glass-effect rounded-xl p-5 hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                  <TrendingDown className="w-6 h-6" style={{ color: 'var(--color-quantum)' }} />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 font-mono gradient-text">
                {avgImprovement.toFixed(1)}%
              </div>
              <div className="text-sm font-medium">Route Optimization</div>
            </div>

            {/* ⭐ NEW: Routes Stats Card */}
            <div className="glass-effect rounded-xl p-5 hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                  <BarChart3 className="w-6 h-6" style={{ color: 'var(--color-quantum)' }} />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 font-mono gradient-text">
                {currentGraph.stats?.successful || results.perGraph.length}/{currentGraph.stats?.total_routes || 'N/A'}
              </div>
              <div className="text-sm font-medium">Routes Processed</div>
              {currentGraph.stats && (
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  {((currentGraph.stats.successful / currentGraph.stats.total_routes) * 100).toFixed(1)}% success
                </div>
              )}
            </div>
          </div>

          {/* Graph Selector */}
          {results.perGraph.length > 1 && (
            <div className="glass-effect rounded-xl p-4">
              <label className="text-sm font-medium mb-2 block">Select Graph:</label>
              <select
                value={selectedGraphIndex}
                onChange={(e) => setSelectedGraphIndex(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                {results.perGraph.map((g, idx) => (
                  <option key={idx} value={idx}>
                    Graph {g.graph_index} ({g.num_nodes} nodes)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Panel - 60% */}
        <div className="w-[60%] p-6 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {/* ⭐ UPDATED: Tabs с routes */}
          <div className="flex gap-2 mb-6 border-b pb-2" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            {(['metrics', 'routes', 'visualization', 'maps'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition-all relative ${
                  activeTab === tab ? '' : 'opacity-50 hover:opacity-75'
                }`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--color-primary)' }}></div>
                )}
              </button>
            ))}
          </div>

          {/* Metrics Table */}
          {activeTab === 'metrics' && (
            <div className="glass-effect rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Detailed Metrics</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <th className="text-left py-3 px-4">Graph</th>
                      <th className="text-right py-3 px-4">Class Time</th>
                      <th className="text-right py-3 px-4">Quant Time</th>
                      <th className="text-right py-3 px-4">Speedup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.perGraph.map((g) => (
                      <tr key={g.graph_index} className="border-b hover:bg-white hover:bg-opacity-5 transition-colors"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                        <td className="py-3 px-4 font-medium">Graph {g.graph_index}</td>
                        <td className="text-right py-3 px-4 font-mono">
                          {typeof g.classical?.enhanced?.opt_time_ms === 'number'
                            ? g.classical.enhanced.opt_time_ms.toFixed(0) + 'ms'
                            : 'N/A'}
                        </td>
                        <td className="text-right py-3 px-4 font-mono" style={{ color: 'var(--color-quantum)' }}>
                          {typeof g.quantum?.enhanced?.opt_time_ms === 'number'
                            ? g.quantum.enhanced.opt_time_ms.toFixed(0) + 'ms'
                            : 'N/A'}
                        </td>
                        <td className="text-right py-3 px-4 font-mono font-semibold"
                          style={{ color: g.compare?.quantum_speedup > 1 ? 'var(--color-success)' : 'var(--color-error)' }}>
                          {typeof g.compare?.quantum_speedup === 'number'
                            ? g.compare.quantum_speedup.toFixed(2) + 'x'
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ⭐ NEW: Routes Tab */}
          {activeTab === 'routes' && (
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Detailed Routes</h3>
                  {currentGraph.stats && (
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {currentGraph.stats.successful} successful routes from {currentGraph.stats.total_routes} total
                    </p>
                  )}
                </div>
                
                {currentGraph.stats && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div style={{ color: 'var(--color-text-tertiary)' }}>Total Time</div>
                      <div className="font-mono font-bold" style={{ color: 'var(--color-quantum)' }}>
                        {(currentGraph.stats.pure_quantum_time * 1000).toFixed(2)}ms
                      </div>
                    </div>
                    <div className="text-right">
                      <div style={{ color: 'var(--color-text-tertiary)' }}>Avg per Route</div>
                      <div className="font-mono font-bold">
                        {((currentGraph.stats.pure_quantum_time / currentGraph.stats.successful) * 1000).toFixed(2)}ms
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {currentGraph.routes ? (
                <RoutesList 
                  routes={currentGraph.routes}
                  onRouteSelect={(route) => {
                    console.log('Selected route:', route);
                  }}
                />
              ) : (
                <div className="glass-effect rounded-xl p-8 text-center">
                  <p style={{ color: 'var(--color-text-secondary)' }}>No routes data available for this graph</p>
                </div>
              )}
            </div>
          )}

          {/* Visualization Tab */}
          {activeTab === 'visualization' && graphData && (
            <GraphVisualization
              graphData={graphData}
              classicalPath={classicalPath}
              quantumPath={quantumPath}
            />
          )}

          {/* Maps Tab */}
          {activeTab === 'maps' && (
            <YandexMapsVisualization
              apiKey="bbbcfa5a-fe28-4f09-aa62-dece34cbc32d"
              coordinates={coordinates}
              classicalRoute={classicalPath}
              quantumRoute={quantumPath}
            />
          )}
        </div>
      </div>
    </div>
  );
}