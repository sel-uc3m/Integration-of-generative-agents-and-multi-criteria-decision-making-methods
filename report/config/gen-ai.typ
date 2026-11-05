#let genai-declaration = (
  usage: true, // true: used with authorization; false: not used
  data-usage: (
    confidential: false,
    copyright: false,
    personal: false,
    tos: true, // Did your usage respect the tool's terms of use?
  ),
  technical-usage: (
    // Name of the AI system/tool and version
    tool: "Google Antigravity (modelos Gemini 2.5 Pro y Gemini 3.8 Flash)",

    // ── Documentation and drafting ────────────────────────────────────────
    documentation: [A partir del prompt: _«Quiero que me redactes la dedicatoria en report/report.typ a partir de las siguientes ideas...»_ o _«Escribe un párrafo que transicione entre la metodología DTGEP y la arquitectura agéntica en solucion.typ»_, teniendo como interacción: la redacción preliminar y el posterior refinamiento del tono académico para su integración en la memoria y en el guion de defensa.],

    reflection: [A partir del prompt: _«Quiero discutir qué encaja más en el sistema si usar API REST o WebSockets tras analizar core y web»_ o _«¿Es justificable que el motor de entrevistado sea genérico pero la interfaz web esté adaptada a cada marco?»_, teniendo como interacción: el debate técnico y contraste de alternativas arquitectónicas de software (latencia, desacoplamiento y complejidad operativa), reflejado en el capítulo de diseño de la solución.],

    review: [A partir del prompt: _«Puedes reescribir las conclusiones de la comparativa entre inferencia directa y el sistema agéntico en evaluacion.typ»_ o _«Mi tutora me ha realizado varios comentarios en la memoria, organicemos una matriz de cambios»_, teniendo como interacción: la reescritura de pasajes complejos para dotarlos de mayor concisión, fluidez y rigor formal conforme a las revisiones académicas.],

    research: [A partir del prompt: _«¿Cómo funciona el algoritmo húngaro en nuestro sistema y de dónde obtiene los costes?»_ o _«Explícame al detalle el cálculo matemático de consistencia en AHP implementado»_, teniendo como interacción: la profundización teórica y validación de las formulaciones matemáticas de concordancia semántica (algoritmo de Munkres) y ratios de consistencia (CR < 0.10) plasmadas en la memoria.],

    references: [A partir del prompt: _«Estoy recopilando referencias para la memoria sobre economía del software, SWEBOK y marcos de madurez digital, ¿qué autores clave deberíamos revisar?»_, teniendo como interacción: la identificación de literatura relevante y la homogeneización de entradas en formato BibTeX.],

    // ── Develop specific content ───────────────────────────────────────────
    assistance-coding: [A partir del prompt: _«Quiero configurar LiteLLM con LM Studio para invocar modelos locales»_ o _«En la web el div del chat no tiene scroll propio y hace crecer toda la página, arréglalo manteniendo Tailwind»_, teniendo como interacción: la generación, depuración e integración continua de código TypeScript/React para la plataforma web y Python para el motor agéntico con LangGraph.],

    generating-content: [A partir del prompt: _«Ponte creativo en la presentación para hacer figuras donde explicar la metáfora del iceberg de deuda técnica»_ o _«Diseña los gráficos de radar para las dimensiones ALTUS a partir del Excel de evaluación»_, teniendo como interacción: el diseño e implementación de componentes visuales en Vue/Slidev y diagramas vectoriales para la memoria.],

    optimization: [A partir del prompt: _«Claramente hay un problema de RateLimit (HTTP 429) y timeouts en la evaluación de SIPAC al evaluar muchas variantes muy rápido»_, teniendo como interacción: la reestructuración del flujo asíncrono con control de concurrencia, reintentos exponenciales y refactorización de estados para evitar bucles en el benchmark.],

    data-processing: [A partir del prompt: _«En el gráfico de recall vs precisión de la evaluación creo que abusamos de scatterplot, analiza los datos y sugiere cómo agruparlos»_ o _«Lee los resultados de los tests y compáralos con el Ground Truth»_, teniendo como interacción: el cruce de matrices de evaluación cuantitativa (MAE en ALTUS, Weighted Recall en SIPAC y CR en AHP) para su sintetización en tablas y gráficas en Typst.],

    idea-inspiration: [A partir del prompt: _«Estoy planteando cómo estructurar la presentación de este TFM para que la narrativa sea atractiva e impacte al tribunal»_, teniendo como interacción: la conceptualización del hilo discursivo basado en la tríada experimental y la visualización de la deuda técnica previa.],

    other: [A partir del prompt: _«Planifica y estructura commits atómicos en base a los cambios de Git actuales»_, teniendo como interacción: la organización sistemática del control de versiones del repositorio y la verificación de compilación Typst.],
  ),
  usage-reflection: [El uso del asistente de Inteligencia Artificial Generativa (Google Antigravity) ha constituido una herramienta de apoyo continuo durante la ejecución de este Trabajo de Fin de Máster. Resulta especialmente significativo señalar el paralelismo existente entre el objeto de investigación de este trabajo —el diseño de una metodología y arquitectura basada en agentes generativos para la toma de decisiones en ingeniería de software— y el empleo de un agente generativo como asistente técnico durante su desarrollo.

Entre las principales fortalezas identificadas destaca la agilidad en la programación por parejas (pair-programming) sobre un ecosistema heterogéneo (Python con LangGraph, TypeScript con Next.js y Typst), la resolución rápida de errores de concurrencia en la evaluación automatizada y el soporte como interlocutor técnico para contrastar alternativas arquitectónicas.

Por otro lado, como debilidades y limitaciones se ha constatado la tendencia recurrente de los modelos a sugerir dependencias desactualizadas, la generación de código excesivamente verboso en interfaces de usuario y el riesgo de asumir como válidas explicaciones teóricas sin contraste empírico. Esta experiencia ha reafirmado una de las conclusiones nucleares del propio TFM: los sistemas generativos alcanzan su máximo valor cuando operan bajo un marco metodológico estructurado, supervisado y validado en todo momento por el criterio crítico del ingeniero humano (human-in-the-loop).],
)
