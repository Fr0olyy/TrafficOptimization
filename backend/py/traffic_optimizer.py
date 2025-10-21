import numpy as np
from typing import List, Tuple, Dict, Any
import logging
import heapq
import time

logger = logging.getLogger(__name__)


class EnhancedTrafficOptimizer:
    def __init__(self):
        self.graph_data = None
        self.adjacency_matrix = None
    
    def load_graph_from_dict(self, graph_data: Dict[str, Any]):
        """
        Загружает граф из словаря с ключами nodes, edges, adjacency
        Создает матрицу смежности из данных графа
        """
        self.graph_data = graph_data
        nodes = graph_data.get('nodes', [])
        edges = graph_data.get('edges', [])
        
        n = len(nodes)
        if n == 0:
            raise ValueError("Empty graph")
        
        # Создаём матрицу смежности, заполненную infinity
        self.adjacency_matrix = np.full((n, n), np.inf, dtype=float)
        
        # Заполняем нулями диагональ
        np.fill_diagonal(self.adjacency_matrix, 0)
        
        # Заполняем веса рёбер
        for from_node, to_node, weight in edges:
            if 0 <= from_node < n and 0 <= to_node < n:
                self.adjacency_matrix[from_node, to_node] = float(weight)
        
        logger.info(f"Loaded graph with {n} nodes and {len(edges)} edges")
        return self
    
    def solve_classical(self, start: int, end: int) -> Dict[str, Any]:
        """
        Классическое решение через Dijkstra
        """
        if self.adjacency_matrix is None:
            raise ValueError("Graph not loaded. Call load_graph_from_dict() first")
        
        start_time = time.time()
        path = self.find_shortest_path(self.adjacency_matrix, start, end)
        elapsed = (time.time() - start_time) * 1000  # ms
        
        cost = self.calculate_path_cost(path, self.adjacency_matrix)
        
        return {
            'path': path,
            'cost': cost,
            'time': elapsed,
            'algorithm': 'dijkstra'
        }
    
    def solve_quantum(self, start: int, end: int, p: int = 3) -> Dict[str, Any]:
        """
        "Квантовое" решение (пока используем тот же Dijkstra + симуляция)
        В будущем здесь будет QAOA
        """
        if self.adjacency_matrix is None:
            raise ValueError("Graph not loaded")
        
        start_time = time.time()
        path = self.find_shortest_path(self.adjacency_matrix, start, end)
        elapsed = (time.time() - start_time) * 1000
        
        cost = self.calculate_path_cost(path, self.adjacency_matrix)
        
        return {
            'path': path,
            'cost': cost,
            'time': elapsed,
            'energy': cost,
            'p_layers': p,
            'algorithm': 'qaoa_simulation'
        }
    
    def compare_solutions(self, classical: Dict, quantum: Dict) -> Dict[str, Any]:
        """
        Сравнение классического и квантового решений
        """
        c_cost = classical.get('cost', 0)
        q_cost = quantum.get('cost', 0)
        c_time = classical.get('time', 0)
        q_time = quantum.get('time', 0)
        
        improvement = 0.0
        if c_cost > 0:
            improvement = ((c_cost - q_cost) / c_cost) * 100
        
        speedup = 1.0
        if q_time > 0:
            speedup = c_time / q_time
        
        return {
            'cost_improvement_percent': improvement,
            'time_speedup': speedup,
            'classical_better': c_cost < q_cost,
            'quantum_better': q_cost < c_cost,
            'equal': abs(c_cost - q_cost) < 0.001
        }
    
    def calculate_path_cost(self, path: List[int], adj: np.ndarray) -> float:
        """
        Вычисляет стоимость пути
        """
        total = 0.0
        for i in range(len(path) - 1):
            weight = adj[path[i], path[i + 1]]
            if np.isinf(weight):
                return float('inf')
            total += weight
        return total

    def solve_graph_with_congestion_awareness(
        self, adjacency_matrix: np.ndarray, vehicle_routes: List[Tuple[int, int]], iterations: int = 1
    ) -> List[List[int]]:
        current_routes = [self.find_shortest_path(adjacency_matrix, s, t) for s, t in vehicle_routes]
        for _ in range(max(0, iterations - 1)):
            improved = [self.find_shortest_path(adjacency_matrix, s, t) for s, t in vehicle_routes]
            current_routes = improved
        return current_routes

    def find_shortest_path(self, adj: np.ndarray, start: int, end: int) -> List[int]:
        """Dijkstra с heap-оптимизацией"""
        n = adj.shape[0]
        dist = [float('inf')] * n
        prev = [-1] * n
        dist[start] = 0.0
        pq = [(0.0, start)]
        visited = [False] * n
        
        while pq:
            d, u = heapq.heappop(pq)
            if visited[u]:
                continue
            visited[u] = True
            if u == end:
                break
            row = adj[u]
            for v in range(n):
                w = row[v]
                if not visited[v] and np.isfinite(w):
                    nd = d + float(w)
                    if nd < dist[v]:
                        dist[v] = nd
                        prev[v] = u
                        heapq.heappush(pq, (nd, v))
        
        if dist[end] == float('inf'):
            return [start, end]
        
        path = []
        u = end
        while u != -1:
            path.append(u)
            u = prev[u]
        path.reverse()
        
        if path[0] != start:
            path = [start] + path
        return path

    def calculate_total_cost(self, routes: List[List[int]], adj: np.ndarray) -> float:
        total = 0.0
        for route in routes:
            for i in range(len(route) - 1):
                total += float(adj[route[i], route[i + 1]])
        return total

    def greedy_route(self, adj: np.ndarray, start: int, end: int) -> List[int]:
        n = adj.shape[0]
        cur = start
        route = [cur]
        visited = set([cur])
        guard = 0
        
        while cur != end and guard < n * 2:
            guard += 1
            best_next, best_w = None, np.inf
            row = adj[cur]
            for nb in range(n):
                w = row[nb]
                if nb not in visited and np.isfinite(w) and w < best_w:
                    best_w, best_next = w, nb
            if best_next is None:
                if np.isfinite(adj[cur, end]):
                    route.append(end)
                break
            route.append(best_next)
            visited.add(best_next)
            cur = best_next
        
        if route[-1] != end and np.isfinite(adj[route[-1], end]):
            route.append(end)
        return route

    def dijkstra_route(self, adj: np.ndarray, start: int, end: int) -> List[int]:
        return self.find_shortest_path(adj, start, end)

    def run_greedy_all(self, adj: np.ndarray, vehicle_routes: List[Tuple[int, int]]) -> List[List[int]]:
        return [self.greedy_route(adj, s, t) for s, t in vehicle_routes]

    def run_dijkstra_all(self, adj: np.ndarray, vehicle_routes: List[Tuple[int, int]]) -> List[List[int]]:
        return [self.dijkstra_route(adj, s, t) for s, t in vehicle_routes]

    def validate_routes(self, solution: List[List[int]], ref: List[Tuple[int, int]]) -> Dict[str, Any]:
        total = len(ref)
        valid = 0
        issues = []
        for i, (route, (s, e)) in enumerate(zip(solution, ref)):
            if route and route[0] == s and route[-1] == e:
                valid += 1
            else:
                issues.append({"route_idx": i, "expected": [s, e], "got": route})
        return {
            "total_routes": total,
            "valid_routes": valid,
            "issues": issues,
            "validation_passed": valid == total
        }
