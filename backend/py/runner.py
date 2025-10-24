#!/usr/bin/env python3
"""
Hybrid Traffic Solver: Full Graph JSON + Extended MIREA + dual CSV outputs
"""

import sys, json, argparse, time, base64, random, os
from csv_parser import parse_dataset
from traffic_optimizer import EnhancedTrafficOptimizer
import pandas as pd
from io import StringIO
import numpy as np

try:
    from mirea_quantum_adapter import MIREAQuantumAdapter
except ImportError:
    MIREAQuantumAdapter = None

def save_qasm_file(qasm_code: str, graph_index: int, route_index: int, output_dir: str = "/tmp/qasm_schemes"):
    try:
        os.makedirs(output_dir, exist_ok=True)
        filename = f"graph_{graph_index}_route_{route_index}.qasm"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(qasm_code)
        return filepath
    except Exception:
        return None

def matrix_to_json_safe(matrix: np.ndarray):
    out = []
    for i in range(matrix.shape[0]):
        row = []
        for v in matrix[i].tolist():
            if isinstance(v, float) and (np.isinf(v) or np.isnan(v)):
                row.append(None)
            else:
                row.append(float(v))
        out.append(row)
    return out

def get_mirea_metrics_for_sample(optimizer, start, end, p_layers, mirea_client, graph_idx, route_idx):
    if not mirea_client:
        return {'success': False, 'error': 'MIREA client not initialized'}
    try:
        qasm_result = optimizer.solve_quantum(start, end, p=p_layers)
        qasm_circuit = qasm_result.get('qasm')
        if not qasm_circuit:
            return {'success': False, 'error': 'QASM generation failed'}
        qasm_path = save_qasm_file(qasm_circuit, graph_idx, route_idx)
        t0 = time.time()
        mirea_result = mirea_client.execute_circuit(qasm_circuit=qasm_circuit, shots=mirea_client.shots)
        dt = time.time() - t0
        if mirea_result.get('success'):
            measurements = mirea_result.get('measurements', {})
            top_sorted = sorted(measurements.items(), key=lambda kv: kv[1], reverse=True)[:10]
            top_measurement = top_sorted[0] if top_sorted else (None, 0)
            return {
                'success': True,
                'qasm_path': qasm_path,
                'shots': mirea_client.shots,
                'time': dt,
                'measurements': measurements,
                'top_measurement': top_measurement[0],
                'top_measurement_count': top_measurement[1],
                'top10': top_sorted,
                'total_measurements': len(measurements),
                'algorithm': 'mirea_quantum_computer'
            }
        else:
            return {'success': False, 'error': mirea_result.get('error', 'Unknown MIREA error')}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def calculate_edge_usage(final_paths, matrix_size):
    edge_usage = {}
    for path in final_paths:
        for idx in range(len(path) - 1):
            u, v = path[idx], path[idx + 1]
            edge = (min(u, v), max(u, v))
            edge_usage[edge] = edge_usage.get(edge, 0) + 1
    return edge_usage

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv-file', required=True)
    parser.add_argument('--iterations', type=int, default=15)
    parser.add_argument('--reroute-fraction', type=float, default=0.1)
    parser.add_argument('--use-mirea', action='store_true')
    parser.add_argument('--mirea-email', default='')
    parser.add_argument('--mirea-password', default='')
    parser.add_argument('--mirea-shots', type=int, default=1024)
    parser.add_argument('--mirea-samples', type=int, default=2)
    parser.add_argument('--max-total-mirea-calls', type=int, default=10)
    parser.add_argument('--p-layers', type=int, default=1)
    parser.add_argument('--max-routes', type=int, default=999999)
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()

    mirea_client = None
    if args.use_mirea and MIREAQuantumAdapter and args.mirea_email and args.mirea_password:
        mc = MIREAQuantumAdapter(email=args.mirea_email, password=args.mirea_password)
        if mc.authenticate():
            mc.shots = args.mirea_shots
            mirea_client = mc

    graphs_data = parse_dataset(args.csv_file)

    results = []
    classic_records = []   # для classic.csv
    quantum_records = []   # для quantum.csv
    total_mirea_calls = 0

    optimizer = EnhancedTrafficOptimizer()

    for graph_order_idx, graph_info in graphs_data.items():
        graph_original_index = graph_info['original_index']
        matrix = graph_info['matrix']
        routes_to_plan = graph_info['routes']

        optimizer.adjacency_matrix = matrix

        classical_result = optimizer.solve_with_congestion(
            adjacency_matrix=matrix,
            routes=routes_to_plan,
            iterations=args.iterations,
            reroute_fraction=args.reroute_fraction
        )

        # classic.csv записи
        for driver_idx, path in enumerate(classical_result['final_paths']):
            classic_records.append({
                "graph_index": graph_original_index,
                "driver_index": driver_idx,
                "route": "-".join(map(str, path)),
            })

        # MIREA метрики (и quantum.csv)
        mirea_metrics_samples = []
        if mirea_client and args.mirea_samples > 0 and total_mirea_calls < args.max_total_mirea_calls:
            samples_to_collect = min(args.mirea_samples, args.max_total_mirea_calls - total_mirea_calls, len(routes_to_plan))
            sample_indices = random.sample(range(len(routes_to_plan)), samples_to_collect)
            for sample_idx in sample_indices:
                start_node, end_node = routes_to_plan[sample_idx]
                metrics = get_mirea_metrics_for_sample(
                    optimizer, start_node, end_node, args.p_layers,
                    mirea_client, graph_original_index, sample_idx
                )
                mirea_metrics_samples.append({
                    "route_index_sampled": sample_idx,
                    "start": start_node,
                    "end": end_node,
                    "mirea_metrics": metrics
                })
                if metrics.get('success'):
                    total_mirea_calls += 1
                    quantum_records.append({
                        "graph_index": graph_original_index,
                        "route_index": sample_idx,
                        "start": start_node,
                        "end": end_node,
                        "shots": metrics.get("shots"),
                        "time_sec": metrics.get("time"),
                        "top_measurement": metrics.get("top_measurement"),
                        "top_measurement_count": metrics.get("top_measurement_count"),
                    })

        # Полный граф
        edge_usage = calculate_edge_usage(classical_result['final_paths'], matrix.shape[0])
        graph_edges = []
        for i in range(matrix.shape[0]):
            for j in range(i + 1, matrix.shape[0]):
                w = matrix[i, j]
                if np.isfinite(w) and w > 0:
                    usage = edge_usage.get((i, j), 0)
                    graph_edges.append({"from": i, "to": j, "weight": float(w), "usage": usage})

        results.append({
            'graph_index': graph_original_index,
            'stats': {
                'total_routes': len(routes_to_plan),
                'iterations': classical_result['iterations'],
                'final_cost': classical_result['final_cost_with_congestion'],
                'time_ms': classical_result['time_ms'],
            },
            'mirea_metric_samples': mirea_metrics_samples,
            'graph_node_count': int(matrix.shape[0]),
            'graph_nodes': list(range(int(matrix.shape[0]))),
            'graph_edges': sorted(graph_edges, key=lambda x: x['usage'], reverse=True),
            'total_edges': len(graph_edges),
            'graph_matrix': matrix_to_json_safe(matrix),
        })

    # Сборка двух CSV
    classic_df = pd.DataFrame(classic_records, columns=["graph_index", "driver_index", "route"])
    quantum_df = pd.DataFrame(quantum_records, columns=[
        "graph_index","route_index","start","end","shots","time_sec","top_measurement","top_measurement_count"
    ])

    def to_b64_csv(df: pd.DataFrame) -> str:
        io_obj = StringIO()
        df.to_csv(io_obj, index=False)
        return base64.b64encode(io_obj.getvalue().encode('utf-8')).decode('utf-8')

    csv_files = [
        {"name": "classic.csv", "base64": to_b64_csv(classic_df)},
        {"name": "quantum.csv", "base64": to_b64_csv(quantum_df)},
    ]

    output_json = {
        'ok': True,
        'mode': 'hybrid_with_full_graph',
        'results': results,
        'summary': {
            'total_graphs': len(results),
            'solver_iterations': args.iterations,
            'mirea_samples_requested': args.mirea_samples,
            'total_mirea_calls_made': total_mirea_calls
        },
        # новый массив файлов (обратная совместимость поддерживается в Go)
        'csv_files': csv_files,
        # старые поля можно опустить; main.go обрабатывает новый формат
    }

    print(json.dumps(output_json, ensure_ascii=False, allow_nan=False))
    return 0

if __name__ == '__main__':
    sys.exit(main())
