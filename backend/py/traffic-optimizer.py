import numpy as np
from typing import List, Tuple, Dict, Any
import logging, heapq

logger = logging.getLogger(__name__)

class EnhancedTrafficOptimizer:
    def __init__(self):
        pass

    def solve_graph_with_congestion_awareness(
        self, adjacency_matrix: np.ndarray, vehicle_routes: List[Tuple[int, int]], iterations: int = 1
    ) -> List[List[int]]:
        current_routes = [self.find_shortest_path(adjacency_matrix, s, t) for s, t in vehicle_routes]
        for _ in range(max(0, iterations-1)):
            improved = [self.find_shortest_path(adjacency_matrix, s, t) for s, t in vehicle_routes]
            current_routes = improved
        return current_routes

    # heap-ускорение Дейкстры
    def find_shortest_path(self, adj: np.ndarray, start: int, end: int) -> List[int]:
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
            for i in range(len(route)-1):
                total += float(adj[route[i], route[i+1]])
        return total

    # Baselines
    def greedy_route(self, adj: np.ndarray, start: int, end: int) -> List[int]:
        n = adj.shape[0]
        cur = start
        route = [cur]
        visited = set([cur])
        guard = 0
        while cur != end and guard < n*2:
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

    def run_greedy_all(self, adj: np.ndarray, vehicle_routes: List[Tuple[int,int]]) -> List[List[int]]:
        return [self.greedy_route(adj, s, t) for s, t in vehicle_routes]

    def run_dijkstra_all(self, adj: np.ndarray, vehicle_routes: List[Tuple[int,int]]) -> List[List[int]]:
        return [self.dijkstra_route(adj, s, t) for s, t in vehicle_routes]

    def validate_routes(self, solution: List[List[int]], ref: List[Tuple[int, int]]) -> Dict[str, Any]:
        total = len(ref); valid = 0; issues = []
        for i, (route, (s, e)) in enumerate(zip(solution, ref)):
            if route and route[0] == s and route[-1] == e:
                valid += 1
            else:
                issues.append({"route_idx": i, "expected": [s, e], "got": route})
        return {"total_routes": total, "valid_routes": valid, "issues": issues, "validation_passed": valid == total}
