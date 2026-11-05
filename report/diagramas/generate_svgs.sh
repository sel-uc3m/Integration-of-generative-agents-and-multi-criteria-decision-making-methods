#!/bin/bash

# Moverse al directorio del script
cd "$(dirname "$0")"

echo "⏳ Generando SVGs desde ficheros Mermaid..."
for file in *.mmd; do
    if [ -f "$file" ]; then
        filename=$(basename -- "$file")
        name="${filename%.*}"
        echo "   ➜ Generando $name.svg..."
        npx -y @mermaid-js/mermaid-cli -i "$file" -o "${name}.svg" -c mermaid-config.json
    fi
done

echo "⏳ Generando SVGs desde ficheros d2..."
for file in *.d2; do
    if [ -f "$file" ]; then
        filename=$(basename -- "$file")
        name="${filename%.*}"
        echo "   ➜ Generando $name.svg..."
        d2 "$file" "${name}.svg"
    fi
done

echo "⏳ Generando SVGs desde ficheros PlantUML..."
if command -v plantuml &> /dev/null; then
    if [ -d "plantuml" ]; then
        cd plantuml
        echo "   ➜ Generando SVGs de PlantUML..."
        plantuml -tsvg *.puml
        cd ..
    fi
else
    echo "   ⚠️ 'plantuml' no está instalado. Ejecuta 'brew install plantuml' (en macOS) o equivalente para poder generarlos."
fi

echo "✅ ¡Todos los diagramas han sido generados con éxito!"
