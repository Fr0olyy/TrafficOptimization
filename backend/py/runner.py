#!/usr/bin/env python3
"""
Quantum Traffic Optimization Runner With MIREA Quantum Integration
"""

import sys
import os
import argparse
import json
import time
import base64
from typing import Dict, List, Tuple, Any

import numpy as np

# Импорт локальных модулей
from csv_parser import parse_dataset
from traffic_optimizer import EnhancedTrafficOptimizer
from qubo_formulator import QUBOIsingFormulator
from qasm_exporter import OpenQASMExporter

# Пытаемся импортировать MIREA адаптер
try:
    from mirea_quantum_adapter import MIREAQuantumAdapter
    MIREA_AVAILABLE = True
except ImportError:
    MIREA_AVAILABLE = False
    print("Warning: MIREA Quantum adapter not available", file=sys.stderr)


def parse_args():
    """Парсинг аргументов командной строки"""
    parser = argparse.ArgumentParser(
        description="Quantum Traffic Optimization with MIREA Quantum Integration"
    )
    
    parser.add_argument(
        '--csv-file',
        type=str,
        required=True,
        help='Path to CSV file with graph data'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        default='results.json',
        help='Output JSON file path (default: results.json)'
    )
    
    parser.add_argument(
        '--graph-index',
        type=int,
        default=None,
        help='Process specific graph index only (default: all graphs)'
    )
    
    parser.add_argument(
        '--use-mirea',
        action='store_true',
        help='Use MIREA quantum backend if available'
    )
    
    parser.add_argument(
        '--p-layers',
        type=int,
        default=3,
        help='Number of QAOA p-layers (default: 3)'
    )
    
    parser.add_argument(
        '--max-routes',
        type=int,
        default=None,
        help='Maximum number of routes to process (default: all)'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose output'
    )
    
    return parser.parse_args()


def adjacency_matrix_to_graph(matrix: np.ndarray) -> Dict[str, Any]:
    """
    Преобразует матрицу смежности в граф
    
    Args:
        matrix: numpy array размером NxN
        
    Returns:
        Dict с ключами nodes, edges, adjacency
    """
    n = matrix.shape[0]
    nodes = list(range(n))
    edges = []
    adjacency = {i: [] for i in range(n)}
    
    for i in range(n):
        for j in range(n):
            weight = matrix[i, j]
            if weight > 0 and not np.isinf(weight) and not np.isnan(weight):
                edges.append((i, j, float(weight)))
                adjacency[i].append((j, float(weight)))
    
    return {
        'nodes': nodes,
        'edges': edges,
        'adjacency': adjacency
    }


def process_graph(
    graph_idx: int,
    adjacency_matrix: np.ndarray,
    route_pairs: List[Tuple[int, int]],
    args: argparse.Namespace
) -> Dict[str, Any]:
    """
    Обработка одного графа
    
    Args:
        graph_idx: Индекс графа
        adjacency_matrix: Матрица смежности
        route_pairs: Список пар (start, end) маршрутов
        args: Аргументы командной строки
        
    Returns:
        Dict с результатами оптимизации
    """
    print(f"\n{'='*80}", file=sys.stderr)
    print(f"Processing Graph #{graph_idx}", file=sys.stderr)
    print(f"{'='*80}", file=sys.stderr)
    print(f"Matrix shape: {adjacency_matrix.shape}", file=sys.stderr)
    print(f"Number of routes: {len(route_pairs)}", file=sys.stderr)
    
    # Конвертируем матрицу в граф
    graph_data = adjacency_matrix_to_graph(adjacency_matrix)
    
    # Ограничиваем количество маршрутов если указано
    if args.max_routes:
        route_pairs = route_pairs[:args.max_routes]
        print(f"Limited to {len(route_pairs)} routes", file=sys.stderr)
    
    # Создаём оптимизатор
    optimizer = EnhancedTrafficOptimizer()
    optimizer.load_graph_from_dict(graph_data)
    
    # Результаты для всех маршрутов
    route_results = []
    
    for route_idx, (start, end) in enumerate(route_pairs):
        print(f"\nRoute {route_idx + 1}/{len(route_pairs)}: {start} -> {end}", file=sys.stderr)
        
        try:
            # Классическое решение (Dijkstra)
            classical_result = optimizer.solve_classical(start, end)
            
            # Квантовое решение (QAOA)
            quantum_result = optimizer.solve_quantum(
                start, 
                end,
                p=args.p_layers
            )
            
            # Сравнение решений
            comparison = optimizer.compare_solutions(
                classical_result,
                quantum_result
            )
            
            route_results.append({
                'route_index': route_idx,
                'start': start,
                'end': end,
                'classical': {
                    'path': classical_result.get('path', []),
                    'cost': classical_result.get('cost', None),
                    'time': classical_result.get('time', None)
                },
                'quantum': {
                    'path': quantum_result.get('path', []),
                    'cost': quantum_result.get('cost', None),
                    'time': quantum_result.get('time', None),
                    'energy': quantum_result.get('energy', None)
                },
                'comparison': comparison
            })
            
            if args.verbose:
                print(f"  Classical: path={classical_result.get('path', [])} "
                      f"cost={classical_result.get('cost', 'N/A')}", file=sys.stderr)
                print(f"  Quantum: path={quantum_result.get('path', [])} "
                      f"cost={quantum_result.get('cost', 'N/A')}", file=sys.stderr)
            
        except Exception as e:
            print(f"  Error processing route: {e}", file=sys.stderr)
            route_results.append({
                'route_index': route_idx,
                'start': start,
                'end': end,
                'error': str(e)
            })
    
    # Агрегированная статистика
    successful_routes = [r for r in route_results if 'error' not in r]
    
    if successful_routes:
        classical_costs = [r['classical']['cost'] for r in successful_routes 
                          if r['classical']['cost'] is not None]
        quantum_costs = [r['quantum']['cost'] for r in successful_routes 
                        if r['quantum']['cost'] is not None]
        
        stats = {
            'total_routes': len(route_pairs),
            'successful': len(successful_routes),
            'failed': len(route_pairs) - len(successful_routes),
            'average_classical_cost': float(np.mean(classical_costs)) if classical_costs else None,
            'average_quantum_cost': float(np.mean(quantum_costs)) if quantum_costs else None,
            'improvement': None
        }
        
        if classical_costs and quantum_costs:
            improvement = ((np.mean(classical_costs) - np.mean(quantum_costs)) / 
                         np.mean(classical_costs) * 100)
            stats['improvement'] = float(improvement)
            print(f"\nAverage improvement: {improvement:.2f}%", file=sys.stderr)
    else:
        stats = {
            'total_routes': len(route_pairs),
            'successful': 0,
            'failed': len(route_pairs)
        }
    
    return {
        'graph_index': graph_idx,
        'metrics': {
            'enhanced': {
                'total_routes': stats['total_routes'],
                'successful_routes': stats['successful'],
                'failed_routes': stats['failed'],
                'average_cost': stats.get('average_quantum_cost', 0),
                'opt_time_ms': sum(r['quantum']['time'] for r in successful_routes) if successful_routes else 0
            }
        },
        'stats': stats,
        'routes': route_results
    }



def main():
    """Главная функция"""
    args = parse_args()
    
    print("="*80, file=sys.stderr)
    print("Quantum Traffic Optimization Runner With MIREA Quantum Integration", file=sys.stderr)
    print("="*80, file=sys.stderr)
    
    # Проверяем доступность MIREA
    if args.use_mirea and not MIREA_AVAILABLE:
        print("ERROR: --use-mirea specified but MIREA adapter not available", file=sys.stderr)
        sys.exit(1)
    
    # Парсим датасет
    print(f"\nParsing dataset: {args.csv_file}", file=sys.stderr)
    
    try:
        graphs_dict = parse_dataset(args.csv_file)
        print(f"✓ Loaded {len(graphs_dict)} graph(s)", file=sys.stderr)
    except Exception as e:
        print(f"ERROR parsing CSV: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Обрабатываем графы
    results = []
    
    # Если указан конкретный граф
    if args.graph_index is not None:
        if args.graph_index not in graphs_dict:
            print(f"ERROR: Graph index {args.graph_index} not found", file=sys.stderr)
            print(f"Available indices: {list(graphs_dict.keys())}", file=sys.stderr)
            sys.exit(1)
        
        graph_data = graphs_dict[args.graph_index]
        result = process_graph(
            graph_idx=graph_data.get('original_index', args.graph_index),
            adjacency_matrix=graph_data['matrix'],
            route_pairs=graph_data['routes'],
            args=args
        )
        results.append(result)
    
    # Иначе обрабатываем все графы
    else:
        for row_order, graph_data in graphs_dict.items():
            graph_idx = graph_data.get('original_index', row_order)
            
            result = process_graph(
                graph_idx=graph_idx,
                adjacency_matrix=graph_data['matrix'],
                route_pairs=graph_data['routes'],
                args=args
            )
            results.append(result)
    
    # Конвертируем numpy типы в Python типы
    def convert_numpy(obj):
        if isinstance(obj, dict):
            return {k: convert_numpy(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [convert_numpy(i) for i in obj]
        elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj
    
    results = convert_numpy(results)
    
    # Формат совместимый с main.go
    output_data = {
        'ok': True,
        'mode': 'quantum',
        'file': os.path.basename(args.csv_file),
        'results': results,
        'summary': {
            'total_graphs': len(results),
            'p_layers': int(args.p_layers),
            'max_routes': int(args.max_routes) if args.max_routes else None,
            'use_mirea': bool(args.use_mirea)
        },
        'csv_base64': '',
        'csv_filename': 'quantum_results.csv'
    }
    
    print(f"\n{'='*80}", file=sys.stderr)
    print(f"Results ready: {len(results)} graphs processed", file=sys.stderr)
    print(f"{'='*80}", file=sys.stderr)
    
    # ТОЛЬКО JSON в stdout без лишнего текста
    print(json.dumps(output_data))
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
