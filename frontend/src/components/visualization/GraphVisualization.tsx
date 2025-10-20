import { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

interface GraphVisualizationProps {
  graphData: {
    nodes: Array<{ id: number; label?: string }>;
    edges: Array<{ from: number; to: number; weight: number }>;
  };
  classicalPath?: number[];
  quantumPath?: number[];
}

export function GraphVisualization({ 
  graphData, 
  classicalPath = [], 
  quantumPath = [] 
}: GraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    // Prepare nodes
    const nodes = new DataSet(
      graphData.nodes.map(node => ({
        id: node.id,
        label: node.label || `${node.id}`,
        shape: 'dot',
        size: 20,
        font: { color: '#ffffff', size: 14 },
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
            : { color: '#4b5563', highlight: '#6b7280' },
          width: isInQuantumPath || isInClassicalPath ? 3 : 1,
          font: { 
            color: '#ffffff', 
            size: 12,
            background: 'rgba(26, 31, 58, 0.8)'
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

    // Cleanup
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [graphData, classicalPath, quantumPath]);

  return (
    <div className="glass-effect rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Graph Visualization</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5" style={{ background: '#3b82f6' }}></div>
            <span style={{ color: 'var(--color-text-secondary)' }}>Classical Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5" style={{ background: '#8b5cf6' }}></div>
            <span style={{ color: 'var(--color-text-secondary)' }}>Quantum Path</span>
          </div>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="w-full rounded-lg"
        style={{ 
          height: '500px', 
          background: 'var(--color-bg-elevated)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      />
      <div className="mt-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        💡 Tip: Drag nodes to rearrange, scroll to zoom, drag background to pan
      </div>
    </div>
  );
}
