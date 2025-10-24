// src/components/dashboard/ComparisonCharts.tsx - FIXED
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ProcessResponse } from '../../types';
import './ComparisonCharts.css';

interface ComparisonChartsProps {
  results: ProcessResponse;
}

const CHART_COLORS = {
  classical: {
    primary: '#15256D',
    light: 'rgba(21, 37, 109, 0.1)',
  },
  quantum: {
    primary: '#4495D1',
    light: 'rgba(68, 149, 209, 0.1)',
  },
  speedup: {
    positive: '#56C02B',
    negative: '#E20072',
    neutral: '#D3D3D3',
  },
  grid: 'rgba(21, 37, 109, 0.1)',
  text: '#15256D',
};

export function ComparisonCharts({ results }: ComparisonChartsProps) {
  // ✅ FIXED: Use new data structure (stats, mirea_metric_samples)
  const costData = results.perGraph.map((g) => ({
    graph: `Graph ${g.graph_index}`,
    cost: g.stats?.final_cost || 0,
    time: g.stats?.time_ms || 0,
    routes: g.stats?.total_routes || 0,
  }));

  const iterationData = results.perGraph.map((g) => ({
    graph: `Graph ${g.graph_index}`,
    iterations: g.stats?.iterations || 0,
    mireadSamples: g.mirea_metric_samples?.length || 0,
  }));

  // ✅ FIXED: Calculate metrics safely
  const totalCost = costData.reduce((acc, d) => acc + d.cost, 0);
  const totalTime = costData.reduce((acc, d) => acc + d.time, 0);
  const avgTime = costData.length > 0 ? totalTime / costData.length : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="comparison-charts-container">
      {/* Cost and Time Comparison */}
      <div className="chart-wrapper">
        <h3 className="chart-title">📊 Cost & Time per Graph</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="graph" stroke={CHART_COLORS.text} />
            <YAxis stroke={CHART_COLORS.text} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="cost" fill={CHART_COLORS.quantum.primary} name="Final Cost" />
            <Bar dataKey="time" fill={CHART_COLORS.classical.primary} name="Time (ms)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Iterations and MIREA Samples */}
      <div className="chart-wrapper">
        <h3 className="chart-title">🔄 Iterations & MIREA Samples</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={iterationData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="graph" stroke={CHART_COLORS.text} />
            <YAxis stroke={CHART_COLORS.text} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="iterations"
              fill={CHART_COLORS.quantum.primary}
              name="Iterations"
            />
            <Bar
              dataKey="mireadSamples"
              fill={CHART_COLORS.speedup.positive}
              name="MIREA Samples"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Statistics */}
      <div className="chart-wrapper">
        <h3 className="chart-title">📈 Summary Statistics</h3>
        <div className="statistics-grid">
          <div className="stat-card">
            <div className="stat-label">Total Cost</div>
            <div className="stat-value">${totalCost.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Time</div>
            <div className="stat-value">{totalTime.toFixed(0)}ms</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Average Time/Graph</div>
            <div className="stat-value">{avgTime.toFixed(0)}ms</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Graphs Processed</div>
            <div className="stat-value">{costData.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}