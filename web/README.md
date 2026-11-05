# Interfaz Web y Plataforma Interactiva de Preproyecto (`web`)

Aplicación web desarrollada con **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4** y **@xyflow/react**. Proporciona un entorno interactivo en tiempo real donde ingenieros y evaluadores de software pueden ejecutar la metodología de preproyecto, interactuar con el motor agéntico multietapa (`@tfm/core`), visualizar el grafo de decisiones y analizar los resultados de priorización cuantitativa.

---

## 🎨 Características Principales

* **Chat Agéntico con Streaming SSE:** Comunicación interactiva paso a paso con el orquestador agéntico mediante Server-Sent Events ([`app/api/chat/route.ts`](file:///Users/adrian/Documents/Universidad/TFM/web/app/api/chat/route.ts)).
* **Visualizador del Grafo en Tiempo Real:** Renderizado reactivo de la máquina de estados LangGraph utilizando `@xyflow/react` ([`app/components/LocalVisualizer.tsx`](file:///Users/adrian/Documents/Universidad/TFM/web/app/components/LocalVisualizer.tsx)), permitiendo al usuario observar en qué nodo se encuentra el flujo (`taskLoader`, `questionManager`, `architect`, etc.).
* **Tablas Interactivas de Decisión:** Componente para ingresar y ponderar criterios de comparación por pares (AHP) y metas de artefactos (SIPAC) de forma ergonómica ([`app/components/InteractiveTabularInput.tsx`](file:///Users/adrian/Documents/Universidad/TFM/web/app/components/InteractiveTabularInput.tsx)).
* **Dashboard de Resultados Multicriterio:** Visualización de gráficos de radar, cuadrantes de madurez de artefactos y barras de peso Saaty con `recharts` ([`app/components/ResultsDashboard.tsx`](file:///Users/adrian/Documents/Universidad/TFM/web/app/components/ResultsDashboard.tsx)).
* **Constructor de Procesos Personalizados:** Editor visual para definir tareas, acciones y criterios preproyecto ad-hoc ([`app/components/CustomProcessBuilder.tsx`](file:///Users/adrian/Documents/Universidad/TFM/web/app/components/CustomProcessBuilder.tsx)).
* **Soporte Bilingüe (Español / Inglés):** Conmutación reactiva de idioma en tiempo real con persistencia en `localStorage` ([`app/context/LanguageContext.tsx`](file:///Users/adrian/Documents/Universidad/TFM/web/app/context/LanguageContext.tsx) y [`app/i18n/translations.ts`](file:///Users/adrian/Documents/Universidad/TFM/web/app/i18n/translations.ts)).

---

## 🏗️ Estructura del Proyecto

```
web/
├── app/
│   ├── api/                           # Route Handlers de Next.js
│   │   ├── chat/route.ts              # Streaming SSE y orquestación con @tfm/core
│   │   ├── classify-bmc/route.ts      # Clasificación asistida en Business Model Canvas
│   │   ├── models/route.ts            # Introspección de modelos LLM disponibles
│   │   ├── processes/route.ts         # Catálogo de plantillas y flujos metodológicos
│   │   ├── results/route.ts           # Consulta y exportación de reportes finales
│   │   └── session/                   # Gestión de estado y persistencia de sesiones
│   ├── components/                    # Componentes React interactivos
│   │   ├── CustomProcessBuilder.tsx   # Creador/editor de plantillas de proceso
│   │   ├── FormattedMessageContent.tsx# Renderizado de mensajes, markdown y alertas
│   │   ├── InteractiveTabularInput.tsx# Formularios tabulares para Saaty / SIPAC
│   │   ├── LocalVisualizer.tsx        # Grafo de estados con @xyflow/react
│   │   └── ResultsDashboard.tsx       # Gráficas analíticas con Recharts
│   ├── context/                       # Contextos React (LanguageProvider)
│   ├── i18n/                          # Diccionarios de internacionalización (ES / EN)
│   ├── services/                      # Lógica de dominio backend
│   │   ├── dbService.ts               # Persistencia local de sesiones JSON
│   │   ├── graphService.ts            # Adaptador entre Next.js y LangGraph
│   │   └── traceService.ts            # Trazas y telemetría de ejecución
│   ├── layout.tsx                     # Shell principal y tipografía Geist
│   ├── page.tsx                       # Vista unificada (Chat + Canvas + Métricas)
│   └── globals.css                    # Estilos globales y tokens Tailwind CSS v4
├── next.config.ts                     # Configuración de compilación Next.js
└── package.json                       # Dependencias y scripts
```

---

## 🔌 API Endpoints Principales

| Endpoint | Método | Descripción |
| :--- | :--- | :--- |
| `/api/chat` | `POST` | Inicia o continúa una interacción con el grafo. Emite eventos SSE con tokens del LLM, cambios de nodo y pausas por interacción humana. |
| `/api/session/init` | `POST` | Inicializa una sesión con la plantilla de proceso seleccionada y crea el checkpoint inicial en memoria. |
| `/api/session/[id]` | `GET` | Recupera el estado actual de la sesión, histórico de mensajes y artefactos acumulados. |
| `/api/session/[id]/trace`| `GET` | Devuelve el historial cronológico de transiciones entre nodos del grafo para depuración visual. |
| `/api/models` | `GET` | Consulta la API de Ollama o proveedores configurados para obtener la lista de LLMs instalados. |
| `/api/processes` | `GET` | Lista los procesos metodológicos disponibles (SWEBOK, DTGEP, etc.). |
| `/api/results/[file]` | `GET` | Descarga el archivo de salida JSON con los resultados de la sesión. |

---

## ⚙️ Variables de Entorno

Configuradas en `.env` en la raíz del repositorio:

```env
# Puerto del servidor web
PORT=3000

# Conexión con motor LLM local
OLLAMA_BASE_URL=http://127.0.0.1:11434
EVAL_MODEL=deepseek-r1:7b

# (Opcional) Entorno y telemetría
NODE_ENV=development
PHOENIX_COLLECTOR_ENDPOINT=http://127.0.0.1:6006
```

---

## 🚀 Comandos de Ejecución

### Desarrollo
Para arrancar el servidor en modo desarrollo con Hot-Module Replacement (HMR):
```bash
# Desde la raíz del monorepo:
bun run dev:web

# O directamente desde la carpeta web:
bun run dev
# o con npm:
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000) (o el puerto configurado en `PORT`).

### Compilación y Producción
> [!IMPORTANT]
> Requiere **Node.js >= 20.9.0** para compilar correctamente bajo Next.js 16.

```bash
# Compilar la aplicación optimizada
bun run build
# o con npm:
npm run build

# Iniciar el servidor compilado
bun run start
# o con npm:
npm run start
```
