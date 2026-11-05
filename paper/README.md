# Artículo Científico Derivado del TFM (`paper`)

Este directorio contiene el borrador y manuscrito científico del artículo de investigación derivado del Trabajo de Fin de Máster, preparado para su envío a conferencias o revistas en el ámbito de la Ingeniería del Software Asistida por Inteligencia Artificial (AI-assisted Software Engineering).

---

## 📑 Estructura del Manuscrito

El artículo está estructurado modularmente en archivos Typst con estilo y tipografía conformes al estándar **IEEE Computer Society**:

```
paper/
├── paper.typ              # Archivo raíz con configuración de formato IEEE y metadatos
├── 01_abstract.typ        # Resumen ejecutivo y palabras clave (Keywords)
├── 02_introduction.typ    # Contexto, formulación del problema y contribuciones
├── 03_related_work.typ    # Estado del arte (LLMs en SE, LangGraph, AHP/SIPAC)
├── 04_methodology.typ     # Metodología agéntica, ciclo de vida y formalización matemática
├── 05_evaluation.typ      # Diseño experimental, benchmarks y resultados cuantitativos
├── 06_threats.typ         # Análisis de amenazas a la validez (interna, externa, constructo)
├── 07_conclusions.typ     # Conclusiones y líneas de trabajo futuro
├── references.bib         # Enlace simbólico a la bibliografía central del TFM
├── ieee.csl               # Estilo bibliográfico IEEE para Pandoc
├── resolve_refs.lua       # Filtro Lua para compatibilidad de referencias cruzadas
├── compile.sh             # Script de automatización de compilación dual (PDF y DOCX)
└── diagramas/             # Diagramas y figuras vectoriales de la metodología
```

---

## 🛠️ Requisitos de Compilación

1. **Typst (>= 0.11.0):**
   Herramienta moderna de composición tipográfica científica.
   ```bash
   # En macOS con Homebrew:
   brew install typst

   # En Linux:
   cargo install --locked typst-cli
   ```

2. **Pandoc (>= 3.0) y citeproc (opcional para versión Word):**
   Requerido para generar el formato Microsoft Word (`.docx`) exigido por algunas conferencias:
   ```bash
   brew install pandoc
   ```

---

## 🚀 Compilación del Manuscrito

El script automatizado [`compile.sh`](file:///Users/adrian/Documents/Universidad/TFM/paper/compile.sh) compila tanto la versión PDF (Typst) como la versión DOCX (Pandoc con filtro Lua y CSL):

```bash
# Desde la raíz del monorepo:
bun run paper:compile

# O directamente desde la carpeta paper/:
./compile.sh
```

### Compilación Manual con Typst (Solo PDF)
Si solo se desea regenerar el PDF en tiempo real con recarga automática:
```bash
typst watch paper.typ paper.pdf
```
