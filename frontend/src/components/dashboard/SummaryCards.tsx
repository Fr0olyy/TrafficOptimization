import { useEffect, useState } from 'react';
import { TrendingUp, Zap, Timer, BarChart3 } from 'lucide-react';
import type { ProcessResponse } from '../../types';
import { calculateAverageSpeedup, calculateAverageImprovement } from '../../utils/calculations';

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
  const avgSpeedup = calculateAverageSpeedup(results);
  const avgImprovement = calculateAverageImprovement(results);

  const timeValue = useCountUp(results.elapsed_ms / 1000, 1200);
  const speedupValue = useCountUp(avgSpeedup, 1200);
  const improvementValue = useCountUp(avgImprovement, 1200);
  const graphsValue = useCountUp(results.perGraph.length, 800);

  const cards = [
    {
      icon: Timer,
      title: 'Total Processing Time',
      value: timeValue.toFixed(2) + 's',
      subtitle: 'End-to-end optimization',
      colorClass: 'card-blue',
    },
    {
      icon: Zap,
      title: 'Quantum Speedup',
      value: speedupValue.toFixed(2) + 'x',
      subtitle: 'Average across all graphs',
      colorClass: avgSpeedup > 1 ? 'card-success' : 'card-error',
    },
    {
      icon: TrendingUp,
      title: 'Route Optimization',
      value: improvementValue.toFixed(1) + '%',
      subtitle: 'Distance improvement',
      colorClass: 'card-purple',
    },
    {
      icon: BarChart3,
      title: 'Graphs Analyzed',
      value: Math.round(graphsValue).toString(),
      subtitle: 'Successfully processed',
      colorClass: 'card-teal',
    },
  ];

  return (
    <div className="summary-cards">
      {cards.map((card, idx) => (
        <div key={idx} className={`summary-card ${card.colorClass}`}>
          <div className="card-icon-wrapper">
            <card.icon className="card-icon" size={24} />
          </div>
          <div className="card-content">
            <h4 className="card-title">{card.title}</h4>
            <div className="card-value">{card.value}</div>
            <p className="card-subtitle">{card.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}