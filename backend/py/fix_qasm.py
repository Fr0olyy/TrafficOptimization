import re

def substitute_qasm_parameters(qasm_code, gamma_values, beta_values):
    """
    Подставляет конкретные значения параметров в QASM схему
    
    Args:
        qasm_code: OpenQASM код с параметрами
        gamma_values: список значений gamma для каждого слоя
        beta_values: список значений beta для каждого слоя
    
    Returns:
        QASM код с подставленными значениями
    """
    lines = qasm_code.split('\n')
    result = []
    
    for line in lines:
        # Пропускаем input float объявления
        if line.strip().startswith('input float'):
            continue
            
        # Заменяем параметры на значения
        modified_line = line
        
        # Заменяем gamma_i * число
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
            
        # Заменяем beta_i
        for i, beta in enumerate(beta_values):
            modified_line = re.sub(
                rf'beta_{i}',
                str(beta),
                modified_line
            )
        
        # Вычисляем простые арифметические выражения типа "2 * 0.5"
        def eval_expr(match):
            try:
                expr = match.group(1)
                # Только простые выражения: число * число
                if '*' in expr or '/' in expr:
                    return str(eval(expr))
                return expr
            except:
                return match.group(0)
        
        # Ищем выражения в скобках rz(...) или rx(...)
        modified_line = re.sub(
            r'r[xyz]\(([0-9.*/ +-]+)\)',
            lambda m: f"{m.group(0).split('(')[0]}({eval(m.group(1))})",
            modified_line
        )
        
        result.append(modified_line)
    
    return '\n'.join(result)

if __name__ == '__main__':
    # Тест
    qasm = """OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
input float gamma_0;
input float beta_0;
h q[0];
h q[1];
rz(2 * gamma_0 * 1.5) q[0];
rx(2 * beta_0) q[0];
measure q[0] -> c[0];
"""
    
    result = substitute_qasm_parameters(qasm, [0.5], [0.3])
    print(result)
