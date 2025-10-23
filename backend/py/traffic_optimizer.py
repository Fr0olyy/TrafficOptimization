import numpy as np
from typing import List, Tuple, Dict, Any
import logging
import heapq
import time
import random
import sys

logger = logging.getLogger(__name__)

class EnhancedTrafficOptimizer:
    def __init__(self):
        self.base_adjacency_matrix = None
        self.adjacency_matrix = None # Добавлено для совместимости

    # --- НАШ НОВЫЙ, ЭФФЕКТИВНЫЙ МЕТОД ---
    def solve_with_congestion(
        self,
        adjacency_matrix: np.ndarray,
        routes: List[Tuple[int, int]],
        iterations: int = 15,
        reroute_fraction: float = 0.1
    ) -> Dict[str, Any]:
        """
        Основной метод для решения задачи с учетом загруженности.
        """
        start_time = time.time()
        self.base_adjacency_matrix = adjacency_matrix.copy()
        num_vehicles = len(routes)

        current_paths = [self.find_shortest_path(self.base_adjacency_matrix, s, t) for s, t in routes]

        initial_congestion = self.build_congestion_matrix(current_paths)
        initial_cost = self.calculate_total_cost_with_congestion(current_paths, self.base_adjacency_matrix, initial_congestion)
        history = [{'cost': initial_cost, 'iteration': 0}]

        for i in range(iterations):
            congestion_matrix = self.build_congestion_matrix(current_paths)
            cost_matrix = self.base_adjacency_matrix * (congestion_matrix * congestion_matrix)

            indices_to_reroute = random.sample(range(num_vehicles), int(num_vehicles * reroute_fraction))

            for vehicle_idx in indices_to_reroute:
                start_node, end_node = routes[vehicle_idx]
                
                path_to_remove = current_paths[vehicle_idx]
                self.update_congestion_matrix(congestion_matrix, path_to_remove, -1)
                
                cost_matrix_for_reroute = self.base_adjacency_matrix * (congestion_matrix * congestion_matrix)
                
                new_path = self.find_shortest_path(cost_matrix_for_reroute, start_node, end_node)
                
                if new_path:
                    current_paths[vehicle_idx] = new_path
                    self.update_congestion_matrix(congestion_matrix, new_path, 1)

            final_congestion = self.build_congestion_matrix(current_paths)
            total_cost = self.calculate_total_cost_with_congestion(current_paths, self.base_adjacency_matrix, final_congestion)
            history.append({'cost': total_cost, 'iteration': i + 1})
            print(f"  Iter {i+1}/{iterations}: Total Cost = {total_cost:.2f}", file=sys.stderr)

        elapsed_ms = (time.time() - start_time) * 1000

        return {
            "final_paths": current_paths,
            "initial_cost": initial_cost,
            "final_cost_with_congestion": history[-1]['cost'],
            "iterations": iterations,
            "time_ms": elapsed_ms,
            "cost_history": history
        }

    # --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ НОВОГО МЕТОДА ---
    def build_congestion_matrix(self, paths: List[List[int]]) -> np.ndarray:
        n = self.base_adjacency_matrix.shape[0]
        congestion = np.zeros((n, n), dtype=int)
        for path in paths:
            if not path: continue
            for i in range(len(path) - 1):
                u, v = path[i], path[i+1]
                congestion[u, v] += 1
        return congestion

    def update_congestion_matrix(self, congestion_matrix: np.ndarray, path: List[int], delta: int):
        if not path: return
        for i in range(len(path) - 1):
            u, v = path[i], path[i+1]
            congestion_matrix[u, v] = max(0, congestion_matrix[u, v] + delta)

    def calculate_total_cost_with_congestion(self, paths: List[List[int]], base_adj: np.ndarray, congestion: np.ndarray) -> float:
        cost_matrix = base_adj * (congestion * congestion)
        total_cost = 0.0
        for path in paths:
            if not path: continue
            for i in range(len(path) - 1):
                u, v = path[i], path[i+1]
                total_cost += cost_matrix[u, v]
        return total_cost

    def find_shortest_path(self, adj: np.ndarray, start: int, end: int) -> List[int]:
        n = adj.shape[0]
        dist = np.full(n, np.inf)
        prev = np.full(n, -1, dtype=int)
        dist[start] = 0.0
        pq = [(0.0, start)]

        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]: continue
            if u == end: break
            for v in range(n):
                weight = adj[u, v]
                if np.isfinite(weight) and dist[u] + weight < dist[v]:
                    dist[v] = dist[u] + weight
                    prev[v] = u
                    heapq.heappush(pq, (dist[v], v))
        
        path = []
        if np.isfinite(dist[end]):
            curr = end
            while curr != -1:
                path.append(curr)
                curr = prev[curr]
            path.reverse()
        
        return path if path and path[0] == start else []

    # --- СТАРЫЙ МЕТОД, ВОЗВРАЩЕН ДЛЯ СБОРА МЕТРИК MIREA ---
    def solve_quantum(self, start: int, end: int, p: int = 1) -> Dict[str, Any]:
        """
        Квантовое решение с генерацией QAOA схемы.
        Используется ТОЛЬКО для сбора метрик с MIREA.
        """
        if self.adjacency_matrix is None:
            raise ValueError("Graph not loaded. Set optimizer.adjacency_matrix first.")
        
        path = self.find_shortest_path(self.adjacency_matrix, start, end)
        cost = self.calculate_path_cost(path, self.adjacency_matrix)
        
        qasm_circuit = None
        num_qubits = 0
        
        try:
            from qubo_formulator import QUBOIsingFormulator
            from qasm_exporter import OpenQASMExporter
            
            routes = [(start, end)]
            formulator = QUBOIsingFormulator(self.adjacency_matrix, routes)
            
            subproblem = formulator.create_subproblem(
                vehicle_indices=[0],
                max_qubits=20,
                max_steps=min(5, len(self.adjacency_matrix) - 1)
            )
            
            num_qubits = subproblem['num_variables']
            h, J, offset = formulator.qubo_to_ising(subproblem['qubo_matrix'])
            
            exporter = OpenQASMExporter(version="2.0")
            qasm_circuit = exporter.generate_qaoa_circuit(h, J, num_layers=p)
            
        except Exception as e:
            logger.warning(f"Failed to generate QAOA circuit: {e}")
            qasm_circuit = None
        
        return {
            'path': path,
            'cost': cost,
            'qasm': qasm_circuit,
            'num_qubits': num_qubits
        }

    def calculate_path_cost(self, path: List[int], adj: np.ndarray) -> float:
        """Вспомогательная функция для старого метода"""
        total = 0.0
        for i in range(len(path) - 1):
            weight = adj[path[i], path[i + 1]]
            if np.isinf(weight):
                return float('inf')
            total += weight
        return total
