import { useState, useMemo } from 'react';
import { Download, RefreshCw, Timer, Zap, TrendingDown, BarChart3 } from 'lucide-react';
import type { ProcessResponse } from '../../types';
import { calculateAverageSpeedup, calculateAverageImprovement } from '../../utils/calculations';
import { GraphVisualization } from '../visualization/GraphVisualization';
import { YandexMapsVisualization } from '../visualization/YandexMapsVisualization';
import { generateGraphCoordinates, generateCircularCoordinates } from '../../utils/coordinateGenerator';
import { RoutesList } from '../dashboard/RoutesList';

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
  const [activeTab, setActiveTab] = useState<'metrics' | 'routes' | 'visualization' | 'maps'>('metrics');
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

    // Собираем рёбра из routes если они есть
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

  // Пути из routes или fallback
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
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}
            >
              <span className="text-2xl text-white">⚛️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#003274' }}>UrbanQ</h1>
              <p className="text-xs text-gray-600">
                {filename} • {(results.elapsed_ms / 1000).toFixed(2)}s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNewAnalysis}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80 border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              New Analysis
            </button>

            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-90 text-white"
                style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}
              >
                <Download className="w-4 h-4" />
                Download
              </button>

              {showDownloadMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                  <button
                    onClick={() => { onDownloadClassical(); setShowDownloadMenu(false); }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700"
                  >
                    Classical CSV
                  </button>
                  <button
                    onClick={() => { onDownloadQuantum(); setShowDownloadMenu(false); }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700"
                  >
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
        <div className="w-[40%] p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Time */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}
                >
                  <Timer className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 font-mono" style={{ color: '#003274' }}>
                {(results.elapsed_ms / 1000).toFixed(2)}s
              </div>
              <div className="text-sm font-medium text-gray-600">Total Processing Time</div>
            </div>

            {/* Quantum Speedup */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ 
                    background: avgSpeedup > 1 
                      ? 'linear-gradient(135deg, #56C02B, #059669)' 
                      : 'linear-gradient(135deg, #E20072, #dc2626)'
                  }}
                >
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
              <div 
                className="text-3xl font-bold mb-1 font-mono"
                style={{ color: avgSpeedup > 1 ? '#56C02B' : '#E20072' }}
              >
                {avgSpeedup.toFixed(2)}x
              </div>
              <div className="text-sm font-medium text-gray-600">Quantum Speedup</div>
            </div>

            {/* Distance Improvement */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #259789, #0d9488)' }}
                >
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 font-mono" style={{ color: '#003274' }}>
                {avgImprovement.toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-gray-600">Route Optimization</div>
            </div>

            {/* Routes Stats Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #15256D, #003274)' }}
                >
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 font-mono" style={{ color: '#003274' }}>
                {currentGraph.stats?.successful || results.perGraph.length}/{currentGraph.stats?.total_routes || 'N/A'}
              </div>
              <div className="text-sm font-medium text-gray-600">Routes Processed</div>
              {currentGraph.stats && (
                <div className="text-xs mt-1 text-gray-500">
                  {((currentGraph.stats.successful / currentGraph.stats.total_routes) * 100).toFixed(1)}% success
                </div>
              )}
            </div>
          </div>

          {/* Graph Selector */}
          {results.perGraph.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <label className="text-sm font-medium mb-2 block text-gray-700">Select Graph:</label>
              <select
                value={selectedGraphIndex}
                onChange={(e) => setSelectedGraphIndex(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg text-sm border border-gray-300 bg-white text-gray-700"
              >
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
        <div className="w-[60%] p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {/* Tabs с routes */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
            {(['metrics', 'routes', 'visualization', 'maps'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition-all relative ${
                  activeTab === tab 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: '#003274' }}
                  ></div>
                )}
              </button>
            ))}
          </div>

          {/* Metrics Table */}
          {activeTab === 'metrics' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Detailed Metrics</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-gray-700 font-semibold">Graph</th>
                      <th className="text-right py-3 px-4 text-gray-700 font-semibold">Class Time</th>
                      <th className="text-right py-3 px-4 text-gray-700 font-semibold">Quant Time</th>
                      <th className="text-right py-3 px-4 text-gray-700 font-semibold">Speedup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.perGraph.map((g) => (
                      <tr key={g.graph_index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-800">Graph {g.graph_index}</td>
                        <td className="text-right py-3 px-4 font-mono text-gray-600">
                          {typeof g.classical?.enhanced?.opt_time_ms === 'number'
                            ? g.classical.enhanced.opt_time_ms.toFixed(0) + 'ms'
                            : 'N/A'}
                        </td>
                        <td className="text-right py-3 px-4 font-mono" style={{ color: '#4495D1' }}>
                          {typeof g.quantum?.enhanced?.opt_time_ms === 'number'
                            ? g.quantum.enhanced.opt_time_ms.toFixed(0) + 'ms'
                            : 'N/A'}
                        </td>
                        <td 
                          className="text-right py-3 px-4 font-mono font-semibold"
                          style={{ color: g.compare?.quantum_speedup > 1 ? '#56C02B' : '#E20072' }}
                        >
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

          {/* Routes Tab */}
          {activeTab === 'routes' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Detailed Routes</h3>
                  {currentGraph.stats && (
                    <p className="text-sm mt-1 text-gray-600">
                      {currentGraph.stats.successful} successful routes from {currentGraph.stats.total_routes} total
                    </p>
                  )}
                </div>
                
                {currentGraph.stats && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="text-gray-500">Total Time</div>
                      <div className="font-mono font-bold" style={{ color: '#4495D1' }}>
                        {(currentGraph.stats.pure_quantum_time * 1000).toFixed(2)}ms
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500">Avg per Route</div>
                      <div className="font-mono font-bold text-gray-700">
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
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-gray-500">No routes data available for this graph</p>
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