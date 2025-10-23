"""
Wrapper для curl - единственный способ, который работает с MIREA API
"""
import subprocess
import json
import tempfile
import os

def post_with_curl(url, payload, email, password, timeout=300):
    """
    Выполняет POST запрос через curl (работает с 307 редиректом)
    
    Returns:
        dict: Response JSON или {'error': 'message'}
    """
    # Сохраняем payload во временный файл
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(payload, f)
        temp_file = f.name
    
    try:
        # Вызываем curl
        result = subprocess.run([
            'curl', '-s',  # Silent mode
            '-X', 'POST',
            '-u', f'{email}:{password}',
            '-H', 'Content-Type: application/json',
            '-d', f'@{temp_file}',
            '--max-time', str(timeout),
            url
        ], capture_output=True, text=True, timeout=timeout)
        
        # Парсим ответ
        if result.returncode == 0:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                return {'error': f'Invalid JSON response: {result.stdout[:100]}'}
        else:
            return {'error': f'curl failed: {result.stderr}'}
            
    finally:
        # Удаляем временный файл
        if os.path.exists(temp_file):
            os.unlink(temp_file)

# Тест
if __name__ == '__main__':
    payload = {
        "elementsObject": {
            "g1": {"id": "g1", "title": "H", "type": "base", "params": None, "error": None, "body": None, "idGate": None},
            "g2": {"id": "g2", "title": "MEASUREMENT", "type": "auxiliary", "params": None, "error": None, "body": None, "idGate": None}
        },
        "actualHistoryMap": [["g1", "g2", "block"]],
        "launch": 100
    }
    
    result = post_with_curl(
        'https://mireatom.mirea.ru/nestor-team/circuit/api',
        payload,
        'Mr.hectop73@gmail.com',
        '32f04ecf2dbd712e5ec5cb9c02d0df41'
    )
    
    print("=== Результат через curl wrapper ===")
    print(json.dumps(result, indent=2))
