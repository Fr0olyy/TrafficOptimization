import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export function ProcessingScreen() {
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState(0);

    const stages = [
        { icon: '📊', label: 'Parsing graph data', duration: 5, color: 'var(--color-primary)' },
        { icon: '🔄', label: 'Running classical algorithms', duration: 30, color: 'var(--color-classical)' },
        { icon: '⚛️', label: 'Executing quantum optimization', duration: 50, color: 'var(--color-quantum)' },
        { icon: '📈', label: 'Comparing results', duration: 15, color: 'var(--color-success)' },
    ];

    useEffect(() => {
        const totalDuration = stages.reduce((sum, s) => sum + s.duration, 0);
        let elapsed = 0;

        const interval = setInterval(() => {
            elapsed += 0.1;
            const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
            setProgress(newProgress);

            let cumulativeDuration = 0;
            for (let i = 0; i < stages.length; i++) {
                cumulativeDuration += stages[i].duration;
                if (elapsed < cumulativeDuration) {
                    setStage(i);
                    break;
                }
            }

            if (elapsed >= totalDuration) {
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-lg"
            style={{ background: 'rgba(10, 14, 39, 0.95)' }}
        >
            <div className="max-w-2xl w-full p-8">
                {/* Quantum Circuit Animation */}
                <div className="mb-12 flex justify-center relative">
                    <div className="relative w-40 h-40">
                        {/* Outer ring */}
                        <div
                            className="absolute inset-0 rounded-full animate-spin-slow"
                            style={{
                                border: '4px solid var(--color-primary)',
                                borderTopColor: 'transparent'
                            }}
                        ></div>

                        {/* Middle ring */}
                        <div
                            className="absolute inset-4 rounded-full animate-spin-slower"
                            style={{
                                border: '4px solid var(--color-secondary)',
                                borderTopColor: 'transparent',
                                animationDirection: 'reverse'
                            }}
                        ></div>

                        {/* Inner ring */}
                        <div
                            className="absolute inset-8 rounded-full animate-spin"
                            style={{
                                border: '4px solid var(--color-quantum)',
                                borderTopColor: 'transparent'
                            }}
                        ></div>

                        {/* Center pulse */}
                        <div
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <div
                                className="w-12 h-12 rounded-full animate-pulse-slow"
                                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                            ></div>
                        </div>

                        {/* Glow effect */}
                        <div
                            className="absolute inset-0 rounded-full animate-glow"
                            style={{ boxShadow: '0 0 40px rgba(102, 126, 234, 0.5)' }}
                        ></div>
                    </div>

                    {/* Floating particles */}
                    <div className="absolute top-0 left-1/4 w-2 h-2 rounded-full bg-primary animate-float delay-100" style={{ background: 'var(--color-primary)' }}></div>
                    <div className="absolute bottom-0 right-1/4 w-2 h-2 rounded-full bg-quantum animate-float delay-300" style={{ background: 'var(--color-quantum)' }}></div>
                </div>

                {/* Progress Bar */}
                <div className="mb-8 animate-fade-in">
                    <div className="flex justify-between mb-3 text-sm font-medium">
                        <span>Processing optimization...</span>
                        <span className="font-mono gradient-text">{progress.toFixed(0)}%</span>
                    </div>
                    <div
                        className="h-4 rounded-full overflow-hidden"
                        style={{ background: 'var(--color-bg-surface)' }}
                    >
                        <div
                            className="h-full transition-all duration-500 ease-out relative overflow-hidden"
                            style={{
                                width: `${progress}%`,
                                background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary), var(--color-quantum))',
                                backgroundSize: '200% 100%'
                            }}
                        >
                            <div className="absolute inset-0 animate-shimmer"></div>
                        </div>
                    </div>
                </div>

                {/* Current Stage */}
                <div className="text-center mb-8 animate-fade-in-up">
                    <div className="text-6xl mb-4 animate-float">{stages[stage].icon}</div>
                    <h3 className="text-2xl font-semibold">{stages[stage].label}</h3>
                    <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                        This may take a few moments...
                    </p>
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                    {stages.map((s, i) => (
                        <div
                            key={i}
                            className={[
                                'rounded-[18px] px-6 py-4 flex items-center shadow',
                                i === stage && 'glass-effect glow-effect scale-105 border-l-4',
                                i < stage && 'opacity-70',
                                i > stage && 'opacity-35'
                            ].filter(Boolean).join(' ')}
                            style={{
                                borderLeft: i === stage ? `4px solid ${s.color}` : 'none'
                            }}
                        >
                            <div className="text-3xl">{s.icon}</div>
                            <div className="flex-1">
                                <p className="font-medium">{s.label}</p>
                                {i < stage && (
                                    <p className="text-xs mt-1 text-success" style={{ color: 'var(--color-success)' }}>
                                        Completed
                                    </p>
                                )}
                                {i === stage && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                        In progress...
                                    </p>
                                )}
                            </div>
                            {i < stage && (
                                <span className="text-success text-2xl" style={{ color: 'var(--color-success)' }}>✓</span>
                            )}
                            {i === stage && (
                                <Loader2 className="w-6 h-6 animate-spin" style={{ color: s.color }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Estimated Time */}
                <div className="mt-6 text-center text-xs text-gray-500">
                    <span className="animate-pulse">⚛️ Analyzing quantum circuits and optimizing routes</span>
                </div>
            </div>
        </div>
    );
}
