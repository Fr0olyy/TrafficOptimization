#!/bin/bash
echo "📂 Копирую QASM схемы из контейнера..."
rm -rf saved_qasm_schemes
docker cp quantum-optimizer:/tmp/qasm_schemes ./saved_qasm_schemes 2>/dev/null

if [ -d "saved_qasm_schemes" ]; then
    file_count=$(find saved_qasm_schemes -name "*.qasm" 2>/dev/null | wc -l)
    echo "✅ Готово! Скопировано файлов: $file_count"
    ls -lh saved_qasm_schemes/
else
    echo "❌ Папка qasm_schemes не найдена в контейнере. Возможно, обработка еще не завершена."
fi
