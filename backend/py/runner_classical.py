#!/usr/bin/env python3
import os, sys, json, argparse, importlib.util, io, csv, base64, time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod

csv_mod = load_module("csv_parser_mod", os.path.join(BASE_DIR, "csv-parser.py"))
opt_mod = load_module("traffic_optimizer_mod", os.path.join(BASE_DIR, "traffic-optimizer.py"))

HackathonCSVParser = csv_mod.HackathonCSVParser
EnhancedTrafficOptimizer = opt_mod.EnhancedTrafficOptimizer

def route_to_py(route): return [int(x) for x in route]
def parse_indices(arg: str):
    if not arg: return None
    return [int(p.strip()) for p in str(arg).split(",") if p.strip()!=""]

def process_one(gi, g, iterations: int, baseline_limit: int):
    adj, routes = g["matrix"], g["routes"]
    opt = EnhancedTrafficOptimizer()

    routes_for_baseline = routes[:baseline_limit] if baseline_limit < len(routes) else routes
    scale = len(routes) / max(1, len(routes_for_baseline))

    t0 = time.perf_counter()
    routes_greedy = opt.run_greedy_all(adj, routes_for_baseline)
    greedy_ms = int((time.perf_counter() - t0) * 1000)
    cost_greedy = float(opt.calculate_total_cost(routes_greedy, adj) * scale)

    t1 = time.perf_counter()
    routes_dijkstra = opt.run_dijkstra_all(adj, routes_for_baseline)
    dijkstra_ms = int((time.perf_counter() - t1) * 1000)
    cost_dijkstra = float(opt.calculate_total_cost(routes_dijkstra, adj) * scale)

    t2 = time.perf_counter()
    routes_opt = opt.solve_graph_with_congestion_awareness(adj, routes, iterations=iterations)
    enhanced_ms = int((time.perf_counter() - t2) * 1000)
    cost_enhanced = float(opt.calculate_total_cost(routes_opt, adj))

    validation = opt.validate_routes(routes_opt, routes)

    return {
        "graph_index": int(gi),
        "original_index": int(g.get("original_index", gi)),
        "num_nodes": int(adj.shape[0]),
        "num_vehicles": int(len(routes)),
        "routes_expected": [route_to_py(r) for r in routes],
        "routes_optimized": [route_to_py(r) for r in routes_opt],
        "validation": validation,
        "total_cost": cost_enhanced,
        "metrics": {
            "greedy": {"total_cost": cost_greedy, "opt_time_ms": greedy_ms, "sampled_routes": len(routes_for_baseline)},
            "dijkstra": {"total_cost": cost_dijkstra, "opt_time_ms": dijkstra_ms, "sampled_routes": len(routes_for_baseline)},
            "enhanced": {"total_cost": cost_enhanced, "opt_time_ms": enhanced_ms, "iterations": iterations}
        }
    }

def make_csv(results) -> str:
    import json as _json
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["graph_index","driver_index","route"])
    for r in results:
        gi_out = int(r["graph_index"])
        for driver_idx, path in enumerate(r["routes_optimized"]):
            w.writerow([gi_out, driver_idx, _json.dumps(path)])
    return buf.getvalue()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--graph-index", default=None)
    ap.add_argument("--iterations", type=int, default=1)
    ap.add_argument("--baseline-limit", type=int, default=100)
    args = ap.parse_args()

    parser = HackathonCSVParser()
    graphs = parser.parse_delimited_file(args.input)

    available = sorted(graphs.keys())
    selected = parse_indices(args.graph_index)
    indices = available if selected is None else selected
    missing = [i for i in indices if i not in graphs]
    if missing:
        sys.stdout.write(json.dumps({"ok": False, "error": f"graph_index not found: {missing}", "available_graph_indices": available}, ensure_ascii=False)); sys.stdout.flush(); return

    results = [process_one(gi, graphs[gi], args.iterations, args.baseline_limit) for gi in indices]

    csv_text = make_csv(results)
    out = {
        "ok": True,
        "mode": "classical",
        "file": os.path.basename(args.input),
        "graphs_count": len(indices),
        "available_graph_indices": available,
        "processed_graph_indices": indices,
        "results": results,
        "csv_filename": f"classical_routes_{os.path.basename(args.input)}.csv",
        "csv_base64": base64.b64encode(csv_text.encode("utf-8")).decode("ascii"),
    }
    sys.stdout.write(json.dumps(out, ensure_ascii=False)); sys.stdout.flush()

if __name__ == "__main__":
    main()
