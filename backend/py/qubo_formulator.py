# QUBO / Ising formulator (sparse, batched, filtered)

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple, List, Any

import numpy as np

Var = Tuple[int, int, int]  # (vehicle, step, node)

@dataclass
class Subproblem:
    vehicle_indices: List[int]
    variable_mapping: Dict[Var, int]
    qubo_Q: Dict[Tuple[int, int], float]
    num_variables: int

class QUBOIsingFormulator:
    def __init__(self, adjacency_matrix: np.ndarray, vehicle_routes: List[Tuple[int, int]]):
        self.W = adjacency_matrix.astype(float, copy=False)
        self.routes = list(vehicle_routes)
        self.N = self.W.shape[0]

    def create_subproblem(self, vehicle_indices: List[int], max_qubits: int = 64, max_steps: int | None = None) -> Dict[str, Any]:
        if not vehicle_indices:
            raise ValueError("vehicle_indices cannot be empty")

        reach = np.isfinite(self.W).astype(int)
        np.fill_diagonal(reach, 1)
        R = reach.copy()
        for k in range(self.N):
            R = np.logical_or(R, np.logical_and(R[:, [k]], R[[k], :]))

        T = self.N - 1 if max_steps is None else min(max_steps, self.N - 1)

        var_id: Dict[Var, int] = {}
        vid = 0
        for v in vehicle_indices:
            s, t = self.routes[v]
            candidates = [i for i in range(self.N) if R[s, i] and R[i, t]]
            for step in range(T + 1):
                for i in candidates:
                    var = (v, step, i)
                    var_id[var] = vid
                    vid += 1
                    if vid >= max_qubits:
                        break
                if vid >= max_qubits:
                    break
            if vid >= max_qubits:
                break

        if vid == 0:
            raise ValueError("No variables after filtering; increase max_qubits or relax filtering")

        Q: Dict[Tuple[int, int], float] = {}
        P_endpoints = 10.0
        P_onehot_time = 5.0
        P_flow = 2.0
        P_cost = 1.0

        def addQ(i: int, j: int, val: float):
            if i > j:
                i, j = j, i
            if val == 0.0:
                return
            Q[(i, j)] = Q.get((i, j), 0.0) + val

        for v in vehicle_indices:
            s, t = self.routes[v]
            idxs0 = [var_id[(v, 0, i)] for i in range(self.N) if (v, 0, i) in var_id]
            for q in idxs0:
                addQ(q, q, P_endpoints * (1.0 if (v, 0, s) in var_id and var_id[(v, 0, s)] == q else -1.0))
            idxsT = [var_id[(v, T, i)] for i in range(self.N) if (v, T, i) in var_id]
            for q in idxsT:
                addQ(q, q, P_endpoints * (1.0 if (v, T, t) in var_id and var_id[(v, T, t)] == q else -1.0))

        for v in vehicle_indices:
            for t in range(T + 1):
                idxs = [var_id[(v, t, i)] for i in range(self.N) if (v, t, i) in var_id]
                for q in idxs:
                    addQ(q, q, P_onehot_time * (1.0 - 2.0))
                for a in range(len(idxs)):
                    qa = idxs[a]
                    for b in range(a + 1, len(idxs)):
                        qb = idxs[b]
                        addQ(qa, qb, 2.0 * P_onehot_time)

        finite = np.isfinite(self.W)
        for v in vehicle_indices:
            for t in range(T):
                idxs_i = [i for i in range(self.N) if (v, t, i) in var_id]
                idxs_j = [j for j in range(self.N) if (v, t + 1, j) in var_id]
                for i in idxs_i:
                    qi = var_id[(v, t, i)]
                    for j in idxs_j:
                        if not finite[i, j] and i != j:
                            qj = var_id[(v, t + 1, j)]
                            addQ(qi, qj, P_flow)

        for v in vehicle_indices:
            for t in range(T):
                for i in range(self.N):
                    if (v, t, i) not in var_id:
                        continue
                    qi = var_id[(v, t, i)]
                    for j in range(self.N):
                        if (v, t + 1, j) not in var_id:
                            continue
                        if not finite[i, j]:
                            continue
                        w = float(self.W[i, j])
                        if i != j:
                            qj = var_id[(v, t + 1, j)]
                            addQ(qi, qj, P_cost * w)

        sub = Subproblem(
            vehicle_indices=list(vehicle_indices),
            variable_mapping=var_id,
            qubo_Q=Q,
            num_variables=vid,
        )
        return {
            "vehicle_indices": sub.vehicle_indices,
            "variable_mapping": sub.variable_mapping,
            "qubo_matrix": sub.qubo_Q,
            "num_variables": sub.num_variables,
        }

    def qubo_to_ising(self, Q_sparse: Dict[Tuple[int, int], float]) -> Tuple[Dict[int, float], Dict[Tuple[int, int], float], float]:
        h: Dict[int, float] = {}
        J: Dict[Tuple[int, int], float] = {}
        offset = 0.0
        for (i, j), q in Q_sparse.items():
            if i == j:
                offset += 0.5 * q
                h[i] = h.get(i, 0.0) + 0.5 * q
            else:
                offset += 0.25 * q
                h[i] = h.get(i, 0.0) + 0.25 * q
                h[j] = h.get(j, 0.0) + 0.25 * q
                key = (i, j) if i < j else (j, i)
                J[key] = J.get(key, 0.0) + 0.25 * q
        return h, J, offset

    def export_ising_data(self, subproblem_data: Dict[str, Any]) -> Dict[str, Any]:
        Q = subproblem_data["qubo_matrix"]
        h, J, offset = self.qubo_to_ising(Q)
        J_serializable = {f"{i}_{j}": coeff for (i, j), coeff in J.items()}
        return {
            "vehicle_indices": subproblem_data["vehicle_indices"],
            "variable_mapping": subproblem_data["variable_mapping"],
            "ising_h": h,
            "ising_J": J_serializable,
            "ising_offset": offset,
            "num_variables": subproblem_data["num_variables"],
        }
