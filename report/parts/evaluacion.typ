#import "eval_analysis.typ": (
  altus-accuracy-mae-chart,
  altus-tradeoff-scatter-chart,
  sipac-f1-chart,
  sipac-precision-recall-chart,
  sipac-qualitative-case-study-table,
  sipac-pruning-heatmap-table,
  ahp-scores-chart,
  ahp-consistency-chart,
  local-models-stacked-time-chart,
  get-altus-avg-turns,
)

= Marco y Resultados de la Evaluación Experimental <sec:evaluacion>
Este capítulo describe el diseño experimental y los resultados empíricos de la evaluación de la metodología *AI-Driven DTGEP* y la arquitectura desarrollada. Para validar la efectividad del enfoque agéntico propuesto, la evaluación se articula en torno a la instanciación de sus tres subprocesos metodológicos clave: la evaluación de la madurez digital (*ALTUS* @sanchez_ALTUS_2020), la identificación y caracterización de activos intangibles y deducción de artefactos (*SIPAC* @sanchez_sipac_2017), y la priorización multicriterio (*AHP* @AHP_2001), utilizando como banco de pruebas un conjunto de casos de estudio sobre organizaciones reales.

Esta elección permite someter a la arquitectura desarrollada para dar soporte a la metodología *AI-Driven DTGEP* a tres desafíos cognitivos cualitativamente distintos y complementarios sobre datos de empresas reales con _Ground Truth_ humano: la conducción de una indagación diagnóstica activa, adaptativa y no redundante en un contexto estructurado (*ALTUS*); la deducción semántica e inferencia generativa en cadena abierta para la identificación de activos y soluciones tecnológicas (*SIPAC*); y la asistencia consultiva a la toma de decisiones mediante la formulación de criterios ortogonales y la justificación de juicios comparativos pareados (*AHP*).

El capítulo concluye con un análisis de viabilidad operativa y rendimiento temporal en distintos entornos de cómputo, una discusión sobre el valor añadido frente a la generación directa sin metodología y la delimitación formal de la validez y limitaciones del estudio.

== Marco y Configuración Experimental <sec:evaluacion:marco>
La validación del sistema se fundamenta en un conjunto de *cuatro casos organizativos reales completos*. El material de origen procede de consultorías de transformación digital realizadas por estudiantes de último curso del Grado en Ingeniería del Software, e integra las grabaciones de audio de las entrevistas de campo y las plantillas metodológicas de trabajo (como las hojas de cálculo de SIPAC y los diagnósticos de madurez de ALTUS).

A partir de dicho material de campo, los datos de cada caso de estudio se estructuran en dos componentes metodológicos fundamentales. Por un lado, se elabora el *Dossier Contextual de la Organización*, un informe cualitativo estructurado que sintetiza la actividad, historia, procesos operativos, áreas de dolor y particularidades de la empresa, obtenido a partir de la transcripción íntegra de las grabaciones de las entrevistas de campo; este informe suministra el contexto fáctico para alimentar la interacción de los agentes. Por otro lado, se consolida el *Patrón de Referencia (_Ground Truth_)*, constituido por las evaluaciones y soluciones formales elaboradas por los consultores humanos en las plantillas metodológicas de ingeniería: en ALTUS corresponde a la calificación formal asignada a cada una de las 51 capacidades organizacionales (en una escala ordinal discreta de $0$ a $5$, donde $0$ denota ausencia y $5$ digitalización excelente) y su evidencia técnica, a partir de las cuales se determina la cobertura agregada en los cuatro Niveles de Madurez del modelo (ML1 a ML4); mientras que en SIPAC integra la formalización de procesos, activos intangibles específicos, artefactos tecnológicos e indicadores. Frente a este patrón se audita de forma objetiva el grado de acierto, exhaustividad y consistencia de la IA.

Asimismo, para garantizar la capacidad de generalización del sistema y prevenir cualquier riesgo de sobreajuste a los datos de diseño, el marco metodológico establece una partición estricta de los casos disponibles. Por una parte, el caso piloto de desarrollo (*`G1_empresa_a`*) se empleó de forma exclusiva durante el ciclo de diseño e ingeniería para ajustar las directivas de los prompts, calibrar empíricamente los umbrales de filtrado semántico y refinar el flujo conversacional del motor de educción, quedando formalmente excluido del conjunto de evaluación final. Por otra parte, el conjunto de prueba a ciegas (*`G2_empresa_b`*, *`G3_empresa_c`* y *`G4_empresa_d`*) reúne tres escenarios reales que han permanecido completamente desacoplados del sistema durante su desarrollo, permitiendo medir de forma imparcial la capacidad de transferencia y resolución de situaciones nuevas sin sesgo.

=== Criterios de Evaluación y Rol del Juez LLM <sec:evaluacion:criterios_juez>
La labor del ingeniero durante la fase de preproyecto combina tareas con respuestas numéricas o cerradas y procesos consultivos de naturaleza intrínsecamente abierta y cualitativa. Para reflejar esta realidad en la evaluación experimental, se adoptan dos enfoques complementarios:

Por un lado, en aquellas dimensiones con formalización numérica o lógica cerrada —concretamente la calificación ordinal asignada a las capacidades en ALTUS ($0$ a $5$) frente al _Ground Truth_ humano, así como la verificación matemática de la coherencia transitiva en las matrices de comparación pareada de AHP mediante la Razón de Consistencia ($"CR" < 0.10$) @AHP_2001—, la evaluación es directa, objetiva y determinista mediante métricas exactas (_Accuracy_, _MAE_ y $"CR"$).

Por otro lado, la mayor parte de la actividad agéntica (la pertinencia de las repreguntas de indagación en ALTUS, la deducción de intangibles y artefactos tecnológicos en SIPAC, y la argumentación de criterios en AHP) se expresa en lenguaje natural libre y presenta una alta riqueza sinonímica. En estas tareas, la comparación literal de cadenas resulta inviable. Para evaluar estas dimensiones semánticas de forma reproducible, se adopta el estándar de la literatura en evaluación de agentes de IA: el paradigma *LLM-as-a-Judge* @zheng_2023_judging. Como evaluador externo independiente se emplea el modelo de frontera *GPT-5.6 Luna*, el cual arbitra las respuestas mediante rúbricas formales discretizadas asignando una puntuación $s in {0, 1, 2, 3}$ (donde $s=0$ denota discrepancia total o calidad deficiente, y $s=3$ correspondencia exacta o excelencia), garantizando una evaluación cualitativa estructurada, homogénea e imparcial.

=== Modelos Evaluados e Infraestructura <sec:evaluacion:modelos>
Para evaluar el desempeño y la viabilidad operativa del sistema en distintos escenarios de despliegue, se somete a prueba una selección estratificada de siete modelos de lenguaje representativos que cubren tres órdenes de magnitud y perfiles de cómputo: arquitecturas locales compactas de pesos abiertos (4B–9B) ejecutables en hardware de consumo estándar (MacBook Air M4 con 16 GB de memoria unificada), modelos de gran escala (27B–31B) servidos en la nube mediante API, y un modelo fundacional de frontera de última generación (\~300B). La @fig:evaluacion:modelos_tabla sintetiza las características técnicas, tamaño de parámetros, modalidad de acceso y entorno de inferencia de cada modelo.

#figure(
  {
    set text(size: 11pt)
    table(
      columns: (auto, auto, auto, auto, 1fr),
      align: (left, left, center, center, left),
      table.header(
        [*Modelo*], [*Desarrollador*], [*Parámetros*], [*Acceso*], [*Entorno / Inferencia*],
      ),
      [Gemma 4 E4B], [Google], [4B], [Pesos abiertos], [Local],
      [DeepSeek R1 7B], [DeepSeek], [7B], [Pesos abiertos], [Local],
      [Ornith 9B], [Comma], [9B], [Pesos abiertos], [Local],
      [Qwen 3.8 27B], [Alibaba], [27B], [Pesos abiertos], [Cloud API],
      [Muse Glimmer 30B], [Meta], [30B], [Pesos abiertos], [Cloud API],
      [Gemma 4 31B], [Google], [31B], [Pesos abiertos], [Cloud API],
      [Gemini 3.7 Flash], [Google], [~300B], [Propietario], [Cloud API],
    )
  },
  caption: [Especificaciones técnicas y entorno de ejecución de los modelos evaluados.],
) <fig:evaluacion:modelos_tabla>

Tanto la infraestructura evaluadora como los modelos de referencia en la nube se ejecutan a través de API independientes, garantizando el aislamiento y la objetividad frente a los modelos bajo prueba.

En cuanto a los parámetros de inferencia, la temperatura del agente evaluado se fija permanentemente a $0.0$ para garantizar el determinismo y la comparabilidad experimental. Por su parte, los evaluadores externos inicializan también a $0.0$, pero incorporan una política de reintento adaptativo (_Adaptive Temperature Backoff_ de hasta 5 intentos) que eleva la temperatura a un máximo de $0.4$ ante fallos sintácticos e inyecta el error previo para guiar la auto-corrección JSON (_Self-Correction Prompting_). Este mecanismo evita que contingencias de formato en la infraestructura penalicen artificialmente al modelo bajo prueba o introduzcan sesgos en el benchmark.


== Evaluación de ALTUS: Diagnóstico de Madurez y Proceso Conversacional <sec:evaluacion:altus>
La evaluación de ALTUS mide la habilidad del agente para conducir la entrevista diagnóstica de madurez digital, estructurándose en dos niveles complementarios: la evaluación del *proceso conversacional* (calidad, pertinencia y comportamiento de indagación) y la evaluación del *resultado final* (acierto en la puntuación ordinal de madurez).

=== Diseño Experimental y Entorno de Simulación <sec:evaluacion:altus:simulacion>
Para evaluar la capacidad de indagación del agente de forma automatizada y reproducible sin intervención humana, se implementó un entorno que emula la dinámica conversacional de una entrevista de consultoría real. En este entorno interactúan dos roles: el agente bajo prueba (actuando como consultor de madurez) y un interlocutor sintético que personifica al cliente de la empresa analizada (*Stakeholder LLM*).

El protocolo se articula mediante la inyección controlada de información inicial incompleta: al iniciar la evaluación de cada una de las 51 capacidades de ALTUS, el agente recibe la respuesta preliminar intencionadamente escueta e imprecisa (*estímulo inicial*, extraído de las primeras intervenciones del cliente en la entrevista real), idéntica para todos los modelos evaluados. Esto obliga al sistema a desplegar una estrategia activa de repregunta para recabar las evidencias necesarias antes de emitir una calificación. Dicho rol de interlocutor lo asume un modelo de lenguaje auxiliar (*DeepSeek V4 Flash 0731*) alimentado con el *dossier contextual de la organización* (el informe descriptivo derivado de las transcripciones de las entrevistas definido en la @sec:evaluacion:marco). Esta configuración articula un entorno de evaluación determinista de laboratorio, indispensable para someter a los siete modelos evaluados exactamente a las mismas condiciones de partida, neutralizando la fatiga, la subjetividad y la variabilidad inherente a los interlocutores humanos y garantizando la estricta reproducibilidad del estudio. El simulador responde a las indagaciones del agente revelando exclusivamente la información técnica requerida y señalando de forma contextual si se formulan preguntas redundantes sobre datos previamente aportados. Al concluir el diálogo, la calificación emitida por el agente para cada capacidad se compara frente al _Ground Truth_ humano ($0$ a $5$).

=== Métricas de Evaluación de ALTUS <sec:evaluacion:altus:metricas>
Para evaluar de forma integral la solvencia del agente en el diagnóstico de ALTUS, el marco experimental articula dos dimensiones analíticas complementarias:

En cuanto a las *métricas del resultado diagnóstico*, la salida de cada capacidad individual de ALTUS es una calificación ordinal discreta ($0$ a $5$, donde $0$: No existente, $1$: Inaceptable, $2$: Pobre, $3$: Aceptable, $4$: Buena, $5$: Excelente) que se compara de forma directa y determinista frente a la evaluación del experto humano (_Ground Truth_). Esta dimensión se cuantifica mediante el *Accuracy* exacto (proporción de capacidades con coincidencia unívoca entre la calificación del agente y la de referencia) y el *Error Absoluto Medio (MAE)*, el cual cuantifica la magnitud promedio de la desviación cuando el agente no acierta la nota exacta:
$ "MAE" = frac(1, n) sum_(i=1)^(n) |g_i - a_i| $
donde $g_i$ representa la calificación de referencia del consultor humano, $a_i$ la puntuación estimada por el agente para la capacidad $i$, y $n$ el número total de capacidades evaluadas ($n=51$).

Por su parte, las *métricas de comportamiento conversacional e indagación* evalúan la eficacia dialéctica del agente durante la entrevista frente al simulador. En este ámbito se analizan dos indicadores primarios (complementados con métricas de control en el @apx:eval:altus): la *Eficacia Extractiva (_Hit Rate_)*, definida como la proporción de repreguntas que logran descubrir información técnica faltante del _Ground Truth_ respecto al total de preguntas de seguimiento emitidas ($frac(|"Hits"|, N_"followups")$); y la *Calidad Dialéctica de las Preguntas de Seguimiento*, donde un juez LLM evalúa la escucha activa y la progresión en el hilo local asignando una puntuación de calidad $s_j in {0, 1, 2, 3}$ a cada repregunta $j$, promediando la calidad como $frac(1, N_"followups") sum_(j=1)^(N_"followups") s_j$ conforme a la rúbrica de la @fig:evaluacion:altus:rubrica_followup (donde $N_"followups"$ es el número total de preguntas de seguimiento formuladas).

#figure(
  {
    set text(size: 9.5pt)
    table(
      columns: (auto, 1fr),
      align: (center, left),
      inset: (y: 4.5pt, x: 5.5pt),
      table.header([*Pts*], [*Nivel de Calidad y Criterio del Juez LLM*]),
      [0], [*Repetitiva / Bucle:* Paráfrasis directa o repetición exacta que ignora la respuesta previa del usuario.],
      [1], [*Cuasi-redundante / Sin avance:* Pregunta genérica de relleno sin orientarse a la evidencia técnica faltante.],
      [2], [*Específica / Dirigida:* Indagación concreta y dirigida a recabar la evidencia requerida para la capacidad.],
      [3], [*Excelente / Progresiva:* Escucha activa que conecta con el turno previo y profundiza con precisión en la madurez.],
    )
  },
  caption: [Rúbrica de evaluación para preguntas de seguimiento en ALTUS.],
) <fig:evaluacion:altus:rubrica_followup>

=== Resultados Empíricos en ALTUS <sec:evaluacion:altus:resultados>
A continuación se analizan los resultados obtenidos tras someter los siete modelos de lenguaje a la batería de pruebas en los casos de test a ciegas de ALTUS. En primer lugar, la @fig:evaluacion:altus:chart_acc resume la comparativa de Accuracy y error medio (MAE) obtenida por los modelos frente a la línea base teórica de asignación puramente aleatoria. Al evaluarse cada capacidad individual sobre una escala ordinal discreta de 6 niveles ($s_i in {0, 1, dots, 5}$), la probabilidad de acierto exacto al azar es del $16.7\%$ ($1/6$), mientras que el error absoluto medio esperado por puro azar entre dos elecciones uniformes independientes es de $1.94$ puntos en dicha escala ($sum_(i=0)^5 sum_(j=0)^5 |i - j| / 36 = 70/36 approx 1.94$).

#altus-accuracy-mae-chart() <fig:evaluacion:altus:chart_acc>

Como se aprecia en el panel (a) de la @fig:evaluacion:altus:chart_acc, el *Accuracy* exacto de los modelos se sitúa en un rango del $16.3\% - 24.8\%$, evidenciando que la coincidencia ordinal estricta resulta una métrica excesivamente rígida al penalizar por igual desvíos de un solo nivel que discrepancias graves. En la práctica de consultoría y evaluación de procesos, la asignación de madurez sobre capacidades organizacionales presenta una inherente variabilidad inter-evaluador (_inter-rater agreement_) @elemam_1996_assessor: dos ingenieros humanos que analizan las mismas evidencias rara vez alcanzan una concordancia perfecta en toda la escala, siendo habitual una discrepancia de $plus.minus 1$ nivel fruto del criterio profesional. Por ello, el *MAE* (panel b) actúa como la métrica continua determinante, logrando todos los modelos una reducción sustancial respecto a la expectativa aleatoria ($1.06 - 1.27$ vs. $1.94$ puntos de desviación esperada por azar, lo que supone una reducción del error entre el $35\%$ y el $45\%$). De hecho, al evaluar la precisión tolerante a $plus.minus 1$ nivel ($"Accuracy"_(plus.minus 1) = P(|g_i - a_i| <= 1)$), la tasa de acierto en proximidad asciende a un rango del $72\% - 84\%$ según el modelo, situando la desviación del agente plenamente dentro del margen admisible de divergencia inter-humana.

Para examinar de forma integrada la interacción entre la dinámica conversacional y la precisión diagnóstica final, la @fig:evaluacion:altus:chart_tradeoff articula en un único plano de dispersión las tres dimensiones clave del proceso: la eficacia extractiva (_Hit Rate_, eje $X$), el error diagnóstico resultante (_MAE_, eje $Y$) y la calidad dialéctica de las repreguntas (radio de la burbuja, proporcional a la rúbrica de 0 a 3 puntos de la @fig:evaluacion:altus:rubrica_followup).

#altus-tradeoff-scatter-chart() <fig:evaluacion:altus:chart_tradeoff>

Los cuadrantes se delimitan a partir del centroide empírico del benchmark ($mu_"Hit" = 88.0\%$ y $mu_"MAE" = 1.17$ puntos de desviación), donde el cuadrante inferior derecho representa el comportamiento óptimo al aunar una alta extracción de evidencias con un error de diagnóstico mínimo. Esta perspectiva conjunta resulta esencial: un MAE bajo con un _Hit Rate_ reducido significaría que el modelo está prediciendo con poca información, en lugar de emitir un juicio justificado a partir de la entrevista. La distribución evidencia que modelos como *Muse Glimmer 30B*, *Gemini 3.7 Flash* y *Qwen 3.8 27B* logran un desempeño equilibrado al combinar un _Hit Rate_ del $96\% - 100\%$ con una contención efectiva del error ($"MAE" approx 1.06 - 1.15$). Asimismo, la modulación del radio de la burbuja permite discriminar la calidad de la entrevista: *Qwen 3.8 27B* (calidad $2.85$), *Muse Glimmer 30B* ($2.67$) y el compacto local *Gemma 4 E4B* ($2.63$) no solo extraen información, sino que lo hacen mediante preguntas específicas y escucha activa, a diferencia de modelos como *DeepSeek R1* ($1.30$, burbuja reducida), cuyas repreguntas presentaron un carácter más genérico y redundante. Por su parte, la posición singular de *Gemma 4 31B* (calidad $0.00$) responde a un patrón pasivo en el que el modelo diagnosticó de forma directa casi todas las capacidades sin formular apenas repreguntas ($1$ único _follow-up_ en todo el conjunto de prueba). El registro cuantitativo completo de todas las métricas de ALTUS caso por caso se recopila en la @fig:apx:eval:altus_tabla del @apx:eval_tablas.

Asimismo, es preciso contextualizar el volumen de interacción observado bajo el perfil organizativo de los casos de estudio. Los modelos registran una media global de apenas #get-altus-avg-turns() turnos por capacidad evaluada —donde la formulación de la pregunta base inicial computa como $1$ turno y cualquier repregunta de seguimiento eleva dicho valor— (recogida en la columna _Turnos_ del @apx:eval:altus), lo que revela que la inmensa mayoría de las $51$ capacidades de ALTUS se resuelven sin requerir repreguntas adicionales. Este fenómeno responde a que, al tratarse íntegramente de pequeñas y medianas empresas (PYMEs), el diagnóstico presenta un sesgo estructural hacia calificaciones bajas de madurez (puntuaciones 0 y 1). En la práctica, cuando se consulta sobre procesos formales o prácticas avanzadas inexistentes en la organización, el interlocutor emite una negativa directa e inequívoca (_"No disponemos de dicho procedimiento"_). Ante esta ausencia manifiesta de evidencias, el agente asigna de forma inmediata la calificación mínima ($0$) sin necesidad de prolongar la indagación. Si bien este comportamiento emula con fidelidad la dinámica de una consultoría real en microempresas y PYMEs, introduce una limitación metodológica al reducir la variabilidad empírica en los niveles superiores de la escala ($4$ y $5$), un factor a contrastar en futuras evaluaciones con organizaciones de mayor madurez estructural.


== Evaluación de SIPAC: Deducción Semántica e Inferencia en Cadena <sec:evaluacion:sipac>
Tras el diagnóstico de madurez en ALTUS, la metodología SIPAC aborda la identificación de las potenciales soluciones de transformación digital que mejor encajan con la empresa objeto de mejora, traduciendo los procesos y metas de negocio de la organización en una cadena estructurada de activos intangibles, artefactos tecnológicos e indicadores de control. Desde el punto de vista agéntico, esta tarea supone un reto cualitativamente superior, ya que no se trata de asignar una puntuación fija, sino de razonar y generar propuestas abiertas en lenguaje natural, donde a menudo existen múltiples alternativas tecnológicas válidas para un mismo problema.

Para auditar esta inferencia en cadena sin arrastrar un efecto dominó (donde un fallo temprano invalide etapas posteriores con lógica interna correcta), la evaluación adopta una estrategia de *_Teacher Forcing_*: al inicio de cada fase (GIA, Activos, Capital Intelectual, Artefactos e Indicadores), el estado del sistema se inicializa con los datos correctos del _Ground Truth_ humano del paso previo. Esto permite aislar y medir la fiabilidad y competencia deductiva intrínseca de cada nodo de razonamiento de forma totalmente desacoplada e independiente, caracterizando la cota superior de desempeño del sistema.

=== Pipeline de Evaluación Semántica Bipartita y Rúbricas Graduadas <sec:evaluacion:sipac:juez>
El principal desafío en SIPAC radica en que el agente genera un conjunto abierto de propuestas $A = {a_1, dots, a_m}$ frente a las referencias del _Ground Truth_ $G = {g_1, dots, g_n}$, con cardinalidad habitualmente dispar ($|A| \neq |G|$). Para absorber variaciones léxicas, premiar equivalencias funcionales y evitar que elementos redundantes inflen la métrica, se articula una evaluación secuencial en cuatro etapas:

1. *Filtro vectorial previo y calibración empírica de $tau^*$:* Para cada par de propuesta $a_i$ y referencia $g_j$, se calcula la similitud coseno de sus _embeddings_ ($"sim"(bold(v)_(a_i), bold(v)_(g_j))$). Si dicha similitud no alcanza el umbral $tau^*$, el par se descarta fijando su afinidad a $M_(i,j) = 0.0$. La calibración empírica en el caso piloto (`G1_empresa_a`) evaluó cortes entre $0.15$ y $0.50$ frente al juicio exhaustivo ($tau = 0.0$), fijando el umbral óptimo en $tau^* = 0.35$, el cual maximiza el ahorro computacional sin descartar ninguna coincidencia válida (cero falsos negativos, preservando el *Recall*).

2. *Arbitraje semántico con Juez LLM y rúbricas graduadas:* Para los pares que superan el filtro ($"sim" >= tau^*$), el juez LLM (*GPT-5.6 Luna*) evalúa la equivalencia conceptual asignando una puntuación $s_(i,j) in {0, 1, 2, 3}$ según la rúbrica formal del campo (@fig:evaluacion:sipac:rubricas). La calificación se normaliza al intervalo $[0.0, 1.0]$ definiendo la afinidad como $M_(i,j) = s_(i,j) / 3.0$.

#figure(
  {
    set text(size: 9.5pt)
    table(
      columns: (auto, auto, auto, 1fr),
      align: (center, center, center, left),
      inset: (y: 4.5pt, x: 5.5pt),
      table.header([*Campo Evaluado*], [*Tolerancia*], [*Pts*], [*Criterio Semántico del Juez LLM*]),
      table.cell(rowspan: 4)[*Categorías GIA* \ *Capital Intellectus*], table.cell(rowspan: 4)[Estricta], [0], [Bloque taxonómico completamente erróneo o ajeno al proceso.],
      [1], [Mismo dominio general pero categoría/bloque impreciso.],
      [2], [--- (Clasificación cerrada: no admite ambigüedad intermedia)],
      [3], [Clasificación exacta o categoría equivalente directa.],
      table.hline(),
      table.cell(rowspan: 4)[*Activo Específico* \ *Artefacto Tecnológico*], table.cell(rowspan: 4)[Moderada], [0], [Propuesta sin relación con la necesidad del proceso o activo.],
      [1], [Propuesta vaga, genérica o con función divergente.],
      [2], [Equivalente funcional (misma capacidad o problema con otra tecnología).],
      [3], [Propuesta idéntica o sinónimo directo.],
      table.hline(),
      table.cell(rowspan: 4)[*Indicadores*], table.cell(rowspan: 4)[Laxa], [0], [Indicador que evalúa una dimensión ajena al objetivo del activo.],
      [1], [Mismo ámbito pero mide una faceta no alineada.],
      [2], [Indicador alternativa válida que cuantifica la misma faceta.],
      [3], [Indicador idéntico o reformulación directa del esperado.],
    )
  },
  caption: [Rúbricas de evaluación semántica por campos en SIPAC.],
) <fig:evaluacion:sipac:rubricas>

3. *Asignación biunívoca óptima (Algoritmo Húngaro):*
   A partir de la matriz de afinidad $M$, se aplica el algoritmo Húngaro para resolver la asignación bipartita máxima que optimiza la puntuación global acumulada. Al exigir una correspondencia estricta 1 a 1 ($pi^*$), se impide que el agente obtenga ventajas artificiales emitiendo múltiples variantes o sinónimos de una misma solución del _Ground Truth_.

4. *Métricas Ponderadas (Weighted Precision, Recall y F1):*
   En tareas de clasificación y recuperación de información, _Precision_ y _Recall_ cuantifican dos dimensiones complementarias: _Precision_ mide la exactitud de las propuestas generadas (penalizando los _False Positives_), mientras que _Recall_ mide la capacidad de recuperar todas las necesidades reales de la organización (penalizando los _False Negatives_). Clásicamente, ambas se definen sobre el conteo discreto de la matriz de confusión (@eq:evaluacion:sipac:classic_metrics):
#figure(
  $
    "Precision" = frac("TP", "TP" + "FP") = frac("TP", |A|), quad quad
    "Recall" = frac("TP", "TP" + "FN") = frac("TP", |G|)
  $,
  caption: [Definición clásica de Precision y Recall en función de los conjuntos de propuestas y referencias.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:evaluacion:sipac:classic_metrics>
   donde $|A| = "TP" + "FP"$ representa el número total de elementos generados por el agente y $|G| = "TP" + "FN"$ el total de elementos de referencia en el _Ground Truth_.

   Para adaptar este marco a la naturaleza continua y abierta del lenguaje natural —donde las coincidencias no son binarias ($0$ o $1$), sino que presentan grados de afinidad semántica $M_(i,j) in [0.0, 1.0]$—, el conteo discreto de aciertos se generaliza como la suma de los *_Soft True Positives_*:
$ "TP"_"soft" = sum_((i,j) in pi^*) M_(i,j) $
   donde $pi^*$ representa la asignación biunívoca óptima 1 a 1 resuelta por el algoritmo Húngaro. Sustituyendo $"TP"_"soft"$ en los denominadores $|A|$ y $|G|$, se obtienen las métricas ponderadas finales (@eq:evaluacion:sipac:soft_f1):

#figure(
  $
    "Weighted Precision" = frac("TP"_"soft", |A|) = frac(1, |A|) sum_((i,j) in pi^*) M_(i,j), \
    "Weighted Recall" = frac("TP"_"soft", |G|) = frac(1, |G|) sum_((i,j) in pi^*) M_(i,j), \
    "Weighted F1" = 2 dot frac("Weighted Precision" dot "Weighted Recall", "Weighted Precision" + "Weighted Recall")
  $,
  caption: [Métricas de Precision, Recall y F1 ponderadas por similitud semántica en SIPAC.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:evaluacion:sipac:soft_f1>

=== Resultados Empíricos en SIPAC <sec:evaluacion:sipac:resultados>
A continuación se analizan los resultados de deducción semántica obtenidos por los siete modelos de lenguaje a lo largo del pipeline de SIPAC bajo _Teacher Forcing_.

En primer lugar, la @fig:evaluacion:sipac:chart_tradeoff resume la comparativa global analizando de forma desagregada el balance entre _Weighted Precision_, _Weighted Recall_ y el $F_1$ global ponderado resultante.

#sipac-precision-recall-chart() <fig:evaluacion:sipac:chart_tradeoff>

Esta distribución esclarece la naturaleza generativa de los modelos frente al emparejamiento biunívoco estricto 1 a 1 del algoritmo Húngaro. Todos los modelos exhiben un elevado _Recall_ medio ($mu_"Rec" = 70.4\%$, alcanzando el $85.5\%$ en *Ornith 9B* y el $82.1\%$ en *Gemma4 31B*), lo que garantiza que los agentes extraen los conceptos esenciales identificados por los consultores humanos. No obstante, la _Precision_ media se sitúa en el $mu_"Prec" = 36.4\%$, consecuencia directa de que los LLMs proponen un conjunto más amplio de artefactos e intangibles complementarios que, al no figurar en el _Ground Truth_ de referencia, son penalizados como excedentes por la asignación biunívoca. Como consecuencia, el $F_1$ ponderado actúa como media armónica equilibrando ambos factores, donde modelos como *Gemini 3.7 Flash* ($F_1 = 0.511$), *Gemma4 31B* ($0.490$) y *Ornith 9B* ($0.485$) obtienen el rendimiento más balanceado entre exhaustividad y especificidad.

Para profundizar en la causa de este balance global, la @fig:evaluacion:sipac:chart_f1 desglosa la métrica de _Weighted F1_ a lo largo de cada una de las etapas del pipeline (Categorías GIA, Activos Intangibles, Capital Intelectual (CI), Artefactos Tecnológicos e Indicadores).

#sipac-f1-chart() <fig:evaluacion:sipac:chart_f1>

El análisis dimensional de la @fig:evaluacion:sipac:chart_f1 revela un patrón claro de degradación a lo largo de la cadena de razonamiento: las fases de mayor anclaje taxonómico (*GIA*, *Activos Intangibles* y *CI*) alcanzan puntuaciones de $F_1$ notablemente superiores ($0.47 - 0.65$), mientras que las fases de generación abierta con vocabulario libre (*Artefactos* e *Indicadores*) presentan mayor dispersión ($F_1 approx 0.28 - 0.43$). Asimismo, el desglose permite detectar fallos sintácticos puntuales como el sufrido por *DeepSeek R1*, cuya generación de bloques de razonamiento desestructuró el esquema JSON en la fase de indicadores ($F_1 = 0.000$). El registro cuantitativo completo de las puntuaciones caso por caso se recoge en la @fig:apx:eval:sipac_tabla del @apx:eval_tablas.

Para complementar la perspectiva agregada e ilustrar de forma práctica la interacción entre la deducción generativa del agente y las diferentes fases del pipeline de evaluación semántica, la @fig:evaluacion:sipac:estudio_caso desglosa un extracto representativo del caso de prueba *G3 (Empresa C)* bajo _Teacher Forcing_ con el modelo *Gemini 3.7 Flash*. En este experimento, tanto el consultor humano como el agente de IA parten de los dos activos intangibles específicos siguientes, relativos a dos procesos formalizados e identificados en el _Ground Truth_: el _Modelo de Clientes_ (asociado al proceso de venta a particulares, clasificado como `GIA 2`) y el _Modelo de Marca_ (asociado a la estrategia de marketing digital, clasificado como `GIA 7`).

#sipac-qualitative-case-study-table() <fig:evaluacion:sipac:estudio_caso>

Como evidencia la @fig:evaluacion:sipac:estudio_caso, el agente logra emparejar la totalidad de los artefactos del _Ground Truth_ ($3/3$ elementos recuperados), alcanzando un _Weighted Recall_ del $88.9\%$ ($0.889$) debido a la ponderación graduada de la equivalencia parcial ($2/3$). Además, el desglose permite apreciar cuatro patrones de comportamiento característicos del pipeline de evaluación:

En primer lugar, se registran *coincidencias exactas (Match 1:1, 3/3 pts)* por identidad funcional directa, tales como _Página Web_ ($"sim" = 0.64$) y _Perfiles en Redes Sociales_ ($"sim" = 0.73$). En segundo lugar, se identifica una *equivalencia funcional parcial (2/3 pts)*: frente al artefacto genérico _Marketing Digital_ del _Ground Truth_, el agente dedujo un _Sistema CRM con módulo de fidelización_ ($"sim" = 0.40$). El juez LLM estimó que, si bien un CRM trasciende la mera publicidad, cubre operativamente la captación y fidelización de clientes en una PYME de bordado, otorgando una calificación aprobada alta ($2/3$).

Por otro lado, emergen *propuestas excedentes evaluadas favorablemente sin plaza 1:1 (Exceso)*: iniciativas como la _Plataforma de automatización de Email Marketing_ ($"sim" = 0.58$ con _Marketing Digital_) superaron el filtro de embeddings y recibieron una valoración positiva del juez LLM, pero no pudieron emparejarse formalmente al haber asignado ya el algoritmo Húngaro la única referencia disponible al CRM. Por último, opera la *poda vectorial previa ($"sim" < 0.35$)* sobre soluciones técnicas válidas en una PYME (como el _Módulo ERP de stock multicanal_ o el _Manual de protocolo comercial_) que, al no guardar proximidad textual directa con el catálogo minimalista del consultor humano, fueron descartadas en frío por el filtro de embeddings sin ser remitidas al juez LLM ($0.0$).

Este desglose pone de manifiesto una limitación intrínseca de los conjuntos de datos de referencia en tareas prescriptivas abiertas: el _Ground Truth_ humano, elaborado con un enfoque deliberadamente minimalista ($3$ artefactos básicos), resulta insuficiente para abarcar todo el espacio de soluciones tecnológicas válidas para la organización. Como consecuencia, cuando el agente propone una arquitectura digital más completa y profunda (incorporando ERP de inventario, protocolos comerciales o automatización de marketing), el mecanismo de asignación biunívoca penaliza matemáticamente estas aportaciones como excedentes sin correspondencia ($0/3$). Por tanto, el _Recall_ ($88.9\%$) refleja mucho mejor el acierto real del modelo, ya que la _Precision_ ($22.2\%$) es baja simplemente porque el agente propuso más soluciones válidas de las que había anotado el consultor.

Por último, en relación con la eficiencia computacional del evaluador automatizado y la dispersión conceptual de los modelos, la @fig:evaluacion:sipac:heatmap_tabla detalla la *tasa de filtrado vectorial previo* por embeddings ($"sim" < tau^* = 0.35$). Cada celda cuantifica el porcentaje de descarte y el ratio exacto ($"pares descartados" / "pares totales generados"$) para cada fase metodológica de SIPAC. Por ejemplo, el registro de *Gemini 3.7 Flash* para el campo de *Artefactos* ($68.7\%$, $46/67$) indica que de las $67$ combinaciones candidatas evaluadas para el modelo, $46$ fueron descartadas automáticamente por el filtro vectorial al no alcanzar la afinidad mínima con el _Ground Truth_, mientras que las $21$ restantes ($31.3\%$) superaron el umbral y fueron remitidas al juez LLM para su evaluación semántica. A nivel agregado, este mecanismo descarta en frío el $60.6\%$ de las propuestas ($754$ de las $1.245$ totales generadas en los tests a ciegas), ahorrando más de la mitad de llamadas a la API del juez LLM.

#sipac-pruning-heatmap-table() <fig:evaluacion:sipac:heatmap_tabla>

El análisis de la @fig:evaluacion:sipac:heatmap_tabla permite extraer cuatro conclusiones fundamentales sobre el comportamiento del sistema:

En primer término, el descarte automático del $60.6\%$ de las combinaciones sin relación ($754$ pares) aporta una notable *eficiencia computacional y blindaje del juez*, reduciendo a menos de la mitad el tiempo y coste de ejecución del benchmark y protegiendo al evaluador de emparejamientos absurdos que pudieran inducir calificaciones arbitrarias o sesgos.

En segundo lugar, se constata el *impacto de la apertura léxica en la precisión*: mientras que en fases taxonómicas como *GIA* y *Capital Intelectual* la tasa de poda es reducida ($30\% - 37\%$), esta se eleva al $66.5\%$ en *Artefactos* e *Indicadores*. Esta dispersión léxica inherente al lenguaje libre explica la contención de la _Precision_ ($mu = 36.4\%$) y reafirma al _Recall_ como el indicador más representativo de la cobertura de necesidades.

Asimismo, el evaluador automatizado garantiza la *detección objetiva de alucinaciones*, identificando de forma autónoma cuándo un modelo desvía su razonamiento, como ocurrió con *DeepSeek R1* en Indicadores ($100\%$ de poda al generar nombres de software como _"Sistema deBigData"_, _"Sistema deBolt"_ o _"Sistema deIA"_ en lugar de métricas cuantitativas), asignando un $F_1 = 0.000$ determinista y evitando que respuestas mal estructuradas contaminen el flujo.

Por último, se ratifica el *carácter conservador del marco experimental*: calibrar el umbral en $tau^* = 0.35$ asume el riesgo de descartar soluciones válidas si su redacción dista del vocabulario del _Ground Truth_ (como el ERP del caso de estudio), garantizando que la evaluación sea deliberadamente estricta y que el desempeño real de los modelos en consultoría tienda a ser superior al reflejado por sus métricas numéricas.

== Evaluación de AHP: Soporte a la Decisión y Priorización Multicriterio <sec:evaluacion:ahp>
En el ciclo de preproyecto de DTGEP, el proceso AHP actúa como una herramienta de toma de decisiones multicriterio (_Multi-Criteria Decision Making_, MCDM) orientada a priorizar los artefactos tecnológicos propuestos en SIPAC. A diferencia de ALTUS y SIPAC, donde existe un _Ground Truth_ unívoco frente al que medir la exactitud del sistema, la selección de criterios y preferencias en AHP es inherentemente dependiente del contexto organizativo y del juicio del decisor.

El cálculo matemático de AHP (la derivación del autovalor máximo $lambda_"max"$, el cálculo de la Razón de Consistencia $"CR"$ y la resolución del vector de prioridades $bold(w)$) es estrictamente determinista y se ejecuta mediante el motor algorítmico independiente. En la metodología de Saaty @AHP_2001, la Razón de Consistencia cuantifica si las comparaciones pareadas guardan coherencia lógica transitiva (evitando contradicciones como juzgar que $A > B$ y $B > C$, pero luego $C > A$); un umbral de $"CR" < 0.10$ ($10\%$) garantiza que las ponderaciones son matemáticamente fiables y no fruto del azar. En consecuencia, la evaluación de AHP se centra en auditar la *capacidad de asistencia consultiva del agente de IA*: su habilidad para formular un marco de decisión sectorial a medida y emitir juicios comparativos pareados fundamentados en la escala Saaty (1--9).

=== Diseño y Justificación de las Rúbricas de Soporte a la Decisión <sec:evaluacion:ahp:diseno>
Para evaluar de forma reproducible el soporte a la decisión generado por cada modelo, el evaluador inyecta al juez LLM el *dossier contextual de la organización* (el mismo informe cualitativo de la empresa derivado de las transcripciones de las entrevistas presentado en la @sec:evaluacion:marco y empleado en ALTUS), la lista de artefactos tecnológicos a priorizar procedentes de SIPAC, la propuesta estructurada de criterios con sus descripciones y las comparaciones pareadas de criterios con sus justificaciones de negocio.

La selección de las cuatro dimensiones de la rúbrica formal y su escala graduada de $0$ a $3$ puntos responde a fundamentos teóricos de la toma de decisiones y a requisitos de ingeniería de software en preproyecto:

1. *Justificación de la Adaptación Contextual (Relevancia):* En consultoría de transformación digital, el uso de plantillas genéricas de libro de texto (_"Coste, Calidad, Tiempo"_) ignora los dolores reales de la PYME. Esta dimensión audita si el agente digiere el contexto del caso para formular criterios adaptados a los procesos del negocio (ej. incidencias en obra o retención de clientes).
2. *Justificación de la Ortogonalidad (Axioma de Independencia de Saaty):* Un axioma central de la jerarquía AHP es que los criterios deben ser mutuamente independientes @AHP_2001. La presencia de criterios sinónimos o solapados induce una doble ponderación que distorsiona algebraicamente el vector de pesos $bold(w)$, duplicando artificialmente el peso de una misma variable.
3. *Justificación de la Completitud Holística (Marco 360° en Economía del Software):* Toda decisión estratégica en preproyecto debe balancear la triple hélice de inversión tecnológica: valor/impacto de negocio, esfuerzo/coste y viabilidad/adopción organizativa. Omitir una de estas facetas (como la curva de aprendizaje de los operarios) conduce frecuentemente al fracaso de implantación.
4. *Justificación de la Racionalidad y Capacidad Comparativa (XAI y Juicio Pareado):* En preproyecto, el decisor humano no aceptará un orden de prioridades si opera como una caja negra. Esta dimensión evalúa la capacidad del sistema para confrontar dos opciones en conflicto (_trade-off_), calibrar la intensidad del juicio en la escala Saaty (1--9) y fundamentar el coste de oportunidad de la preferencia elegida.

El detalle cualitativo de los cuatro niveles por dimensión se resume en la @fig:evaluacion:ahp:rubrica:

#figure(
  {
    set text(size: 9.5pt)
    table(
      columns: (auto, auto, 1fr),
      align: (center, center, left),
      inset: (y: 4.5pt, x: 5.5pt),
      table.header([*Dimensión*], [*Pts*], [*Criterio Cualitativo del Juez LLM*]),
      table.cell(rowspan: 4)[*Adaptación Contextual* \ (Relevancia)], [0], [Criterios genéricos de plantilla, ajenos a la realidad de la empresa.],
      [1], [Criterios estándar aplicables a cualquier negocio, sin personalización a los procesos del caso.],
      [2], [Criterios adaptados al sector y tipología de la PYME (ej. construcción, comercio textil, retail).],
      [3], [Criterios hiper-específicos que capturan con precisión los dolores, restricciones y metas del caso.],
      table.hline(),
      table.cell(rowspan: 4)[*Ortogonalidad* \ (No Solapamiento)], [0], [Criterios redundantes o sinónimos directos que duplican la ponderación de una variable.],
      [1], [Fuerte solapamiento conceptual entre criterios (miden facetas muy próximas).],
      [2], [Criterios conceptualmente diferenciados con leve intersección de ámbito.],
      [3], [Criterios estrictamente independientes (ej. Valor de Negocio vs. Coste vs. Adopción vs. Plazos).],
      table.hline(),
      table.cell(rowspan: 4)[*Completitud Holística* \ (Cobertura)], [0], [Omisión de dimensiones críticas evidentes (ej. evaluar coste ignorando impacto y viabilidad).],
      [1], [Perspectiva sesgada hacia un único ángulo dominante (ej. puramente financiero o técnico).],
      [2], [Cubre las facetas principales pero omite dimensiones relevantes como riesgo o adopción.],
      [3], [Cobertura equilibrada y holística de valor estratégico, esfuerzo/coste, viabilidad y adopción.],
      table.hline(),
      table.cell(rowspan: 4)[*Racionalidad de Justificación* \ (Juicio Pareado)], [0], [Sin justificaciones o basadas en tautologías vacías ("A es mejor que B porque es preferible").],
      [1], [Justificaciones vagas o genéricas sin anclaje en el contexto de la organización.],
      [2], [Justificaciones lógicas y coherentes basadas en el funcionamiento general del sector.],
      [3], [Argumentación estratégica profunda que fundamenta la intensidad Saaty según los datos del caso.],
    )
  },
  caption: [Rúbrica de evaluación del soporte a la decisión en AHP.],
) <fig:evaluacion:ahp:rubrica>

=== Resultados Empíricos en AHP <sec:evaluacion:ahp:resultados>
A continuación se analizan los resultados obtenidos por los siete modelos de lenguaje en la formulación de criterios y el juicio pareado para la priorización multicriterio en AHP.

La @fig:evaluacion:ahp:chart_scores resume el desempeño mediante un diagrama de barras apiladas, donde la altura total representa la puntuación acumulada media (hasta un máximo de $12$ puntos o $100\%$ normalizado) y los segmentos interiores desglosan la aportación de cada una de las cuatro dimensiones de la rúbrica.

#ahp-scores-chart() <fig:evaluacion:ahp:chart_scores>

Los resultados confirman que modelos como *Gemini 3.7 Flash* y *Gemma 4 E4B* obtienen las puntuaciones más equilibradas, situándose entre el $64\%$ y el $67\%$ de la escala normalizada ($7.67$ y $8.00$ sobre $12$ puntos).

El desglose dimensional revela dos patrones de comportamiento determinantes. En primer lugar, respecto a la *calibración de la intensidad Saaty y la coherencia del juicio*, esta dimensión audita si el valor numérico asignado en la escala Saaty ($1$ a $9$) refleja con fidelidad la magnitud real de las prioridades del negocio. Modelos como *DeepSeek R1* y *Ornith 9B* obtienen puntuaciones bajas ($1.00 / 3$) por emitir juicios tímidos o esquemáticos, tratando como comparativas casi igualadas ($1$ o $2$) diferencias que en el caso son críticas. Por el contrario, *Gemini 3.7 Flash* y *Gemma 4 E4B* calibran la intensidad matemática adecuada a cada escenario, justificando con datos del caso por qué un criterio debe dominar con fuerza sobre otro (como primar de forma contundente los plazos frente al coste ante el riesgo de penalizaciones de obra).

En segundo lugar, se manifiesta un claro compromiso (*trade-off*) entre la *adaptación contextual y la ortogonalidad* de los criterios: modelos como *Muse Glimmer 30B* destacan en adaptar los criterios a la realidad del negocio ($2.33 / 3$ en Adaptación), pero a costa de introducir cierto solapamiento conceptual entre ellos ($1.33 / 3$ en Ortogonalidad). Por el contrario, *Qwen 3.8 27B* y *DeepSeek R1* garantizan criterios estrictamente independientes ($2.00 / 3$), recurriendo para ello a categorías más estándar y menos personalizadas al caso.

#ahp-consistency-chart() <fig:evaluacion:ahp:chart_consistency>

Para profundizar en la relación entre el rigor deductivo y la corrección algebraica, la @fig:evaluacion:ahp:chart_consistency cruza la solidez del juicio pareado con la Razón de Consistencia ($"CR"$) resultante. Como se aprecia en la distribución, existe una clara correlación empírica entre ambas variables: los modelos con mayor capacidad de contextualización (*Gemini 3.7 Flash*, *Gemma 4 E4B* y *Gemma 4 31B*) se sitúan holgadamente dentro de la zona de consistencia matemática, con valores medios de $"CR"$ entre $0.053$ y $0.084$ (por debajo del límite de $0.10$), demostrando que un razonamiento guiado por las necesidades reales de la empresa conduce de forma natural a comparaciones coherentes. Por el contrario, los modelos que emitieron explicaciones superficiales o genéricas (*Ornith 9B* con $"CR" = 0.171$ y *DeepSeek R1* con $"CR" = 0.335$) cayeron en contradicciones lógicas al comparar los criterios entre sí, superando el umbral de inconsistencia de Saaty. El registro numérico desagregado caso por caso se detalla en la @fig:apx:eval:ahp_tabla del @apx:eval_tablas.


== Viabilidad Operativa y Rendimiento Temporal <sec:evaluacion:tiempos>
Tras haber auditado de forma independiente la solvencia cognitiva del motor agéntico en las tres metodologías que componen AI-Driven DTGEP, resulta fundamental evaluar su viabilidad operativa en entornos profesionales reales. En el contexto de la consultoría de ingeniería de software, un sistema de preproyecto no solo debe garantizar rigor metodológico y consistencia algorítmica, sino también ofrecer tiempos de respuesta computacionalmente asumibles y adaptarse a las restricciones de infraestructura y privacidad de cada organización.

A este respecto, es imprescindible puntualizar la naturaleza de las métricas temporales recogidas en el benchmark: los datos reportados cuantifican estrictamente el *tiempo de cómputo neto del sistema* (el tiempo de inferencia de los modelos de lenguaje, el avance por los estados del grafo en LangGraph y la ejecución de las tuberías matemáticas deterministas). Al realizarse la evaluación experimental mediante un simulador sintético (_Stakeholder LLM_) que emite sus respuestas de forma prácticamente instantánea, estas cifras no reflejan la duración cronológica global que conllevaría una entrevista con un interlocutor humano real, quien naturalmente requiere pausas para leer, reflexionar, consultar documentación interna o responder a lo largo de su jornada laboral. Por tanto, el valor de estas mediciones reside en caracterizar el esfuerzo computacional, el coste de infraestructura y la latencia técnica del motor agéntico, la cual habilita un modelo asíncrono donde el usuario responde a su propio ritmo sin consumir tiempo síncrono del ingeniero.

=== Análisis Comparativo de Entornos de Despliegue <sec:evaluacion:tiempos:entornos>
Los resultados del benchmark reflejan una clara diferenciación operativa según el entorno de inferencia seleccionado.

Bajo la modalidad de *inferencia remota en la nube (Cloud API)*, los modelos de gran escala y frontera (*Gemini 3.7 Flash*, *Gemma 4 31B*, *Muse Glimmer 30B* y *Qwen 3.8 27B*) completan el ciclo íntegro de preproyecto por empresa en un rango de $23$ a $100$ minutos de cómputo neto. En este grupo, *Gemma 4 31B* destaca por su extraordinaria eficiencia temporal, resolviendo la totalidad de las tres metodologías en apenas $23.3$ minutos de tiempo de máquina por caso manteniendo un desempeño semántico y de decisión equivalente al de modelos de frontera. Estos tiempos confirman la viabilidad del motor agéntico para sesiones consultivas ágiles o evaluaciones automatizadas bajo demanda, validando asimismo que las arquitecturas abiertas de 27B–31B representan una alternativa idónea para empresas que opten por autoalojar el servicio en servidores locales dedicados provistos de $24 - 32 "GB"$ de VRAM.

Por su parte, en escenarios de *inferencia local en hardware de consumo* orientados a organizaciones con soberanía de datos estricta y sin infraestructura dedicada, la @fig:evaluacion:tiempos_locales detalla el tiempo de ejecución acumulado y desglosado por metodología para los tres modelos evaluados en la estación de trabajo de referencia del estudio (MacBook Air M4 con 16 GB de memoria unificada):

#local-models-stacked-time-chart() <fig:evaluacion:tiempos_locales>

=== Cuello de Botella en Memoria y Recomendaciones de Despliegue <sec:evaluacion:tiempos:cuello_botella>
El perfil de ejecución de la @fig:evaluacion:tiempos_locales pone de manifiesto dos fenómenos críticos en inferencia local.

Por un lado, se observa una clara *dominancia de la fase de indagación en ALTUS*, donde la entrevista de madurez concentra más del $70\%$ del tiempo total de cómputo en todos los modelos locales (llegando a representar $212$ de los $300$ minutos totales en *DeepSeek R1*). Este comportamiento contrasta con SIPAC y AHP, cuyas fases de inferencia semántica y cálculo matricial se resuelven de forma mucho más ágil ($20 - 45$ minutos por fase).

Por otro lado, se identifica un severo problema de *saturación de memoria unificada y degradación por swap*: mientras que el modelo compacto *Gemma 4 E4B* (4B) se ejecuta con total soltura en $67.7$ minutos totales, las arquitecturas de 7B (*DeepSeek R1*) y 9B (*Ornith*) multiplican por cinco la latencia, alcanzando las $5$ horas de ejecución. La causa raíz técnica no reside en la complejidad algorítmica de DTGEP, sino en la acumulación de contexto: la evaluación secuencial de las 51 capacidades de ALTUS retiene un extenso historial conversacional. Al coexistir en los 16 GB de memoria unificada del equipo el modelo, los _KV caches_ y el sistema operativo, los modelos $>= 7"B"$ agotan la RAM disponible y fuerzan un desbordamiento continuo a memoria secundaria (_swap_ en disco), penalizando drásticamente la tasa de generación de tokens.

A partir de estos hallazgos, se derivan tres directrices clave de despliegue para la práctica industrial:
Para un *despliegue local ligero en equipos de 16 GB RAM*, la arquitectura compacta *Gemma 4 E4B* (4B) constituye la opción recomendada al conjugar privacidad total, rigor metodológico ($"MAE" = 1.18$ y consistencia $"CR" = 0.053$) y una ejecución fluida en poco más de una hora. Para un *despliegue local de alta capacidad (On-Premise con 24–32 GB VRAM)* en organizaciones que no puedan compartir datos en la nube y requieran la máxima profundidad prescriptiva, se recomienda desplegar modelos de 27B–31B (como *Gemma 4 31B* o *Qwen 3.8 27B*) en servidores locales con GPUs dedicadas. Finalmente, para un *despliegue en la nube (SaaS / API)* en escenarios estándar sin restricciones de confidencialidad externa, el uso de APIs de frontera (*Gemini 3.7 Flash* o *Gemma 4 31B*) maximiza la calidad analítica y reduce la latencia a escala de minutos.

El registro cuantitativo completo y desglosado caso por caso de todas las métricas predictivas, semánticas y temporales se encuentra disponible para consulta en el @apx:eval_tablas.


== Contraste de Paradigmas: AI-Driven DTGEP frente a la Inferencia Directa con LLMs <sec:evaluacion:baseline>
La evaluación empírica precedente ha examinado el comportamiento del motor AI-Driven DTGEP integrando diversas arquitecturas de lenguaje. Sin embargo, desde los principios de la Economía de la Ingeniería de Software (@swebok_v4), surge una cuestión metodológica fundamental: *¿cuál es el valor diferencial que aporta una arquitectura agéntica basada en grafos de estado y metodologías formales frente al uso directo de un modelo fundacional de frontera mediante ingeniería de prompts avanzada?*

Para responder a esta pregunta de forma reproducible y objetiva, se implementó un banco de pruebas experimental de referencia (`run_baseline.ts`). Este entorno de evaluación suministra al modelo de frontera (*Gemini 3.7 Flash*, $T=0.0$) el dossier íntegro de la empresa sin estructuración metodológica previa. Mediante un prompt de rol de consultor experto con razonamiento paso a paso (_Chain-of-Thought_), se le encomienda generar directamente las cuatro entregas clave de preproyecto: diagnóstico de madurez, catálogo de soluciones tecnológicas con KPIs, marco de criterios de decisión y priorización estratégica justificada.

Cabe destacar que la naturaleza narrativa y no tipada de la respuesta generada directamente por el LLM en Markdown impide someterla a métricas algebraicas deterministas (como el cálculo formal del autovector $bold(w)$ o la verificación estricta de $"CR" < 0.10$ en AHP, o la proyección en matrices $2 times 2$ en SIPAC). Por tanto, la evaluación se instrumenta mediante un contraste cualitativo y de ingeniería de las salidas literales producidas para el caso representativo *Empresa C* (`G3`). La @fig:evaluacion:baseline:propuestas_tabla sintetiza y enfrenta los entregables resultantes bajo ambos paradigmas.

#figure(
  {
    set text(size: 8.5pt)
    table(
      columns: (1.1fr, 2fr, 2fr),
      align: (left, left, left),
      table.header(
        [*Entrega de Preproyecto (DTGEP)*],
        [*Línea Base (LLM Directo - Gemini 3.7 Flash)*],
        [*AI-Driven DTGEP (Sistema Propuesto)*],
      ),
      [*1. Diagnóstico de Madurez Digital* \ (_DTGEP1 / ALTUS_)],
      [Evaluación _ad-hoc_ sobre 4 áreas no normalizadas: \
       - Ventas: Nivel 1.0 (Manual) \
       - Repositorio Picajes: Nivel 2.0 (OneDrive) \
       - Conocimiento Técnico: Nivel 1.0 (Tácito) \
       - B2B y PRL: Nivel 1.0 (Fragmentado) \
       _(Extrapola supuestos no confirmados del dossier)._],
      [Diagnóstico determinista de 12 capacidades de capital intelectual en escala formal 1--5: \
       - 8 capacidades en Nivel 1 (Inicial) \
       - 4 capacidades en Nivel 2 (Básico) \
       _(Genera radar y diálogo interactivo de repreguntas)._],
      table.hline(),
      [*2. Catálogo de Soluciones y Artefactos* \ (_DTGEP2 / SIPAC_)],
      [Solucionismo comercial prescribiendo productos SaaS cerrados: \
       - Shopify / WooCommerce + Zakeke (Canal B2C) \
       - Airtable / Baserow (DAM de picajes) \
       - Notion / BookStack (Wiki técnica de taller) \
       - Trengo / HubSpot Service Hub (CRM B2B)],
      [4 especificaciones funcionales neutrales trazadas a intangibles: \
       - Portal e-commerce con configurador (`GIA 2`) \
       - Repositorio DAM indexado de diseños (`GIA 10`) \
       - Base de conocimiento de tejidos y taller (`GIA 11`) \
       - Módulo CRM corporativo (`GIA 7`)],
      table.hline(),
      [*3. Marco de Criterios de Decisión* \ (_DTGEP3 / AHP_)],
      [4 criterios narrativos con pesos porcentuales fijos a priori: \
       - Impacto en Negocio (35%) \
       - Coste / Esfuerzo TCO (25%) \
       - Viabilidad Técnica (20%) \
       - Adopción Organizativa (20%)],
      [Marco de criterios ortogonales sectoriales: \
       - Reducción de tiempo de atención \
       - Fidelización y valor de marca \
       - Coste de implantación y Viabilidad \
       _(Calibra juicios pareados en escala Saaty 1--9)._],
      table.hline(),
      [*4. Priorización y Hoja de Ruta* \ (_DTGEP4 / AHP_)],
      [Cronograma en 3 fases por suma lineal simple (WSM): \
       - Fase 1 (Meses 1-3): DAM + Wiki \
       - Fase 2 (Meses 4-6): E-commerce B2C \
       - Fase 3 (Meses 7-8): Hub CRM B2B \
       _(Sin verificación de coherencia ni autovalores)._],
      [Vector cuantitativo de prioridades $bold(w)$ resuelto por AHP: \
       - 1º Portal E-commerce ($w = 0.41$) \
       - 2º Repositorio DAM ($w = 0.28$) \
       - 3º Módulo CRM ($w = 0.18$) \
       - 4º Base Conocimiento ($w = 0.13$) \
       _(Consistencia auditada: $"CR" = 0.04 < 0.10$)._],
    )
  },
  caption: [Comparativa de entregables entre Línea Base y AI-Driven DTGEP (caso G3).],
) <fig:evaluacion:baseline:propuestas_tabla>

A partir de la evidencia empírica recogida en la @fig:evaluacion:baseline:propuestas_tabla, el análisis comparativo permite extraer conclusiones claras sobre las divergencias metodológicas que separan ambos enfoques, estructuradas en cuatro dimensiones esenciales:

En primer lugar, respecto al diagnóstico de madurez digital en ALTUS, la inferencia directa se comporta como un receptor pasivo. Cuando el modelo se enfrenta a lagunas de información en el dossier inicial, tiende a asumir premisas no declaradas e inventa puntuaciones arbitrarias para completar el informe sin verificar la realidad operativa. En contraste, AI-Driven DTGEP monitoriza continuamente el nivel de evidencia fáctica disponible y articula un diálogo adaptativo con repreguntas orientadas a recabar evidencias concretas. Esto garantiza que la evaluación se fundamente en hechos contrastados y se normalice con rigor sobre las doce capacidades de capital intelectual del modelo.

En segundo término, en la fase de deducción de soluciones mediante SIPAC, la generación directa incurre sistemáticamente en un solucionismo tecnológico prematuro, saltando de los problemas identificados a la prescripción inmediata de herramientas SaaS comerciales cerradas (como Shopify, Airtable, Notion o HubSpot). En la fase de preproyecto (@swebok_v4), este planteamiento introduce un acoplamiento temprano e injustificado a proveedores externos antes de haber formalizado los requisitos funcionales del sistema. Por el contrario, el motor de SIPAC @sanchez_sipac_2017 formula especificaciones funcionales neutrales e independientes de la tecnología comercial, guiando la prescripción a través de la cadena causal del Modelo Intellectus (desde los procesos de negocio hacia las áreas de interés, los activos intangibles y, finalmente, los artefactos tecnológicos). De este modo, se asegura que las iniciativas propuestas potencien el capital intelectual y la ventaja competitiva real de la organización.

En tercer lugar, en lo relativo a la priorización multicriterio en AHP, el enfoque basado en inferencia directa asigna ponderaciones porcentuales arbitrarias a priori y evalúa las alternativas mediante modelos de suma lineal ponderada. Este proceder vulnera el axioma de independencia y ortogonalidad de Saaty @AHP_2001 —al solapar conceptos como el impacto operativo y el retorno de la inversión— y carece de mecanismos para auditar la coherencia interna de los juicios. En cambio, AI-Driven DTGEP define un conjunto de criterios ortogonales y fundamenta las comparaciones pareadas en la escala Saaty de 1 a 9, explicitando las relaciones de compromiso (_trade-offs_) y el coste de oportunidad intrínseco a cada decisión estratégica.

Por último, en lo concerniente a la formalización y gobernanza de los entregables, la inferencia directa se limita a producir un cronograma heurístico y un documento narrativo en Markdown que resulta legible para un usuario humano, pero inviable para su procesamiento automatizado o auditoría matemática. Frente a esta debilidad, la arquitectura agéntica propuesta calcula algebraicamente el autovector principal de prioridades $bold(w)$, verifica formalmente que la Razón de Consistencia satisfaga el umbral axiomático de Saaty ($"CR" < 0.10$, alcanzando un valor de $"CR" = 0.04$ en el caso de estudio) y persiste el estado completo del preproyecto en un grafo tipado y validado mediante esquemas JSON, lo que permite su exportación directa a motores BPMN, bases de datos o cuadros de mando corporativos.

En síntesis, este contraste empírico demuestra que la inferencia generativa directa con modelos fundacionales, pese a ofrecer una redacción superficialmente persuasiva, carece de los mecanismos de control, reproducibilidad y rigor analítico indispensables en la ingeniería del software. El valor fundamental de AI-Driven DTGEP radica en gobernar la estocasticidad propia de los modelos de lenguaje mediante marcos metodológicos y estructuras de control formales, transformando la inferencia generativa en un proceso de toma de decisiones trazable, determinista y orientado a maximizar el valor del software.


== Validez y Limitaciones del Estudio Experimental <sec:evaluacion:limitaciones>
Con el propósito de contextualizar el alcance de los hallazgos y delimitar las condiciones de reproducibilidad del estudio, a continuación se analizan los factores de validez y las limitaciones metodológicas conforme a la taxonomía estándar en Ingeniería del Software empírica @wohlin_2012_experimentation:

=== Validez de Constructo <sec:evaluacion:limitaciones:constructo>
La validez de constructo examina en qué medida los instrumentos y procedimientos de evaluación implementados reflejan fielmente las capacidades cognitivas objeto de estudio.

En primer lugar, la auditoría de dimensiones semánticas abiertas en SIPAC y AHP se apoya en el modelo de frontera GPT-5.6 Luna mediante rúbricas formales ($0 - 3$ puntos). Aunque este enfoque constituye el estándar actual en la evaluación de agentes de IA @zheng_2023_judging, introduce una potencial dependencia de los sesgos internos del evaluador. Para mitigar esta limitación, aquellas facetas con fundamentación formal y cuantitativa se auditan mediante métricas deterministas desacopladas de cualquier juez sintético: por un lado, la calificación ordinal de las 51 capacidades en ALTUS ($0 - 5$) a través de métricas continuas exactas (_Accuracy_ y _MAE_); por otro, la coherencia lógica de las comparaciones pareadas en AHP mediante la Razón de Consistencia ($"CR" < 0.10$), resuelta de forma estrictamente algebraica a partir del autovalor principal $lambda_"max"$ de la matriz de Saaty @AHP_2001.

Asimismo, la naturaleza del _Ground Truth_ humano de referencia introduce una asimetría metodológica. Al haber sido generado por consultores junior en formación (estudiantes de último curso de Grado), su catálogo de artefactos tecnológicos en SIPAC adoptó un enfoque deliberadamente minimalista ($3$ elementos básicos). Cuando el agente de IA propone una arquitectura digital más exhaustiva y válida para el negocio, el mecanismo de asignación biunívoca penaliza matemáticamente la precisión calculada al computar dichas propuestas como excedentes.

Por último, el filtrado semántico previo por _embeddings_ calibrado en $tau^* = 0.35$ persigue optimizar la eficiencia computacional y blindar al juez LLM de emparejamientos espurios. No obstante, este filtro asume el riesgo de descartar soluciones válidas cuya redacción diste del vocabulario específico del consultor humano, otorgando al benchmark un carácter deliberadamente conservador.

=== Validez Interna <sec:evaluacion:limitaciones:interna>
La validez interna analiza si las relaciones observadas y el rendimiento de los modelos se deben a sus capacidades deductivas intrínsecas o si han podido verse condicionados por factores de confusión no controlados en el entorno de ejecución.

Por un lado, a pesar de fijar la temperatura de inferencia en $0.0$, los modelos de lenguaje pueden exhibir ligeras variaciones estocásticas derivadas de paralelismo interno y precisión numérica en punto flotante. Para neutralizar contingencias sintácticas accidentales ajenas al razonamiento del modelo, la infraestructura evaluadora implementa una política de reintentos adaptativos con auto-corrección guiada (_Adaptive Temperature Backoff_ hasta $0.4$).

Por otro lado, la evaluación del pipeline de SIPAC se ejecuta aislando cada fase mediante _Teacher Forcing_, suministrando al inicio de cada nodo los datos correctos del _Ground Truth_ del paso previo. Este desacoplamiento metodológico previene la propagación de fallos tempranos en cascada y garantiza que las métricas reflejen con exactitud la competencia deductiva intrínseca y la cota superior de desempeño de cada etapa del grafo, quedando para trabajos futuros la evaluación del pipeline en ejecuciones completas de extremo a extremo sin asistencia intermedia.

=== Validez Externa <sec:evaluacion:limitaciones:externa>
La validez externa aborda el grado en que los hallazgos empíricos pueden generalizarse a otros contextos industriales y organizativos del sector del software.

A este respecto, el conjunto de evaluación comprende cuatro organizaciones reales completas (un caso piloto de desarrollo y tres casos de test a ciegas) respaldadas por grabaciones de campo y documentación exhaustiva. Si bien cuatro casos no permiten realizar análisis estadísticos a gran escala, aportan un alto valor práctico al basar el estudio en problemas empresariales auténticos frente a escenarios sintéticos o simulados.

No obstante, las empresas evaluadas corresponden íntegramente a microempresas y PYMEs del sector servicios caracterizadas por una baja madurez tecnológica previa (predominio de calificaciones 0 y 1 en ALTUS). Por consiguiente, la generalización de las dinámicas conversacionales y de priorización a grandes corporaciones o entornos con alta madurez estructural previa (calificaciones 4 y 5) debe ser contrastada en futuros estudios.

=== Validez de Conclusión <sec:evaluacion:limitaciones:conclusion>
La validez de conclusión se centra en comprobar que las comparativas y conclusiones extraídas a partir de los datos sean fiables, reproducibles y metodológicamente sólidas.

Para asegurar la repetibilidad del estudio, todo el banco de pruebas está automatizado mediante scripts que guardan el estado y las conversaciones en esquemas JSON estructurados. Esto garantiza que todos los modelos se hayan probado exactamente en las mismas condiciones y sin variabilidad manual.

Asimismo, al tratarse de un estudio basado en cuatro casos reales analizados en profundidad, el objetivo no es realizar un análisis estadístico a gran escala, sino comparar de forma directa y detallada el rendimiento de cada modelo en cada fase (mediante métricas como el MAE, el _Weighted F1_ y la Razón de Consistencia). Esto permite identificar con claridad las fortalezas y puntos débiles de cada arquitectura en tareas de consultoría real.

Por último, los tiempos de ejecución medidos cuantifican exclusivamente el esfuerzo computacional y de inferencia del sistema bajo respuestas sintéticas instantáneas, sin incorporar los tiempos de respuesta y reflexión de un entrevistado humano real. Asimismo, las mediciones en hardware local pueden fluctuar ligeramente por factores del entorno físico (como la temperatura del procesador o la gestión de memoria del sistema operativo). Por ello, las conclusiones sobre la calidad del sistema se sustentan primordialmente en las métricas de acierto semántico y consistencia matemática, empleando las métricas temporales como una cota de referencia para el dimensionamiento de infraestructura y la viabilidad técnica del despliegue.
