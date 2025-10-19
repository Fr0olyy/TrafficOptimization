import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ProcessResponse } from '../../types';

interface ComparisonChartsProps {
  results: ProcessResponse;
}

export function ComparisonCharts({ results }: ComparisonChartsProps) {
  const timeData = results.perGraph.map(g => ({
    graph: g.graph_index,
    classical: g.classical.enhanced.opt_time_ms,
    quantum: g.quantum.enhanced.opt_time_ms,
  }));

  const distanceData = results.perGraph.map(g => ({
    graph: g.graph_index,
    classical: g.classical.enhanced.total_distance,
    quantum: g.quantum.enhanced.total_distance,
  }));

  const speedupData = results.perGraph.map(g => ({
    graph: g.graph_index,
    speedup: g.compare.quantum_speedup,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Time Comparison */}
      <div className="glass-effect rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-4">⏱️ Processing Time Comparison</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={timeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="graph" stroke="#e5e7eb" />
            <YAxis stroke="#e5e7eb" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid #667eea' }}
              labelStyle={{ color: '#e5e7eb' }}
            />
            <Legend />
            <Bar dataKey="classical" fill="#3b82f6" name="Classical" />
            <Bar dataKey="quantum" fill="#8b5cf6" name="Quantum" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Distance Comparison */}
      <div className="glass-effect rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-4">📏 Route Distance Quality</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={distanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="graph" stroke="#e5e7eb" />
            <YAxis stroke="#e5e7eb" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid #667eea' }}
            />
            <Legend />
            <Line type="monotone" dataKey="classical" stroke="#3b82f6" strokeWidth={2} name="Classical" />
            <Line type="monotone" dataKey="quantum" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Quantum" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Speedup Distribution */}
      <div className="glass-effect rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-4">⚡ Quantum Speedup Factor</h3>
        <ResponsiveContainer width="100%" height={250}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="graph" stroke="#e5e7eb" />
            <YAxis stroke="#e5e7eb" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid #667eea' }}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <ReferenceLine y={1.0} stroke="#f59e0b" strokeDasharray="5 5" />
            <Scatter name="Speedup" data={speedupData} fill="#10b981" />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Values above baseline (1.0) indicate quantum advantage
        </p>
      </div>
    </div>
  );
}
