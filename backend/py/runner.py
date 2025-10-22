#!/usr/bin/env python3
"""
Optimized Quantum Traffic Runner with Parallel Processing
"""
import sys, json, argparse, time
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
from csv_parser import parse_dataset
from traffic_optimizer import EnhancedTrafficOptimizer

mirea_adapter = None
try:
    from mirea_quantum_adapter import MIREAQuantumAdapter
    print("✓ MIREA Quantum adapter available", file=sys.stderr)
except ImportError:
    print("⚠ MIREA Quantum adapter not available", file=sys.stderr)

def process_single_route(args_tuple):
    """Process single route (for parallel execution)"""
    optimizer, start, end, route_idx, p_layers, use_mirea = args_tuple
    
    route_data = {
        'route_index': route_idx,
        'start': start,
        'end': end,
        'quantum': None,
        'mirea': None
    }
    
    # Local QAOA
    try:
        t0 = time.time()
        result = optimizer.solve_quantum(start, end, p=p_layers)
        t1 = time.time() - t0
        
        path = result.get('path', [])
        cost = result.get('cost')
        
        route_data['quantum'] = {
            'path': path if path else [],
            'cost': float(cost) if cost is not None and cost < float('inf') else None,
            'time': t1,
            'algorithm': 'qaoa_simulation',
            'p_layers': p_layers,
            'qubits': len(path) if path else 0
        }
    except Exception as e:
        route_data['quantum'] = {'error': str(e)}
    
    return route_data

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv-file', required=True)
    parser.add_argument('--output', default='/tmp/quantum_results.json')
    parser.add_argument('--max-routes', type=int, default=999999)
    parser.add_argument('--p-layers', type=int, default=1)  # REDUCED from 2 to 1
    parser.add_argument('--workers', type=int, default=4)  # NEW: parallel workers
    parser.add_argument('--use-mirea', action='store_true')
    parser.add_argument('--mirea-email', default='')
    parser.add_argument('--mirea-password', default='')
    parser.add_argument('--mirea-shots', type=int, default=1024)
    parser.add_argument('--mirea-timeout', type=int, default=2)
    args = parser.parse_args()
    
    print("\n🚀 Optimized Quantum Traffic Runner", file=sys.stderr)
    print("="*60, file=sys.stderr)
    print(f"Workers: {args.workers}, QAOA layers: {args.p_layers}", file=sys.stderr)
    
    graphs = parse_dataset(args.csv_file)
    print(f"\n📊 Loaded {len(graphs)} graphs", file=sys.stderr)
    
    results = []
    
    for idx, graph_data in graphs.items():
        print(f"\n{'='*60}", file=sys.stderr)
        print(f"Processing Graph #{graph_data['original_index']}", file=sys.stderr)
        
        matrix = graph_data['matrix']
        routes = graph_data['routes'][:args.max_routes]
        print(f"Routes: {len(routes)}", file=sys.stderr)
        
        optimizer = EnhancedTrafficOptimizer()
        optimizer.adjacency_matrix = matrix
        
        # PARALLEL PROCESSING
        route_results = []
        pure_time = 0
        
        t_start = time.time()
        
        # Prepare tasks
        tasks = [
            (optimizer, start, end, i, args.p_layers, args.use_mirea)
            for i, (start, end) in enumerate(routes)
        ]
        
        # Execute in parallel
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {executor.submit(process_single_route, task): task for task in tasks}
            
            for future in as_completed(futures):
                try:
                    route_data = future.result()
                    route_results.append(route_data)
                except Exception as e:
                    print(f"  ✗ Route error: {e}", file=sys.stderr)
        
        pure_time = time.time() - t_start
        
        # Sort by route_index to maintain order
        route_results.sort(key=lambda x: x['route_index'])
        
        print(f"\n📈 Completed in {pure_time*1000:.0f}ms", file=sys.stderr)
        
        results.append({
            'graph_index': graph_data['original_index'],
            'routes': route_results,
            'stats': {
                'total_routes': len(graph_data['routes']),
                'processed_routes': len(routes),
                'successful': len(route_results),
                'pure_quantum_time': pure_time,
                'mirea_time': None
            }
        })
    
    output = {
        'ok': True,
        'mode': 'quantum',
        'file': args.csv_file,
        'results': results,
        'summary': {
            'total_graphs': len(results),
            'use_mirea': args.use_mirea,
            'mirea_available': mirea_adapter is not None,
            'p_layers': args.p_layers,
            'workers': args.workers,
            'max_routes': args.max_routes
        },
        'csv_base64': '',
        'csv_filename': ''
    }
    
    print(json.dumps(output))
    return 0

if __name__ == '__main__':
    sys.exit(main())
