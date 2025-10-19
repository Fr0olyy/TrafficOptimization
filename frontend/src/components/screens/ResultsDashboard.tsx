import { useState } from 'react';
import { Download, RefreshCw, Timer, Zap, TrendingDown, BarChart3 } from 'lucide-react';
import type { ProcessResponse } from '../../types';
import { calculateAverageSpeedup, calculateAverageImprovement } from '../../utils/calculations';
import { GraphVisualization } from '../visualization/GraphVisualization';
import { YandexMapsVisualization } from '../visualization/YandexMapsVisualization';

// --- mock for demo, заменяй на реальные данные:
const sampleGraph = {
  nodes: [
    { id: 0, label: 'A' }, { id: 1, label: 'B' }, { id: 2, label: 'C' }, { id: 3, label: 'D' }
  ],
  edges: [
    { from: 0, to: 1, weight: 6 },
    { from: 0, to: 2, weight: 8 },
    { from: 1, to: 2, weight: 12 },
    { from: 2, to: 3, weight: 5 }
  ]
};
const sampleCoords = [
  { id: 0, lat: 55.7558, lon: 37.6173, label: 'A' },
  { id: 1, lat: 55.7522, lon: 37.6156, label: 'B' },
  { id: 2, lat: 55.7489, lon: 37.6201, label: 'C' },
  { id: 3, lat: 55.7525, lon: 37.6279, label: 'D' }
];
const classicalPath = [0, 1, 2, 3];
const quantumPath = [0, 2, 3];

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
  const [activeTab, setActiveTab] = useState<'metrics' | 'visualization' | 'maps'>('metrics');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const avgSpeedup = calculateAverageSpeedup(results);
  const avgImprovement = calculateAverageImprovement(results);

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
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                End-to-end optimization
              </div>
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
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                Average across all graphs
              </div>
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
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                Distance improvement
              </div>
            </div>
            {/* Graphs Analyzed */}
            <div className="glass-effect rounded-xl p-5 hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                  <BarChart3 className="w-6 h-6" style={{ color: 'var(--color-quantum)' }} />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 font-mono gradient-text">
                {results.perGraph.length}
              </div>
              <div className="text-sm font-medium">Graphs Analyzed</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                Successfully processed
              </div>
            </div>
          </div>
        </div>
        {/* Right Panel - 60% */}
        <div className="w-[60%] p-6 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b pb-2" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            {['metrics', 'visualization', 'maps'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
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
                        <td className="py-3 px-4 font-medium">{g.graph_index}</td>
                        <td className="text-right py-3 px-4 font-mono">
                          {typeof g.classical.enhanced.opt_time_ms === 'number'
                            ? g.classical.enhanced.opt_time_ms.toFixed(0) + 'ms'
                            : 'N/A'}
                        </td>
                        <td className="text-right py-3 px-4 font-mono" style={{ color: 'var(--color-quantum)' }}>
                          {typeof g.quantum.enhanced.opt_time_ms === 'number'
                            ? g.quantum.enhanced.opt_time_ms.toFixed(0) + 'ms'
                            : 'N/A'}
                        </td>
                        <td className="text-right py-3 px-4 font-mono font-semibold"
                          style={{ color: g.compare.quantum_speedup > 1 ? 'var(--color-success)' : 'var(--color-error)' }}>
                          {typeof g.compare.quantum_speedup === 'number'
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
          {activeTab === 'visualization' && (
            <GraphVisualization
              graphData={sampleGraph} // заменяй на свои реальные
              classicalPath={classicalPath}
              quantumPath={quantumPath}
            />
          )}
          {activeTab === 'maps' && (
            <YandexMapsVisualization
              apiKey="bbbcfa5a-fe28-4f09-aa62-dece34cbc32d"
              coordinates={sampleCoords} // заменяй на свои реальные
              classicalRoute={classicalPath}
              quantumRoute={quantumPath}
            />
          )}
        </div>
      </div>
    </div>
  );
}
