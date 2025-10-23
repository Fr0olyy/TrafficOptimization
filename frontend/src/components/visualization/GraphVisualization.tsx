import { useEffect, useRef, useState, useMemo } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Activity, Zap, Cpu, BarChart3 } from 'lucide-react';

interface GraphVisualizationProps {
  graphData: {
    nodes: Array<{ id: number; label?: string }>;
    edges: Array<{ from: number; to: number; weight: number }>;
  };
  classicalPath?: number[];
  quantumPath?: number[];
}

interface NodeLoad {
  id: number;
  load: number; // 0-1 value representing load
}

export function GraphVisualization({ 
  graphData, 
  classicalPath = [], 
  quantumPath = [] 
}: GraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [activeTab, setActiveTab] = useState<'graph' | 'heatmap'>('graph');
  const [simulationRunning, setSimulationRunning] = useState(false);

  // Generate simulated node load data for heatmap
  const nodeLoads = useMemo((): NodeLoad[] => {
    return graphData.nodes.map(node => ({
      id: node.id,
      load: Math.random() * 0.8 + 0.2 // Random load between 0.2 and 1.0
    }));
  }, [graphData.nodes]);

  // Calculate graph statistics for heatmap
  const graphStats = useMemo(() => {
    const totalNodes = graphData.nodes.length;
    const totalEdges = graphData.edges.length;
    const avgLoad = nodeLoads.reduce((sum, node) => sum + node.load, 0) / totalNodes;
    const maxLoad = Math.max(...nodeLoads.map(node => node.load));
    
    return { totalNodes, totalEdges, avgLoad, maxLoad };
  }, [graphData, nodeLoads]);

  // Get color for load value (green to red gradient)
  const getLoadColor = (load: number): string => {
    if (load < 0.3) return '#10b981'; // Green
    if (load < 0.6) return '#f59e0b'; // Yellow
    if (load < 0.8) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  // Get size for load value
  const getLoadSize = (load: number): number => {
    return 15 + (load * 15); // 15-30px based on load
  };

  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    if (activeTab === 'graph') {
      // Prepare nodes for graph visualization
      const nodes = new DataSet(
        graphData.nodes.map(node => ({
          id: node.id,
          label: node.label || `${node.id}`,
          shape: 'dot',
          size: 20,
          font: { color: '#1f2937', size: 14 },
          color: {
            background: '#667eea',
            border: '#8b5cf6',
            highlight: { background: '#8b5cf6', border: '#667eea' }
          }
        }))
      );

      // Prepare edges
      const edges = new DataSet(
        graphData.edges.map((edge, idx) => {
          const isInClassicalPath = classicalPath.length > 0 && 
            classicalPath.some((_, i) => 
              i < classicalPath.length - 1 && 
              ((classicalPath[i] === edge.from && classicalPath[i + 1] === edge.to) ||
               (classicalPath[i] === edge.to && classicalPath[i + 1] === edge.from))
            );

          const isInQuantumPath = quantumPath.length > 0 && 
            quantumPath.some((_, i) => 
              i < quantumPath.length - 1 && 
              ((quantumPath[i] === edge.from && quantumPath[i + 1] === edge.to) ||
               (quantumPath[i] === edge.to && quantumPath[i + 1] === edge.from))
            );

          return {
            id: idx,
            from: edge.from,
            to: edge.to,
            label: `${edge.weight}`,
            color: isInQuantumPath 
              ? { color: '#8b5cf6', highlight: '#667eea' }
              : isInClassicalPath
              ? { color: '#3b82f6', highlight: '#2563eb' }
              : { color: '#9ca3af', highlight: '#6b7280' },
            width: isInQuantumPath || isInClassicalPath ? 3 : 1,
            font: { 
              color: '#374151', 
              size: 12,
              background: 'rgba(255, 255, 255, 0.9)'
            }
          };
        })
      );

      const data = { nodes, edges };

      const options = {
        nodes: {
          borderWidth: 2,
          borderWidthSelected: 3,
        },
        edges: {
          smooth: {
            enabled: true,
            type: 'continuous',
            roundness: 0.5
          },
          arrows: {
            to: { enabled: false }
          }
        },
        physics: {
          enabled: true,
          stabilization: {
            enabled: true,
            iterations: 100,
            fit: true
          },
          barnesHut: {
            gravitationalConstant: -2000,
            centralGravity: 0.3,
            springLength: 95,
            springConstant: 0.04,
            damping: 0.09,
            avoidOverlap: 0.1
          }
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          zoomView: true,
          dragView: true
        },
        layout: {
          improvedLayout: true
        }
      };

      networkRef.current = new Network(containerRef.current, data, options);
    } else {
      // Prepare nodes for heatmap visualization
      const nodes = new DataSet(
        graphData.nodes.map(node => {
          const loadData = nodeLoads.find(n => n.id === node.id);
          const load = loadData?.load || 0.5;
          
          return {
            id: node.id,
            label: node.label || `${node.id}`,
            shape: 'dot',
            size: getLoadSize(load),
            font: { color: '#1f2937', size: 12, face: 'monospace' },
            color: {
              background: getLoadColor(load),
              border: '#1f2937',
              highlight: { background: getLoadColor(load), border: '#1f2937' }
            },
            title: `Node ${node.id}\nLoad: ${(load * 100).toFixed(1)}%`
          };
        })
      );

      // Prepare edges for heatmap (lighter and thinner)
      const edges = new DataSet(
        graphData.edges.map((edge, idx) => ({
          id: idx,
          from: edge.from,
          to: edge.to,
          color: { color: 'rgba(156, 163, 175, 0.3)', highlight: 'rgba(156, 163, 175, 0.5)' },
          width: 0.5,
          smooth: {
            enabled: true,
            type: 'continuous',
            roundness: 0.5
          }
        }))
      );

      const data = { nodes, edges };

      const options = {
        nodes: {
          borderWidth: 1,
          borderWidthSelected: 2,
        },
        edges: {
          smooth: {
            enabled: true,
            type: 'continuous',
            roundness: 0.5
          },
          arrows: {
            to: { enabled: false }
          }
        },
        physics: {
          enabled: true,
          stabilization: {
            enabled: true,
            iterations: 100,
            fit: true
          },
          barnesHut: {
            gravitationalConstant: -1500,
            centralGravity: 0.2,
            springLength: 100,
            springConstant: 0.03,
            damping: 0.1,
            avoidOverlap: 0.2
          }
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          zoomView: true,
          dragView: true
        }
      };

      networkRef.current = new Network(containerRef.current, data, options);
    }

    // Cleanup
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [graphData, classicalPath, quantumPath, activeTab, nodeLoads]);

  // Simulate dynamic load changes
  const startLoadSimulation = () => {
    setSimulationRunning(true);
    // In a real app, this would connect to actual load data
    // For now, we'll just simulate some changes
    setTimeout(() => setSimulationRunning(false), 3000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800">Network Analysis</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'graph'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Graph View
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'heatmap'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Load Heatmap
            </button>
          </div>
        </div>

        {activeTab === 'graph' && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500"></div>
              <span className="text-gray-600">Classical Path</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-purple-500"></div>
              <span className="text-gray-600">Quantum Path</span>
            </div>
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="flex items-center gap-4">
            <div className="flex gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-600">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">High</span>
              </div>
            </div>
            <button
              onClick={startLoadSimulation}
              disabled={simulationRunning}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {simulationRunning ? 'Simulating...' : 'Simulate Load'}
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards for Heatmap */}
      {activeTab === 'heatmap' && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-700">{graphStats.totalNodes}</div>
            <div className="text-xs text-blue-600">Total Nodes</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-100">
                <Zap className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-green-700">{graphStats.totalEdges}</div>
            <div className="text-xs text-green-600">Total Edges</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-100">
                <Cpu className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-orange-700">{(graphStats.avgLoad * 100).toFixed(1)}%</div>
            <div className="text-xs text-orange-600">Avg Load</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100">
                <BarChart3 className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-700">{(graphStats.maxLoad * 100).toFixed(1)}%</div>
            <div className="text-xs text-red-600">Peak Load</div>
          </div>
        </div>
      )}

      {/* Visualization Container */}
      <div 
        ref={containerRef}
        className="w-full rounded-lg bg-white border border-gray-200"
        style={{ height: '500px' }}
      />

      {/* Footer */}
      <div className="mt-4 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {activeTab === 'graph' && '💡 Drag nodes to rearrange, scroll to zoom, drag background to pan'}
          {activeTab === 'heatmap' && '🎯 Node size and color indicate computational load intensity'}
        </div>
        <div className="text-xs text-gray-400">
          {activeTab === 'graph' && `${graphData.nodes.length} nodes, ${graphData.edges.length} edges`}
          {activeTab === 'heatmap' && 'Real-time load simulation'}
        </div>
      </div>
    </div>
  );
}