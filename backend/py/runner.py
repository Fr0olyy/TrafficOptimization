#!/usr/bin/env python3
"""
Hybrid Traffic Solver: Iterative Classical for Solution + MIREA for Metrics + Scheme Archiving
"""
import sys, json, argparse, time, base64, random, os
from csv_parser import parse_dataset
from traffic_optimizer import EnhancedTrafficOptimizer
import pandas as pd
from io import StringIO

# --- MIREA Integration ---
mirea_adapter = None
try:
    from mirea_quantum_adapter import MIREAQuantumAdapter
    print("✓ MIREA Quantum adapter available", file=sys.stderr)
except ImportError:
    print("⚠ MIREA Quantum adapter not available", file=sys.stderr)
# -------------------------


def save_qasm_to_json(qasm_code: str, graph_index: int, route_index: int, output_dir: str = "quantum_schemes"):
    """
    Сохраняет QASM-код в JSON-файл в указанную директорию.
    """
    try:
        # Папка будет создана внутри контейнера в /app/quantum_schemes
        os.makedirs(output_dir, exist_ok=True)
        filename = f"graph_{graph_index}_route_{route_index}.json"
        filepath = os.path.join(output_dir, filename)

        data_to_save = {
            "graph_index": graph_index,
            "route_index": route_index,
            "qasm_code": qasm_code
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data_to_save, f, ensure_ascii=False, indent=2)
        
        print(f"  ✓ Saved QASM for route {route_index} to {filepath}", file=sys.stderr)
        return filepath
    except Exception as e:
        print(f"  ✗ Failed to save QASM for route {route_index}: {e}", file=sys.stderr)
        return None


def get_mirea_metrics_for_sample(optimizer, start, end, p_layers, mirea_client, graph_idx, route_idx):
    """
    Вспомогательная функция для получения метрик от MIREA, теперь с сохранением схемы.
    """
    if not mirea_client:
        return {'success': False, 'error': 'MIREA client not initialized'}
    
    try:
        qasm_result = optimizer.solve_quantum(start, end, p=p_layers)
        qasm_circuit = qasm_result.get('qasm')

        if not qasm_circuit:
            return {'success': False, 'error': 'QASM generation failed'}

        # <<< --- НОВЫЙ ШАГ: СОХРАНЯЕМ СХЕМУ ПЕРЕД ОТПРАВКОЙ --- >>>
        save_qasm_to_json(qasm_circuit, graph_idx, route_idx)

        t0_mirea = time.time()
        mirea_result = mirea_client.execute_circuit(
            qasm_circuit=qasm_circuit,
            shots=mirea_client.shots
        )
        t1_mirea = time.time() - t0_mirea

        if mirea_result.get('success'):
            return {
                'success': True,
                'measurements': mirea_result.get('measurements', {}),
                'time': t1_mirea,
                'shots': mirea_client.shots,
                'algorithm': 'mirea_quantum_computer'
            }
        else:
            return {'success': False, 'error': mirea_result.get('error', 'Unknown MIREA error')}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}


def main():
    parser = argparse.ArgumentParser()
    # Аргументы для решателя
    parser.add_argument('--csv-file', required=True)
    parser.add_argument('--iterations', type=int, default=15)
    parser.add_argument('--reroute-fraction', type=float, default=0.1)
    # Аргументы для MIREA
    parser.add_argument('--use-mirea', action='store_true')
    parser.add_argument('--mirea-email', default='')
    parser.add_argument('--mirea-password', default='')
    parser.add_argument('--mirea-shots', type=int, default=1024)
    parser.add_argument('--mirea-samples', type=int, default=3)
    parser.add_argument('--p-layers', type=int, default=1)
    # Аргументы для совместимости
    parser.add_argument('--max-routes', type=int, default=999999)
    parser.add_argument('--workers', type=int, default=4)

    args = parser.parse_args()
    
    print("🚀 Hybrid Traffic Solver [with QASM Archiving]", file=sys.stderr)
    
    # Инициализация клиента MIREA
    mirea_client = None
    if args.use_mirea and MIREAQuantumAdapter and args.mirea_email and args.mirea_password:
        mirea_client = MIREAQuantumAdapter(email=args.mirea_email, password=args.mirea_password)
        if mirea_client.authenticate():
            mirea_client.shots = args.mirea_shots
            print("✓ MIREA client initialized for metrics collection", file=sys.stderr)
        else:
            print("✗ MIREA authentication failed", file=sys.stderr)
            mirea_client = None
    
    # Основная логика
    graphs_data = parse_dataset(args.csv_file)
    all_results_for_json = []
    submission_df = pd.DataFrame()
    optimizer = EnhancedTrafficOptimizer()

    for graph_order_idx, graph_info in graphs_data.items():
        graph_original_index = graph_info['original_index']
        print(f"\n{'='*40}\nProcessing Graph #{graph_original_index}", file=sys.stderr)
        
        matrix = graph_info['matrix']
        routes_to_plan = graph_info['routes']
        optimizer.adjacency_matrix = matrix

        # 1. Запускаем классический решатель
        print("  1. Running iterative classical solver for submission...", file=sys.stderr)
        classical_result = optimizer.solve_with_congestion(
            adjacency_matrix=matrix,
            routes=routes_to_plan,
            iterations=args.iterations,
            reroute_fraction=args.reroute_fraction
        )
        print(f"  📈 Classical solver done. Final Cost: {classical_result['final_cost_with_congestion']:.2f}", file=sys.stderr)

        # 2. Собираем метрики MIREA и сохраняем схемы
        mirea_metrics_samples = []
        if mirea_client and args.mirea_samples > 0:
            print(f"  2. Collecting MIREA metrics for {args.mirea_samples} sample routes...", file=sys.stderr)
            sample_indices = random.sample(range(len(routes_to_plan)), min(args.mirea_samples, len(routes_to_plan)))
            
            for sample_idx in sample_indices:
                start_node, end_node = routes_to_plan[sample_idx]
                # Передаем индексы для сохранения файла
                metrics = get_mirea_metrics_for_sample(optimizer, start_node, end_node, args.p_layers, mirea_client, graph_original_index, sample_idx)
                mirea_metrics_samples.append({
                    "route_index_sampled": sample_idx,
                    "start": start_node,
                    "end": end_node,
                    "mirea_metrics": metrics
                })
            print("  ✓ MIREA metrics and schemes collection complete.", file=sys.stderr)

        # Собираем финальный JSON
        all_results_for_json.append({
            'graph_index': graph_original_index,
            'stats': {
                'total_routes': len(routes_to_plan),
                'iterations': classical_result['iterations'],
                'final_cost': classical_result['final_cost_with_congestion'],
                'time_ms': classical_result['time_ms'],
            },
            'mirea_metric_samples': mirea_metrics_samples
        })

        # Создаем DataFrame для submission.csv
        records = []
        for driver_idx, path in enumerate(classical_result['final_paths']):
            route_str = "-".join(map(str, path))
            records.append({
                "graph_index": graph_original_index,
                "driver_index": driver_idx,
                "route": route_str,
            })
        submission_df = pd.concat([submission_df, pd.DataFrame(records)], ignore_index=True)

    # Формирование итогового вывода
    output_csv_io = StringIO()
    submission_df.to_csv(output_csv_io, index=False)
    all_submission_csv_str = output_csv_io.getvalue()

    output_json = {
        'ok': True,
        'mode': 'hybrid_classical_submission_with_mirea_metrics',
        'results': all_results_for_json,
        'summary': {
            'total_graphs': len(all_results_for_json),
            'solver_iterations': args.iterations,
            'mirea_samples_requested': args.mirea_samples if args.use_mirea else 0
        },
        'csv_base64': base64.b64encode(all_submission_csv_str.encode('utf-8')).decode('utf-8'),
        'csv_filename': 'submission.csv'
    }
    
    print(json.dumps(output_json))
    return 0

if __name__ == '__main__':
    sys.exit(main())
