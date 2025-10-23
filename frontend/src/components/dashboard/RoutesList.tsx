import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Zap, Clock, Cpu, Route, Brain } from 'lucide-react';
import type { RouteDetail } from '../../types';

interface RoutesListProps {
    routes: RouteDetail[];
    onRouteSelect?: (route: RouteDetail) => void;
}

export function RoutesList({ routes, onRouteSelect }: RoutesListProps) {
    const [expandedRoute, setExpandedRoute] = useState<number | null>(null);

    if (!routes || routes.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                     style={{ background: 'linear-gradient(135deg, #003274, #4495D1)' }}>
                    <Route className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#003274' }}>No Routes Available</h3>
                <p className="text-gray-600">Route data will appear here after processing your traffic optimization problem.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {routes.map((route) => {
                const isExpanded = expandedRoute === route.route_index;

                return (
                    <div
                        key={route.route_index}
                        className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
                    >
                        {/* Header */}
                        <div
                            className="p-6 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors"
                            onClick={() => {
                                setExpandedRoute(isExpanded ? null : route.route_index);
                                onRouteSelect?.(route);
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #667eea)' }}
                                >
                                    <span className="font-bold text-white text-sm">#{route.route_index}</span>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-100">
                                            <MapPin className="w-3 h-3" style={{ color: '#003274' }} />
                                        </div>
                                        <span className="font-semibold text-gray-800">
                                            {route.start} → {route.end}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <div className="w-4 h-4 rounded-full flex items-center justify-center bg-purple-100">
                                                <Zap className="w-3 h-3" style={{ color: '#8b5cf6' }} />
                                            </div>
                                            Cost: {route.quantum.cost.toFixed(2)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <div className="w-4 h-4 rounded-full flex items-center justify-center bg-green-100">
                                                <Clock className="w-3 h-3" style={{ color: '#059669' }} />
                                            </div>
                                            {(route.quantum.time * 1000).toFixed(2)}ms
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <div className="w-4 h-4 rounded-full flex items-center justify-center bg-blue-100">
                                                <Cpu className="w-3 h-3" style={{ color: '#3b82f6' }} />
                                            </div>
                                            {route.quantum.qubits} qubits
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div 
                                    className="px-4 py-2 rounded-full text-sm font-medium text-white"
                                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #667eea)' }}
                                >
                                    {route.quantum.algorithm}
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                    isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                            <div className="px-6 pb-6 border-t border-gray-200">
                                <div className="mt-4 space-y-4">
                                    {/* Quantum Path */}
                                    <div>
                                        <div className="text-sm font-semibold mb-3 text-gray-700">
                                            Quantum Path ({route.quantum.path.length} nodes):
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {route.quantum.path.map((node, idx) => (
                                                <div key={`${route.route_index}-${idx}`} className="flex items-center gap-2">
                                                    <div 
                                                        className="px-3 py-2 rounded-lg text-sm font-mono font-semibold text-white"
                                                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #667eea)' }}
                                                    >
                                                        {node}
                                                    </div>
                                                    {idx < route.quantum.path.length - 1 && (
                                                        <span className="text-gray-400 font-semibold">→</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* QAOA Parameters */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-100">
                                                    <Brain className="w-4 h-4" style={{ color: '#8b5cf6' }} />
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-600">QAOA Layers</div>
                                            <div className="text-xl font-bold" style={{ color: '#8b5cf6' }}>
                                                {route.quantum.p_layers}
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100">
                                                    <Cpu className="w-4 h-4" style={{ color: '#3b82f6' }} />
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-600">Qubits</div>
                                            <div className="text-xl font-bold" style={{ color: '#3b82f6' }}>
                                                {route.quantum.qubits}
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-100">
                                                    <Clock className="w-4 h-4" style={{ color: '#059669' }} />
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-600">Time (ms)</div>
                                            <div className="text-xl font-bold" style={{ color: '#059669' }}>
                                                {(route.quantum.time * 1000).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    {route.mirea && (
                                        <div className="border-t border-gray-200 pt-4">
                                            <div className="text-sm font-semibold mb-3 text-gray-700">
                                                Classical Path:
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {route.mirea.path.map((node, idx) => (
                                                    <div key={`mirea-${route.route_index}-${idx}`} className="flex items-center gap-2">
                                                        <div 
                                                            className="px-3 py-2 rounded-lg text-sm font-mono font-semibold text-white"
                                                            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                                                        >
                                                            {node}
                                                        </div>
                                                        {idx < (route.mirea?.path.length ?? 0) - 1 && (
                                                            <span className="text-gray-400 font-semibold">→</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 flex gap-6 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-100">
                                                        <Zap className="w-3 h-3" style={{ color: '#3b82f6' }} />
                                                    </div>
                                                    <span className="text-gray-600">Cost: </span>
                                                    <span className="font-mono font-semibold text-gray-800">{route.mirea.cost.toFixed(2)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-100">
                                                        <Clock className="w-3 h-3" style={{ color: '#059669' }} />
                                                    </div>
                                                    <span className="text-gray-600">Time: </span>
                                                    <span className="font-mono font-semibold text-gray-800">{(route.mirea.time * 1000).toFixed(2)}ms</span>
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