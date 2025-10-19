import { useEffect, useState } from 'react';
import { TrendingUp, Zap, Timer, BarChart3 } from 'lucide-react';
import type { ProcessResponse } from '../../types';
import { calculateAverageSpeedup, calculateAverageImprovement} from '../../utils/calculations';

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
      gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      iconColor: '#3b82f6',
    },
    {
      icon: Zap,
      title: 'Quantum Speedup',
      value: speedupValue.toFixed(2) + 'x',
      subtitle: 'Average across all graphs',
      gradient: avgSpeedup > 1 
        ? 'linear-gradient(135deg, #10b981, #059669)' 
        : 'linear-gradient(135deg, #ef4444, #dc2626)',
      iconColor: avgSpeedup > 1 ? '#10b981' : '#ef4444',
    },
    {
      icon: TrendingUp,
      title: 'Route Optimization',
      value: improvementValue.toFixed(1) + '%',
      subtitle: 'Distance improvement',
      gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
      iconColor: '#667eea',
    },
    {
      icon: BarChart3,
      title: 'Graphs Analyzed',
      value: Math.round(graphsValue).toString(),
      subtitle: 'Successfully processed',
      gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      iconColor: '#8b5cf6',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-6 p-6">
      {cards.map((card, i) => (
        <div
          key={i}
          className="glass-effect rounded-2xl p-6 hover-lift cursor-pointer relative overflow-hidden group"
          style={{ 
            animationDelay: `${i * 100}ms`,
            animation: 'fadeInUp 0.6s ease-out forwards'
          }}
        >
          {/* Background gradient on hover */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
            style={{ background: card.gradient }}
          ></div>

          {/* Icon */}
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
            style={{ background: `${card.iconColor}20` }}
          >
            <card.icon className="w-7 h-7" style={{ color: card.iconColor }} />
          </div>

          {/* Value */}
          <div 
            className="text-4xl font-bold mb-2 animate-count-up font-mono"
            style={{ 
              background: card.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {card.value}
          </div>

          {/* Title */}
          <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {card.title}
          </div>

          {/* Subtitle */}
          <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {card.subtitle}
          </div>

          {/* Decorative corner */}
          <div 
            className="absolute top-0 right-0 w-20 h-20 opacity-10"
            style={{ 
              background: card.gradient,
              borderRadius: '0 1rem 0 100%'
            }}
          ></div>
        </div>
      ))}
    </div>
  );
}
