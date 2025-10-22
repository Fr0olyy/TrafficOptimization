import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Zap,
  Clock,
  Cpu,
  Route,
  Gauge,
  Brain,
} from "lucide-react";
import type { RouteDetail } from "../../types";
import "./RoutesList.css";

interface RoutesListProps {
  routes: RouteDetail[];
  onRouteSelect?: (route: RouteDetail) => void;
}

export function RoutesList({ routes, onRouteSelect }: RoutesListProps) {
  const [expandedRoute, setExpandedRoute] = useState<number | null>(null);

  if (!routes || routes.length === 0) {
    return (
      <div className="routes-empty-state">
        <div className="empty-icon">🛣️</div>
        <h3 className="empty-title">No Routes Available</h3>
        <p className="empty-description">
          Route data will appear here after processing your traffic optimization
          problem.
        </p>
      </div>
    );
  }

  const getQuantumEfficiency = (
    quantumCost: number,
    classicalCost?: number | null
  ) => {
    if (!classicalCost || classicalCost === 0) return 0;
    return ((classicalCost - quantumCost) / classicalCost) * 100;
  };

  return (
    <div className="routes-list">
      {routes.map((route) => {
        const isExpanded = expandedRoute === route.route_index;
        const efficiency = getQuantumEfficiency(
          route.quantum.cost,
          route.mirea?.cost
        );
        const hasAdvantage = efficiency > 0;

        return (
          <div
            key={route.route_index}
            className={`route-card ${isExpanded ? "expanded" : ""} ${
              hasAdvantage ? "advantage" : ""
            }`}
          >
            {/* Header */}
            <div
              className="route-header"
              onClick={() => {
                setExpandedRoute(isExpanded ? null : route.route_index);
                onRouteSelect?.(route);
              }}
            >
              <div className="route-identity">
                <div className="route-icon">
                  <Route className="route-icon-svg" />
                  <span className="route-number">#{route.route_index + 1}</span>
                </div>
                <div className="route-info">
                  <div className="route-endpoints">
                    <MapPin className="endpoint-icon" />
                    <span className="start-node">{route.start}</span>
                    <div className="connection-line" />
                    <span className="end-node">{route.end}</span>
                  </div>
                  <div className="route-metrics">
                    <div className="metric-tag quantum">
                      <Zap className="metric-icon" />
                      <span>{route.quantum.cost.toFixed(1)} cost</span>
                    </div>
                    <div className="metric-tag">
                      <Clock className="metric-icon" />
                      <span>{(route.quantum.time * 1000).toFixed(0)}ms</span>
                    </div>
                    <div className="metric-tag">
                      <Cpu className="metric-icon" />
                      <span>{route.quantum.qubits} qubits</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="route-status">
                {route.mirea && (
                  <div
                    className={`efficiency-badge ${
                      hasAdvantage ? "positive" : "neutral"
                    }`}
                  >
                    <Gauge className="efficiency-icon" />
                    <span>
                      {hasAdvantage ? "+" : ""}
                      {efficiency.toFixed(1)}%
                    </span>
                  </div>
                )}
                <div className="algorithm-badge">{route.quantum.algorithm}</div>
                {isExpanded ? (
                  <ChevronUp className="expand-icon" />
                ) : (
                  <ChevronDown className="expand-icon" />
                )}
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="route-details">
                <div className="details-grid">
                  {/* Quantum Solution */}
                  <div className="solution-section quantum">
                    <div className="solution-header">
                      <Zap className="solution-icon quantum" />
                      <h4>Quantum Solution</h4>
                      <div className="solution-badge quantum">QAOA</div>
                    </div>

                    <div className="path-visualization">
                      <div className="path-label">Optimal Path</div>
                      <div className="path-nodes">
                        {route.quantum.path.map((node, idx) => (
                          <div key={idx} className="path-step">
                            <div className="node-circle quantum">{node}</div>
                            {idx < route.quantum.path.length - 1 && (
                              <div className="connection-line animated" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="quantum-params">
                      <div className="param-card">
                        <Brain className="param-icon" />
                        <div className="param-content">
                          <div className="param-value">
                            {route.quantum.p_layers}
                          </div>
                          <div className="param-label">QAOA Layers</div>
                        </div>
                      </div>
                      <div className="param-card">
                        <Cpu className="param-icon" />
                        <div className="param-content">
                          <div className="param-value">
                            {route.quantum.qubits}
                          </div>
                          <div className="param-label">Qubits Used</div>
                        </div>
                      </div>
                      <div className="param-card">
                        <Clock className="param-icon" />
                        <div className="param-content">
                          <div className="param-value">
                            {(route.quantum.time * 1000).toFixed(0)}
                          </div>
                          <div className="param-label">ms Runtime</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Classical Solution */}
                  {route.mirea && (
                    <div className="solution-section classical">
                      <div className="solution-header">
                        <Route className="solution-icon classical" />
                        <h4>Classical Solution</h4>
                        <div className="solution-badge classical">MIREA</div>
                      </div>

                      <div className="path-visualization">
                        <div className="path-label">Classical Path</div>
                        <div className="path-nodes">
                          {route.mirea.path.map((node, idx) => (
                            <div key={idx} className="path-step">
                              <div className="node-circle classical">
                                {node}
                              </div>
                              {idx < (route.mirea?.path.length ?? 0) - 1 && (
                                <div className="connection-line" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="comparison-stats">
                        <div className="comparison-item">
                          <span className="comparison-label">
                            Cost Difference:
                          </span>
                          <span
                            className={`comparison-value ${
                              hasAdvantage ? "positive" : "neutral"
                            }`}
                          >
                            {hasAdvantage ? "-" : "+"}
                            {Math.abs(
                              route.mirea.cost - route.quantum.cost
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="comparison-item">
                          <span className="comparison-label">
                            Time Difference:
                          </span>
                          <span className="comparison-value positive">
                            -
                            {Math.abs(
                              route.mirea.time - route.quantum.time
                            ).toFixed(3)}
                            s
                          </span>
                        </div>
                        <div className="comparison-item">
                          <span className="comparison-label">
                            Quantum Efficiency:
                          </span>
                          <span
                            className={`comparison-value ${
                              hasAdvantage ? "positive" : "neutral"
                            }`}
                          >
                            {hasAdvantage ? "+" : ""}
                            {efficiency.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* No Classical Solution Message */}
                  {!route.mirea && (
                    <div className="solution-section classical">
                      <div className="solution-header">
                        <Route className="solution-icon classical" />
                        <h4>Classical Solution</h4>
                        <div className="solution-badge neutral">
                          Not Available
                        </div>
                      </div>
                      <div className="no-solution-message">
                        <p>
                          Classical algorithm solution is not available for this
                          route.
                        </p>
                        <p className="no-solution-subtitle">
                          The quantum solution provides the optimal path.
                        </p>
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
