import sys, json, argparse, time
import numpy as np
from csv_parser import parse_dataset
from traffic_optimizer import EnhancedTrafficOptimizer

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv-file', required=True)
    parser.add_argument('--output', default='/tmp/quantum_results.json')
    parser.add_argument('--max-routes', type=int, default=10)
    parser.add_argument('--p-layers', type=int, default=2)
    parser.add_argument('--use-mirea', action='store_true')
    parser.add_argument('--mirea-email', default='')
    parser.add_argument('--mirea-password', default='')
    parser.add_argument('--mirea-shots', type=int, default=1024)
    args = parser.parse_args()
    
    # ALL DEBUG TO STDERR
    print("\nQuantum Traffic Optimization Runner", file=sys.stderr)
    print("="*60, file=sys.stderr)
    
    graphs = parse_dataset(args.csv_file)
    print(f"\nLoaded {len(graphs)} graphs", file=sys.stderr)
    
    results = []
    
    for idx, graph_data in graphs.items():
        print(f"\n{'='*60}", file=sys.stderr)
        print(f"Processing Graph #{graph_data['original_index']}", file=sys.stderr)
        print(f"{'='*60}", file=sys.stderr)
        
        matrix = graph_data['matrix']
        routes = graph_data['routes'][:args.max_routes]
        print(f"Matrix shape: {matrix.shape}", file=sys.stderr)
        print(f"Limited to {len(routes)} routes\n", file=sys.stderr)
        
        optimizer = EnhancedTrafficOptimizer()
        optimizer.adjacency_matrix = matrix
        
        route_results = []
        pure_time = 0
        
        for i, (start, end) in enumerate(routes, 1):
            print(f"Route {i}/{len(routes)}: {start} -> {end}", file=sys.stderr)
            try:
                t0 = time.time()
                result = optimizer.solve_quantum(start, end, p=args.p_layers)
                t1 = time.time() - t0
                pure_time += t1
                
                path = result.get('path', [])
                cost = result.get('cost')
                
                route_results.append({
                    'route_index': i-1,
                    'start': start,
                    'end': end,
                    'quantum': {
                        'path': path if path else [],
                        'cost': float(cost) if cost is not None and cost < float('inf') else None,
                        'time': t1
                    }
                })
            except Exception as e:
                print(f"Error: {e}", file=sys.stderr)
        
        print(f"\nPure QAOA time: {pure_time*1000:.0f}ms", file=sys.stderr)
        
        results.append({
            'graph_index': graph_data['original_index'],
            'routes': route_results,
            'stats': {'successful': len(route_results), 'pure_quantum_time': pure_time}
        })
    
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"Results: {len(results)} graphs", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)
    
    output = {
        'ok': True,
        'mode': 'quantum',
        'file': args.csv_file,
        'results': results,
        'summary': {'total_graphs': len(results)},
        'csv_base64': '',
        'csv_filename': ''
    }
    
    # ONLY JSON TO STDOUT
    print(json.dumps(output))
    return 0

if __name__ == '__main__':
    sys.exit(main())