# Guía de Creación y Configuración de Metodologías (`METHODOLOGY_GUIDE.md`)

Esta guía explica en detalle cómo diseñar, configurar y extender metodologías y procesos preproyecto en el motor agéntico `@tfm/core`. Todo el comportamiento conversacional, la deducción lógica, los ganchos de evaluación y el flujo de la máquina de estados se definen de manera declarativa mediante archivos JSON.

---

## 📑 Estructura General del Archivo de Metodología

Un archivo de metodología es un documento JSON con tres bloques principales:

```json
{
  "session_id": "MI_METODOLOGIA_V1",
  "profile": {
    /* Configuración de comportamiento del Grafo */
  },
  "tasks": [
    /* Lista ordenada de tareas a ejecutar */
  ]
}
```

* **`session_id`** (`string`, obligatorio): Identificador único o versión del proceso (ej. `"ALTUS_FULL"`, `"SIPAC_FULL_COMPLIANCE"`).
* **`profile`** (`object`, obligatorio): Perfil de ejecución que activa o desactiva subsistemas del grafo (dudas, repreguntas, consultor de conocimiento, ganchos).
* **`tasks`** (`array`, obligatorio): Secuencia ordenada de macro-etapas (**Tareas**). Cada tarea contiene una lista secuencial de micro-pasos (**Acciones**).

---

## ⚙️ 1. Configuración del Perfil (`profile`)

El objeto `profile` define las políticas de control y el comportamiento de la máquina de estados LangGraph durante la sesión:

| Campo | Tipo | Por Defecto | Descripción |
| :--- | :---: | :---: | :--- |
| **`processName`** | `string` | `"Custom"` | Nombre representativo de la metodología (ej. `"ALTUS"`, `"SIPAC"`, `"AHP"`). |
| **`allowFollowUps`** | `boolean` | `false` | Si está activo (`true`), el nodo `architect` analiza cada respuesta del usuario. Si detecta vacíos o vaguedades, genera preguntas de seguimiento (*follow-ups*) adaptativas antes de avanzar. |
| **`allowDoubtConfirmation`** | `boolean` | `false` | Si está activo (`true`), cuando el clasificador de intención detecta una duda con confianza intermedia, el nodo `doubtConfirmer` pide confirmación al usuario para no interrumpir el flujo innecesariamente. |
| **`allowKnowledgeConsultation`** | `boolean` | `false` | Si está activo (`true`), cuando el usuario formula una duda técnica, el nodo `knowledgeConsultant` consulta la base de conocimiento y le responde didácticamente sin avanzar la acción actual. |
| **`generateTaskSummaries`** | `boolean` | `false` | Si está activo (`true`), el nodo `taskSummarizer` redacta un resumen ejecutivo al concluir todas las acciones de una tarea. |
| **`saveTaskSummariesToOutput`** | `boolean` | `false` | Si está activo (`true`), almacena los resúmenes de tarea dentro del documento final `outputJson`. |
| **`answerSufficiencyPrompt`** | `string` | `undefined` | Directriz personalizada para el nodo `architect`. Permite definir el nivel de exigencia para validar las respuestas (ej. *"Exige que el usuario especifique si cuenta con herramienta digital y el nivel de adopción"*). |
| **`systemPrompt`** | `string` | `undefined` | Prompt de sistema global inyectado a los agentes en todas las operaciones de la sesión. |
| **`knowledgeBase`** | `array` | `[]` | Lista de documentos de referencia indexados para resolver dudas técnicas del usuario. Cada elemento es `{ "name": "...", "path": "..." }`. |
| **`hooks`** | `object` | `{}` | Ganchos automáticos ejecutados en el ciclo de vida del grafo (ver sección de Hooks). |

---

## 📋 2. Definición de Tareas (`tasks`)

Una **Tarea** (`Task`) representa un hito o fase metodológica (por ejemplo: *"Diagnóstico de Configuración"*, *"Identificación de Objetivos"*, o *"Priorización AHP"*).

```json
{
  "id": "1_CONF",
  "name": "Nivel de Madurez 1 - Configuración",
  "metadata": {
    "maturityLevel": 1,
    "architecturalCode": "CONF",
    "bmc_block": "key_activities"
  },
  "actions": [
    /* Lista de acciones */
  ]
}
```

* **`id`** (`string`, obligatorio): Identificador alfanumérico único de la tarea.
* **`name`** (`string`, obligatorio): Nombre legible utilizado en el cuadro de mandos y en los registros de traza.
* **`metadata`** (`object`, opcional): Diccionario libre para etiquetar la tarea (ej. nivel de madurez, bloque del Canvas, categoría metodológica).
* **`actions`** (`array`, obligatorio): Lista ordenada de acciones que componen la tarea.

---

## ⚡ 3. Tipos de Acción (`actions`)

Cada elemento dentro del array `actions` representa una operación atómica dentro del flujo. Existen **3 tipos de acción**:

### 3.1. Acción Interactiva (`"type": "question"`)
Formula una pregunta directamente al usuario humano en el chat o terminal y espera su respuesta:

```json
{
  "id": "STEP_1_OBJETIVOS",
  "type": "question",
  "content": "¿Cuáles son los objetivos estratégicos que su organización desea mejorar este trimestre?",
  "outputVar": "objetivos_estrategicos"
}
```

* **`id`** (`string`): Identificador único de la acción.
* **`content`** (`string`): El texto exacto de la pregunta. Soporta interpolación de variables `{nombre_variable}`.
* **`outputVar`** (`string`, opcional): Clave bajo la cual se guardará la respuesta procesada en `outputJson`. Permite que pasos posteriores lean este dato.

---

### 3.2. Acción de Deducción Interna (`"type": "internal"`)
Ejecuta una operación de razonamiento o cálculo desatendido mediante el LLM sin interrumpir al usuario humano. Es ideal para extraer entidades, categorizar, estructurar o sintetizar información:

```json
{
  "id": "STEP_2_DEDUCE_ACTIVOS",
  "type": "internal",
  "content": "Deducción de activos intangibles a partir de objetivos",
  "instruction": "A partir de los objetivos provistos en '{objetivos_estrategicos}', deduce los activos intangibles requeridos. Devuelve un JSON estructurado.",
  "outputVar": "activos_deducidos",
  "outputSchema": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "nombre_activo": { "type": "string" },
        "categoria": { "type": "string", "enum": ["Humano", "Estructural", "Relacional"] }
      },
      "required": ["nombre_activo", "categoria"],
      "additionalProperties": false
    }
  }
}
```

* **`content`** (`string`): Descripción interna de lo que realiza la acción (mostrada en trazas).
* **`instruction`** (`string`): La directriz técnica detallada dada al LLM. Soporta variables interpoladas entre llaves `{variable}`.
* **`outputVar`** (`string`): Nombre de la variable en `outputJson` donde se guardará el resultado estructurado.
* **`outputSchema`** (`object`, opcional pero altamente recomendado): Esquema JSON Schema estricto. El motor valida y repara la respuesta del LLM para garantizar que cumpla exactamente este formato.

---

### 3.3. Acción de Bucle Dinámico (`"type": "loop_validation"`)
Permite iterar sobre un array generado previamente en tiempo de ejecución (por ejemplo, una lista de activos descubiertos) y **desenrollar dinámicamente** una pregunta o acción interna para cada elemento del array:

```json
{
  "id": "LOOP_VALIDAR_ACTIVOS",
  "type": "loop_validation",
  "sourceVar": "activos_deducidos",
  "unrollType": "question",
  "templateQuestion": "Para el activo '{nombre_activo}' ({categoria}), ¿qué nivel de impacto (1-5) considera que tiene para su empresa?",
  "outputVarItem": "calificacion_activo"
}
```

* **`sourceVar`** (`string`): Nombre de la variable en `outputJson` que contiene el array sobre el que iterar.
* **`unrollType`** (`"question"` | `"internal"`): El tipo de acción en el que se transformará cada elemento del bucle (por defecto `"question"`).
* **`templateQuestion`** (`string`): Plantilla de pregunta para cada elemento. Puede interpolar cualquier propiedad de los objetos del array usando `{propiedad}`.
* **`templateInstruction`** (`string`): Si `unrollType` es `"internal"`, la instrucción a ejecutar para cada elemento.
* **`outputVarItem`** (`string`, opcional): Clave donde se almacenará el resultado individual de cada iteración dentro del contexto del elemento.

---

## 🔗 4. Interpolación de Variables (`{variable}`)

El motor `@tfm/core` cuenta con un sistema de interpolación de plantillas reactivo:

1. Cuando cualquier acción guarda un dato en `outputVar: "mi_variable"`, este valor pasa a residir en el estado global `outputJson`.
2. Cualquier acción posterior puede referenciar este valor simplemente escribiendo `{mi_variable}` en su campo `content`, en su `instruction`, o en sus plantillas de bucle.
3. Si el valor es un objeto o array complejo, el motor lo convierte automáticamente a una representación JSON legible para que el LLM lo interprete sin ambigüedad.

---

## 🪝 5. Ganchos de Evaluación (`hooks`)

Los hooks permiten ejecutar evaluaciones automáticas o aplicar rúbricas científicas sin alterar el flujo principal de preguntas:

### Gancho `afterActionAnswer`
Se dispara automáticamente tras recibir y resumir la respuesta a una pregunta. Es el mecanismo utilizado por metodologías como **ALTUS** para calificar madurez (0-5) sobre una rúbrica formal:

```json
"hooks": {
  "afterActionAnswer": {
    "instruction": "Evalúa la madurez de la capacidad en escala 0 a 5 según la respuesta del usuario:\n- 5: Excelente con soporte digital integral.\n- 3: Aceptable con soporte no digital.\n- 1: Inexistente.\nJustifica la nota brevemente.",
    "outputSchema": {
      "type": "object",
      "properties": {
        "qualification": { "type": "integer", "minimum": 0, "maximum": 5 },
        "qualification_reasoning": { "type": "string" }
      },
      "required": ["qualification", "qualification_reasoning"],
      "additionalProperties": false
    }
  }
}
```

El resultado del hook se almacena automáticamente asociado al ID de la acción en `outputJson[actionId].qualification` y `outputJson[actionId].qualification_reasoning`.

---

## 💡 6. Ejemplo Completo y Mínimo: "Diagnóstico Rápido de Software"

A continuación se muestra un ejemplo funcional completo listo para ser cargado en la plataforma:

```json
{
  "session_id": "DIAGNOSTICO_SOFTWARE_EXPRESS",
  "profile": {
    "processName": "Diagnóstico Express",
    "allowFollowUps": true,
    "allowDoubtConfirmation": true,
    "allowKnowledgeConsultation": false,
    "generateTaskSummaries": true,
    "saveTaskSummariesToOutput": true,
    "answerSufficiencyPrompt": "Asegúrate de que el usuario mencione tecnologías específicas y problemas concretos.",
    "hooks": {}
  },
  "tasks": [
    {
      "id": "TAREA_1_STACK",
      "name": "1. Identificación del Stack Tecnológico",
      "actions": [
        {
          "id": "Q1_STACK",
          "type": "question",
          "content": "¿Qué lenguaje de programación y base de datos principal utiliza su sistema actual?",
          "outputVar": "stack_actual"
        },
        {
          "id": "INT_ANALISIS_STACK",
          "type": "internal",
          "content": "Análisis preliminar de obsolescencia técnica",
          "instruction": "Analiza el stack indicado en '{stack_actual}'. Identifica si incluye componentes legacy o modernos y lista 2 riesgos potenciales.",
          "outputVar": "analisis_riesgos",
          "outputSchema": {
            "type": "object",
            "properties": {
              "es_moderno": { "type": "boolean" },
              "riesgos": {
                "type": "array",
                "items": { "type": "string" }
              }
            },
            "required": ["es_moderno", "riesgos"],
            "additionalProperties": false
          }
        }
      ]
    },
    {
      "id": "TAREA_2_FEEDBACK",
      "name": "2. Validación con el Usuario",
      "actions": [
        {
          "id": "Q2_CONFIRMAR_RIESGOS",
          "type": "question",
          "content": "Hemos detectado los siguientes riesgos técnicos preliminares:\n\n{analisis_riesgos}\n\n¿Coincide esta apreciación con los problemas que experimenta su equipo en el día a día?"
        }
      ]
    }
  ]
}
```

---

## 🛠️ Cómo Probar una Nueva Metodología

1. Guarda tu archivo JSON en la carpeta [`questions/`](questions/) con el nombre `preguntas-MI_METODOLOGIA.json`.
2. Para probarla desde la interfaz web:
   * Accede a la plataforma web (`http://localhost:3000` o puerto configurado).
   * En el menú lateral de procesos, selecciona la metodología o utiliza el **Constructor de Procesos Personalizados** (`CustomProcessBuilder`) para importar tu JSON.
3. Para probarla mediante scripts en el motor `@tfm/core`:
   * Carga el JSON mediante `loadQuestions(rutaJson)` y pásalo a `createInitialState()`.
   * Ejecuta el grafo con `appGraph.stream(...)` o mediante los runners de evaluación en `core/eval/runner.ts`.
