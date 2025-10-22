import { useEffect, useState } from 'react';
import { TrendingUp, Zap, Timer, BarChart3, Cpu, Route, Gauge, Brain } from 'lucide-react';
import type { ProcessResponse } from '../../types';
import { calculateAverageSpeedup, calculateAverageImprovement } from '../../utils/calculations';
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
  const avgSpeedup = calculateAverageSpeedup(results);
  const avgImprovement = calculateAverageImprovement(results);
  
  // Calculate additional metrics
  const quantumAdvantageCount = results.perGraph.filter(g => g.compare.quantum_speedup > 1).length;
  const totalRoutes = results.perGraph.reduce((acc, g) => acc + (g.routes?.length || 0), 0);
  const successfulRoutes = results.perGraph.reduce((acc, g) => acc + (g.stats?.successful || 0), 0);

  const timeValue = useCountUp(results.elapsed_ms / 1000, 1200);
  const speedupValue = useCountUp(avgSpeedup, 1200);
  const improvementValue = useCountUp(avgImprovement, 1200);
  const graphsValue = useCountUp(results.perGraph.length, 800);
  const advantageValue = useCountUp(quantumAdvantageCount, 1000);
  const routesValue = useCountUp(successfulRoutes, 1000);

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
      title: 'Quantum Speedup',
      value: speedupValue.toFixed(2) + 'x',
      subtitle: 'Average performance gain',
      color: avgSpeedup > 1 ? 'success' : 'neutral',
      gradient: avgSpeedup > 1 
        ? 'linear-gradient(135deg, var(--color-urban-green), #56C02B)'
        : 'linear-gradient(135deg, var(--color-urban-gray), #6E6E6E)',
    },
    {
      icon: TrendingUp,
      title: 'Route Optimization',
      value: improvementValue.toFixed(1) + '%',
      subtitle: 'Distance improvement',
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
      title: 'Quantum Advantages',
      value: Math.round(advantageValue).toString(),
      subtitle: 'Graphs with speedup > 1x',
      color: 'quantum',
      gradient: 'linear-gradient(135deg, #8b5cf6, #667eea)',
    },
    {
      icon: Route,
      title: 'Successful Routes',
      value: Math.round(routesValue).toString(),
      subtitle: `of ${totalRoutes} total routes`,
      color: 'green',
      gradient: 'linear-gradient(135deg, var(--color-urban-green), #56C02B)',
    },
  ];

  return (
    <div className="summary-cards">
      {cards.map((card, idx) => (
        <div 
          key={idx} 
          className={`summary-card ${card.color}`}
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className="card-background" style={{ background: card.gradient }} />
          <div className="card-content">
            <div className="card-icon-wrapper">
              <card.icon className="card-icon" size={24} />
            </div>
            <div className="card-text">
              <h4 className="card-title">{card.title}</h4>
              <div className="card-value">{card.value}</div>
              <p className="card-subtitle">{card.subtitle}</p>
            </div>
            <div className="card-decoration">
              <div className="decoration-circle"></div>
              <div className="decoration-wave"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}