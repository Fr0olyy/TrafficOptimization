def qasm_to_mirea_format(self, qasm_circuit: str) -> Dict[str, Any]:
    """
    Конвертирует OpenQASM схему в формат MIREA API
    
    Args:
        qasm_circuit: OpenQASM код
        
    Returns:
        Dict с elementsObject и actualHistoryMap
    """
    elements = {}
    gate_operations = []  # [(gate_id, qubits_list), ...]
    
    # Парсим QASM построчно
    lines = qasm_circuit.strip().split('\n')
    qubit_count = 0
    column = 0
    
    for line in lines:
        line = line.strip()
        
        # Пропускаем комментарии и директивы
        if not line or line.startswith('//') or line.startswith('OPENQASM') or line.startswith('include'):
            continue
            
        # Определяем количество кубитов
        if line.startswith('qreg'):
            # qreg q[5];
            parts = line.split('[')
            if len(parts) > 1:
                qubit_count = int(parts[1].split(']')[0])
            continue
            
        if line.startswith('creg'):
            continue
        
        # Парсим гейты
        gate_info = self.parse_qasm_gate(line, column)
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
            
            # Сохраняем операцию с кубитами
            gate_operations.append((gate_id, gate_info.get('qubits', []), gate_info['title']))
            column += 1
    
    # Строим actualHistoryMap как матрицу по линиям кубитов
    history_map = [[] for _ in range(qubit_count)]
    
    for gate_id, qubits, title in gate_operations:
        if title == 'MEASUREMENT':
            # Измерение: добавляем gate_id и блок
            for q in qubits:
                history_map[q].append(gate_id)
                history_map[q].append('block')
        elif title == 'CONTROL' and len(qubits) == 2:
            # CNOT: control и target на разных линиях
            # В MIREA формате CONTROL идет на control линию,
            # а соответствующий X гейт на target линию
            control_q, target_q = qubits
            # Для простоты добавим CONTROL на обе линии
            # (нужно изучить документацию подробнее)
            history_map[control_q].append(gate_id)
            # Возможно нужен отдельный X гейт для target
        else:
            # Однокубитный гейт
            for q in qubits:
                history_map[q].append(gate_id)
    
    logger.debug(f"Converted QASM: {len(elements)} gates, {qubit_count} qubits")
    logger.debug(f"History map: {len(history_map)} lines")
    
    return {
        'elements': elements,
        'history': history_map,
        'qubit_count': qubit_count
    }
