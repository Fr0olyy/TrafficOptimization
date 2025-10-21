"""
CSV Parser Module for Hackathon Dataset
Строгая валидация: 100x100 матрицы, 500 маршрутов
"""

import pandas as pd
import numpy as np
import json


class HackathonCSVParser:
    """Parser with strict validation for competition format"""
    
    def parse_delimited_file(self, file_path):
        """Parse CSV with 100x100 matrices and 500 route pairs"""
        df = pd.read_csv(file_path)
        graphs_dict = {}
        
        for row_order, row in df.iterrows():
            graph_index = int(row['graph_index'])
            
            # Parse adjacency matrix
            matrix_str = row['graph_matrix']
            matrix = json.loads(matrix_str)
            matrix = np.array(matrix, dtype=float)
            
            # Strict validation: must be 100x100
            if matrix.shape != (100, 100):
                raise ValueError(
                    f"Graph row {row_order}: adjacency matrix must be 100x100, "
                    f"got {matrix.shape}"
                )
            
            # Replace inf with large number
            matrix = np.where(np.isinf(matrix), 999999.0, matrix)
            matrix = np.where(np.isnan(matrix), 999999.0, matrix)
            
            # Parse routes
            routes_str = str(row['routes_start_end']).strip()
            route_pairs = []
            
            if routes_str and routes_str != 'nan':
                tokens = routes_str.split()
                
                for i in range(0, len(tokens), 2):
                    if i + 1 < len(tokens):
                        start = int(tokens[i])
                        end = int(tokens[i + 1])
                        route_pairs.append((start, end))
            
            # Strict validation: must have exactly 500 route pairs
            if len(route_pairs) != 500:
                raise ValueError(
                    f"Graph row {row_order}: routes_start_end must contain "
                    f"exactly 500 pairs, got {len(route_pairs)}"
                )
            
            graphs_dict[row_order] = {
                'original_index': graph_index,
                'matrix': matrix,
                'routes': route_pairs
            }
        
        return graphs_dict
