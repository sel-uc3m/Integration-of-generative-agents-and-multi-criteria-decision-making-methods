# Integración de agentes generativos y métodos de toma de decisiones multicriterio

### *Integration of generative agents and multi-criteria decision-making methods*

[![Universidad Carlos III de Madrid](https://img.shields.io/badge/UC3M-Master_TFM-blue)](https://www.uc3m.es)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.4-F46800)](https://js.langchain.com/docs/concepts/langgraph/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2_(Turbopack)-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-white?logo=ollama&logoColor=black)](https://ollama.ai)

> **Trabajo de Fin de Máster (TFM)**  
> **Título:** *Metodología para la integración de agentes generativos en la toma de decisiones en la fase de pre-proyecto*  
> **Autor:** Adrián Fernández Galán  
> **Tutoras:** Dra. María Isabel Sánchez Segura & Dra. Fuensanta Medina Domínguez  
> **Institución:** Universidad Carlos III de Madrid (UC3M) — Departamento de Informática
>
> **Documentos:** [Memoria](report/Memoria_Final.pdf) · [Artículo científico](paper/paper.pdf)

> [!NOTE]
> Los datos de las empresas colaboradoras que participaron en el estudio no se incluyen en este repositorio. Los identificadores de caso, los nombres de empresa y las capturas de pantalla han sido anonimizados. El conjunto de datos completo se conserva en el repositorio privado del grupo de investigación.

---

## 📌 Visión General

En el marco de la **Ingeniería Económica del Software (*Software Engineering Economics* - SWEBOK)**, la fase de preproyecto es el periodo crítico donde se decide si una iniciativa tecnológica debe iniciarse, cómo debe abordarse y qué retorno aportará a la organización. Históricamente, la tasa de fracaso de proyectos de software en esta fase supera el 70%, debido principalmente a la omisión de los activos intangibles, diagnósticos de madurez superficiales y sesgos cognitivos en la priorización de alternativas.

Este proyecto implementa **AI-Driven DTGEP**, una metodología y plataforma de software que combina:
1. **Un motor conversacional agéntico orquestado con LangGraph:** Guía entrevistas de educción estructuradas y adaptativas con stakeholders, combinando verificación dialéctica, memoria a corto/largo plazo y desambiguación contextual sin alucinaciones.
2. **Procesamiento algorítmico determinista:** Separa estrictamente la creatividad del LLM del cálculo matemático. Una vez recolectadas las variables, se ejecutan modelos cuantitativos rigurosos libres de estocasticidad.
3. **Integración metodológica en 3 etapas:**
   * **ALTUS (Diagnóstico de Madurez Digital):** Evaluación de la madurez digital en 5 niveles.
   * **SIPAC (Gestión de Activos Intangibles):** Detección de activos ocultos (capital humano, estructural y relacional), cálculo de brechas de calidad ($V$) e impacto ($W$) y mapeo interactivo al **Business Model Canvas (BMC)**.
   * **AHP (*Analytic Hierarchy Process*):** Priorización multicriterio de soluciones tecnológicas con matrices de Saaty y control de ratio de consistencia ($CR < 0.10$).
4. **Plataforma web unificada:** Cuadro de mandos reactivo (Next.js 16) con visualización de grafos en tiempo real, lienzo BMC interactivo con códigos semánticos de salud y gráficos de radar.

---

## 🏛️ Arquitectura del Monorepo

El repositorio está organizado como un espacio de trabajo modular (*monorepo*):

```
.
├── core/                  # Motor agéntico en TypeScript / LangGraph y lógica algorítmica
│   ├── src/               # Grafo de estados, nodos, evaluadores, LLM client y memoria
│   ├── tests/             # Suite de 80 tests unitarios y funcionales (Vitest)
│   ├── eval/              # Framework de benchmarking experimental offline y online
│   └── results/           # Persistencia de variables y transcripciones de ejecución
│
├── web/                   # Aplicación web interactiva (Next.js 16 App Router + Tailwind v4)
│   ├── app/               # Páginas, rutas API (/api/chat, /api/sessions, /api/classify-bmc)
│   ├── components/        # Cuadros de mando (BMC interactivo, radares ALTUS, ranking AHP)
│   └── services/          # Conexión con el grafo de core y persistencia SQLite local
│
├── questions/             # Definiciones ontológicas y cuestionarios JSON estructurados
│   ├── preguntas-ALTUS.json   # Diagnóstico de madurez en 5 dimensiones
│   ├── preguntas-SIPAC.json   # Educción de procesos y activos intangibles
│   └── preguntas-AHP.json     # Criterios y alternativas de decisión
│
├── knowledge_base/        # Catálogos formales y taxonomías metodológicas
│   ├── modelo_intellectus.md  # Taxonomía de capital intelectual
│   ├── catalogo_gia.md        # Catálogo canónico de activos intangibles
│   └── doc_artifacts.md      # Diccionario de artefactos
│
├── report/                # Memoria académica oficial del TFM (Typst)
├── paper/                 # Artículo científico (Typst, formato IEEE)
└── DEPLOYMENT.md          # Guía de despliegue en servidor VPS con PM2 y Ollama
```

Para consultar la documentación específica de cada subsistema:
* 🧠 [Documentación del Motor Core (`core/README.md`)](core/README.md)
* 📋 [Guía de Configuración de Metodologías (`core/METHODOLOGY_GUIDE.md`)](core/METHODOLOGY_GUIDE.md)
* 🌐 [Documentación de la Aplicación Web (`web/README.md`)](web/README.md)
* 🚀 [Guía de Despliegue en Producción (`DEPLOYMENT.md`)](DEPLOYMENT.md)

> [!NOTE]
> Este repositorio reúne los entregables del TFM: la plataforma (`core/`, `web/`), la memoria (`report/`) y el artículo científico (`paper/`).

---

## ⚡ Inicio Rápido (Quickstart)

### Requisitos previos
* **Node.js** `>= 20.9.0` o **Bun** `>= 1.1.0` (recomendado).
* **Ollama** ejecutándose localmente con al menos un modelo descargado (por ejemplo, `deepseek-r1:7b` o `qwen2.5:7b`):
  ```bash
  ollama pull deepseek-r1:7b
  ```

### 1. Clonar e instalar dependencias
```bash
git clone https://github.com/Adri-Extremix/TFM.git
cd TFM

# Con Bun (recomendado):
bun install

# O con npm:
npm install
```

### 2. Configurar variables de entorno
Copia la plantilla de entorno:
```bash
cp .env.example .env
```

Configuración típica para uso con **Ollama local**:
```env
# Servidor local de inferencia LLM
OLLAMA_BASE_URL=http://127.0.0.1:11434
EVAL_MODEL=deepseek-r1:7b

# Puerto de la plataforma web
PORT=3000
NODE_ENV=development

# (Opcional) Proveedores en la nube para benchmarking masivo
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=tu_api_key_aqui
```

### 3. Compilar y arrancar la aplicación

```bash
# Modo desarrollo simultáneo (Core + Web):
bun run dev:web

# O arrancando en modo producción:
bun run --cwd core build
bun run --cwd web build
bun run --cwd web start
```

Abre tu navegador en **`http://localhost:3000`** para interactuar con la plataforma.

---

## 🧪 Banco de Pruebas y Benchmarking

El repositorio incluye una suite integral de evaluación con **Ground Truth** validado sobre casos reales de PYMEs para medir la calidad de las entrevistas, la tasa de alucinación y la precisión algorítmica.

> **Nota:** el conjunto de datos de evaluación (`core/eval/ground_truth/`) no se distribuye con este repositorio por confidencialidad. Los comandos de esta sección requieren acceso al repositorio privado del grupo. El informe agregado y ya anonimizado sí se incluye, porque es la fuente de las tablas de la memoria.

### Tests Unitarios del Core (80 tests)
```bash
bun run --cwd core test
```

### Suite de Evaluación Agéntica (`eval`)
Permite evaluar el comportamiento de los agentes frente a simuladores de stakeholders sintéticos:

```bash
# Evaluar todos los módulos (ALTUS, SIPAC, AHP) sobre el modelo por defecto:
bun run eval

# Evaluar un módulo concreto:
bun run eval -- --module=altus
bun run eval -- --module=sipac
bun run eval -- --module=ahp

# Evaluar un caso de prueba específico del Ground Truth:
bun run eval -- --cases=G1_empresa_a

# Forzar re-ejecución ignorando el caché:
bun run eval -- --fresh
```

### Recálculo Offline con Jueces LLM (`eval:rescore`)
Re-evalúa las salidas persistidas turn-by-turn aplicando las rúbricas formales de evaluación (0 a 3 en profundidad de preguntas, algoritmo Húngaro y consistencia Saaty) **sin incurrir en gasto de tokens de inferencia**:
```bash
bun run eval:rescore
```

---

## 🚀 Despliegue en Servidores VPS

El proyecto está preparado para ejecutarse de forma persistente y autónoma en servidores Linux mediante **PM2** y **Ollama**:

* Consulta la [Guía Completa de Despliegue (`DEPLOYMENT.md`)](DEPLOYMENT.md) para ver los pasos de instalación en Ubuntu, gestión de procesos con PM2, variables de entorno y ejecución en producción.
