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
  Cell,
} from 'recharts';
import type { ProcessResponse } from '../../types';
import './ComparisonCharts.css';

interface ComparisonChartsProps {
  results: ProcessResponse;
}

// UrbanQ цветовая схема для графиков
const CHART_COLORS = {
  classical: {
    primary: '#15256D',
    light: 'rgba(21, 37, 109, 0.1)',
    gradient: 'url(#classicalGradient)',
  },
  quantum: {
    primary: '#4495D1',
    light: 'rgba(68, 149, 209, 0.1)',
    gradient: 'url(#quantumGradient)',
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
  const timeData = results.perGraph.map((g) => ({
    graph: `Graph ${g.graph_index + 1}`,
    classical: g.classical.enhanced.opt_time_ms,
    quantum: g.quantum.enhanced.opt_time_ms,
    speedup: g.compare.quantum_speedup,
  }));

  const distanceData = results.perGraph.map((g) => ({
    graph: `Graph ${g.graph_index + 1}`,
    classical: g.classical.enhanced.total_distance,
    quantum: g.quantum.enhanced.total_distance,
    improvement: ((g.classical.enhanced.total_distance - g.quantum.enhanced.total_distance) / g.classical.enhanced.total_distance) * 100,
  }));

  const speedupData = results.perGraph.map((g) => ({
    graph: `Graph ${g.graph_index + 1}`,
    speedup: g.compare.quantum_speedup,
    advantage: g.compare.quantum_speedup > 1 ? 'advantage' : 'neutral',
  }));

  // Кастомный тултип
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <div className="tooltip-header">
            <strong>{label}</strong>
          </div>
          <div className="tooltip-content">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="tooltip-item">
                <div 
                  className="tooltip-color" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="tooltip-label">{entry.name}:</span>
                <span className="tooltip-value">
                  {entry.name.includes('Time') ? `${entry.value}ms` : 
                   entry.name.includes('Improvement') ? `${entry.value.toFixed(1)}%` :
                   entry.name.includes('Speedup') ? `${entry.value.toFixed(2)}x` : 
                   entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Кастомная легенда
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="chart-legend">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="legend-item">
            <div 
              className="legend-color" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="legend-label">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="comparison-charts">
      {/* SVG градиенты для красивых заливок */}
      <svg style={{ height: 0 }}>
        <defs>
          <linearGradient id="classicalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15256D" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#15256D" stopOpacity={0.3}/>
          </linearGradient>
          <linearGradient id="quantumGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4495D1" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#4495D1" stopOpacity={0.3}/>
          </linearGradient>
          <linearGradient id="speedupGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#56C02B" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#56C02B" stopOpacity={0.3}/>
          </linearGradient>
        </defs>
      </svg>

      {/* График времени оптимизации */}
      <div className="chart-container">
        <div className="chart-header">
          <h4 className="chart-title">Optimization Time Comparison</h4>
          <p className="chart-subtitle">Quantum vs Classical algorithm performance</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={timeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={CHART_COLORS.grid}
              vertical={false}
            />
            <XAxis 
              dataKey="graph" 
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={{ stroke: CHART_COLORS.grid }}
              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
            />
            <YAxis 
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={{ stroke: CHART_COLORS.grid }}
              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
              label={{ 
                value: 'Time (ms)', 
                angle: -90, 
                position: 'insideLeft',
                offset: -10,
                style: { fill: CHART_COLORS.text, fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
            <Bar 
              dataKey="classical" 
              name="Classical Algorithm"
              radius={[4, 4, 0, 0]}
            >
              {timeData.map((entry, index) => (
                <Cell key={index} fill={CHART_COLORS.classical.gradient} />
              ))}
            </Bar>
            <Bar 
              dataKey="quantum" 
              name="Quantum Algorithm"
              radius={[4, 4, 0, 0]}
            >
              {timeData.map((entry, index) => (
                <Cell key={index} fill={CHART_COLORS.quantum.gradient} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* График расстояния */}
      <div className="chart-container">
        <div className="chart-header">
          <h4 className="chart-title">Route Distance Optimization</h4>
          <p className="chart-subtitle">Total distance comparison between algorithms</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={distanceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={CHART_COLORS.grid}
              vertical={false}
            />
            <XAxis 
              dataKey="graph" 
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={{ stroke: CHART_COLORS.grid }}
              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
            />
            <YAxis 
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={{ stroke: CHART_COLORS.grid }}
              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
              label={{ 
                value: 'Distance', 
                angle: -90, 
                position: 'insideLeft',
                offset: -10,
                style: { fill: CHART_COLORS.text, fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
            <Line 
              type="monotone" 
              dataKey="classical" 
              stroke={CHART_COLORS.classical.primary}
              strokeWidth={3}
              name="Classical Distance"
              dot={{ fill: CHART_COLORS.classical.primary, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: CHART_COLORS.classical.primary }}
            />
            <Line 
              type="monotone" 
              dataKey="quantum" 
              stroke={CHART_COLORS.quantum.primary}
              strokeWidth={3}
              name="Quantum Distance"
              strokeDasharray="5 5"
              dot={{ fill: CHART_COLORS.quantum.primary, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: CHART_COLORS.quantum.primary }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* График квантового ускорения */}
      <div className="chart-container">
        <div className="chart-header">
          <h4 className="chart-title">Quantum Speedup Analysis</h4>
          <p className="chart-subtitle">Performance improvement factor across different graphs</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart data={speedupData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={CHART_COLORS.grid}
              vertical={false}
            />
            <XAxis 
              dataKey="graph" 
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={{ stroke: CHART_COLORS.grid }}
              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
            />
            <YAxis 
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={{ stroke: CHART_COLORS.grid }}
              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
              label={{ 
                value: 'Speedup Factor (x)', 
                angle: -90, 
                position: 'insideLeft',
                offset: -10,
                style: { fill: CHART_COLORS.text, fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              y={1} 
              stroke={CHART_COLORS.text}
              strokeDasharray="3 3" 
              strokeOpacity={0.5}
              label={{ 
                value: 'Baseline', 
                position: 'right',
                fill: CHART_COLORS.text,
                fontSize: 12
              }}
            />
            <Scatter 
              name="Quantum Speedup" 
              fill={CHART_COLORS.speedup.positive}
            >
              {speedupData.map((entry, index) => (
                <Cell 
                  key={index}
                  fill={entry.speedup > 1 ? CHART_COLORS.speedup.positive : CHART_COLORS.speedup.neutral}
                  r={6}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="chart-notes">
          <div className="note-item">
            <div className="note-color" style={{ backgroundColor: CHART_COLORS.speedup.positive }} />
            <span>Quantum Advantage (Speedup &gt; 1.0x)</span>
          </div>
          <div className="note-item">
            <div className="note-color" style={{ backgroundColor: CHART_COLORS.speedup.neutral }} />
            <span>Classical Performance (Speedup ≤ 1.0x)</span>
          </div>
        </div>
      </div>
    </div>
  );
}