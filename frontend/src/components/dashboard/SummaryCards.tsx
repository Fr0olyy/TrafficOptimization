// src/components/dashboard/SummaryCards.tsx - FIXED
import { useEffect, useState } from 'react';
import { TrendingUp, Zap, Timer, BarChart3, Cpu, Route } from 'lucide-react';
import type { ProcessResponse } from '../../types';
import {
  getTotalGraphs,
  getAverageQuantumTime,
  getTotalFinalCost,
  getMireaMetricsCount,
} from '../../utils/calculations';
import './SummaryCards.css';

interface SummaryCardsProps {
  results: ProcessResponse;
}

function useCountUp(target: number, duration: number = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(startValue + (target - startValue) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return value;
}

export function SummaryCards({ results }: SummaryCardsProps) {
  // ✅ FIXED: Use new calculation functions
  const totalGraphs = getTotalGraphs(results);
  const avgTime = getAverageQuantumTime(results);
  const totalCost = getTotalFinalCost(results);
  const mireaCount = getMireaMetricsCount(results);

  // ✅ FIXED: Calculate metrics from new data structure
  const processingTime = results.elapsed_ms / 1000;
  const avgSpeedup = 1.5; // Placeholder - calculate if needed
  const routeImprovement = 15.5; // Placeholder - calculate if needed

  const timeValue = useCountUp(processingTime, 1200);
  const speedupValue = useCountUp(avgSpeedup, 1200);
  const improvementValue = useCountUp(routeImprovement, 1200);
  const graphsValue = useCountUp(totalGraphs, 800);
  const costValue = useCountUp(totalCost, 1000);
  const mireaValue = useCountUp(mireaCount, 1000);

  const cards = [
    {
      icon: Timer,
      title: 'Total Processing Time',
      value: timeValue.toFixed(2) + 's',
      subtitle: 'End-to-end optimization',
      color: 'blue',
      gradient: 'linear-gradient(135deg, var(--color-urban-accent), var(--color-urban-dark))',
    },
    {
      icon: Zap,
      title: 'Quantum Execution',
      value: avgTime.toFixed(0) + 'ms',
      subtitle: 'Average execution time',
      color: 'cyan',
      gradient: 'linear-gradient(135deg, var(--color-urban-blue), #4495D1)',
    },
    {
      icon: TrendingUp,
      title: 'Total Final Cost',
      value: '$' + totalCost.toFixed(2),
      subtitle: 'Optimization result',
      color: 'purple',
      gradient: 'linear-gradient(135deg, var(--color-urban-dark), var(--color-urban-blue))',
    },
    {
      icon: BarChart3,
      title: 'Graphs Analyzed',
      value: Math.round(graphsValue).toString(),
      subtitle: 'Successfully processed',
      color: 'teal',
      gradient: 'linear-gradient(135deg, var(--color-urban-teal), var(--color-urban-accent))',
    },
    {
      icon: Cpu,
      title: 'MIREA Samples',
      value: Math.round(mireaValue).toString(),
      subtitle: 'Quantum metrics',
      color: 'quantum',
      gradient: 'linear-gradient(135deg, #8b5cf6, #667eea)',
    },
    {
      icon: Route,
      title: 'Processing Status',
      value: 'Complete',
      subtitle: results.ok ? '✅ Success' : '❌ Failed',
      color: 'green',
      gradient: 'linear-gradient(135deg, var(--color-urban-green), #56C02B)',
    },
  ];

  return (
    <div className="summary-cards-container">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="summary-card"
            style={{ backgroundImage: card.gradient }}
          >
            <div className="card-header">
              <Icon className="card-icon" />
            </div>
            <div className="card-body">
              <div className="card-title">{card.title}</div>
              <div className="card-value">{card.value}</div>
              <div className="card-subtitle">{card.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}