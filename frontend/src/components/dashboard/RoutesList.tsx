import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Zap, Clock, Cpu } from 'lucide-react';
import type { RouteDetail } from '../../types';

interface RoutesListProps {
    routes: RouteDetail[];
    onRouteSelect?: (route: RouteDetail) => void;
}

export function RoutesList({ routes, onRouteSelect }: RoutesListProps) {
    const [expandedRoute, setExpandedRoute] = useState<number | null>(null);

    if (!routes || routes.length === 0) {
        return (
            <div className="glass-effect rounded-xl p-8 text-center">
                <p style={{ color: 'var(--color-text-secondary)' }}>No routes data available</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {routes.map((route) => {
                const isExpanded = expandedRoute === route.route_index;

                return (
                    <div
                        key={route.route_index}
                        className="glass-effect rounded-xl overflow-hidden transition-all hover-lift"
                    >
                        {/* Header */}
                        <div
                            className="p-4 cursor-pointer flex items-center justify-between"
                            onClick={() => {
                                setExpandedRoute(isExpanded ? null : route.route_index);
                                onRouteSelect?.(route);
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                                    <span className="font-bold text-sm">#{route.route_index}</span>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <MapPin className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                                        <span className="font-medium">
                                            {route.start} → {route.end}
                                        </span>
                                    </div>
                                    <div className="text-xs flex items-center gap-3" style={{ color: 'var(--color-text-secondary)' }}>
                                        <span className="flex items-center gap-1">
                                            <Zap className="w-3 h-3" />
                                            Cost: {route.quantum.cost.toFixed(2)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {(route.quantum.time * 1000).toFixed(2)}ms
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Cpu className="w-3 h-3" />
                                            {route.quantum.qubits} qubits
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="px-3 py-1 rounded-full text-xs font-medium"
                                    style={{ background: 'rgba(139, 92, 246, 0.2)', color: 'var(--color-quantum)' }}>
                                    {route.quantum.algorithm}
                                </div>
                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                            <div className="px-4 pb-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                                <div className="mt-3 space-y-3">
                                    {/* Quantum Path */}
                                    <div>
                                        <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                                            Quantum Path ({route.quantum.path.length} nodes):
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {route.quantum.path.map((node, idx) => (
                                                <div key={`${route.route_index}-${idx}`} className="flex items-center gap-2">
                                                    <div className="px-2 py-1 rounded text-xs font-mono"
                                                        style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                                                        {node}
                                                    </div>
                                                    {idx < route.quantum.path.length - 1 && (
                                                        <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* QAOA Parameters */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="rounded-lg p-2" style={{ background: 'var(--color-bg-elevated)' }}>
                                            <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>QAOA Layers</div>
                                            <div className="text-lg font-bold" style={{ color: 'var(--color-quantum)' }}>
                                                {route.quantum.p_layers}
                                            </div>
                                        </div>
                                        <div className="rounded-lg p-2" style={{ background: 'var(--color-bg-elevated)' }}>
                                            <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Qubits</div>
                                            <div className="text-lg font-bold" style={{ color: 'var(--color-quantum)' }}>
                                                {route.quantum.qubits}
                                            </div>
                                        </div>
                                        <div className="rounded-lg p-2" style={{ background: 'var(--color-bg-elevated)' }}>
                                            <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Time (ms)</div>
                                            <div className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>
                                                {(route.quantum.time * 1000).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    {route.mirea && (
                                        <div className="border-t pt-3" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                                            <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                                                MIREA Classical Path:
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {route.mirea.path.map((node, idx) => (
                                                    <div key={`mirea-${route.route_index}-${idx}`} className="flex items-center gap-2">
                                                        <div className="px-2 py-1 rounded text-xs font-mono"
                                                            style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                                                            {node}
                                                        </div>
                                                        {idx < (route.mirea?.path.length ?? 0) - 1 && (
                                                            <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-2 flex gap-4 text-xs">
                                                <div>
                                                    <span style={{ color: 'var(--color-text-tertiary)' }}>Cost: </span>
                                                    <span className="font-mono">{route.mirea.cost.toFixed(2)}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--color-text-tertiary)' }}>Time: </span>
                                                    <span className="font-mono">{(route.mirea.time * 1000).toFixed(2)}ms</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}