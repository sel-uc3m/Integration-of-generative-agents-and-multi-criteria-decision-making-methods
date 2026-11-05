#!/usr/bin/env bash
set -e

# Directorio base del script (carpeta paper/)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd "$DIR"

echo "==> 1. Compilando PDF con Typst (Estilo IEEE)..."
typst compile paper.typ paper.pdf

echo "==> 2. Compilando Word (.docx) con Pandoc (Estilo IEEE CSL)..."
pandoc -f typst -t docx \
  --lua-filter="resolve_refs.lua" \
  --citeproc \
  --csl="ieee.csl" \
  --bibliography="references.bib" \
  paper.typ -o paper.docx

echo "==> ¡Éxito! Generados:"
echo "    - $DIR/paper.pdf"
echo "    - $DIR/paper.docx"
