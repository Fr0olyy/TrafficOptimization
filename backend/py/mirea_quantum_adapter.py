"""
MIREA Quantum API Adapter
Интеграция с квантовым компьютером MIREA для выполнения QAOA схем
"""
import requests
import base64
import time
import logging
from typing import Dict, List, Any, Optional
import json
import uuid

logger = logging.getLogger(__name__)


def post_with_curl(url, payload, email, password, timeout=300):
    """Выполняет POST через curl (работает с 307 редиректом MIREA)"""
    import subprocess
    import tempfile
    import json as json_module
    import os
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json_module.dump(payload, f)
        temp_file = f.name
    
    try:
        result = subprocess.run([
            'curl', '-s', '-X', 'POST',
            '-u', f'{email}:{password}',
            '-H', 'Content-Type: application/json',
            '-d', f'@{temp_file}',
            '--max-time', str(timeout),
            url
        ], capture_output=True, text=True, timeout=timeout)
        
        if result.returncode == 0:
            try:
                return json_module.loads(result.stdout)
            except:
                return {'error': f'Invalid JSON: {result.stdout[:100]}'}
        return {'error': f'curl failed: {result.stderr}'}
    finally:
        if os.path.exists(temp_file):
            os.unlink(temp_file)


class MIREAQuantumAdapter:
    """Адаптер для работы с MIREA Quantum API"""
    
    def __init__(
        self,
        email: str,
        password: str,
        api_url: str = "https://mireatom.mirea.ru/nestor-team/circuit/api",
        timeout: int = 300
    ):
        """
        Инициализация адаптера
        
        Args:
            email: Email для аутентификации
            password: Пароль
            api_url: URL MIREA Quantum API
            timeout: Таймаут запросов в секундах
        """
        self.email = email
        self.password = password
        self.api_url = api_url.rstrip('/')
        self.timeout = timeout
        self.auth_token = None
        self.session = requests.Session()
        
    def authenticate(self) -> bool:
        """
        Аутентификация в MIREA API через Basic Auth
        """
        try:
            auth_str = f"{self.email}:{self.password}"
            auth_bytes = base64.b64encode(auth_str.encode('utf-8'))
            auth_header = f"Basic {auth_bytes.decode('utf-8')}"
            
            headers = {
                'Authorization': auth_header,
                'Content-Type': 'application/json'
            }
            
            logger.info(f"Authenticating with MIREA API: {self.api_url}")
            # MIREA не требует отдельного /auth endpoint
            # Авторизация проверяется при каждом запросе
            self.auth_token = auth_header  # Используем Basic Auth напрямую
            logger.info("✓ MIREA credentials configured")
            return True
            
        except Exception as e:
            logger.error(f"MIREA authentication error: {e}")
            return False
    
    def execute_circuit(
        self,
        qasm_circuit: str,
        shots: int = 1024
    ) -> Dict[str, Any]:
        """Выполняет квантовую схему на MIREA"""
        try:
            # Конвертируем QASM в формат MIREA
            # Подставляем параметры (gamma=0.5, beta=0.3 для примера)
            # TODO: передавать оптимальные значения параметров
            p_layers = qasm_circuit.count("gamma_")
            gamma_vals = [0.5] * max(1, p_layers)
            beta_vals = [0.3] * max(1, p_layers)
            qasm_circuit = substitute_qasm_parameters(qasm_circuit, gamma_vals, beta_vals)
            logger.debug(f"Substituted QAOA parameters: gamma={gamma_vals}, beta={beta_vals}")

            circuit_json = self.qasm_to_mirea_format(qasm_circuit)
            
            # Формируем payload согласно документации
            payload = {
                "elementsObject": circuit_json['elements'],
                "actualHistoryMap": circuit_json['history'],
                "launch": shots
            }
            
            headers = {
                'Authorization': self.auth_token,  # Basic Auth
                'Content-Type': 'application/json'
            }
            
            import json as json_module
            logger.debug(f"Payload JSON: {json_module.dumps(payload, indent=2)}")

            logger.info(f"Executing circuit on MIREA (shots={shots})")
            logger.debug(f"Circuit: {len(circuit_json['elements'])} gates")
            
            # Отправляем POST через curl (единственный способ для MIREA API)
            start_time = time.time()
            result = post_with_curl(
                self.api_url,
                payload,
                self.email,
                self.password,
                timeout=self.timeout
            )
            elapsed = time.time() - start_time
            
            # Проверяем ответ от MIREA
            if result.get('status') == True:
                logger.info(f"✓ MIREA execution completed in {elapsed:.2f}s")
                return {
                    'success': True,
                    'measurements': result.get('data', {}),
                    'execution_time': elapsed,
                    'shots': shots
                }
            else:
                error_msg = result.get('error', 'Unknown error')
                logger.error(f"MIREA execution failed: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg
                }
        except Exception as e:
            logger.error(f"MIREA execution error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def qasm_to_mirea_format(self, qasm_circuit: str) -> Dict[str, Any]:
        """Конвертирует QASM в формат MIREA с правильной матрицей actualHistoryMap"""
        elements = {}
        gate_operations = []  # [(gate_id, qubits_list, title)]
        
        lines = qasm_circuit.strip().split('\n')
        qubit_count = 0
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('//') or line.startswith('OPENQASM') or line.startswith('include'):
                continue
            
            if line.startswith('qreg'):
                parts = line.split('[')
                if len(parts) > 1:
                    qubit_count = int(parts[1].split(']')[0])
                continue
            
            if line.startswith('creg'):
                continue
            
            # Парсим гейт
            gate_info = self.parse_qasm_gate(line, 0)
            if gate_info:
                gate_id = str(uuid.uuid4())
                elements[gate_id] = {
                    "id": gate_id,
                    "title": gate_info['title'],
                    "type": gate_info['type'],
                    "params": gate_info.get('params'),
                    "error": None,
                    "body": None,
                    "idGate": None
                }
                gate_operations.append((gate_id, gate_info.get('qubits', []), gate_info['title']))
        
        # Строим actualHistoryMap как матрицу по линиям кубитов
        history_map = [[] for _ in range(qubit_count)]
        
        for gate_id, qubits, title in gate_operations:
            if title == 'MEASUREMENT':
                # Measurement: добавляем gate_id, потом "block"
                for q in qubits:
                    history_map[q].append(gate_id)
                    history_map[q].append('block')
            else:
                # Обычный гейт: просто добавляем gate_id
                for q in qubits:
                    history_map[q].append(gate_id)
        
        logger.debug(f"Converted QASM: {len(elements)} gates, {qubit_count} qubits")
        logger.debug(f"History map: {history_map}")
        
        return {
            'elements': elements,
            'history': history_map,
            'qubit_count': qubit_count
        }

    def parse_qasm_gate(self, line: str, column: int) -> Optional[Dict[str, Any]]:
        """
        Парсит одну строку QASM с гейтом
        
        Args:
            line: Строка QASM кода
            column: Номер колонки
            
        Returns:
            Dict с информацией о гейте или None
        """
        line = line.rstrip(';').strip()
        
        # Однокубитные гейты без параметров
        single_qubit_gates = {
            'h': ('H', 'base'),
            'x': ('X', 'base'),
            'y': ('Y', 'base'),
            'z': ('Z', 'base'),
            's': ('S', 'base'),
            'sdg': ('S_REVERSE', 'base'),
            't': ('T', 'base'),
            'tdg': ('T_REVERSE', 'base'),
            'id': ('I', 'base'),
        }
        
        # Гейты с параметрами
        param_gates = ['rx', 'ry', 'rz', 'u1', 'u2', 'u3']
        
        # Пытаемся распарсить
        parts = line.split()
        if not parts:
            return None
            
        gate_name = parts[0].lower()
        
        # Однокубитные без параметров
        if gate_name in single_qubit_gates:
            title, gate_type = single_qubit_gates[gate_name]
            qubit_str = parts[1] if len(parts) > 1 else 'q[0]'
            qubit_num = self.extract_qubit_number(qubit_str)
            return {
                'title': title,
                'type': gate_type,
                'qubits': [qubit_num],
                'params': None
            }
        
        # Гейты с параметрами
        if gate_name in param_gates:
            # rx(1.5708) q[0];
            param_start = line.find('(')
            param_end = line.find(')')
            if param_start != -1 and param_end != -1:
                param_value = float(line[param_start+1:param_end])
                qubit_str = line[param_end+1:].strip().split()[0]
                qubit_num = self.extract_qubit_number(qubit_str)
                
                return {
                    'title': gate_name.upper(),
                    'type': 'params',
                    'qubits': [qubit_num],
                    'params': {
                        'key': 'theta',
                        'value': {
                            'key': f'angle_{column}',
                            'data': 'input-number',
                            'value': param_value
                        }
                    }
                }
        
        # Barrier
        if gate_name == 'barrier':
            return {
                'title': 'BARRIER',
                'type': 'auxiliary',
                'qubits': [0],
                'params': None
            }
        
        # Measurement
        if gate_name == 'measure':
            qubit_str = parts[1] if len(parts) > 1 else 'q[0]'
            qubit_num = self.extract_qubit_number(qubit_str)
            return {
                'title': 'MEASUREMENT',
                'type': 'auxiliary',
                'qubits': [qubit_num],
                'params': None
            }
        
        # CNOT / CX
        if gate_name in ['cx', 'cnot']:
            if len(parts) >= 3:
                control = self.extract_qubit_number(parts[1].rstrip(','))
                target = self.extract_qubit_number(parts[2])
                return {
                    'title': 'CONTROL',
                    'type': 'auxiliary',
                    'qubits': [control, target],
                    'params': None
                }
        
        logger.warning(f"Unknown QASM gate: {line}")
        return None
    
    def extract_qubit_number(self, qubit_str: str) -> int:
        """
        Извлекает номер кубита из строки типа 'q[0]'
        
        Args:
            qubit_str: Строка с кубитом
            
        Returns:
            Номер кубита
        """
        try:
            # q[0] -> 0
            if '[' in qubit_str:
                return int(qubit_str.split('[')[1].split(']')[0])
            return 0
        except:
            return 0
    
    def process_measurements(
        self,
        measurements: Dict[str, int],
        num_qubits: int
    ) -> Dict[str, Any]:
        """
        Обрабатывает результаты измерений
        
        Args:
            measurements: Результаты от MIREA {state: count}
            num_qubits: Количество кубитов
            
        Returns:
            Dict с обработанными результатами
        """
        if not measurements:
            return {
                'best_state': None,
                'probability': 0,
                'energy': 0
            }
        
        total_shots = sum(measurements.values())
        
        # Находим наиболее вероятное состояние
        best_state_item = max(measurements.items(), key=lambda x: x[1])
        best_state_bin = bin(int(best_state_item[0]))[2:].zfill(num_qubits)
        probability = best_state_item[1] / total_shots if total_shots > 0 else 0
        
        return {
            'best_state': best_state_bin,
            'best_state_int': int(best_state_item[0]),
            'counts': best_state_item[1],
            'probability': probability,
            'total_shots': total_shots,
            'all_measurements': measurements
        }

def substitute_qasm_parameters(qasm_code, gamma_values, beta_values):
    """Подставляет конкретные значения параметров в QASM схему"""
    import re
    lines = qasm_code.split('\n')
    result = []
    
    for line in lines:
        if line.strip().startswith('input float'):
            continue
            
        modified_line = line
        
        for i, gamma in enumerate(gamma_values):
            modified_line = re.sub(
                rf'gamma_{i}\s*\*\s*([0-9.]+)',
                lambda m: str(float(m.group(1)) * gamma),
                modified_line
            )
            modified_line = re.sub(
                rf'([0-9.]+)\s*\*\s*gamma_{i}',
                lambda m: str(float(m.group(1)) * gamma),
                modified_line
            )
            
        for i, beta in enumerate(beta_values):
            modified_line = re.sub(rf'beta_{i}', str(beta), modified_line)
        
        modified_line = re.sub(
            r'r[xyz]\(([0-9.*/ +-]+)\)',
            lambda m: f"{m.group(0).split('(')[0]}({eval(m.group(1))})",
            modified_line
        )
        
        result.append(modified_line)
    
    return '\n'.join(result)
