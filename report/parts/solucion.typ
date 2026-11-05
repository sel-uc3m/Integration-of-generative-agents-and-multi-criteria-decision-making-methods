#let in-outline = state("in-outline", false)

= Solución Propuesta

En este capítulo se presenta un marco de trabajo soportado por una solución software basada en el uso de agentes inteligentes, cuyo propósito es asistir y descargar de trabajo al ingeniero de software en la fase de pre-proyecto, facilitando la toma de decisiones tecnológicas conforme a los objetivos de la @intro:objetivos. Esta solución consiste en el diseño de una metodología que guíe la toma de decisiones durante el proceso de planificación de las transformaciones digitales en las organizaciones mediante Inteligencia Artificial Agéntica, y en el desarrollo de una herramienta software de soporte. De este modo, el sistema releva al ingeniero de la conducción directa de la entrevista, asumiendo de manera autónoma la recolección inicial de información para generar borradores preliminares auditables.

== Descripción de la Metodología Propuesta: AI-Driven DTGEP <sec:solucion:metodologia>

El punto de partida metodológico sobre el que se fundamenta la solución toma como base la metodología DTGEP (_Digital Transformation Governance Engineering Process_), concebida para identificar potenciales proyectos de transformación digital sostenibles y libres de deuda técnica, que sean necesarios desplegar en una organización como parte de su proceso de transformación digital. Para poder integrar la Inteligencia Artificial Agéntica de forma efectiva, la nueva solución no aborda DTGEP en su totalidad, sino que centra sus adaptaciones en modificar los subprocesos DTGEP1, DTGEP2 y DTGEP4 de la metodología DTGEP como se han resaltado en la @fig:solucion:DTGEP. El cambio fundamental para estos pasos consiste en la transición hacia un modelo asíncrono, dividiendo los procesos tradicionales de evaluación en fases separadas de recolección conversacional de información y posterior procesamiento algorítmico. A esta evolución metodológica con inteligencia artificial se la denominará en adelante *AI-Driven DTGEP*.

#figure(
  image("../img/DTGEP.png", width: 65%),
  caption: [Metodología DTGEP. Subprocesos resaltados indican adaptaciones para AI-Driven DTGEP.],
) <fig:solucion:DTGEP>


La ejecución de estos tres subprocesos se lleva a cabo mediante la integración de metodologías y métodos de toma de decisiones específicos que conforman la base operativa de la solución propuesta:

En primer lugar, el subproceso *DTGEP1 (ALTUS)* se materializa mediante la metodología ALTUS @sanchez_ALTUS_2020 con el objetivo de medir y caracterizar la madurez digital actual de la empresa. Para ello, el agente recopila información directamente del _stakeholder_ (entendido en este ámbito como cualquier actor con conocimiento relevante sobre la organización), produciendo un diagnóstico multidimensional utilizable tanto por la dirección para comprender su posición competitiva como por el equipo técnico como base de planificación.

En segundo lugar, el subproceso *DTGEP2 (SIPAC)* implementa la metodología SIPAC @sanchez_sipac_2017. A partir de los procesos de negocio y las metas estratégicas de la organización, el sistema deduce y caracteriza los activos intangibles clave, formulando las especificaciones funcionales de los artefactos tecnológicos idóneos para impulsar la transformación digital; su salida estructurada constituye el insumo directo para la posterior priorización.

Finalmente, el subproceso *DTGEP4 (AHP)* integra el método de toma de decisiones multicriterio _Analytic Hierarchy Process_ de Saaty @AHP_2001 para ordenar y priorizar las alternativas tecnológicas deducidas en SIPAC. En este paso, el _stakeholder_ define y calibra los criterios de decisión pertinentes (impacto, coste, viabilidad), y el motor algorítmico resuelve algebraicamente el vector de prioridades para determinar la hoja de ruta óptima de implantación.

En la @fig:solucion:procesos se muestra un diagrama que representa de forma global cómo estos 3 subprocesos indicados se relacionan tal y como se define en la metodología DTGEP.

#figure(
  image("../diagramas/bpmn/nivel1_procesos.svg", width: 80%),
  caption: [Representación global de los procesos principales de la solución propuesta.#context if not in-outline.get() [ #footnote[
    *Notación — BPMN 2.0 (Business Process Model and Notation)*: Este y los siguientes diagramas de procesos siguen la notación BPMN 2.0. Los *pools* (grandes rectángulos con título en el lateral) delimitan el ámbito de cada participante del proceso (p. ej., _Stakeholder_, _Sistema_). Dentro de cada pool, los *eventos de inicio y fin* se representan con círculos (borde fino el de inicio, borde grueso el de fin). Los *nodos de tarea* son rectángulos de esquinas redondeadas. Las *líneas continuas con flecha* son flujos de secuencia dentro de un mismo pool; las *líneas discontinuas con círculo en el origen* son flujos de mensaje entre participantes distintos.
  ]<fn:bpmn> ]],
) <fig:solucion:procesos>

Con los tres subprocesos DTGEP1, DTGEP2 y DTGEP4 ya caracterizados, el siguiente interrogante es cómo incorporar la Inteligencia Artificial Agéntica dentro de ellos sin alterar su esencia metodológica. En su concepción original, cada uno de estos subprocesos se ejecuta como un bloque unitario e indivisible: el ingeniero de software y el _stakeholder_ coinciden simultáneamente, el primero formula las preguntas conforme avanza el análisis y va obteniendo de manera inmediata los resultados parciales del proceso. Esta dependencia de sincronía y experiencia humana convierte la fase de entrevista en el principal cuello de botella de la metodología. Para resolver esta limitación, se ha optado por estructurar cada proceso en dos fases que se ejecutan secuencialmente de forma automática: una fase de *recolección de información*, en la que el agente asume el rol del ingeniero para obtener la información organizativa que sólo puede ser provista por el *stakeholder*, y una fase de *procesamiento*, en la que esos datos se transforman algorítmicamente en un primer borrador de los resultados.

La fase de procesamiento es puramente algorítmica y, por tanto, directamente automatizable. El verdadero cuello de botella es la fase de recolección tanto para cada uno de las metodologías mencionadas (ALTUS, SIPAC y AHP): requiere la disponibilidad simultánea del ingeniero y del *stakeholder*, exige experiencia por parte del ingeniero para saber qué preguntar y cómo profundizar en las respuestas, y consume una cantidad de tiempo significativa que depende de la complejidad de la empresa analizada.

La solución propuesta consiste en relevar al ingeniero de software de su presencia en esta fase de recolección mediante *agentes de Inteligencia Artificial*. La alternativa más intuitiva podría ser involucrar a la IA como copiloto síncrono del *stakeholder* o del ingeniero durante la entrevista; sin embargo, esto no eliminaría el cuello de botella de la concurrencia temporal ni el consumo de horas del consultor. Por tanto, la decisión más eficiente es que la IA asuma de forma autónoma la labor de interrogación e indagación: formular las preguntas, gestionar el flujo de la conversación, resolver dudas metodológicas, detectar respuestas insuficientes y profundizar en ellas.

Esta delegación de la entrevista tiene una consecuencia arquitectónica importante: el proceso adopta un *modelo de ejecución automatizado End-to-End con auditoría asíncrona*. El *stakeholder* puede realizar la entrevista con el agente en cualquier momento y desde cualquier lugar. Una vez que la entrevista finaliza, el sistema encadena automáticamente la recolección con la fase de procesamiento, generando un *borrador preliminar* de forma inmediata. Esto proporciona valor instantáneo al usuario. Posteriormente, el ingeniero de software entra en el flujo de forma asíncrona para revisar este borrador diferido, auditar la calidad de las respuestas si detecta inconsistencias, y validarlo para emitir el plan definitivo. Cabe destacar que esta labor de auditoría se plantea conceptualmente dentro de la solución, pero no cuenta con una solución tecnológica específica o interfaz gráfica de usuario dedicada en el presente trabajo; el ingeniero de software realiza esta validación mediante la inspección manual directa de los ficheros JSON generados, quedando el desarrollo de una interfaz de auditoría fuera del alcance de este TFM.

Este modelo automatizado impone, a su vez, un requisito técnico fundamental: el resultado estructurado de la entrevista debe persistirse en ficheros estandarizados. Estos ficheros actúan como el contrato de datos que conecta ambas fases sin intervención humana, permitiendo que los algoritmos los consuman al instante y, al mismo tiempo, sirven de registro auditable para la revisión asíncrona por parte del ingeniero de software (@fig:solucion:asincrono).

#figure(
  image("../diagramas/bpmn/nivel2_modelo_asincrono.svg", width: 90%),
  caption: [Modelo de ejecución asíncrono y separación de fases.#context if not in-outline.get() [ #footnote(<fn:bpmn>) ]]
) <fig:solucion:asincrono>

== Arquitectura del Software: Motor Genérico e Instanciación de AI-Driven DTGEP <sec:solucion:software>

Para dar soporte operativo a la metodología AI-Driven DTGEP —y al mismo tiempo proporcionar un marco extensible a otros dominios de decisión—, la solución software se diseña bajo un principio de estricto desacoplamiento entre el *motor de educción agéntica genérico* y las *reglas de negocio específicas*.

Tomando como referencia el modelo asíncrono de la @fig:solucion:asincrono, la arquitectura se estructura en tres bloques principales: el *motor de educción agéntico* (@sec:solucion:motor), concebido como un componente genérico y agnóstico al dominio responsable de conducir la entrevista cualitativa mediante LangGraph y contratos JSON; la *fase de procesamiento algorítmico* (@sec:solucion:procesamiento), integrada por módulos matemáticos deterministas que ejecutan la lógica de negocio de las metodologías instanciadas (ALTUS, SIPAC y AHP); y la *aplicación web unificada* (@sec:solucion:web), desarrollada en Next.js 16 para orquestar la interacción, el streaming en tiempo real y la trazabilidad de las sesiones.

=== Motor de Educción <sec:solucion:motor>

Establecido el modelo de ejecución en la @fig:solucion:asincrono, el componente central de la solución es el *motor de educción de información*: un framework agéntico autónomo capaz de conducir entrevistas cualitativas complejas emulando el comportamiento de un ingeniero de software.

Arquitectónicamente, este motor opera como un intérprete declarativo: no contiene lógica cableada de ninguna metodología en particular, sino que interpreta estructuras abstractas de tareas, acciones y esquemas de validación. En el contexto de este trabajo, dicho motor se parametriza mediante ficheros de configuración específicos para materializar operativamente la recolección de datos de ALTUS, SIPAC y AHP dentro de AI-Driven DTGEP. La figura @fig:solucion:motor_entrevista ubica este motor dentro de la arquitectura global, mostrando cómo interactúa con el *stakeholder* y sus salidas.

#figure(
  image("../diagramas/diagramas_finales/proceso_entrevista.svg", width: 60%),
  caption: [Ubicación del motor de educción dentro de la arquitectura global.#context if not in-outline.get() [ #footnote(<fn:bpmn>) ]]
) <fig:solucion:motor_entrevista>

La tecnología seleccionada para implementar este motor es *LangGraph*, una librería que permite construir grafos de ejecución (máquinas de estados) donde cada nodo representa una acción o decisión, y las aristas determinan el flujo de control en función del resultado de cada nodo. Los Modelos de Lenguaje Grandes (LLMs) actúan como el motor de razonamiento de cada nodo que requiera comprensión del lenguaje, clasificación de intenciones o síntesis de información. La elección de LangGraph frente a otras alternativas de IA agéntica se debe a su capacidad para definir flujos de control explícitos y deterministas, lo que resulta esencial en un sistema de entrevista donde el orden y la completitud de la información recogida son críticos y donde los comportamientos erráticos o impredecibles podrían comprometer la calidad del output.

Para que el motor de educción pueda relevar de forma efectiva al ingeniero en la conducción de la entrevista, debe cubrir un conjunto específico de capacidades que emulen el comportamiento de un consultor humano durante la recolección de información:

En primer lugar, la *formulación de preguntas y aclaración de dudas*: el ingeniero no solo interroga, sino que atiende y resuelve las dudas del *stakeholder* sobre los conceptos de la metodología. El motor detecta de forma autónoma cuándo el interlocutor plantea una duda, la solventa consultando la base de conocimiento y reformula la pregunta incorporando la aclaración.

En segundo lugar, el *flujo dinámico de preguntas*: un consultor experimentado no sigue un guión estático. Ante respuestas escuetas o incompletas, el motor evalúa la suficiencia de la información recabada y despliega preguntas de seguimiento contextualizadas (_follow-ups_) para profundizar antes de dar por cerrada la acción.

En tercer lugar, la *memoria conversacional*: en sesiones extensas, el motor mantiene un estado jerárquico de resúmenes que le permite recordar información previa y eludir preguntas redundantes cuando la respuesta ya ha sido proporcionada de forma implícita en turnos anteriores.

Asimismo, incorpora *razonamiento autónomo*: ciertas variables no se obtienen directamente del usuario, sino que se deducen a partir del contexto ya recopilado aplicando conocimiento de dominio mediante llamadas internas al LLM sin interacción directa con el interlocutor.

Finalmente, la *configurabilidad*: el motor opera de forma completamente desacoplada de la lógica de negocio, definiéndose su comportamiento íntegramente mediante un contrato de configuración externo (ficheros JSON), lo que permite instanciar indistintamente procesos como ALTUS, SIPAC o AHP sobre el mismo núcleo agéntico. Esta aproximación puramente declarativa e interpretada mediante LLMs aporta la *máxima flexibilidad y adaptabilidad*: permite incorporar nuevas metodologías o modificar cuestionarios al vuelo sin necesidad de recopilar datasets de entrenamiento ni reajustar pesos de modelos (*Zero-Shot In-Context Learning*). Aunque este diseño traslada las decisiones internas de transición al tiempo de inferencia del LLM (asumiendo un mayor coste temporal que en un proceso asíncrono desatendido es perfectamente asumible), prioriza el desacoplamiento y la genericidad sobre la rigidez de clasificadores cableados.

#block(
  fill: luma(235),
  inset: (x: 1em, y: 0.8em),
  radius: 4pt,
  width: 100%,
)[
  *Genericidad del motor*: cualquier proceso de recolección de información que pueda expresarse mediante tareas y acciones puede ejecutarse sobre este motor sin modificar una sola línea de su código. Un nuevo proceso de auditoría —de cualquier dominio— únicamente necesita respetar el contrato de configuración para beneficiarse de todas las capacidades del motor: flujo dinámico, memoria conversacional, razonamiento autónomo, validación estructurada y persistencia asíncrona.
]

Todas estas características conforman el motor de educción y se formalizan mediante el diagrama de casos de uso expuesto en la @fig:solucion:casos_uso.

#figure(
  image("../diagramas/plantuml/nivel3_casos_uso.svg", width:100%),
  caption: [Casos de uso principales del motor de educción.#context if not in-outline.get() [ #footnote[
    *Notación — UML de Casos de Uso*: Este diagrama describe las interacciones funcionales entre actores y el sistema. Los *actores* (figuras de persona) representan entidades externas que interactúan con el sistema. Los *óvalos* representan casos de uso (funcionalidades). Las *líneas continuas* entre un actor y un caso de uso indican que el actor participa en esa funcionalidad. Las *flechas discontinuas* con etiqueta `«include»` indican que un caso de uso incorpora obligatoriamente el comportamiento de otro; las etiquetadas con `«extend»` representan una extensión opcional. El *rectángulo exterior* delimita la frontera del sistema.
  ]<fn:uml-casos-uso> ]]
) <fig:solucion:casos_uso>

==== Flujo de una Sesión de Entrevista <sec:solucion:flujo>

Con las capacidades del motor ya definidas en la @sec:solucion:motor, esta sección describe cómo se articula una sesión de educción de información completa desde el punto de vista del usuario y del sistema. El flujo no es lineal sino iterativo, ya que cada pregunta puede dar lugar a varios ciclos de aclaración y evaluación antes de avanzar a la siguiente.

Para poder describir este flujo es necesario introducir dos conceptos clave que estructuran la configuración del motor: las *tareas* y las *acciones*. Una *tarea* representa un bloque temático de la sesión, es decir, un conjunto de preguntas o razonamientos relacionados con un mismo objetivo (por ejemplo, recoger información sobre los procesos internos de la empresa, o sobre sus objetivos estratégicos). Dentro de cada tarea, las *acciones* son las unidades mínimas de trabajo: cada acción es o bien una pregunta que el agente formula al _stakeholder_, o bien un razonamiento interno que el sistema ejecuta de forma autónoma sin interacción con el usuario. Esta distinción es lo que permite configurar el motor de forma diferente para cada proceso (ALTUS, SIPAC, AHP), simplemente variando qué tareas hay y qué acciones contiene cada una.

Al inicio de la sesión, el sistema carga la configuración del proceso correspondiente, que especifica precisamente esta lista de tareas y su secuencia de acciones. No se trata de motores distintos para cada proceso, sino del mismo motor configurado de forma diferente.

Para cada acción de la configuración, el sistema distingue tres modalidades operativas de comportamiento:

Si la acción es de tipo *pregunta*, el agente la presenta al *stakeholder* y abre un sub-flujo interactivo: si el interlocutor plantea una duda, el agente la resuelve y reformula la pregunta; si responde, el sistema evalúa la suficiencia de la respuesta antes de avanzar. En caso de detectar lagunas, emite repreguntas contextualizadas (_follow-ups_). Para evitar la fatiga del usuario y prevenir bucles indefinidos, el motor incorpora *guardas deterministas de parada* que acotan las aclaraciones a un máximo de dos intentos y las repreguntas a tres turnos por acción, consolidando la mejor evidencia disponible si se alcanza dicho límite.

Si la acción es *interna*, el sistema ejecuta un razonamiento autónomo mediante LLM sin interacción directa con el usuario, persistiendo la deducción en el estado global para su consumo por acciones posteriores.

Finalmente, si la acción es de tipo *bucle* (`loop_validation`), opera como un generador dinámico que toma una plantilla y la expande sobre colecciones de elementos descubiertos en tiempo de ejecución (por ejemplo, instanciando preguntas específicas para cada uno de los sistemas informáticos identificados en fases previas), dotando a la entrevista de la flexibilidad necesaria para tratar conjuntos de datos dinámicos.

Una vez que todas las acciones de una tarea se han completado, el sistema genera un resumen de la tarea que queda disponible como contexto para las tareas siguientes. Esta memoria de medio plazo opera en dos sentidos: por un lado, se inyecta como contexto en el prompt de acciones posteriores; por otro, antes de formular cada nueva pregunta al _stakeholder_, el sistema la contrasta con los resúmenes acumulados para determinar si la respuesta ya fue proporcionada implícitamente en una tarea anterior. Si es así, la pregunta se omite y la respuesta extraída de los resúmenes se registra directamente como resultado de la acción, evitando así cualquier redundancia en la entrevista. Cuando todas las tareas han sido procesadas, la sesión concluye y el resultado se persiste en disco, completando así el flujo detallado en la @fig:solucion:flujo_entrevista.

#figure(
  image("../diagramas/plantuml/nivel4_flujo_entrevista.svg", width: 80%),
  caption: [Flujo funcional de una sesión de entrevista.#context if not in-outline.get() [ #footnote[
    *Notación — UML de Actividad*: Este diagrama modela el flujo de control de un proceso paso a paso. El *círculo negro* es el nodo inicial; el *círculo negro con borde* es el nodo final. Los *rectángulos de esquinas redondeadas* representan actividades o acciones. Los *rombos* son nodos de decisión: cada arista saliente lleva una condición que indica cuándo se toma ese camino. Las *flechas continuas* conectan los elementos en el orden de ejecución.
  ]<fn:uml-actividad> ]],
) <fig:solucion:flujo_entrevista>

==== Diseño de Datos (Configuración, Estado y Salida) <sec:solucion:datos>

Con el flujo funcional ya descrito, esta sección detalla la estructura de los datos que configuran y sostienen el sistema. No describe comportamiento en tiempo de ejecución, sino las entidades estáticas que lo hacen posible: cómo se configura el motor, cómo representa su estado interno durante la sesión, y qué produce como resultado.

Para tener una visión clara de las entidades y sus relaciones, la @fig:solucion:modelo_datos ilustra el modelo de datos principal. En el diagrama destacan tres pilares: `GraphProfile` como contenedor de la configuración global, las entidades `Task` y `Action` que formalizan los conceptos de tarea y acción introducidos en la @sec:solucion:flujo, y el `GraphState` que mantiene la memoria activa de la ejecución vinculando la configuración con las colas de trabajo.

#figure(
  image("../diagramas/plantuml/nivel5_modelo_datos.svg", width: 70%),
  caption: [Modelo de datos principal: configuración, tareas y estado.#context if not in-outline.get() [ #footnote[
    *Notación — UML de Clases*: Este diagrama describe la estructura estática de los datos del sistema. Cada *rectángulo* representa una clase o tipo de datos, dividido en secciones de nombre y atributos (con su tipo). Las *flechas con punta rellena* indican una relación de asociación direccional entre clases. Los números en los extremos de las líneas indican multiplicidad (p. ej., `1` a `*` significa «uno a muchos»).
  ]<fn:uml-clases> ]],
  placement:  auto
) <fig:solucion:modelo_datos>

La configuración de una entrevista se especifica en un único fichero JSON que contiene dos partes principales. La primera parte es el *perfil del grafo* (`GraphProfile`), que controla el comportamiento global del motor: qué capacidades están activas (evaluación de respuestas, aclaración de dudas, generación de resúmenes), los prompts de sistema para razonamientos internos y la definición de los *hooks* (`GraphHook`). Un *hook* es un mecanismo opcional que permite ejecutar un post-procesamiento automático mediante LLM al alcanzar momentos clave de la sesión: tras validar la respuesta de una acción (`afterActionAnswer`) o al completar una tarea (`afterTask`). Por ejemplo, en el proceso ALTUS, el hook `afterActionAnswer` se utiliza para evaluar automáticamente la madurez digital de la capacidad recién respondida (en una escala de 0 a 5) y generar su justificación sin alterar la lógica del motor genérico ni introducir acciones adicionales tras cada pregunta. La segunda parte es la lista de *tareas* (`Task[]`), cada una con su conjunto de acciones (`Action[]`). Esta separación entre perfil, hooks y tareas permite reutilizar el mismo perfil de comportamiento para distintos conjuntos de preguntas, y viceversa.

Este fichero JSON constituye la *interfaz pública del motor*: es el único punto de contacto entre el motor genérico y cualquier proceso concreto. Quien desee incorporar un nuevo proceso al sistema no necesita conocer ni modificar el código del motor; basta con definir un fichero de configuración que respete este contrato. Un ejemplo de este formato puede apreciarse en la @fig:solucion:config_profile_snippet para el perfil y en la @fig:solucion:config_tasks_snippet para las tareas.

#let config_str = read("../../questions/preguntas-SIPAC.json")
#let profile_snippet = "{\n" + config_str.split("\n").slice(2, 17).join("\n") + "\n    // ...\n  }\n}"

#figure(
  align(left)[
    #raw(profile_snippet, lang: "json")
  ],
  caption: [Fragmento de configuración de entrada (Perfil).],
) <fig:solucion:config_profile_snippet>

#let tasks_snippet = "{\n  // ...\n" + config_str.split("\n").slice(30, 41).join("\n") + "\n        // ...\n      ]\n    }\n  ]\n}"

#figure(
  align(left)[
    #raw(tasks_snippet, lang: "json")
  ],
  caption: [Fragmento de configuración de entrada (Tareas).],
) <fig:solucion:config_tasks_snippet>

Durante la ejecución, el grafo mantiene un estado global (`GraphState`) que actúa como memoria de trabajo de la sesión. Este estado contiene las colas de tareas y acciones pendientes, la tarea y acción actuales, el almacén de resultados compartido (`outputJson`), el historial de resúmenes de tarea, y un indicador de finalización. Es importante destacar que este estado es *efímero*: existe únicamente durante la ejecución de la sesión y no forma parte del output final. Su propósito es únicamente permitir que el grafo tome decisiones informadas en cada momento.

De forma continua durante la ejecución —tras cada acción o tarea completada, y no únicamente al finalizar la sesión—, el sistema divide y vuelca el contenido del estado en dos ficheros de salida complementarios, tal y como se ilustra en la @fig:solucion:proceso_persistencia. Esta separación arquitectónica responde a que sirven a consumidores distintos con requerimientos desacoplados:

#figure(
  image("../diagramas/diagramas_finales/proceso_persistencia.svg", width: 60%),
  caption: [Ubicación de los ficheros de salida dentro de la arquitectura global.#context if not in-outline.get() [ #footnote(<fn:bpmn>) ]],
) <fig:solucion:proceso_persistencia>

Por un lado, el *fichero de registros de conversación* (`output_<process>_<timestamp>.json`) contiene el transcript completo de la entrevista organizado por tareas y acciones, orientado a la revisión humana durante la auditoría asíncrona del ingeniero de software si se precisa contrastar la calidad de las intervenciones.

Por otro lado, el *fichero de variables estructuradas* (`variables_<process>_<timestamp>.json`) contiene exclusivamente las variables que las acciones persisten explícitamente mediante el campo `outputVar`. Para que los algoritmos deterministas de ALTUS, SIPAC y AHP puedan consumir estos datos sin ambigüedad, la salida se valida obligatoriamente contra un *esquema JSON* estricto, asegurando un contrato de datos tipado que alimenta directamente a los módulos matemáticos.

Finalmente, el flujo completo de información y la relación global entre configuración, estado interno y estos ficheros de salida queda expuesta de forma gráfica en la @fig:solucion:flujo_datos.
//TODO: Cambiar la figura para indicar que las variables son variables
#figure(
  image("../diagramas/bpmn/nivel5_flujo_datos.svg", width: 80%),
  caption: [Estructura de datos: configuración, estado de ejecución y salida.#context if not in-outline.get() [ #footnote(<fn:bpmn>) ]]
) <fig:solucion:flujo_datos>

==== Arquitectura del Grafo <sec:solucion:grafo>

Esta sección describe cómo se organiza el grafo de ejecución, detallando los nodos, las aristas y las colas que implementan el flujo iterativo y el diseño de datos expuestos en la @sec:solucion:flujo y la @sec:solucion:datos.

Para lograr un comportamiento dinámico y *agnóstico al proceso concreto que se ejecute*, el motor no predefine el camino de la entrevista en la estructura del grafo, sino que se apoya en un sistema de doble cola: una cola para las tareas (`taskQueue`) y una cola para las acciones (`actionQueue`), conceptos y entidades que fueron introducidos en la @sec:solucion:flujo y modelados en la @sec:solucion:datos. Al inicio de la sesión, se cargan todas las tareas configuradas en la cola principal. El nodo inicial extrae la primera tarea y vuelca todas sus acciones en la cola secundaria.

A partir de ahí, el sistema se fundamenta en un ciclo principal de procesamiento continuo gobernado por la máquina de estados. El motor extrae la primera acción de la cola de acciones y la deriva hacia dos caminos principales en función de su naturaleza: por un lado, el *camino de pregunta*, que presenta la interacción al usuario, gestiona dudas mediante consultas a la base de conocimiento y evalúa la suficiencia de la respuesta antes de avanzar; por otro lado, el *camino interno*, que ejecuta razonamientos autónomos y síntesis deductivas sin interacción del usuario.

Este diseño estructurado en un doble camino y gobernado por evaluaciones previas a cada interacción materializa de forma práctica el paradigma *ReAct* (_Reasoning and Acting_) introducido en el Estado del Arte (@sota:estado_arte). En lugar de usar el modelo de lenguaje como un mero generador estocástico, la arquitectura orquesta un ciclo donde el agente primero razona sobre el estado actual (clasificando intenciones o evaluando la suficiencia de los datos) y, en función de ese razonamiento, actúa sobre su entorno (haciendo una pregunta de seguimiento, resolviendo dudas o avanzando en el proceso).

Dentro de estos caminos, cuando una acción tiene definido un esquema JSON para su `outputVar` (tal y como se detalló en la @sec:solucion:datos), el grafo incorpora un sub-bucle de validación estructurada. Tras invocar al LLM para extraer el contenido, un nodo validador comprueba si el JSON devuelto encaja estrictamente en el esquema esperado. Si la validación falla, el grafo traza una arista de retroceso hacia el LLM, inyectando el error de formato en el prompt para que el modelo corrija su respuesta. Este bucle garantiza solidez en el formato antes de avanzar.

Para las acciones de tipo bucle (`loop_validation`), cuya necesidad funcional se introdujo en la @sec:solucion:flujo, el grafo delega la ejecución en un proceso de desenrollado: lee una colección de elementos del estado, genera de forma dinámica las acciones derivadas para cada elemento y las añade a la cabeza de la cola de procesamiento.

Ambos caminos principales convergen en un proceso de consolidación o cierre de acción, donde se genera un resumen de la iteración y se guarda el estado en disco de forma incremental. Si la cola de acciones aún tiene elementos, el grafo vuelve a extraer la siguiente acción. Al vaciarse la cola de acciones, el sistema ejecuta el cierre de tarea, generando un resumen global de todo el bloque, y extrae la siguiente tarea de la cola principal para reiniciar el ciclo. El proceso completo termina cuando ambas colas quedan vacías.

Para facilitar la asimilación visual de todas estas transiciones y observar en detalle la complejidad de las interacciones, el esquema de estados completo que configura el motor *LangGraph* se detalla en la @fig:solucion:grafo.

#figure(
  image("../diagramas/nivel6_estados_motor.svg", width:100%),
  caption: [Arquitectura de estados y transiciones del motor de educción.#context if not in-outline.get() [ #footnote[
    *Notación — Grafo de Estados*: Este diagrama representa la máquina de estados que implementa el motor de educción. Cada *nodo* (rectángulo) es un estado del sistema, es decir, una operación concreta que el motor puede ejecutar. Las *aristas con línea continua* son transiciones incondicionales que se activan siempre al terminar un nodo. Las *aristas con línea discontinua* son transiciones condicionales que solo se activan cuando se cumple la condición indicada en su etiqueta. Los nodos con el mismo color de fondo pertenecen a la misma fase del flujo.
  ]<fn:grafo-estados> ]]
) <fig:solucion:grafo>

==== Gestión de Memoria y Estado

La capacidad de *memoria conversacional* descrita en la @sec:solucion:motor se implementa mediante un sistema de dos planos complementarios, tal y como se anticipó en el flujo de sesión de la @sec:solucion:flujo.

A corto plazo, dentro de una misma tarea, el sistema inyecta en el prompt únicamente los *resúmenes* de las acciones anteriores a modo de contexto inmediato; las respuestas completas se almacenan en el estado exclusivamente para la auditoría humana posterior y no se envían al modelo, lo que mantiene el coste de tokens acotado. A medio plazo, al concluir cada tarea, el sistema sintetiza todos sus intercambios en un resumen global que quedará disponible como contexto para las tareas siguientes.

Este doble repositorio de resúmenes es lo que permite al gestor de la entrevista eludir preguntas redundantes: antes de formular cualquier pregunta, consulta el conocimiento acumulado y, si el modelo determina que la respuesta ya está implícita, la acción se cierra directamente sin interacción con el stakeholder. Esto materializa la capacidad enunciada en la @sec:solucion:motor de evitar que el motor repita información ya proporcionada. La @fig:solucion:memoria ilustra este mecanismo dual mediante una vista detallada (zoom del sistema) enfocada en el ciclo de vida de la memoria y el estado del motor.

#figure(
  image("../diagramas/plantuml/nivel7_memoria_secuencia.svg", width: 85%),
  caption: [Detalle de ejecución (zoom del sistema) del flujo de gestión de memoria y estado para la prevención de preguntas redundantes.#context if not in-outline.get() [ #footnote[
    *Notación — UML de Secuencia*: Este diagrama representa el comportamiento dinámico del sistema, detallando cómo interactúan los componentes con las capas de memoria y estado a lo largo del tiempo. Los *rectángulos* en la parte superior representan los módulos o subsistemas participantes. Las *líneas verticales discontinuas* son las líneas de vida de cada participante. Las *flechas horizontales con punta rellena* representan mensajes enviados de un participante a otro; las *flechas con punta abierta sobre línea discontinua horizontal* representan el retorno de la respuesta. El tiempo avanza de arriba hacia abajo.
  ]<fn:uml-secuencia> ]]
) <fig:solucion:memoria>

==== Capa de Abstracción LLM

El grafo de nodos descrito en la @sec:solucion:grafo contiene la lógica de enrutamiento y las reglas de negocio, pero ningún nodo llama directamente a la API del modelo de lenguaje. Toda interacción se delega en una capa de abstracción unificada, ocultando los detalles de construcción de prompts, validación de esquemas y gestión de reintentos.

Esta separación es lo que hace posibles, de forma fiable, las capacidades descritas en la @sec:solucion:motor: la detección de dudas, la evaluación de suficiencia de respuestas, los follow-ups contextualizados o el razonamiento autónomo no son decisiones tomadas directamente por los nodos, sino el resultado de invocar funciones especializadas que garantizan una salida con tipo y estructura conocidos. Como se muestra en la @fig:solucion:llm, estas funciones se agrupan en operaciones de clasificación/evaluación y operaciones de síntesis/razonamiento, y todas siguen un *pipeline* interno idéntico: inyección de contexto, consulta al modelo, y validación estricta de formato.


#figure(
  image("../diagramas/plantuml/nivel7_capa_llm.svg", width: 100%),
  caption: [Capa de abstracción LLM: mapeo de nodos a funciones y pipeline interno.#context if not in-outline.get() [ #footnote(<fn:uml-secuencia>) ]]
) <fig:solucion:llm>

=== Fase de Procesamiento Algorítmico <sec:solucion:procesamiento>
Dando por cerrada la fase de recolección de información, el siguiente paso es procesar los datos obtenidos para generar los resultados finales. La figura @fig:solucion:fase_procesamiento ubica esta fase dentro de la arquitectura global, mostrando cómo los ficheros de variables generados por el motor de educción alimentan los tres procesos de negocio indicados en @sec:solucion:metodologia para la metodología AI-Driven DTGEP (ALTUS, SIPAC y AHP) que producen los resultados finales.

#figure(
  image("../diagramas/diagramas_finales/proceso_procesado.svg", width: 60%),
  caption: [Ubicación de la fase de procesamiento dentro de la arquitectura global.#context if not in-outline.get() [ #footnote(<fn:bpmn>) ]],
) <fig:solucion:fase_procesamiento>

El modelo automatizado descrito en la @fig:solucion:asincrono encadena de manera directa la fase de recolección de información (conducida por el motor de educción) con la fase de procesamiento. Esta segunda fase es puramente algorítmica y determinista, y no requiere intervención del modelo de lenguaje ni validación humana previa: cada proceso (ALTUS, SIPAC o AHP) se ejecuta automáticamente sobre su propio fichero de variables mediante un módulo matemático independiente (`altus_logic.ts`, `sipac_logic.ts` y `ahp_logic.ts`, respectivamente) que es desacoplado del flujo conversacional.

Esta separación arquitectónica es deliberada: la incertidumbre y la variabilidad del lenguaje natural quedan confinadas al motor de educción, mientras que las conclusiones preliminares de negocio —perfiles de madurez en ALTUS, brechas de artefactos en SIPAC, rankings de priorización en AHP— se derivan de manera reproducible a partir de los datos estructurados, permitiendo al _stakeholder_ obtener un borrador inmediato.

Para garantizar esta reproducibilidad, cada metodología implementa una secuencia lineal estricta de transformaciones sobre los datos JSON de entrada. Las tuberías de las tres metodologías, con sus ficheros de entrada y salida respectivos, quedan esquematizadas en la @fig:solucion:procesamiento.

#figure(
  image("../diagramas/plantuml/nivel7_tuberias.svg", width: 90%),
  caption: [Tuberías de procesamiento algorítmico para las metodologías ALTUS, SIPAC y AHP.#context if not in-outline.get() [ #footnote(<fn:uml-casos-uso>) ]]
) <fig:solucion:procesamiento>

Las tuberías se diseñan como procesos lineales sin dependencias externas: ante un mismo fichero JSON de entrada, el borrador preliminar generado será siempre idéntico, cumpliendo el objetivo de reproducibilidad determinista que justifica la separación arquitectónica.

El desarrollo matemático formal completo y las ecuaciones teóricas de cada metodología pueden consultarse en el @apx:formulacion_matematica. En las siguientes subsecciones se describe el flujo de transformación de datos de cada tubería y, en particular, los refinamientos lógicos, controles de robustez y decisiones de ingeniería implementadas en el software para automatizar su ejecución de forma desatendida y resiliente.

==== Tubería de Procesamiento de ALTUS <sec:solucion:procesamiento:altus>

El objetivo del procesamiento ALTUS es transformar las puntuaciones de madurez recogidas durante la entrevista en un *Perfil de Madurez* estructurado por dimensiones, siguiendo el modelo de gobierno del conocimiento propuesto por Sánchez-Segura et al. @sanchez_ALTUS_2020 y Dugarte-Peña @dugarte_tesis_2019.

El flujo de cálculo se inicia leyendo el fichero de variables `variables_altus.json`, que contiene las cincuenta y una capacidades críticas evaluadas identificadas mediante claves con el formato `<índice>_<DIMENSIÓN>:<número>` (por ejemplo, `1_CONF:1`, `2_FORM:3`). La tubería ejecuta las siguientes etapas:

1. *Agrupación por Dimensión Arquitectónica*: Se extrae el identificador de dimensión de la clave de cada capacidad para clasificarla en una de las siete dimensiones arquitectónicas de la organización (Configuración, Formación, Memoria Transaccional, etc.).
2. *Mapeo de Nivel de Madurez*: La puntuación numérica recogida en la escala ($s in \{0, dots, 5\}$) se mapea a uno de los cuatro niveles del modelo de madurez mediante la función $"nivel"(s) = min(max(s, 1), 4)$, asignando las respuestas a los niveles Inicial (0 y 1), En Desarrollo (2), Definido (3) y Optimizado (4 y 5).
3. *Cálculo de Métricas Agregadas de Negocio*:
   - *Puntuación Media por Dimensión*: Calcula la media aritmética de las puntuaciones de las capacidades de cada dimensión arquitectónica (@eq:anexos:altus:media_dimension).
   - *Cobertura por Nivel de Madurez (ML1 a ML4)*: Determina el porcentaje de cumplimiento de cada nivel respecto a la puntuación máxima teórica alcanzable (@eq:anexos:altus:cobertura).

Como resultado, el procesamiento produce un diagnóstico multidimensional del estado de la empresa, caracterizando de forma cuantitativa tanto las dimensiones arquitectónicas consolidadas como aquellas áreas deficitarias sobre las que deberán focalizarse las iniciativas de mejora.

==== Tubería de Procesamiento de SIPAC <sec:solucion:procesamiento:sipac>

La metodología SIPAC (_Systemic Intangible Process Assets Characterization_) @sanchez_sipac_2017 orienta la evaluación y la toma de decisiones estratégicas a partir de los activos intangibles de conocimiento de la organización. Dentro del marco AI-Driven DTGEP, el objetivo del sistema es automatizar este flujo de trabajo tradicionalmente manual y presencial: la recolección de información cualitativa es conducida de forma guiada por el motor de diálogo agéntico (@sec:solucion:grafo), consolidando en `variables_sipac.json` los objetivos de negocio, requisitos, procesos, áreas de interés (GIA), activos intangibles específicos con su importancia (1 a 5) y peso relativo, catalogación en el modelo Intellectus, deducción de artefactos tecnológicos, definición de indicadores tipificados en calidad o impacto, y la parametrización de rangos, sentido y valores actual y meta.

A partir de dicha estructura consolidada, la tubería determinista de SIPAC (`sipac_logic.ts`) ejecuta de forma reproducible las siguientes etapas de procesamiento algorítmico y caracterización de salud:

1. *Estandarización de Indicadores*: Proyecta los valores brutos medidos (valor actual $X_{"Act"}$ y meta $X_{"Goal"}$) al rango uniforme $[0, 1]$ en función del sentido de mejora del indicador (positivo o negativo, @eq:anexos:sipac:est1 y @eq:anexos:sipac:est2).
2. *Cálculo del Valor Normalizado del Indicador*: Obtiene el valor normalizado relativo ($X_("NORM") in [-1, 0]$) que evalúa el progreso hacia la meta fijada (@eq:anexos:sipac:gap1 y @eq:anexos:sipac:gap2).
3. *Valoración del Activo Intangible*: Agrega los valores normalizados calculando por separado la media normalizada de calidad ($V$, indicadores de tipo 1) y la media normalizada de impacto ($W$, indicadores de tipo 2) mediante promedios aritméticos condicionales (@eq:anexos:sipac:calidad_impacto), derivando asimismo el valor lineal agregado del activo (@eq:anexos:sipac:ka_val).
4. *Caracterización de Estados del Activo*: Cruza las valoraciones de calidad e impacto con los umbrales estratégicos configurables ($Q_(t h)$ e $I_(t h)$). En consonancia con la definición metodológica, la caracterización no se restringe a una matriz fija, sino que se adapta dinámicamente a la dimensionalidad de los indicadores disponibles:
   - *Calidad e Impacto (bidimensional, 4 estados)*: Si el activo dispone de ambos tipos de métricas, se clasifica en uno de los cuatro cuadrantes estratégicos: *Activo Estable* (_Stable_), *Activo en Evolución* (_Evolving_), *Activo Reemplazable* (_Replaceable_) o *Activo Nocivo* (_Warning_).
   - *Solo Calidad (unidimensional, 2 estados)*: Clasifica el activo en *Activo de Calidad Aceptable* o *Activo de Calidad Insuficiente*.
   - *Solo Impacto (unidimensional, 2 estados)*: Clasifica el activo en *Activo de Impacto Aceptable* o *Activo de Impacto Insuficiente*.
5. *Consecución del Objetivo Estratégico*: Agrega las valoraciones de todos los activos ponderadas por su peso relativo para cuantificar la consecución global del objetivo de negocio (@eq:anexos:sipac:objetivo).

Para trasladar este modelo a un software de ejecución desatendida y orientado al negocio, la implementación incorpora tres grupos de refinamientos de ingeniería:

En primer lugar, respecto al *control de casos límite y robustez matemática*, el motor previene divisiones por cero forzando a $0$ indicadores con rangos nulos ($X_(M A X) = X_(M I N)$) e inyectando un valor normalizado de $-1$ ante metas nulas. Asimismo, acota superiormente los resultados a $0$ mediante $min(0, X_("NORM"))$, impidiendo que un indicador con superávit enmascare deficiencias de otros dentro del mismo activo.

En segundo lugar, para la *automatización del diagnóstico y reducción de fricción*, el motor calcula las medias condicionales directas de calidad e impacto fijando umbrales por defecto ($Q_(t h) = I_(t h) = -0.5$) cuando no se especifican valores particulares, y aplica un desplazamiento de $+1$ sobre la valoración global ($"SG"_("VAL")$) para proyectar la métrica en un rango intuitivo de $[0, 1]$ ($0\%$ a $100\%$).

Finalmente, como parte del diagnóstico estratégico, la solución consolida la *integración con el Business Model Canvas (BMC)*, asociando automáticamente cada activo intangible y sus artefactos tecnológicos deducidos con su bloque correspondiente del lienzo estratégico (propuesta de valor, actividades clave, recursos clave, canales, etc.), contextualizando el impacto de los activos de conocimiento y las soluciones de digitalización sobre la arquitectura global del modelo de negocio.

==== Tubería de Procesamiento de AHP <sec:solucion:procesamiento:ahp>

El objetivo del procesamiento AHP es transformar las valoraciones de preferencia relativa recogidas durante la entrevista en un *ranking priorizado* de artefactos tecnológicos, aplicando el método de toma de decisiones multicriterio _Analytic Hierarchy Process_ de Saaty @AHP_2001.

A diferencia de ALTUS o SIPAC (cuyas entrevistas pueden iniciarse sin contexto previo para recopilar la información organizativa desde cero), AHP presenta una *dependencia de datos de entrada*: para poder construir las matrices de comparación pareada, el proceso requiere conocer con antelación las alternativas tecnológicas candidatas. Por ello, el motor soporta dos modos de alimentación: por un lado, una *ejecución encadenada* bajo la metodología DTGEP, donde el sistema inyecta automáticamente la salida estructurada de SIPAC (`sipac_final_output`) y extrae los artefactos vinculados a los activos con brechas; por otro lado, una *ejecución aislada*, que permite ejecutar el análisis de forma independiente cargando un fichero JSON de estado inicial con las alternativas a priorizar.

Una vez cargadas las alternativas y recopiladas las comparaciones pareadas en `variables_ahp.json` (tanto entre criterios de evaluación como entre alternativas bajo cada criterio), la tubería ejecuta las siguientes etapas:

1. *Construcción de Matrices Pareadas*: Construye las matrices $A$ de dimensión $n times n$ a partir de los juicios pareados del usuario, asignando a cada celda el valor de la escala fundamental de Saaty ($1$ a $9$) o su recíproco, con diagonal siempre igual a $1$.
2. *Cálculo del Vector de Prioridades*: Obtiene el vector de pesos normalizados $bold(w)$ para cada matriz (@eq:anexos:ahp:pesos).
3. *Verificación de Consistencia*: Estima el autovalor máximo $lambda_("max")$ (@eq:anexos:ahp:lambda), calcula el índice de consistencia $"CI"$ (@eq:anexos:ahp:ci) y determina el ratio de consistencia $"CR"$ (@eq:anexos:ahp:cr) frente a los índices aleatorios tabulados. El módulo evalúa si la matriz satisface los umbrales de tolerancia de Saaty ($0.05$ para matrices $3 times 3$, $0.09$ para $4 times 4$, y $0.10$ para $n >= 5$), registrando el resultado de consistencia en la salida para la auditoría técnica.
4. *Puntuación Global y Generación del Ranking*: Agrega las prioridades de los criterios con las valoraciones de las alternativas (@eq:anexos:ahp:final), emitiendo el ranking jerárquico definitivo de soluciones tecnológicas para orientar la selección del proyecto de transformación digital.

=== Arquitectura Web del Sistema <sec:solucion:web>

La herramienta software se expone al usuario a través de una aplicación web que actúa como interfaz de control de todo el sistema. Su propósito es permitir que tanto el _stakeholder_ como el ingeniero de software interactúen con el motor de educción y consulten los resultados del procesamiento sin necesidad de ejecutar comandos directamente desde la línea de órdenes.

Antes de describir la arquitectura resultante, conviene justificar la decisión de diseño que condiciona toda la capa web: la elección de un *framework híbrido* en lugar de una separación estricta en dos servicios independientes (un servidor desacoplado en NestJS o Express y un cliente React separado).

La alternativa de mantener dos servicios independientes fue descartada por dos razones. Primera, habría requerido configurar y mantener manualmente la infraestructura de WebSockets y la sincronización de estado del chat en el cliente (historial, variables, errores de red), introduciendo una complejidad accidental que no aporta valor al trabajo. Segunda, la lógica del motor de educción está implementada en TypeScript y orquestada con LangGraph, por lo que ejecutarla en un entorno Node.js de backend ya lo hace de forma nativa, sin capas de adaptación.

Por estas razones, la capa web se implementa con *Next.js 16* utilizando el patrón de *App Router*, unificando frontend y backend en un único monorepo TypeScript. Esta elección aporta cuatro ventajas técnicas determinantes: permite la reutilización directa del motor de educción (`@tfm/core`) en el mismo entorno de ejecución Node.js; elimina la sobrecarga de configuración de CORS al operar bajo el mismo origen; ofrece soporte nativo para respuestas HTTP en streaming mediante *Server-Sent Events (SSE)*; y facilita una trazabilidad integrada al interceptar las invocaciones al LLM a través de los callbacks de LangChain sin requerir herramientas externas.

==== Backend <sec:solucion:web:backend>

La lógica del backend se organiza en torno a un conjunto de rutas HTTP y canales de streaming que siguen las convenciones del App Router de Next.js:

- `POST /api/session/init`: Crea una nueva sesión de entrevista a partir de la plantilla o configuración seleccionada y el modelo LLM indicado. Instancia el grafo LangGraph en el servidor y abre el canal de streaming *SSE* (_Server-Sent Events_) para emitir el evento inicial de interrupción con la primera pregunta.

- `POST /api/chat`: Envía la respuesta del _stakeholder_ a la sesión activa. Reanuda el grafo desde el último punto de interrupción, procesa la intervención a través de los nodos de evaluación y seguimiento (@sec:solucion:grafo), y transmite por el flujo SSE los eventos de ejecución intermedios y el siguiente turno conversacional.

- `GET /api/session/{sessionId}`: Recupera el estado actual de una sesión activa en memoria, permitiendo reanudar sesiones interrumpidas desde la interfaz web.

- `GET /api/sessions`: Devuelve la lista de sesiones activas. Para garantizar la privacidad de los usuarios al no haber un sistema de autenticación de credenciales clásico, este endpoint acepta un parámetro de consulta `ids` con la lista de identificadores únicos (`sessionId`) que el navegador guarda en su `localStorage` local. El servidor filtra y solo devuelve las sesiones coincidentes, evitando que distintos usuarios compartan o visualicen sesiones de otros navegadores.

- `GET /api/processes`: Devuelve la lista de ficheros de configuración de proceso disponibles en el sistema de ficheros, permitiendo al usuario seleccionar qué metodología ejecutar.

- `GET /api/results` y `GET /api/results/{fileName}`: Listan y sirven los ficheros de resultados generados por sesiones anteriores, permitiendo la consulta del historial desde la interfaz. Al igual que el listado de sesiones, la consulta general de resultados requiere el envío del parámetro `ids` para filtrar y asegurar que un usuario solo pueda descargar y consultar sus propias evaluaciones previas.

Para dotar al sistema de resiliencia frente a reinicios del servidor web o desconexiones del cliente sin incurrir en una acumulación indefinida de datos huérfanos de pruebas, la herramienta implementa una política de *persistencia temporal* mediante una base de datos local SQLite (`sessions.db`) gestionada por el servicio `dbService.ts`. En ella se almacena el identificador único (`sessionId`), el estado del grafo (nodo activo y datos de interrupción `first_interrupt`), las variables conversacionales acumuladas (`carried_context_map` y `carried_output_json`) y los historiales de trazas. Para garantizar que este almacenamiento sea efímero y mantener la base de datos limpia, se ha incorporado un mecanismo de auto-expiración con claves foráneas en cascada (`PRAGMA foreign_keys = ON`), donde cada consulta al backend purga de forma transparente cualquier sesión (y sus trazas y resultados asociados) inactiva durante más de catorce días.

El *modelo de comunicación por streaming (SSE)* articula la sincronización en tiempo real entre el backend y la interfaz de usuario: en lugar de emplear un esquema de petición-respuesta bloqueante (inviable ante turnos de razonamiento del grafo que pueden prolongarse decenas de segundos), el servidor mantiene la conexión HTTP abierta y emite un flujo continuo de eventos tipados (`node_active`, `llm_start`, `llm_end`, `process_transition`, `completed`). Esto permite al cliente renderizar de forma reactiva el avance de la entrevista (como el cambio de nodo en el visualizador o las respuestas del agente) conforme se producen en el motor, reduciendo la latencia percibida.

Además, el backend integra un *módulo de trazabilidad propio* que se conecta a los callbacks de LangChain para interceptar la ejecución del grafo sin instrumentación adicional. Por cada sesión activa, el módulo registra: el nodo activo en cada instante, el historial ordenado de transiciones entre nodos, y el detalle de cada llamada al LLM (modelo utilizado, prompts enviados, respuesta recibida y latencia). Toda esta información se mantiene en memoria durante la sesión y se persiste de forma incremental en la base de datos SQLite local (`sessions.db`), exponiéndose al cliente a través del endpoint `GET /api/session/{sessionId}/trace`. Esto permite al visualizador del frontend resaltar en tiempo real el nodo activo sobre el diagrama del grafo, y al ingeniero de software consultar el historial completo de llamadas LLM para auditar el comportamiento del motor de educción, complementando la auditoría asíncrona descrita en la @sec:solucion:metodologia.

==== Frontend <sec:solucion:web:frontend>

La interfaz de usuario se implementa como una aplicación de página única (_Single-Page Application_) en React y Next.js 16, empleando *Tailwind CSS* para el diseño visual. Como se aprecia en la @fig:web:vista_general, el diseño se organiza mediante una cabecera superior con navegación por pestañas (*Configuración*, *Entrevista* e *Historial*), selector de modelo LLM en tiempo real y dos paneles principales: la configuración del flujo de trabajo y la gestión de sesiones activas en memoria para su rápida reanudación.

#figure(
  image("../img/Vista_General_web.png", width: 95%),
  caption: [Vista principal de la aplicación web: panel de configuración y sesiones activas en memoria.],
) <fig:web:vista_general>

*1. Configuración de Evaluaciones y Creación de Procesos:*

La plataforma ofrece dos modalidades de inicialización (@fig:web:configuracion). Por un lado, la carga del pipeline estándar AI-Driven DTGEP encadena automáticamente las tres fases metodológicas (ALTUS, SIPAC y AHP) permitiendo reordenar o eliminar etapas según el alcance del pre-proyecto. Por otro lado, la herramienta integra un diseñador de procesos personalizados donde el usuario puede definir el _system prompt_ del agente, habilitar mecanismos de repregunta y base de conocimiento, y parametrizar las tareas y preguntas de evaluación que consumirá el motor de educción.

#figure(
  grid(
    columns: (1fr, 1.35fr),
    gutter: 1.2em,
    align: horizon,
    image("../img/Configuracion_pipeline_web.png"),
    image("../img/Proceso_personalizado_web.png"),
  ),
  caption: [Modalidades de configuración de sesiones: (izq.) Pipeline encadenado AI-Driven DTGEP; (der.) Formulario de creación de procesos personalizados.],
) <fig:web:configuracion>

*2. Entorno de Entrevista y Grafo Reactivo:*

La pestaña de entrevista centraliza la recolección conversacional en una vista dividida (@fig:web:entrevista). En el panel izquierdo, el _stakeholder_ interactúa con el agente mediante un chat con respuestas en _streaming_. En el panel derecho, un visualizador interactivo desarrollado con *React Flow* renderiza la topología del grafo LangGraph, iluminando en tiempo real el nodo activo conforme se reciben los eventos SSE del backend y permitiendo al usuario inspeccionar el histórico de transiciones paso a paso o consultar las trazas de razonamiento.

#figure(
  image("../img/Entrevista_grafo_web.png", width: 95%),
  caption: [Interfaz de entrevista agéntica: canal de diálogo en tiempo real y visualizador reactivo del grafo de estados en React Flow.],
) <fig:web:entrevista>

*3. Cuadros de Mando y Visualización de Resultados:*

Tras finalizar la fase de educción o al cargar evaluaciones previas desde la pestaña de historial, la aplicación despliega cuadros de mando interactivos específicos para cada metodología:

- *Diagnóstico de Madurez ALTUS (@fig:web:resultados-altus)*: Calcula métricas agregadas por niveles de madurez (ML1 a ML4), distribuye las capacidades evaluadas según la escala Likert y representa la huella multidimensional de la organización mediante un gráfico radar en *Recharts* junto con la matriz numérica de cobertura.

#figure(
  image("../img/Resultados_ALTUS_web.png", width: 92%),
  caption: [Dashboard de resultados de madurez digital ALTUS con huella radar y matriz de cobertura.],
) <fig:web:resultados-altus>

- *Lienzo BMC en SIPAC (@fig:web:resultados-sipac)*: Transforma las necesidades detectadas en un _Business Model Canvas_ interactivo, ubicando los artefactos y activos intangibles en sus bloques estratégicos correspondientes (propuestas de valor, recursos clave y relaciones con clientes).

#figure(
  image("../img/Resultados_SIPAC_BMC_web.png", width: 92%),
  caption: [Visualizador interactivo de Business Model Canvas (BMC) derivado de la evaluación SIPAC.],
) <fig:web:resultados-sipac>

- *Priorización Multicriterio AHP (@fig:web:resultados-ahp)*: Representa el vector de prioridades globales, el ratio de consistencia ($C R$) de los juicios emitidos y la matriz de decisión ponderada para ordenar la viabilidad e impacto de cada iniciativa tecnológica.

#figure(
  image("../img/Resultados_AHP_web.png", width: 92%),
  caption: [Dashboard de resultados de priorización multicriterio AHP con vector de pesos y matriz de decisión.],
) <fig:web:resultados-ahp>
