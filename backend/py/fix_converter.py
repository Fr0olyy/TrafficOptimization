# Этот скрипт покажет, что нужно исправить в qasm_to_mirea_format

print("""
ПРОБЛЕМА: actualHistoryMap неправильного формата.

Текущий код генерирует:
  actualHistoryMap = [
    [gate_id, qubit_index],  # Неправильно
    ...
  ]

Должно быть:
  actualHistoryMap = [
    [gate1_id, gate2_id, ...],  # Линия кубита 0
    [gate3_id, gate4_id, ...],  # Линия кубита 1
    ...
  ]

РЕШЕНИЕ: Переписать логику построения actualHistoryMap.
Вместо списка (gate_id, qubit) нужно строить матрицу по линиям кубитов.
""")
