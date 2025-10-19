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
  const timeData = results.perGraph.map((g) => ({
    graph: g.graph_index,
    classical: g.classical.enhanced.opt_time_ms,
    quantum: g.quantum.enhanced.opt_time_ms,
  }));

  const distanceData = results.perGraph.map((g) => ({
    graph: g.graph_index,
    classical: g.classical.enhanced.total_distance,
    quantum: g.quantum.enhanced.total_distance,
  }));

  const speedupData = results.perGraph.map((g) => ({
    graph: g.graph_index,
    speedup: g.compare.quantum_speedup,
  }));

  return (
    <div className="comparison-charts">
      <div className="chart-container">
        <h4 className="chart-title">Optimization Time Comparison</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={timeData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="graph" label={{ value: 'Graph #', position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-card-border)',
                borderRadius: 'var(--radius-base)',
              }}
            />
            <Legend />
            <Bar dataKey="classical" fill="#21808d" name="Classical" />
            <Bar dataKey="quantum" fill="#32b8c6" name="Quantum" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h4 className="chart-title">Distance Comparison</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={distanceData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="graph" label={{ value: 'Graph #', position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: 'Distance', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-card-border)',
                borderRadius: 'var(--radius-base)',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="classical" stroke="#21808d" strokeWidth={2} name="Classical" />
            <Line type="monotone" dataKey="quantum" stroke="#32b8c6" strokeWidth={2} name="Quantum" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h4 className="chart-title">Quantum Speedup Factor</h4>
        <p className="chart-subtitle">Values above baseline (1.0) indicate quantum advantage</p>
        <ResponsiveContainer width="100%" height={250}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="graph" label={{ value: 'Graph #', position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: 'Speedup (x)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-card-border)',
                borderRadius: 'var(--radius-base)',
              }}
            />
            <ReferenceLine y={1} stroke="var(--color-text-secondary)" strokeDasharray="3 3" label="Baseline" />
            <Scatter data={speedupData} fill="#10b981" name="Speedup" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}