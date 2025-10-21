#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Адаптер для интеграции с MIREA Quantum Platform (quantum.mirea.ru)
Конвертирует QAOA параметры в формат API платформы и отправляет схемы на выполнение
"""

import requests
import json
import time
from typing import Dict, List, Tuple, Optional
import uuid


class MIREAQuantumAdapter:
    """Адаптер для работы с MIREA Quantum API"""
    
    def __init__(self, email: str, password: str, base_url: str = "https://quantum.mirea.ru"):
        """
        Инициализация адаптера
        
        Args:
            email: Email для авторизации на платформе
            password: Пароль для авторизации
            base_url: Базовый URL API (по умолчанию quantum.mirea.ru)
        """
        self.base_url = base_url
        self.auth = (email, password)
        self.session = requests.Session()
        self.session.auth = self.auth
        
    def _generate_unique_id(self, prefix: str = "") -> str:
        """Генерирует уникальный ID для элемента схемы"""
        return f"{prefix}{uuid.uuid4().hex[:16]}"
    
    def _create_gate_element(self, gate_type: str, gate_id: Optional[str] = None, 
                           params: Optional[List] = None) -> Dict:
        """
        Создает объект элемента (гейта) в формате MIREA Quantum
        
        Args:
            gate_type: Тип гейта (H, X, RZ, CONTROL, MEASUREMENT и т.д.)
            gate_id: Уникальный ID элемента
            params: Параметры гейта (для параметризованных гейтов)
            
        Returns:
            Словарь с описанием элемента
        """
        if gate_id is None:
            gate_id = self._generate_unique_id(f"{gate_type.lower()}_")
            
        element = {
            "id": gate_id,
            "title": gate_type,
            "params": params,
            "error": None,
            "body": None,
            "idGate": None
        }
        
        # Определяем тип элемента
        if gate_type in ["H", "X", "Y", "Z", "I", "S", "T"]:
            element["type"] = "base"
        elif gate_type in ["RX", "RY", "RZ", "U1", "U2", "U3"]:
            element["type"] = "params"
        elif gate_type in ["CONTROL", "MEASUREMENT", "SWAP", "BARRIER"]:
            element["type"] = "auxiliary"
        else:
            element["type"] = "custom"
            
        return element
    
    def _create_rotation_params(self, angle: float, param_name: str = "angle") -> List[Dict]:
        """
        Создает параметры для вращательных гейтов
        
        Args:
            angle: Угол вращения в радианах
            param_name: Название параметра
            
        Returns:
            Список параметров в формате MIREA Quantum
        """
        return [{
            "key": param_name,
            "title": "Угол поворота",
            "manipulation": None,
            "value": [{
                "title": "Угол",
                "key": "angle1",
                "types": [{
                    "input": "input",
                    "type": "number",
                    "key": "input-number",
                    "title": "Радианы",
                    "data": round(angle, 6),
                    "step": 0.01,
                    "decimalDigits": 6
                }],
                "data": "input-number"
            }]
        }]
    
    def generate_qaoa_circuit_config(self, n_qubits: int, 
                                     h: Dict[int, float], 
                                     J: Dict[Tuple[int, int], float],
                                     gamma: float, 
                                     beta: float,
                                     shots: int = 1024) -> Dict:
        """
        Генерирует конфигурацию QAOA схемы для одного слоя
        
        Args:
            n_qubits: Количество кубитов
            h: Локальные поля Изинг-модели {qubit_idx: field_value}
            J: Парные взаимодействия {(i,j): coupling_value}
            gamma: Параметр cost Hamiltonian
            beta: Параметр mixer Hamiltonian
            shots: Количество измерений (запусков)
            
        Returns:
            Конфигурация в формате MIREA Quantum API
        """
        elements = {}
        history_map = [[] for _ in range(n_qubits)]
        
        # ===== Слой 1: Начальная суперпозиция =====
        # Применяем H ко всем кубитам
        for q in range(n_qubits):
            elem_id = self._generate_unique_id(f"h_init_{q}_")
            element = self._create_gate_element("H", elem_id)
            elements[elem_id] = element
            history_map[q].append(elem_id)
        
        # Выравниваем все строки
        self._align_history_map(history_map)
        
        # ===== Слой 2: Cost Hamiltonian (Problem Layer) =====
        # 2a. Однокубитные Z-вращения для локальных полей h_i
        for qubit_idx, h_value in sorted(h.items()):
            if abs(h_value) > 1e-9:
                angle = 2 * gamma * h_value
                elem_id = self._generate_unique_id(f"rz_h_{qubit_idx}_")
                params = self._create_rotation_params(angle, "lambda")
                element = self._create_gate_element("RZ", elem_id, params)
                elements[elem_id] = element
                history_map[qubit_idx].append(elem_id)
        
        self._align_history_map(history_map)
        
        # 2b. Двухкубитные ZZ-взаимодействия для J_ij
        # Реализуем через декомпозицию: CNOT - RZ - CNOT
        for (i, j), J_value in sorted(J.items()):
            if abs(J_value) > 1e-9:
                # Первый CNOT: контроль на i, цель на j
                ctrl_id1 = self._generate_unique_id(f"cnot1_ctrl_{i}_{j}_")
                tgt_id1 = self._generate_unique_id(f"cnot1_tgt_{i}_{j}_")
                
                elements[ctrl_id1] = self._create_gate_element("CONTROL", ctrl_id1)
                elements[tgt_id1] = self._create_gate_element("X", tgt_id1)
                
                history_map[i].append(ctrl_id1)
                history_map[j].append(tgt_id1)
                self._align_history_map(history_map)
                
                # RZ на целевом кубите j
                angle = 2 * gamma * J_value
                rz_id = self._generate_unique_id(f"rz_J_{i}_{j}_")
                params = self._create_rotation_params(angle, "lambda")
                element = self._create_gate_element("RZ", rz_id, params)
                elements[rz_id] = element
                history_map[j].append(rz_id)
                self._align_history_map(history_map)
                
                # Второй CNOT (обратный)
                ctrl_id2 = self._generate_unique_id(f"cnot2_ctrl_{i}_{j}_")
                tgt_id2 = self._generate_unique_id(f"cnot2_tgt_{i}_{j}_")
                
                elements[ctrl_id2] = self._create_gate_element("CONTROL", ctrl_id2)
                elements[tgt_id2] = self._create_gate_element("X", tgt_id2)
                
                history_map[i].append(ctrl_id2)
                history_map[j].append(tgt_id2)
                self._align_history_map(history_map)
        
        # ===== Слой 3: Mixer Hamiltonian =====
        # Применяем RX(2*beta) ко всем кубитам
        for q in range(n_qubits):
            angle = 2 * beta
            elem_id = self._generate_unique_id(f"rx_mixer_{q}_")
            params = self._create_rotation_params(angle, "theta")
            element = self._create_gate_element("RX", elem_id, params)
            elements[elem_id] = element
            history_map[q].append(elem_id)
        
        self._align_history_map(history_map)
        
        # ===== Слой 4: Измерения =====
        for q in range(n_qubits):
            meas_id = self._generate_unique_id(f"meas_{q}_")
            element = self._create_gate_element("MEASUREMENT", meas_id)
            elements[meas_id] = element
            history_map[q].append(meas_id)
        
        self._align_history_map(history_map)
        
        # Добавляем блокировку после измерений (обязательно по спецификации)
        for q in range(n_qubits):
            history_map[q].append("block")
        
        return {
            "elementsObject": elements,
            "actualHistoryMap": history_map,
            "launch": shots
        }
    
    def _align_history_map(self, history_map: List[List[str]]) -> None:
        """
        Выравнивает все строки history_map до одинаковой длины,
        заполняя пустые места "none"
        
        Args:
            history_map: Двумерный массив строк схемы (модифицируется на месте)
        """
        if not history_map:
            return
        
        max_len = max(len(row) for row in history_map)
        for row in history_map:
            while len(row) < max_len:
                row.append("none")
    
    def submit_circuit(self, config: Dict, timeout: int = 300) -> Dict:
        """
        Отправляет квантовую схему на выполнение через MIREA Quantum API
        
        Args:
            config: Конфигурация схемы (elementsObject + actualHistoryMap + launch)
            timeout: Таймаут запроса в секундах
            
        Returns:
            Ответ от API с результатами выполнения
            
        Raises:
            Exception: При ошибке API или таймауте
        """
        url = f"{self.base_url}/circuit/api"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        try:
            response = self.session.post(
                url,
                headers=headers,
                json=config,
                timeout=timeout
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                error_msg = f"MIREA Quantum API error {response.status_code}: {response.text}"
                raise Exception(error_msg)
                
        except requests.exceptions.Timeout:
            raise Exception(f"Request to MIREA Quantum API timed out after {timeout}s")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request to MIREA Quantum API failed: {str(e)}")
    
    def parse_measurement_results(self, api_response: Dict) -> Dict[str, int]:
        """
        Парсит результаты измерений из ответа MIREA Quantum API
        
        Args:
            api_response: Ответ от API
            
        Returns:
            Словарь {bitstring: count}, например {"0101": 234, "1010": 567}
            
        Raises:
            ValueError: Если формат ответа неизвестен
        """
        # Проверяем различные возможные форматы ответа
        if "counts" in api_response:
            return api_response["counts"]
        elif "measurements" in api_response:
            return api_response["measurements"]
        elif "result" in api_response and "counts" in api_response["result"]:
            return api_response["result"]["counts"]
        elif "data" in api_response and "counts" in api_response["data"]:
            return api_response["data"]["counts"]
        else:
            # Пытаемся найти любой словарь с битстрингами
            for key, value in api_response.items():
                if isinstance(value, dict) and all(
                    isinstance(k, str) and all(c in '01' for c in k) 
                    for k in value.keys()
                ):
                    return value
            
            raise ValueError(f"Unknown response format from MIREA Quantum API: {api_response.keys()}")
    
    def calculate_expectation_value(self, counts: Dict[str, int], 
                                   h: Dict[int, float], 
                                   J: Dict[Tuple[int, int], float]) -> float:
        """
        Вычисляет среднее значение энергии Изинг-модели по результатам измерений
        
        Args:
            counts: Результаты измерений {bitstring: count}
            h: Локальные поля
            J: Парные взаимодействия
            
        Returns:
            Среднее значение энергии
        """
        total_shots = sum(counts.values())
        if total_shots == 0:
            return 0.0
        
        energy_sum = 0.0
        
        for bitstring, count in counts.items():
            # Конвертируем битстринг в спины (-1, +1)
            spins = [1 if bit == '0' else -1 for bit in bitstring]
            
            # Вычисляем энергию для этой конфигурации
            energy = 0.0
            
            # Локальные члены
            for qubit_idx, h_value in h.items():
                if qubit_idx < len(spins):
                    energy += h_value * spins[qubit_idx]
            
            # Парные взаимодействия
            for (i, j), J_value in J.items():
                if i < len(spins) and j < len(spins):
                    energy += J_value * spins[i] * spins[j]
            
            energy_sum += energy * count
        
        return energy_sum / total_shots
    
    def find_best_solution(self, counts: Dict[str, int]) -> Tuple[str, int]:
        """
        Находит наиболее часто измеренную конфигурацию
        
        Args:
            counts: Результаты измерений {bitstring: count}
            
        Returns:
            Кортеж (лучший битстринг, количество измерений)
        """
        if not counts:
            return ("", 0)
        
        best_bitstring = max(counts.items(), key=lambda x: x[1])
        return best_bitstring


def test_adapter():
    """Тестовая функция для проверки работы адаптера"""
    print("Testing MIREA Quantum Adapter...")
    
    # Простой пример: 3 кубита, простая Изинг-модель
    n_qubits = 3
    h = {0: 0.5, 1: -0.3, 2: 0.2}
    J = {(0, 1): 0.4, (1, 2): -0.6}
    gamma = 0.7
    beta = 0.4
    
    # Создаем адаптер (без реальных учетных данных для теста)
    adapter = MIREAQuantumAdapter("test@example.com", "dummy_password")
    
    # Генерируем конфигурацию
    config = adapter.generate_qaoa_circuit_config(n_qubits, h, J, gamma, beta, shots=100)
    
    print(f"\nGenerated config for {n_qubits} qubits:")
    print(f"  Elements: {len(config['elementsObject'])}")
    print(f"  History map rows: {len(config['actualHistoryMap'])}")
    print(f"  Max columns: {max(len(row) for row in config['actualHistoryMap'])}")
    print(f"  Shots: {config['launch']}")
    
    # Проверяем структуру
    assert len(config['actualHistoryMap']) == n_qubits
    assert all(row[-1] == "block" for row in config['actualHistoryMap'])
    
    print("\n✓ Test passed!")
    
    # Сохраняем пример конфигурации
    with open("example_mirea_circuit.json", "w") as f:
        json.dump(config, f, indent=2)
    print("✓ Example config saved to example_mirea_circuit.json")


if __name__ == "__main__":
    test_adapter()
