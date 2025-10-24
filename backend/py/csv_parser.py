import re
import pandas as pd
import numpy as np
from typing import List, Tuple, Dict, Any

class HackathonCSVParser:
    def __init__(self):
        self.graphs_data: Dict[int, Dict[str, Any]] = {}

    def parse_csv_file(self, file_path: str) -> Dict[int, Dict[str, Any]]:
        return self.parse_delimited_file(file_path)

    def parse_delimited_file(self, file_path: str) -> Dict[int, Dict[str, Any]]:
        df = pd.read_csv(file_path, sep=None, engine="python")

        def norm(c: str) -> str:
            return str(c).strip().lower().replace(" ", "").replace("-", "").replace("_", "")

        df.columns = [norm(c) for c in df.columns]

        required = {"graphindex", "graphmatrix", "routesstartend"}
        if not required.issubset(set(df.columns)):
            raise ValueError(
                f"Missing columns. Expected: graphindex/graph_index, graphmatrix/graph_matrix, routesstartend/routes_start_end. Got: {set(df.columns)}"
            )

        graphs: Dict[int, Dict[str, Any]] = {}

        for row_order, row in enumerate(df.itertuples(index=False)):
            gi_raw = int(getattr(row, "graphindex"))

            matrix = self._parse_matrix(getattr(row, "graphmatrix"))
            routes = self._parse_routes(getattr(row, "routesstartend"))

            if matrix.shape[0] != matrix.shape[1]:
                raise ValueError(
                    f"Graph row {row_order}: adjacency matrix must be square, got {matrix.shape}"
                )

            # Валидация индексов маршрутов
            self._validate_graph_data(row_order, matrix, routes)

            graphs[row_order] = {
                "matrix": matrix,                           # numpy.ndarray (может содержать inf/NaN)
                "routes": routes,                           # List[Tuple[int,int]]
                "original_index": gi_raw,
                "row_order": row_order,
                # JSON‑safe матрица — пригодится для сериализации наружу
                "matrix_json_safe": self.as_json_safe_matrix(matrix),
            }

        self.graphs_data = graphs
        return graphs

    def _to_float(self, v: Any) -> float:
        if isinstance(v, (int, float, np.floating, np.integer)):
            return float(v)
        s = str(v).strip().lower()
        if s in ("inf", "+inf", "infinity", "+infinity"): return float("inf")
        if s in ("-inf", "-infinity"): return float("-inf")
        if s in ("nan",): return float("nan")
        return float(s)

    def _parse_matrix(self, matrix_val: Any) -> np.ndarray:
        if isinstance(matrix_val, (list, tuple, np.ndarray)):
            arr = np.array(matrix_val, dtype=object)
            flat = [self._to_float(x) for x in arr.flatten()]
        else:
            s = str(matrix_val)
            s = re.sub(r"[\[\]\n\r]", " ", s)
            s = re.sub(r"[;|\t ]+", ",", s)
            s = re.sub(r",+", ",", s).strip(",")
            tokens = [t for t in s.split(",") if t != ""]
            flat = [self._to_float(t) for t in tokens]

        n = len(flat)
        sz = int(round(np.sqrt(n)))
        if sz * sz != n:
            raise ValueError(f"Matrix elements {n} don't form a square matrix")

        return np.array(flat, dtype=float).reshape(sz, sz)

    def _parse_routes(self, routes_val: Any) -> List[Tuple[int, int]]:
        if isinstance(routes_val, (list, tuple, np.ndarray)):
            nums = [int(str(x)) for x in np.array(routes_val, dtype=object).flatten()]
        else:
            s = str(routes_val)
            s = re.sub(r"[\[\]\(\)]", " ", s)
            s = re.sub(r"[;|\n\r\t]+", " ", s)
            s = s.replace(",", " ")
            s = re.sub(r"\s+", " ", s).strip()
            nums = [int(tok) for tok in s.split(" ") if tok != ""]

        if len(nums) % 2 != 0:
            raise ValueError(f"Odd number of route elements: {len(nums)}")

        return [(nums[i], nums[i + 1]) for i in range(0, len(nums), 2)]

    def _validate_graph_data(self, graph_index: int, matrix: np.ndarray, routes: List[Tuple[int, int]]) -> None:
        if matrix.shape[0] != matrix.shape[1]:
            raise ValueError(f"Graph {graph_index}: Matrix is not square: {matrix.shape}")
        n = matrix.shape[0]
        for i, (s, t) in enumerate(routes):
            if not (0 <= s < n and 0 <= t < n):
                raise ValueError(f"Graph {graph_index}: bad route {i} -> ({s},{t})")

    # ---------- JSON‑safe helpers ----------

    def as_json_safe_matrix(self, matrix: np.ndarray) -> List[List[float | None]]:
        """Преобразует матрицу в список списков, заменяя inf/NaN на None для строгого JSON."""
        out: List[List[float | None]] = []
        for i in range(matrix.shape[0]):
            row: List[float | None] = []
            for v in matrix[i].tolist():
                if isinstance(v, float) and (np.isinf(v) or np.isnan(v)):
                    row.append(None)
                else:
                    row.append(float(v))
            out.append(row)
        return out

# ============================================================
# WRAPPER ФУНКЦИЯ ДЛЯ ИМПОРТА В runner.py
# ============================================================

def parse_dataset(file_path: str) -> Dict[int, Dict[str, Any]]:
    """
    Wrapper функция для парсинга CSV файла
    Args:
        file_path: Путь к CSV файлу
    Returns:
        Dict с графами: {graph_index: {matrix, routes, ...}}
    """
    parser = HackathonCSVParser()
    return parser.parse_csv_file(file_path)

# Экспортируем также класс для прямого использования
__all__ = ['HackathonCSVParser', 'parse_dataset']
