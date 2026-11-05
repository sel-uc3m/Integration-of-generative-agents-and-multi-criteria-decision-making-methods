= Formulación Matemática de las Metodologías de Decisión <apx:formulacion_matematica>

En este anexo se detalla el desarrollo formal y las ecuaciones matemáticas teóricas correspondientes a los modelos de evaluación y métodos de toma de decisiones multicriterio integrados en el sistema (*ALTUS*, *SIPAC* y *AHP*), las cuales fundamentan el procesamiento algorítmico automatizado descrito en la @sec:solucion:procesamiento.

== Metodología ALTUS <apx:altus_math>

De acuerdo con el modelo de madurez de gobierno del conocimiento propuesto por Sánchez-Segura et al. @sanchez_ALTUS_2020 y formalizado por Dugarte-Peña @dugarte_tesis_2019, la evaluación analiza cincuenta y una capacidades críticas de conocimiento distribuidas en siete dimensiones arquitectónicas y cuatro niveles de madurez.

A partir de las puntuaciones individuales $s_i in \{1, dots, 5\}$ asignadas a cada capacidad en la escala Likert, el modelo establece dos métricas cuantitativas principales:

*1. Puntuación Media por Dimensión:* \
Para cada una de las siete dimensiones arquitectónicas de la organización (como Configuración, Formación, Memoria Transaccional, etc.), el sistema calcula la media aritmética simple de las puntuaciones obtenidas por las capacidades pertenecientes a dicha dimensión según la @eq:anexos:altus:media_dimension:

#figure(
  $ "avg"_d = (sum_(i in "Cap"_d) s_i) / (| "Cap"_d |) $,
  caption: [Puntuación media de una dimensión arquitectónica en ALTUS @sanchez_ALTUS_2020.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:altus:media_dimension>

Donde $"Cap"_d$ es el conjunto de capacidades asociadas a la dimensión arquitectónica $d$, $s_i$ es la puntuación asignada a la capacidad $i$, y $|"Cap"_d|$ es el número total de capacidades que componen dicha dimensión.

*2. Cobertura por Nivel de Madurez (Maturity Level Coverage):* \
Para evaluar en qué grado la organización satisface los requisitos de cada uno de los cuatro niveles de madurez (ML1 a ML4), el modelo define la tasa de cobertura comparando la suma de las puntuaciones obtenidas frente a la puntuación máxima teórica alcanzable en ese nivel ($5$ puntos por capacidad) según la @eq:anexos:altus:cobertura:

#figure(
  $ "Coverage"_L = (sum_(j in "Cap"_L) s_j) / (5 dot | "Cap"_L |) $,
  caption: [Tasa de cobertura para un nivel de madurez en ALTUS @sanchez_ALTUS_2020.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:altus:cobertura>

Donde $"Cap"_L$ es el conjunto de capacidades del nivel de madurez $L$ ($L in \{1, 2, 3, 4\}$), $s_j$ es la puntuación de la capacidad $j$, y el denominador representa el valor óptimo posible. Esta métrica se expresa como porcentaje ($0\%$ a $100\%$) para ilustrar el avance organizativo.

== Metodología SIPAC <apx:sipac_math>

La metodología SIPAC (_Systemic Intangible Process Assets Characterization_) @sanchez_sipac_2017 estructura la evaluación y caracterización estratégica en doce pasos secuenciales. Los Pasos 10, 11 y 12 formalizan computacionalmente la evaluación cuantitativa y los estados de salud de los activos intangibles de conocimiento, cuya modelización matemática se fundamenta en Dugarte-Peña @dugarte_tesis_2019:

*Paso 10.1: Estandarización de Indicadores:* \
Los valores brutos de los indicadores (valor actual medido $X_{"Act"}$ y valor meta de mejora $X_{"Goal"}$) se proyectan al intervalo uniforme $[0, 1]$ en función del sentido de mejora del indicador:
- Si el sentido es $1$ (mayor valor representa mejor desempeño):
#figure(
  $ X' = (X - X_(M I N)) / (X_(M A X) - X_(M I N)) $,
  caption: [Estandarización de indicadores en SIPAC (Sentido = 1) @dugarte_tesis_2019.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:sipac:est1>

- Si el sentido es $-1$ (menor valor representa mejor desempeño):
#figure(
  $ X' = (X - X_(M A X)) / (X_(M A X) - X_(M I N)) dot (-1) $,
  caption: [Estandarización de indicadores en SIPAC (Sentido = -1) @dugarte_tesis_2019.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:sipac:est2>

Donde $X'$ es el valor estandarizado, $X$ es el valor bruto ($X_{"Act"}$ o $X_{"Goal"}$), y $X_(M I N)$ y $X_(M A X)$ definen los límites del rango físico admisible.

*Paso 10.2: Cálculo del Valor Normalizado del Indicador ($X_("NORM")$):* \
A partir de los valores estandarizados ($X'_{"Act"}$, $X'_{"Goal"}$), se obtiene el valor normalizado relativo ($X_("NORM") in [-1, 0]$), evaluando la distancia hacia la meta:
- Si el sentido es $1$:
#figure(
  $ X_("NORM") = (X'_{"Act"} - X'_{"Goal"}) / (X'_{"Goal"}) $,
  caption: [Valor Normalizado del Indicador en SIPAC (Sentido = 1) @dugarte_tesis_2019.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:sipac:gap1>

- Si el sentido es $-1$:
#figure(
  $ X_("NORM") = (X'_{"Act"} - X'_{"Goal"}) / (X'_{"Act"}) $,
  caption: [Valor Normalizado del Indicador en SIPAC (Sentido = -1) @dugarte_tesis_2019.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:sipac:gap2>

*Paso 10.3: Valoración de Calidad, Impacto y Valor Lineal del Activo:* \
Los valores normalizados de los indicadores se desagregan por dimensión para calcular la valoración media normalizada de calidad ($Q_n^("VAL")$, indicadores tipo 1) y de impacto ($I_n^("VAL")$, indicadores tipo 2):
#figure(
  $ Q_n^("VAL") = (sum_(i=1)^q X_i^n) / q \
    I_n^("VAL") = (sum_(i=1)^p X_i^n) / p $,
  caption: [Valoración media normalizada de calidad (Q) e impacto (I) de un activo en SIPAC @dugarte_tesis_2019.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:sipac:calidad_impacto>

Asimismo, el valor lineal del activo intangible $n$ ($"KA"_n^("VAL")$) se obtiene mediante la media agregada de sus $m$ indicadores:
#figure(
  $ "KA"_n^("VAL") = 1/m sum_(i=1)^m X_("NORM")^i $,
  caption: [Valor lineal agregado de un Activo de Conocimiento en SIPAC @dugarte_tesis_2019.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:sipac:ka_val>

Donde $"KA"_n^("VAL") in [-1, 0]$. Por su parte, la importancia relativa del activo ($W_k$) utilizada en la agregación estratégica se deriva de la importancia ordinal asignada por el usuario en el Paso 5 ($"Imp"_k in \{1, dots, 5\}$) normalizada respecto al conjunto de activos: $W_k = "Imp"_k / sum_(j=1)^n "Imp"_j$.

*Paso 11: Caracterización del Activo Intangible según Estados de Salud:* \
Las valoraciones ($Q_n^("VAL")$, $I_n^("VAL")$) se contrastan frente a los umbrales estratégicos configurables e independientes de calidad ($Q_(t h)$) e impacto ($I_(t h)$). El modelo contempla tres casos de caracterización adaptados a la tipología de los indicadores del activo:

- *Caso 1: Calidad e Impacto (bidimensional, 4 estados):*
  - *Activo Estable (Stable):* $I_n^("VAL") >= I_(t h)$ y $Q_n^("VAL") >= Q_(t h)$.
  - *Activo en Evolución (Evolving):* $I_n^("VAL") >= I_(t h)$ y $Q_n^("VAL") < Q_(t h)$.
  - *Activo Reemplazable (Replaceable):* $I_n^("VAL") < I_(t h)$ y $Q_n^("VAL") >= Q_(t h)$.
  - *Activo Nocivo (Warning):* $I_n^("VAL") < I_(t h)$ y $Q_n^("VAL") < Q_(t h)$.

- *Caso 2: Solo Calidad (unidimensional, 2 estados):*
  - *Activo de Calidad Aceptable:* $Q_n^("VAL") >= Q_(t h)$.
  - *Activo de Calidad Insuficiente:* $Q_n^("VAL") < Q_(t h)$.

- *Caso 3: Solo Impacto (unidimensional, 2 estados):*
  - *Activo de Impacto Aceptable:* $I_n^("VAL") >= I_(t h)$.
  - *Activo de Impacto Insuficiente:* $I_n^("VAL") < I_(t h)$.

*Paso 12: Valoración de Consecución del Objetivo Estratégico ($"SG"_("VAL")$):* \
La valoración cuantitativa de la consecución del objetivo de negocio se calcula agregando los valores lineales de todos los activos ponderados por su peso relativo ($W_k$):
#figure(
  $ "SG"_("VAL") = sum_(k=1)^n W_k dot "KA"_k^("VAL") $,
  caption: [Valoración de consecución del objetivo estratégico en función de los intangibles @dugarte_tesis_2019.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:sipac:objetivo>

== Método AHP (Analytic Hierarchy Process) <apx:ahp_math>

El método AHP @AHP_2001 estructura la toma de decisiones multicriterio a través de comparaciones pareadas jerárquicas:

*1. Matriz de Comparaciones Pareadas y Vector de Prioridades:* \
A partir de la matriz pareada $A = (a_(i j))_(n times n)$ construida mediante la escala fundamental de Saaty (1–9), el vector de prioridades $bold(w)$ se obtiene por normalización de columnas:
#figure(
  $ w_i = 1/n sum_(j=1)^n a_(i j) / (sum_(k=1)^n a_(k j)) $,
  caption: [Cálculo del vector de prioridades (pesos) en AHP @AHP_2001.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:ahp:pesos>

*2. Estimación del Autovalor Máximo ($lambda_("max"$):* \
Se calcula promediando el cociente entre el vector de consistencia $A bold(w)$ y el vector de prioridades $bold(w)$:
#figure(
  $ lambda_("max") = 1/n sum_(i=1)^n (sum_(j=1)^n a_(i j) dot w_j) / w_i $,
  caption: [Estimación del autovalor máximo en AHP @AHP_2001.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:ahp:lambda>

*3. Índice de Consistencia ("CI") y Ratio de Consistencia ("CR"):* \
El índice de consistencia ("CI") mide la desviación de la transitividad:
#figure(
  $ "CI" = (lambda_("max") - n) / (n - 1) $,
  caption: [Cálculo del índice de consistencia en AHP @AHP_2001.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:ahp:ci>

El ratio de consistencia ("CR") se obtiene dividiendo "CI" entre el índice de consistencia aleatoria tabulado ("RI"):
#figure(
  $ "CR" = "CI" / "RI" $,
  caption: [Cálculo del ratio de consistencia en AHP @AHP_2001.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:ahp:cr>

La matriz se valida como consistente si $"CR"$ no supera los umbrales de tolerancia de Saaty: $0.05$ para $n=3$, $0.09$ para $n=4$, y $0.10$ para $n >= 5$.

*4. Puntuación Global Ponderada:* \
La puntuación final de cada alternativa $i$ se obtiene ponderando su desempeño bajo cada criterio $j$ por el peso de dicho criterio:
#figure(
  $ "score"_i = sum_(j=1)^m w^"crit"_j dot w^"alt"_(i,j) $,
  caption: [Puntuación global ponderada de alternativas en AHP @AHP_2001.],
  kind: "equation",
  supplement: [Ecuación],
) <eq:anexos:ahp:final>


= Tablas Detalladas de la Evaluación Experimental <apx:eval_tablas>
#import "eval_analysis.typ": altus-summary-table, sipac-summary-table, ahp-summary-table

En este anexo se recopila de forma exhaustiva el registro cuantitativo completo de las métricas obtenidas por los modelos evaluados en los casos de test a ciegas para las metodologías *ALTUS*, *SIPAC* y *AHP*. Estas tablas proporcionan el soporte numérico formal y el registro de reproducibilidad para las figuras analíticas presentadas en el @sec:evaluacion.

== Métricas Detalladas en ALTUS <apx:eval:altus>
La @fig:apx:eval:altus_tabla recoge el registro cuantitativo exhaustivo de la evaluación en ALTUS para cada modelo y caso de prueba a ciegas. Además de las métricas principales de desempeño diagnóstico (*Acc*, *MAE*), eficacia extractiva (*Hit Rate*) y calidad de indagación (*Calidad*) descritas en el @sec:evaluacion:altus:metricas, la tabla incorpora las siguientes variables operacionales y de control del diálogo:

- *Redundancia (Redund. / Over-asking):* Proporción de repreguntas que solicitan información técnica que ya había sido revelada previamente por el interlocutor ($frac(|"Over-asking"|, N_"followups")$).
- *Parada Prematura (Parada P. / Premature Stop):* Proporción de capacidades organizacionales evaluadas de forma directa sin emitir ninguna pregunta de seguimiento ($frac(|"Premature Stop"|, N_"capacidades")$).
- *Turnos:* Número medio de turnos conversacionales de interacción requeridos por capacidad evaluada, donde la formulación de la pregunta base inicial representa el valor basal de $1$ turno y cada repregunta de seguimiento (_follow-up_) incrementa la cuenta sucesivamente.

#altus-summary-table() <fig:apx:eval:altus_tabla>

== Métricas Detalladas en SIPAC <apx:eval:sipac>
La @fig:apx:eval:sipac_tabla detalla el rendimiento en deducción semántica ponderada (_Weighted F1_) obtenido en cada una de las etapas del pipeline de SIPAC bajo _Teacher Forcing_.

#sipac-summary-table() <fig:apx:eval:sipac_tabla>

== Métricas Detalladas en AHP <apx:eval:ahp>
La @fig:apx:eval:ahp_tabla detalla las puntuaciones de calidad asignadas por el juez LLM sobre las cuatro dimensiones analíticas del soporte a la decisión y priorización en AHP.

#ahp-summary-table() <fig:apx:eval:ahp_tabla>
