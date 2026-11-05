#import "@preview/lilaq:0.5.0" as lq

// 1. Carga de datos de evaluación
#let eval-raw = json("/core/results/evaluations/eval_report_latest.json")

// 2. Definición estructurada de modelos a incluir en el análisis
#let local-models = (
  (
    id: "gemma4:e4b-mlx",
    name: "Gemma4 E4B",
    tag: "Gemma4 E4B (4B)",
    size: "4B",
    deploy: "Local Ollama",
  ),
  (
    id: "deepseek-r1:7b",
    name: "DeepSeekR1",
    tag: "DeepSeekR1 (7B)",
    size: "7B",
    deploy: "Local Ollama",
  ),
  (
    id: "ornith:9b",
    name: "Ornith 9B",
    tag: "Ornith (9B)",
    size: "9B",
    deploy: "Local Ollama",
  ),
)

#let cloud-models = (
  (
    id: "google/gemma-4-31b-it",
    name: "Gemma4 31B",
    tag: "Gemma4 31B (Cloud)",
    size: "31B",
    deploy: "Cloud API",
  ),
  (
    id: "meta/muse-glimmer-30b",
    name: "Muse Glimmer 30B",
    tag: "Muse Glimmer 30B (Cloud)",
    size: "30B",
    deploy: "Cloud API",
  ),
  (
    id: "qwen/qwen3.8-27b",
    name: "Qwen 3.8 27B",
    tag: "Qwen 3.8 27B (Cloud)",
    size: "27B",
    deploy: "Cloud API",
  ),
  (
    id: "google/gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    tag: "Gemini 3.7 Flash (Cloud)",
    size: "~300B",
    deploy: "Cloud API",
  ),
)

#let all-models = local-models + cloud-models

// ===================================================
// PALETA CROMÁTICA GLOBAL (Nativa Lilaq: Okabe & Ito)
// Estándar científico universal accesible a daltonismo
// ===================================================

#let okabe = lq.color.map.okabe-ito

// Paleta cualitativa para identificación unívoca de modelos (7 modelos = 7 tonos Okabe-Ito)
#let palette-models = (
  "gemma4:e4b-mlx":          okabe.at(0), // Azul marino
  "deepseek-r1:7b":          okabe.at(1), // Naranja cálido
  "ornith:9b":               okabe.at(2), // Verde azulado
  "google/gemma-4-31b-it":   okabe.at(3), // Rosa rojizo
  "meta/muse-glimmer-30b":   okabe.at(4), // Azul cielo
  "qwen/qwen3.8-27b":        okabe.at(5), // Bermellón / Teja
  "google/gemini-3.7-flash": okabe.at(6), // Amarillo ocre
)
#let model-colors-list = okabe

// Paleta semántica para fases y metodologías del pipeline
#let palette-phases = (
  altus: okabe.at(0), // Azul (ALTUS: Diagnóstico / Diálogo)
  sipac: okabe.at(2), // Verde azulado (SIPAC: Deducción Semántica)
  ahp:   okabe.at(1), // Naranja (AHP: Priorización Multicriterio)
)

// Paleta para dimensiones semánticas de SIPAC
#let palette-sipac-dims = (
  gia: okabe.at(0), // Azul
  act: okabe.at(3), // Rosa rojizo
  ci:  okabe.at(1), // Naranja cálido
  art: okabe.at(4), // Azul cielo
  ind: okabe.at(2), // Verde azulado
)

// Paleta de métricas, diagnóstico y elementos de soporte
#let palette-metrics = (
  accuracy:   okabe.at(0), // Azul (Precisión diagnóstica)
  mae:        okabe.at(5), // Bermellón (Error absoluto medio)
  precision:  okabe.at(0), // Azul (Weighted Precision)
  recall:     okabe.at(2), // Verde azulado (Weighted Recall)
  f1:         okabe.at(5), // Bermellón (Weighted F1)
  f1-border:  okabe.at(1), // Naranja dorado de contraste
  ahp-rel:    okabe.at(0), // Adaptación Contextual
  ahp-non:    okabe.at(2), // Ortogonalidad
  ahp-comp:   okabe.at(1), // Completitud
  ahp-just:   okabe.at(3), // Racionalidad de Justificación
  baseline:   rgb("#64748b"), // Gris pizarra para referencias base
  zone-opt:   okabe.at(2).transparentize(85%), // Verde translúcido para zonas óptimas
  subtext:    rgb("#64748b"), // Texto secundario / metadata
  table-alt:  rgb("#f1f5f9"), // Fondo de fila agregada (Media Global)
)

// ===================================================
// Traducción
// ===================================================

#let i18n = (
  es: (
    local-ollama: "Local Ollama",
    cloud-api: "Cloud API",

    // ALTUS Accuracy & MAE
    altus-acc-title: "(a) Accuracy",
    altus-mae-title: "(b) Error Absoluto Medio (MAE)",
    altus-acc-ylabel: "% Accuracy",
    altus-mae-ylabel: "Desviación de Calificación (0-5)",
    altus-acc-baseline: "Azar (16.7%)",
    altus-mae-baseline: "Azar (1.94)",
    altus-acc-mae-caption: [Evaluación diagnóstica (Accuracy y MAE) en ALTUS frente a la línea base aleatoria.],

    // ALTUS Tradeoff Bubble Scatter
    altus-tradeoff-title: [Eficacia Extractiva vs. Error Diagnóstico (MAE) en ALTUS],
    altus-tradeoff-subtitle: [(El tamaño de la burbuja y el valor numérico indican la Calidad Media de Repregunta: Rúbrica 0 a 3 pts)],
    altus-tradeoff-xlabel: "Eficacia Extractiva / Hit Rate (%)",
    altus-tradeoff-ylabel: "Error Absoluto Medio (MAE)",
    altus-tradeoff-caption: [Eficacia extractiva (Hit Rate) frente a error diagnóstico (MAE) en ALTUS.],
    altus-tradeoff-scale-title: [*Escala de Calidad (Rúbrica 0 a 3 pts):*],
    altus-tradeoff-scale-0: [*0.0* (Sin avance)],
    altus-tradeoff-scale-1: [*1.5* (Genérica)],
    altus-tradeoff-scale-3: [*3.0* (Excelente)],

    // SIPAC F1
    sipac-f1-title: [Weighted F1 por Dimensión Semántica en SIPAC],
    sipac-f1-ylabel: [Weighted F1],
    sipac-f1-gia: "GIA",
    sipac-f1-act: "Activos",
    sipac-f1-ci: "CI",
    sipac-f1-art: "Artefactos",
    sipac-f1-ind: "Indicadores",
    sipac-f1-caption: [Weighted F1 por dimensión en las fases de inferencia de SIPAC.],

    // SIPAC Precision & Recall
    sipac-pr-title: [Balance de Precision, Recall y F1 Global en SIPAC],
    sipac-pr-ylabel: [% Ponderado],
    sipac-pr-prec: "Weighted Precision",
    sipac-pr-rec: "Weighted Recall",
    sipac-pr-f1: [Weighted $F_1$ Global],
    sipac-pr-caption: [Balance de Precision, Recall y $F_1$ ponderado por modelo en SIPAC.],

    // SIPAC Scatter Tradeoff (Precision & Recall vs. Poda)
    sipac-scatter-a-title: "(a) Precision vs. Tasa de Poda",
    sipac-scatter-b-title: "(b) Recall vs. Tasa de Poda",
    sipac-scatter-xlabel: "Tasa de Poda por Embeddings (%)",
    sipac-scatter-a-ylabel: "Weighted Precision (%)",
    sipac-scatter-b-ylabel: "Weighted Recall (%)",
    sipac-scatter-caption: [Impacto de la tasa de poda semántica en Precision y Recall en SIPAC.],
    sipac-heatmap-caption: [Tasa de descarte por filtrado vectorial previo ($"sim" < 0.35$) por modelo y fase en SIPAC.],

    // AHP Scores
    ahp-scores-title: [Dimensiones de Calidad en Soporte a la Decisión AHP (Barras Apiladas 0-12 pts)],
    ahp-scores-ylabel: [Puntuación acumulada (0-12 pts)],
    ahp-scores-rel: "Adaptación Contextual",
    ahp-scores-non: "Ortogonalidad",
    ahp-scores-comp: "Completitud",
    ahp-scores-just: "Racionalidad de Justificación",
    ahp-scores-caption: [Puntuación acumulada y desglose dimensional de calidad en AHP.],

    // AHP Consistency vs Justification
    ahp-consistency-title: [Consistencia Matemática ($"CR"$) vs. Racionalidad de la Justificación en AHP],
    ahp-consistency-subtitle: [(El tamaño de la burbuja y el valor numérico indican la Puntuación Total en AHP: Rúbrica 0 a 12 pts)],
    ahp-consistency-xlabel: [Razón de Consistencia Media ($"CR"$) de Saaty],
    ahp-consistency-ylabel: [Racionalidad de Justificación (0 a 3 pts)],
    ahp-consistency-zone: [Zona Consistente ($"CR" <= 0.10$)],
    ahp-consistency-saaty: [Umbral Saaty ($"CR" = 0.10$)],
    ahp-consistency-caption: [Razón de Consistencia ($"CR"$) frente a solidez del juicio pareado en AHP.],

    // Local models time
    local-time-title: [Tiempo de Ejecución Acumulado por Metodología en Modelos Locales],
    local-time-xlabel: [Tiempo Medio por Caso (minutos)],
    local-time-altus: [ALTUS (Entrevista e Indagación)],
    local-time-sipac: [SIPAC (Cadena Semántica)],
    local-time-ahp: [AHP (Criterios de Priorización)],
    local-time-caption: [Tiempo de ejecución acumulado por metodología en inferencia local.],

    // Tables
    global-tbl-model: "Modelo",
    global-tbl-deploy: "Despliegue",
    global-tbl-altus-acc: "ALTUS Acc",
    global-tbl-sipac-f1: "SIPAC F1",
    global-tbl-ahp-score: "AHP Score",
    global-tbl-total-time: "Tiempo Total",
    global-tbl-caption: [Síntesis comparativa global de rendimiento y tiempo medio por modelo.],
  ),
  en: (
    local-ollama: "Local Ollama",
    cloud-api: "Cloud API",

    // ALTUS Accuracy & MAE
    altus-acc-title: "(a) Accuracy",
    altus-mae-title: "(b) Mean Absolute Error (MAE)",
    altus-acc-ylabel: "% Accuracy",
    altus-mae-ylabel: "Score Deviation (0-5)",
    altus-acc-baseline: "Random (16.7%)",
    altus-mae-baseline: "Random (1.94)",
    altus-acc-mae-caption: [Diagnostic evaluation (Accuracy and MAE) in ALTUS compared to random baseline.],

    // ALTUS Tradeoff Bubble Scatter
    altus-tradeoff-title: [Extractive Efficiency vs. Diagnostic Error (MAE) in ALTUS],
    altus-tradeoff-subtitle: [(Bubble size and numerical value indicate Average Follow-up Quality: 0 to 3 Rubric pts)],
    altus-tradeoff-xlabel: "Extractive Efficiency / Hit Rate (%)",
    altus-tradeoff-ylabel: "Mean Absolute Error (MAE)",
    altus-tradeoff-caption: [Extractive Efficiency (Hit Rate) vs. Mean Absolute Error (MAE) in ALTUS.],
    altus-tradeoff-scale-title: [*Quality Scale (0 to 3 Rubric pts):*],
    altus-tradeoff-scale-0: [*0.0* (No progress)],
    altus-tradeoff-scale-1: [*1.5* (Generic)],
    altus-tradeoff-scale-3: [*3.0* (Excellent)],

    // SIPAC F1
    sipac-f1-title: [Weighted F1 by Semantic Dimension in SIPAC],
    sipac-f1-ylabel: [Weighted F1],
    sipac-f1-gia: "GIA",
    sipac-f1-act: "Intangible Assets",
    sipac-f1-ci: "CI",
    sipac-f1-art: "Tech Artifacts",
    sipac-f1-ind: "Indicators",
    sipac-f1-caption: [Weighted F1 by dimension across SIPAC inference stages.],

    // SIPAC Precision & Recall
    sipac-pr-title: [Precision, Recall, and Overall F1 Trade-off in SIPAC],
    sipac-pr-ylabel: [Weighted %],
    sipac-pr-prec: "Weighted Precision",
    sipac-pr-rec: "Weighted Recall",
    sipac-pr-f1: [Overall Weighted $F_1$],
    sipac-pr-caption: [Precision, Recall, and overall $F_1$ trade-off per model in SIPAC.],

    // SIPAC Scatter Tradeoff (Precision & Recall vs. Pruning)
    sipac-scatter-a-title: "(a) Precision vs. Pruning Rate",
    sipac-scatter-b-title: "(b) Recall vs. Pruning Rate",
    sipac-scatter-xlabel: "Embedding Pruning Rate (%)",
    sipac-scatter-a-ylabel: "Weighted Precision (%)",
    sipac-scatter-b-ylabel: "Weighted Recall (%)",
    sipac-scatter-caption: [Impact of semantic pruning rate on Precision and Recall in SIPAC.],
    sipac-heatmap-caption: [Semantic pruning rate per model and phase in SIPAC.],

    // AHP Scores
    ahp-scores-title: [AHP Decision Support Quality Dimensions (Stacked Bars 0-12 pts)],
    ahp-scores-ylabel: [Cumulative Score (0-12 pts)],
    ahp-scores-rel: "Contextual Adaptation",
    ahp-scores-non: "Orthogonality",
    ahp-scores-comp: "Completeness",
    ahp-scores-just: "Justification Rationality",
    ahp-scores-caption: [Cumulative score and dimensional breakdown of decision quality in AHP.],

    // AHP Consistency vs Justification
    ahp-consistency-title: [Mathematical Consistency ($"CR"$) vs. Justification Rationality in AHP],
    ahp-consistency-subtitle: [(Bubble size and numerical value indicate Total AHP Score: 0 to 12 Rubric pts)],
    ahp-consistency-xlabel: [Average Saaty Consistency Ratio ($"CR"$)],
    ahp-consistency-ylabel: [Justification Rationality (0 to 3 pts)],
    ahp-consistency-zone: [Consistent Zone ($"CR" <= 0.10$)],
    ahp-consistency-saaty: [Saaty Threshold ($"CR" = 0.10$)],
    ahp-consistency-caption: [Consistency Ratio ($"CR"$) vs. pairwise justification depth in AHP.],

    // Local models time
    local-time-title: [Cumulative Execution Time by Methodology on Local Models],
    local-time-xlabel: [Mean Time per Case (minutes)],
    local-time-altus: [ALTUS (Interview & Inquiry)],
    local-time-sipac: [SIPAC (Semantic Chain)],
    local-time-ahp: [AHP (Prioritization Criteria)],
    local-time-caption: [Cumulative execution time by methodology on local models.],

    // Tables
    global-tbl-model: "Model",
    global-tbl-deploy: "Deployment",
    global-tbl-altus-acc: "ALTUS Acc",
    global-tbl-sipac-f1: "SIPAC F1",
    global-tbl-ahp-score: "AHP Score",
    global-tbl-total-time: "Total Time",
    global-tbl-caption: [Global comparative synthesis of performance and average runtime per model.],
  ),
)

// 3. Funciones auxiliares de cálculo y agregación
#let get-blind-cases(model-id) = {
  eval-raw.results.filter(r => r.modelName == model-id and r.at("isPilot", default: false) == false)
}

#let avg(list) = {
  let valid = list.filter(v => v != none)
  if valid.len() == 0 { 0.0 } else { valid.sum() / valid.len() }
}

#let fmt-dec(val, d: 3) = {
  if val == none { "---" } else {
    let r = calc.round(val, digits: d)
    let s = str(r)
    if d > 0 {
      let parts = s.split(".")
      if parts.len() == 1 {
        s = s + "." + ("0" * d)
      } else {
        let dec = parts.at(1)
        if dec.len() < d {
          s = s + ("0" * (d - dec.len()))
        }
      }
    }
    s
  }
}

#let fmt-pct(val) = {
  if val == none { "---" } else {
    let r = calc.round(val * 100, digits: 1)
    let s = str(r)
    let parts = s.split(".")
    if parts.len() == 1 {
      s = s + ".0%"
    } else {
      s = s + "%"
    }
    s
  }
}

#let fmt-h(ms) = {
  if ms == none or ms == 0 { "---" } else { str(calc.round(ms / 3600000, digits: 2)) + " h" }
}

#let fmt-min(ms) = {
  if ms == none or ms == 0 { "---" } else { str(calc.round(ms / 60000, digits: 1)) + " min" }
}

// 4. Extracción de métricas agregadas por proceso

#let get-altus-metrics(model-id) = {
  let cases = get-blind-cases(model-id).filter(r => "altus" in r and r.altus.at("accuracy", default: none) != none)
  let validFollowUps = cases.filter(r => r.altus.at("agenticHitRate", default: r.altus.at("hitRate", default: none)) != none)
  let totalFollowUps = cases.map(r => r.altus.at("totalFollowUps", default: 0)).sum()
  (
    count: cases.len(),
    totalFollowUps: totalFollowUps,
    accuracy: avg(cases.map(r => r.altus.at("accuracy", default: none))),
    mae: avg(cases.map(r => r.altus.at("mae", default: none))),
    hitRate: if validFollowUps.len() > 0 {
      avg(validFollowUps.map(r => r.altus.at("agenticHitRate", default: r.altus.at("hitRate", default: none))))
    } else { 0.0 },
    redRate: avg(cases.map(r => r.altus.at("redundancyRate", default: none))),
    premRate: avg(cases.map(r => {
      let turns = r.altus.at("turnsEvaluated", default: ())
      if turns.len() == 0 {
        let premCount = r.altus.at("prematureStopCount", default: none)
        if premCount != none { premCount / 51.0 } else { 0.0 }
      } else {
        let premStops = turns.filter(t => t.at("followUpsAsked", default: 0) == 0).len()
        premStops / turns.len()
      }
    })),
    quality: avg(cases.map(r => r.altus.at("averageFollowUpQuality", default: none))),
    turns: avg(cases.map(r => r.altus.at("averageTurnCount", default: r.altus.at("averageTurnsPerQuestion", default: none)))),
    timeMs: avg(cases.map(r => r.altus.at("executionTimeMs", default: 0))),
  )
}

#let get-altus-avg-turns() = {
  let turns = all-models.map(m => get-altus-metrics(m.id).turns)
  fmt-dec(avg(turns), d: 2)
}

#let get-sipac-metrics(model-id) = {
  let cases = get-blind-cases(model-id).filter(r => "sipac" in r and r.sipac.at("overallF1", default: none) != none)
  (
    count: cases.len(),
    overallF1: avg(cases.map(r => r.sipac.at("overallF1", default: none))),
    overallPrecision: avg(cases.map(r => {
      let s = r.sipac
      let p-vals = ("giaMetrics", "activoIntangibleMetrics", "intellectusCiMetrics", "artefactosMetrics", "indicadoresMetrics").map(k => s.at(k, default: (:)).at("precision", default: 0.0))
      avg(p-vals)
    })),
    overallRecall: avg(cases.map(r => {
      let s = r.sipac
      let r-vals = ("giaMetrics", "activoIntangibleMetrics", "intellectusCiMetrics", "artefactosMetrics", "indicadoresMetrics").map(k => s.at(k, default: (:)).at("recall", default: 0.0))
      avg(r-vals)
    })),
    giaF1: avg(cases.map(r => r.sipac.at("giaMetrics", default: (:)).at("f1", default: none))),
    actF1: avg(cases.map(r => r.sipac.at("activoIntangibleMetrics", default: (:)).at("f1", default: none))),
    ciF1: avg(cases.map(r => r.sipac.at("intellectusCiMetrics", default: (:)).at("f1", default: none))),
    artF1: avg(cases.map(r => r.sipac.at("artefactosMetrics", default: (:)).at("f1", default: none))),
    indF1: avg(cases.map(r => r.sipac.at("indicadoresMetrics", default: (:)).at("f1", default: none))),
    timeMs: avg(cases.map(r => r.sipac.at("executionTimeMs", default: 0))),
  )
}

#let get-ahp-metrics(model-id) = {
  let cases = get-blind-cases(model-id).filter(r => "ahp" in r and r.ahp.at("normalizedScore", default: none) != none)
  (
    count: cases.len(),
    normScore: avg(cases.map(r => r.ahp.at("normalizedScore", default: none))),
    cr: avg(cases.map(r => r.ahp.at("consistencyRatio", default: none))),
    relevance: avg(cases.map(r => r.ahp.at("relevanceScore", default: none))),
    nonOverlap: avg(cases.map(r => r.ahp.at("nonOverlapScore", default: none))),
    completeness: avg(cases.map(r => r.ahp.at("completenessScore", default: none))),
    justification: avg(cases.map(r => r.ahp.at("justificationScore", default: none))),
    timeMs: avg(cases.map(r => r.ahp.at("executionTimeMs", default: 0))),
  )
}


// ==========================================
// 5. GENERADORES DE TABLAS (Estilo Booktabs)
// ==========================================

#let case-label(caseId) = {
  if caseId == "G2_empresa_b" { "G2: Empresa B" }
  else if caseId == "G3_empresa_c" { "G3: Empresa C" }
  else if caseId == "G4_empresa_d" { "G4: Empresa D" }
  else { caseId }
}

#let get-altus-case-metrics(r) = {
  let a = r.altus
  let turns = a.at("turnsEvaluated", default: ())
  let premRate = if turns.len() == 0 {
    let premCount = a.at("prematureStopCount", default: none)
    if premCount != none { premCount / 51.0 } else { 0.0 }
  } else {
    let premStops = turns.filter(t => t.at("followUpsAsked", default: 0) == 0).len()
    premStops / turns.len()
  }
  let totalFollowUps = a.at("totalFollowUps", default: 0)
  (
    caseId: r.caseId,
    companyName: r.companyName,
    accuracy: a.at("accuracy", default: none),
    mae: a.at("mae", default: none),
    hitRate: if totalFollowUps > 0 { a.at("agenticHitRate", default: a.at("hitRate", default: 0.0)) } else { 0.0 },
    redRate: a.at("redundancyRate", default: 0.0),
    premRate: premRate,
    quality: if totalFollowUps > 0 { a.at("averageFollowUpQuality", default: none) } else { 0.0 },
    turns: a.at("averageTurnCount", default: a.at("averageTurnsPerQuestion", default: none)),
    totalFollowUps: totalFollowUps,
  )
}

#let altus-summary-table() = {
  let all-mets = all-models.map(m => (
    m: m,
    globalMet: get-altus-metrics(m.id),
    caseMets: get-blind-cases(m.id).filter(r => "altus" in r).map(r => get-altus-case-metrics(r)),
  ))

  figure(
    {
      set text(size: 7.5pt)
      set table(inset: (x: 2.5pt, y: 3pt))
      table(
        columns: (2.1cm, 2.0cm, 1.0cm, 1.0cm, 1.6cm, 1.4cm, 1.6cm, 1.4cm, 1.2cm),
        align: (left, left, center, center, center, center, center, center, center),
        table.header(
          [*Modelo*], [*Caso*], [*Acc*], [*MAE*], [*Hit Rate*], [*Redund.*], [*Parada P.*], [*Calidad*], [*Turnos*],
        ),
        ..all-mets.map(x => {
          let m = x.m
          let gm = x.globalMet
          let is-few-global = gm.totalFollowUps <= 1

          let sorted-cases = ("G2_empresa_b", "G3_empresa_c", "G4_empresa_d").map(cid => {
            let found = x.caseMets.filter(c => c.caseId == cid)
            if found.len() > 0 { found.first() } else { none }
          }).filter(c => c != none)

          let rows = ()
          // Celda agrupada del modelo
          rows.push(table.cell(rowspan: sorted-cases.len() + 1, align: left + horizon)[
            *#m.name* \
            #text(size: 6.5pt, fill: palette-metrics.subtext)[#m.deploy]
          ])

          // Filas por cada caso de prueba
          for c in sorted-cases {
            let is-few = c.totalFollowUps <= 1
            rows.push([#case-label(c.caseId)])
            rows.push([#fmt-pct(c.accuracy)])
            rows.push([#fmt-dec(c.mae, d: 3)])
            rows.push([#fmt-pct(c.hitRate)#if is-few [ $""^*$]])
            rows.push([#fmt-pct(c.redRate)#if is-few [ $""^*$]])
            rows.push([#fmt-pct(c.premRate)])
            rows.push([#fmt-dec(c.quality, d: 2)#if is-few [ $""^*$]])
            rows.push([#fmt-dec(c.turns, d: 2)])
          }

          // Fila agregada de Media Global
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 8.2pt)[*Media Global*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 8.2pt)[*#fmt-pct(gm.accuracy)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 8.2pt)[*#fmt-dec(gm.mae, d: 3)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 8.2pt)[*#fmt-pct(gm.hitRate)*#if is-few-global [ $""^*$]]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 8.2pt)[*#fmt-pct(gm.redRate)*#if is-few-global [ $""^*$]]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 8.2pt)[*#fmt-pct(gm.premRate)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 8.2pt)[*#fmt-dec(gm.quality, d: 2)*#if is-few-global [ $""^*$]]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 8.2pt)[*#fmt-dec(gm.turns, d: 2)*]])

          rows
        }).join(),
      )
      v(3pt)
      align(left)[
        #set text(size: 7.2pt)
        $""^*$ *Nota metodológica sobre casos con escasa o nula interacción:* Cuando el modelo incurre en parada prematura generalizada (por ejemplo, *Gemma4 31B* en G2 y G4 con $100\%$ de parada prematura), las métricas del proceso conversacional (_Hit Rate_, _Redundancia_ y _Calidad_) se calculan sobre $0$ o $1$ repregunta, constituyendo un artefacto estadístico de la falta de interacción.
      ]
    },
    caption: [Métricas detalladas de diagnóstico y diálogo conversacional en ALTUS.],
  )
}

#let get-sipac-case-metrics(r) = {
  let s = r.sipac
  (
    caseId: r.caseId,
    companyName: r.companyName,
    overallF1: s.at("overallF1", default: none),
    giaF1: s.at("giaMetrics", default: (:)).at("f1", default: none),
    actF1: s.at("activoIntangibleMetrics", default: (:)).at("f1", default: none),
    ciF1: s.at("intellectusCiMetrics", default: (:)).at("f1", default: none),
    artF1: s.at("artefactosMetrics", default: (:)).at("f1", default: none),
    indF1: s.at("indicadoresMetrics", default: (:)).at("f1", default: none),
  )
}

#let sipac-summary-table() = {
  let all-mets = all-models.map(m => (
    m: m,
    globalMet: get-sipac-metrics(m.id),
    caseMets: get-blind-cases(m.id).filter(r => "sipac" in r).map(r => get-sipac-case-metrics(r)),
  ))

  figure(
    {
      set text(size: 7.2pt)
      set table(inset: (x: 2.8pt, y: 3pt))
      table(
        columns: (2.5cm, 2.3cm, 1.5cm, 1.4cm, 1.4cm, 1.4cm, 1.4cm, 1.4cm),
        align: (left, left, center, center, center, center, center, center),
        table.header(
          [*Modelo*], [*Caso*], [*F1 Global*], [*F1 GIA*], [*F1 Activos*], [*F1 CI*], [*F1 Artef.*], [*F1 Indic.*],
        ),
        ..all-mets.map(x => {
          let m = x.m
          let gm = x.globalMet

          let sorted-cases = ("G2_empresa_b", "G3_empresa_c", "G4_empresa_d").map(cid => {
            let found = x.caseMets.filter(c => c.caseId == cid)
            if found.len() > 0 { found.first() } else { none }
          }).filter(c => c != none)

          let rows = ()
          // Celda agrupada del modelo
          rows.push(table.cell(rowspan: sorted-cases.len() + 1, align: left + horizon)[
            *#m.name* \
            #text(size: 6.2pt, fill: palette-metrics.subtext)[#m.deploy]
          ])

          // Filas por cada caso de prueba
          for c in sorted-cases {
            rows.push([#case-label(c.caseId)])
            rows.push([#fmt-dec(c.overallF1, d: 3)])
            rows.push([#fmt-dec(c.giaF1, d: 3)])
            rows.push([#fmt-dec(c.actF1, d: 3)])
            rows.push([#fmt-dec(c.ciF1, d: 3)])
            rows.push([#fmt-dec(c.artF1, d: 3)])
            rows.push([#fmt-dec(c.indF1, d: 3)])
          }

          // Fila agregada de Media Global
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*Media Global*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#fmt-dec(gm.overallF1, d: 3)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#fmt-dec(gm.giaF1, d: 3)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#fmt-dec(gm.actF1, d: 3)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#fmt-dec(gm.ciF1, d: 3)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#fmt-dec(gm.artF1, d: 3)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#fmt-dec(gm.indF1, d: 3)*]])

          rows
        }).join(),
      )
    },
    caption: [Métricas detalladas de deducción semántica (Weighted F1) en SIPAC.],
  )
}

#let get-sipac-pruning-stats(model-id) = {
  let runs = get-blind-cases(model-id).filter(r => "sipac" in r)
  let get-field-stat(f-key) = {
    let tot = 0
    let filt = 0
    for r in runs {
      let m = r.sipac.at(f-key, default: (:))
      let pairs = m.at("matchedPairs", default: ())
      for p in pairs {
        tot += 1
        if not p.at("evaluatedByLLM", default: false) {
          filt += 1
        }
      }
    }
    (
      tot: tot,
      filt: filt,
      rate: if tot > 0 { (filt / tot) * 100 } else { 0.0 },
    )
  }

  let gia = get-field-stat("giaMetrics")
  let act = get-field-stat("activoIntangibleMetrics")
  let ci = get-field-stat("intellectusCiMetrics")
  let art = get-field-stat("artefactosMetrics")
  let ind = get-field-stat("indicadoresMetrics")
  let tot-global = gia.tot + act.tot + ci.tot + art.tot + ind.tot
  let filt-global = gia.filt + act.filt + ci.filt + art.filt + ind.filt
  let global = (
    tot: tot-global,
    filt: filt-global,
    rate: if tot-global > 0 { (filt-global / tot-global) * 100 } else { 0.0 },
  )

  (gia: gia, act: act, ci: ci, art: art, ind: ind, global: global)
}

#let heatmap-tint(rate) = {
  let t = calc.min(calc.max(rate / 100.0, 0.0), 1.0)
  if t <= 0.4 {
    let f = t / 0.4
    // 0%: white -> 40%: soft cream amber (#fef3c7)
    let r = int(255 - f * (255 - 254))
    let g = int(255 - f * (255 - 243))
    let b = int(255 - f * (255 - 199))
    rgb(r, g, b)
  } else if t <= 0.75 {
    let f = (t - 0.4) / 0.35
    // 40%: #fef3c7 -> 75%: soft warm orange (#fed7aa)
    let r = int(254 - f * (254 - 254))
    let g = int(243 - f * (243 - 215))
    let b = int(199 - f * (199 - 170))
    rgb(r, g, b)
  } else {
    let f = (t - 0.75) / 0.25
    // 75%: #fed7aa -> 100%: soft rose coral (#fca5a5)
    let r = int(254 - f * (254 - 252))
    let g = int(215 - f * (215 - 165))
    let b = int(170 - f * (170 - 165))
    rgb(r, g, b)
  }
}

#let sipac-pruning-heatmap-table(lang: "es", show-caption: true) = {
  let tr = i18n.at(lang, default: i18n.es)
  let stats = all-models.map(m => (
    m: m,
    st: get-sipac-pruning-stats(m.id),
  ))

  // Totales agregados
  let tot-gia = 0; let filt-gia = 0
  let tot-act = 0; let filt-act = 0
  let tot-ci = 0; let filt-ci = 0
  let tot-art = 0; let filt-art = 0
  let tot-ind = 0; let filt-ind = 0
  let tot-all = 0; let filt-all = 0

  for x in stats {
    tot-gia += x.st.gia.tot; filt-gia += x.st.gia.filt
    tot-act += x.st.act.tot; filt-act += x.st.act.filt
    tot-ci += x.st.ci.tot; filt-ci += x.st.ci.filt
    tot-art += x.st.art.tot; filt-art += x.st.art.filt
    tot-ind += x.st.ind.tot; filt-ind += x.st.ind.filt
    tot-all += x.st.global.tot; filt-all += x.st.global.filt
  }

  let avg-gia-rate = if tot-gia > 0 { (filt-gia / tot-gia) * 100 } else { 0.0 }
  let avg-act-rate = if tot-act > 0 { (filt-act / tot-act) * 100 } else { 0.0 }
  let avg-ci-rate = if tot-ci > 0 { (filt-ci / tot-ci) * 100 } else { 0.0 }
  let avg-art-rate = if tot-art > 0 { (filt-art / tot-art) * 100 } else { 0.0 }
  let avg-ind-rate = if tot-ind > 0 { (filt-ind / tot-ind) * 100 } else { 0.0 }
  let avg-all-rate = if tot-all > 0 { (filt-all / tot-all) * 100 } else { 0.0 }

  let format-cell(st-item) = {
    let (fg-rate, fg-frac) = if st-item.rate >= 75.0 {
      (rgb("#0f172a"), rgb("#7f1d1d"))
    } else if st-item.rate >= 45.0 {
      (rgb("#0f172a"), rgb("#7c2d12"))
    } else {
      (rgb("#0f172a"), rgb("#475569"))
    }
    table.cell(fill: heatmap-tint(st-item.rate))[
      #text(fill: fg-rate, weight: "bold")[#fmt-dec(st-item.rate, d: 1)%] \
      #text(size: 7.0pt, fill: fg-frac, weight: "medium")[(#st-item.filt/#st-item.tot)]
    ]
  }

  let table-content = {
    set text(size: 7.3pt)
    set table(inset: (x: 2.2pt, y: 3.5pt))
    table(
      columns: (1.35fr, 0.9fr, 1.35fr, 1.15fr, 1.0fr, 1.0fr, 1.05fr),
      align: (left, center, center, center, center, center, center),
      table.header(
        [*Modelo*],
        [*GIA*],
        [*Activos Específicos*],
        [*Componente CI*],
        [*Artefactos*],
        [*Indicadores*],
        [*Poda Global*],
      ),
      ..stats.map(x => (
        [
          *#x.m.name* \
          #text(size: 6.2pt, fill: palette-metrics.subtext)[#x.m.deploy]
        ],
        format-cell(x.st.gia),
        format-cell(x.st.act),
        format-cell(x.st.ci),
        format-cell(x.st.art),
        format-cell(x.st.ind),
        format-cell(x.st.global),
      )).join(),
      // Fila de Media Global
      table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*Media Global*]],
      table.cell(fill: palette-metrics.table-alt)[
        *#fmt-dec(avg-gia-rate, d: 1)%* \
        #text(size: 6.8pt, fill: rgb("#334155"), weight: "medium")[(#filt-gia/#tot-gia)]
      ],
      table.cell(fill: palette-metrics.table-alt)[
        *#fmt-dec(avg-act-rate, d: 1)%* \
        #text(size: 6.8pt, fill: rgb("#334155"), weight: "medium")[(#filt-act/#tot-act)]
      ],
      table.cell(fill: palette-metrics.table-alt)[
        *#fmt-dec(avg-ci-rate, d: 1)%* \
        #text(size: 6.8pt, fill: rgb("#334155"), weight: "medium")[(#filt-ci/#tot-ci)]
      ],
      table.cell(fill: palette-metrics.table-alt)[
        *#fmt-dec(avg-art-rate, d: 1)%* \
        #text(size: 6.8pt, fill: rgb("#334155"), weight: "medium")[(#filt-art/#tot-art)]
      ],
      table.cell(fill: palette-metrics.table-alt)[
        *#fmt-dec(avg-ind-rate, d: 1)%* \
        #text(size: 6.8pt, fill: rgb("#334155"), weight: "medium")[(#filt-ind/#tot-ind)]
      ],
      table.cell(fill: palette-metrics.table-alt)[
        *#fmt-dec(avg-all-rate, d: 1)%* \
        #text(size: 6.8pt, fill: rgb("#0f172a"))[*#filt-all/#tot-all*]
      ],
    )

    v(0.2cm)
    align(center)[
      #block(width: 10.5cm)[
        #stack(
          spacing: 3pt,
          rect(
            width: 100%,
            height: 4.5pt,
            stroke: 0.4pt + rgb("#0f172a"),
            fill: gradient.linear(
              heatmap-tint(0.0),
              heatmap-tint(25.0),
              heatmap-tint(50.0),
              heatmap-tint(75.0),
              heatmap-tint(100.0),
            ),
          ),
          grid(
            columns: (1fr, 1fr, 1fr, 1fr, 1fr),
            align: (left, center, center, center, right),
            [#text(size: 6.5pt, fill: rgb("#475569"))[0% (Mínima)]],
            [#text(size: 6.5pt, fill: rgb("#475569"))[25%]],
            [#text(size: 6.5pt, fill: rgb("#475569"))[50%]],
            [#text(size: 6.5pt, fill: rgb("#475569"))[75%]],
            [#text(size: 6.5pt, fill: rgb("#475569"))[100% (Total)]],
          ),
          v(3.5pt),
          align(center)[#text(size: 7.0pt, fill: rgb("#475569"), style: "italic")[Escala de intensidad del filtrado vectorial previo ($"sim" < 0.35$)]],
        )
      ]
    ]
  }

  if show-caption {
    figure(
      table-content,
      caption: tr.sipac-heatmap-caption,
    )
  } else {
    table-content
  }
}

#let sipac-qualitative-case-study-table(lang: "es", show-caption: true) = {
  let tr = i18n.at(lang, default: i18n.es)

  let render-status(status-type) = {
    if status-type == "exact" {
      text(size: 8.5pt, weight: "bold", fill: rgb("#166534"))[Match 1:1]
    } else if status-type == "partial" {
      text(size: 8.5pt, weight: "bold", fill: rgb("#0369a1"))[Equiv. parcial]
    } else if status-type == "extra_llm" {
      text(size: 8.5pt, weight: "medium", fill: rgb("#b45309"))[Excedente 1:1]
    } else {
      text(size: 8.5pt, style: "italic", fill: rgb("#64748b"))[Poda vectorial]
    }
  }

  let table-section-header(proc-name, gia-name) = table.cell(
    colspan: 5,
    fill: rgb("#f1f5f9"),
    inset: (x: 6pt, y: 4.8pt),
  )[
    #text(size: 9.0pt, weight: "bold", fill: rgb("#0f172a"))[#proc-name] #h(6pt)
    #text(size: 8.0pt, fill: rgb("#475569"), style: "italic")[(#gia-name)]
  ]

  let table-content = {
    set text(size: 8.3pt)
    set table(inset: (x: 3.0pt, y: 4.5pt))
    table(
      columns: (2.35fr, 1.45fr, 2.3fr, 1.15fr, 1.1fr),
      align: (left + horizon, left + horizon, left + horizon, center + horizon, center + horizon),
      stroke: (x, y) => if y == 0 { (bottom: 1.2pt + rgb("#0f172a"), top: 1.2pt + rgb("#0f172a")) } else { (bottom: 0.4pt + rgb("#e2e8f0")) },
      table.header(
        [*Activo Intangible Específico*],
        [*Ground Truth*],
        [*Propuesta del Sistema*],
        [*Asignación*],
        [*Calificación*],
      ),
      // Bloque 1
      table-section-header("Proceso 1: Mejora de Venta a Particulares", "GIA 2: Modelo Comercial o de Clientes"),
      table.cell(rowspan: 3, align: left + horizon)[
        *Modelo Clientes* \
        #text(size: 7.5pt, fill: rgb("#64748b"))[Capital Negocio]
      ],
      [Página Web],
      [Página Web transaccional para particulares],
      [#render-status("exact")],
      [3 / 3],

      [#text(fill: rgb("#94a3b8"))[—]],
      [Manual de protocolo comercial y atención B2C],
      [#render-status("pruned")],
      [#text(fill: rgb("#94a3b8"))[—]],

      [#text(fill: rgb("#94a3b8"))[—]],
      [Módulo ERP de gestión y stock multicanal],
      [#render-status("pruned")],
      [#text(fill: rgb("#94a3b8"))[—]],

      // Bloque 2
      table-section-header("Proceso 2: Estrategia de Marketing Digital", "GIA 7: Modelo de Marca"),
      table.cell(rowspan: 4, align: left + horizon)[
        *Modelo de Marca* \
        #text(size: 6.8pt, fill: rgb("#64748b"))[Capital Negocio]
      ],
      [Redes Sociales],
      [Canales oficiales en RRSS (Instagram/TikTok)],
      [#render-status("exact")],
      [3 / 3],

      [Marketing Digital],
      [Sistema CRM con módulo de fidelización],
      [#render-status("partial")],
      [2 / 3],

      [#text(fill: rgb("#94a3b8"))[—]],
      [Plataforma de automatización de Email Marketing],
      [#render-status("extra_llm")],
      [#text(fill: rgb("#94a3b8"))[—]],

      [#text(fill: rgb("#94a3b8"))[—]],
      [Repositorio digital de recursos y guía de marca],
      [#render-status("pruned")],
      [#text(fill: rgb("#94a3b8"))[—]],
    )
  }

  if show-caption {
    figure(
      table-content,
      caption: [Comparativa de deducción de artefactos tecnológicos frente al Ground Truth y evaluación semántica en SIPAC (caso G3, Gemini 3.7 Flash).],
    )
  } else {
    table-content
  }
}

#let get-ahp-case-metrics(r) = {
  let h = r.ahp
  (
    caseId: r.caseId,
    companyName: r.companyName,
    normScore: h.at("normalizedScore", default: none),
    cr: h.at("consistencyRatio", default: none),
    relevance: h.at("relevanceScore", default: none),
    nonOverlap: h.at("nonOverlapScore", default: none),
    completeness: h.at("completenessScore", default: none),
    justification: h.at("justificationScore", default: none),
  )
}

#let ahp-summary-table() = {
  let all-mets = all-models.map(m => (
    m: m,
    globalMet: get-ahp-metrics(m.id),
    caseMets: get-blind-cases(m.id).filter(r => "ahp" in r).map(r => get-ahp-case-metrics(r)),
  ))

  figure(
    {
      set text(size: 7.2pt)
      set table(inset: (x: 2.5pt, y: 3pt))
      table(
        columns: (2.4cm, 1.9cm, 1.4cm, 1.2cm, 1.7cm, 1.7cm, 1.7cm, 1.7cm),
        align: (left, left, center, center, center, center, center, center),
        table.header(
          [*Modelo*], [*Caso*], [*Score Norm.*], [*CR*], [*Adaptación* (0-3)], [*Ortogonal.* (0-3)], [*Completitud* (0-3)], [*Justificación* (0-3)],
        ),
        ..all-mets.map(x => {
          let m = x.m
          let gm = x.globalMet

          let sorted-cases = ("G2_empresa_b", "G3_empresa_c", "G4_empresa_d").map(cid => {
            let found = x.caseMets.filter(c => c.caseId == cid)
            if found.len() > 0 { found.first() } else { none }
          }).filter(c => c != none)

          let rows = ()
          // Celda agrupada del modelo
          rows.push(table.cell(rowspan: sorted-cases.len() + 1, align: left + horizon)[
            *#m.name* \
            #text(size: 6.2pt, fill: palette-metrics.subtext)[#m.deploy]
          ])

          // Filas por cada caso de prueba
          for c in sorted-cases {
            rows.push([#case-label(c.caseId)])
            rows.push([#fmt-dec(c.normScore, d: 3)])
            rows.push([#if c.cr != none { fmt-dec(c.cr, d: 3) } else { text(fill: rgb("#94a3b8"))[—] }])
            rows.push([#fmt-dec(c.relevance, d: 2)])
            rows.push([#fmt-dec(c.nonOverlap, d: 2)])
            rows.push([#fmt-dec(c.completeness, d: 2)])
            rows.push([#fmt-dec(c.justification, d: 2)])
          }

          // Fila agregada de Media Global
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*Media Global*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#fmt-dec(gm.normScore, d: 3)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#if gm.cr != none { fmt-dec(gm.cr, d: 3) } else { "—" }*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#fmt-dec(gm.relevance, d: 2)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#fmt-dec(gm.nonOverlap, d: 2)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#fmt-dec(gm.completeness, d: 2)*]])
          rows.push(table.cell(fill: palette-metrics.table-alt)[#text(size: 7.8pt)[*#fmt-dec(gm.justification, d: 2)*]])

          rows
        }).join(),
      )
    },
    caption: [Métricas detalladas de soporte a la decisión y consistencia en AHP.],
  )
}

#let global-comparison-table(lang: "es", show-caption: true) = {
  let tr = i18n.at(lang, default: i18n.es)
  let all-mets = all-models.map(m => {
    let a = get-altus-metrics(m.id)
    let s = get-sipac-metrics(m.id)
    let h = get-ahp-metrics(m.id)
    (
      m: m,
      a: a,
      s: s,
      h: h,
      totalMs: a.timeMs + s.timeMs + h.timeMs,
    )
  })
  let max-alt-acc = calc.max(..all-mets.map(x => x.a.accuracy).filter(v => v != none))
  let max-sip-f1 = calc.max(..all-mets.map(x => x.s.overallF1).filter(v => v != none))
  let max-ahp-sc = calc.max(..all-mets.map(x => x.h.normScore).filter(v => v != none))

  let tbl-content = {
    set text(size: 10pt)
    table(
      columns: (auto, auto, 1.2fr, 1.2fr, 1.2fr, 1.3fr),
      align: (left, center, center, center, center, center),
      table.header(
        [*#tr.global-tbl-model*], [*#tr.global-tbl-deploy*], [*#tr.global-tbl-altus-acc*], [*#tr.global-tbl-sipac-f1*], [*#tr.global-tbl-ahp-score*], [*#tr.global-tbl-total-time*],
      ),
      ..all-mets.map(x => {
        let m = x.m
        let a = x.a
        let s = x.s
        let h = x.h
        let totalMs = x.totalMs
        let is-best-acc = calc.abs(a.accuracy - max-alt-acc) < 0.0001
        let is-best-f1 = calc.abs(s.overallF1 - max-sip-f1) < 0.0001
        let is-best-ahp = calc.abs(h.normScore - max-ahp-sc) < 0.0001
        (
          [#m.tag],
          [#m.deploy],
          [#if is-best-acc [*#fmt-dec(a.accuracy)*] else [#fmt-dec(a.accuracy)]],
          [#if is-best-f1 [*#fmt-dec(s.overallF1)*] else [#fmt-dec(s.overallF1)]],
          [#if is-best-ahp [*#fmt-dec(h.normScore)*] else [#fmt-dec(h.normScore)]],
          [#if m.deploy == "Cloud API" [#fmt-min(totalMs)] else [#fmt-h(totalMs)]],
        )
      }).join(),
    )
  }

  if show-caption {
    figure(
      tbl-content,
      caption: tr.global-tbl-caption,
    )
  } else {
    tbl-content
  }
}


// ==========================================
// 6. GENERADORES DE GRÁFICOS (Lilaq)
// ==========================================

#let tick-label(tag) = {
  box(width: 0pt, height: 0pt, align(top + right)[
    #rotate(-45deg, origin: top + right)[
      #box(width: 3.5cm, align(right)[
        #set text(size: 9pt)
        #tag
        #h(4pt)
      ])
    ]
  ])
}

#let altus-accuracy-mae-chart(lang: "es", show-caption: true) = {
  let tr = i18n.at(lang, default: i18n.es)
  let tags = all-models.map(m => m.name)
  let accs = all-models.map(m => get-altus-metrics(m.id).accuracy * 100)
  let maes = all-models.map(m => get-altus-metrics(m.id).mae)
  let n = tags.len()
  let x-pos = range(n)

  let chart-content = {
    grid(
      columns: (1fr, 1fr),
      gutter: 0.8cm,
      lq.diagram(
        title: text(size: 10pt)[#tr.altus-acc-title],
        width: 6.6cm,
        height: 5.2cm,
        xaxis: (
          ticks: tags.enumerate().map(p => (p.at(0), tick-label(p.at(1)))),
          subticks: none,
        ),
        yaxis: (
          lim: (0, 105),
          label: text(size:10pt)[#tr.altus-acc-ylabel],
        ),
        legend: (
          position: top + right,
        ),
        // Línea base del azar (16.7%)
        lq.plot((-0.6, n - 0.4), (16.67, 16.67), mark: none, stroke: (paint: palette-metrics.baseline, dash: "dashed", thickness: 1pt), label: text(size: 7.2pt)[#tr.altus-acc-baseline], z-index: 1),
        lq.bar(x-pos, accs, width: 0.5, fill: palette-metrics.accuracy, z-index: 3),
      ),
      lq.diagram(
        title: text(size: 10pt)[#tr.altus-mae-title],
        width: 6.6cm,
        height: 5.2cm,
        xaxis: (
          ticks: tags.enumerate().map(p => (p.at(0), tick-label(p.at(1)))),
          subticks: none,
        ),
        yaxis: (
          lim: (0, 2.3),
          label: text(size:10pt)[#tr.altus-mae-ylabel],
        ),
        legend: (
          position: top + right,
        ),
        // Línea base del azar (MAE esperado uniforme = 1.94)
        lq.plot((-0.6, n - 0.4), (1.944, 1.944), mark: none, stroke: (paint: palette-metrics.baseline, dash: "dashed", thickness: 1pt), label: text(size: 7.2pt)[#tr.altus-mae-baseline], z-index: 1),
        lq.bar(x-pos, maes, width: 0.5, fill: palette-metrics.mae, z-index: 3),
      ),
    )
    v(1.7cm)
  }

  if show-caption {
    figure(
      chart-content,
      caption: tr.altus-acc-mae-caption,
    )
  } else {
    chart-content
  }
}

#let bubble-mark(color, r, label-text) = {
  mark => place(center + horizon)[
    #circle(radius: r, fill: color.transparentize(22%), stroke: (paint: color.darken(25%), thickness: 1.3pt))[
      #place(center + horizon)[
        #set text(size: if r < 10pt { 6.5pt } else { 7.5pt }, weight: "bold", fill: rgb("#0f172a"))
        #label-text
      ]
    ]
  ]
}

#let altus-tradeoff-scatter-chart(lang: "es", show-caption: true) = {
  let tr = i18n.at(lang, default: i18n.es)
  let data = all-models.map(m => {
    let met = get-altus-metrics(m.id)
    (
      id: m.id,
      name: m.name,
      tag: m.tag,
      acc: met.accuracy * 100,
      mae: met.mae,
      hitRate: met.hitRate * 100,
      premRate: met.premRate * 100,
      quality: met.quality,
      color: palette-models.at(m.id),
    )
  })

  // Umbrales calculados dinámicamente a partir del centroide empírico del benchmark
  let th-hit = avg(data.map(d => d.hitRate))
  let th-mae = avg(data.map(d => d.mae))

  // Ordenar por calidad descendente para que las burbujas grandes se pinten primero (al fondo) y las pequeñas encima
  let sorted-data = data.sorted(key: d => -d.quality)

  let chart-content = align(center)[
    #lq.diagram(
      title: [
        #text(size: 10.5pt, weight: "bold")[#tr.altus-tradeoff-title] \
        #text(size: 8.2pt, fill: rgb("#475569"))[#tr.altus-tradeoff-subtitle]
      ],
      width: 13.0cm,
      height: 7.8cm,
      xaxis: (
        lim: (30, 105),
        label: text(size: 10pt)[#tr.altus-tradeoff-xlabel],
        ticks: ((40, "40%"), (50, "50%"), (60, "60%"), (70, "70%"), (80, "80%"), (90, "90%"), (100, "100%")),
        subticks: none,
      ),
      yaxis: (
        lim: (0.95, 1.40),
        label: text(size: 10pt)[#tr.altus-tradeoff-ylabel],
        ticks: ((1.0, "1.00"), (1.10, "1.10"), (1.20, "1.20"), (1.30, "1.30"), (1.40, "1.40")),
        subticks: none,
      ),
      // Sombreado verde de referencia (Hit >= media, MAE <= media)
      lq.rect(th-hit, th-mae, width: 107 - th-hit, height: th-mae - 0.95, align: left + bottom, fill: palette-metrics.zone-opt, stroke: none, z-index: 0),
      // Líneas de cuadrante en el centroide empírico
      lq.plot((th-hit, th-hit), (0.95, 1.40), stroke: (paint: palette-metrics.baseline, dash: "dashed", thickness: 0.8pt), z-index: 1),
      lq.plot((30, 107), (th-mae, th-mae), stroke: (paint: palette-metrics.baseline, dash: "dashed", thickness: 0.8pt), z-index: 1),
      // Modelos evaluados con burbujas proporcionales a la calidad de repreguntas (0 a 3 pts) y valor numérico interior
      ..sorted-data.map(d => {
        let r = 8.5pt + (d.quality / 3.0) * 11.5pt
        let lbl = if d.quality == 0.0 { "0.0" } else { fmt-dec(d.quality, d: 2) }
        lq.plot(
          (d.hitRate,),
          (d.mae,),
          mark: bubble-mark(d.color, r, lbl),
          stroke: none,
          z-index: 3,
        )
      }),
    )
    #v(0.25cm)
    #grid(
      columns: (auto, auto, auto, auto),
      gutter: 1.0em,
      row-gutter: 0.5em,
      ..data.map(d => box[
        #box(circle(radius: 4pt, fill: d.color, stroke: none), baseline: -1pt)
        #h(0.3em)
        #text(size: 8.8pt)[#d.tag]
      ])
    )
  ]

  if show-caption {
    figure(
      chart-content,
      caption: tr.altus-tradeoff-caption,
    )
  } else {
    chart-content
  }
}

#let sipac-f1-chart(lang: "es", show-caption: true) = {
  let tr = i18n.at(lang, default: i18n.es)
  let tags = all-models.map(m => m.name)
  let f1-gia = all-models.map(m => get-sipac-metrics(m.id).giaF1)
  let f1-act = all-models.map(m => get-sipac-metrics(m.id).actF1)
  let f1-ci = all-models.map(m => get-sipac-metrics(m.id).ciF1)
  let f1-art = all-models.map(m => get-sipac-metrics(m.id).artF1)
  let f1-ind = all-models.map(m => get-sipac-metrics(m.id).indF1)
  let n = tags.len()
  let x-pos = range(n)

  let chart-content = align(center)[
    #lq.diagram(
      title: [#tr.sipac-f1-title],
      width: 13.5cm,
      height: 6.0cm,
      xaxis: (
        ticks: tags.enumerate().map(p => (p.at(0), tick-label(p.at(1)))),
        subticks: none,
      ),
      yaxis: (
        lim: (0, 1.10),
        label: [#tr.sipac-f1-ylabel],
      ),
      legend: lq.legend(
        position: top + center,
        pad: 6pt,
        fill: white.transparentize(15%),
        stroke: 0.5pt + rgb("#cbd5e1"),
        radius: 3pt,
        inset: 4pt,
        grid(
          columns: (auto, auto, auto, auto, auto),
          gutter: 1.2em,
          align: horizon,
          box[#box(rect(width: 1.4em, height: 0.65em, fill: palette-sipac-dims.gia), baseline: -0.5pt) #h(0.35em) #text(size: 8pt, weight: "medium")[#tr.sipac-f1-gia]],
          box[#box(rect(width: 1.4em, height: 0.65em, fill: palette-sipac-dims.act), baseline: -0.5pt) #h(0.35em) #text(size: 8pt, weight: "medium")[#tr.sipac-f1-act]],
          box[#box(rect(width: 1.4em, height: 0.65em, fill: palette-sipac-dims.ci),  baseline: -0.5pt) #h(0.35em) #text(size: 8pt, weight: "medium")[#tr.sipac-f1-ci]],
          box[#box(rect(width: 1.4em, height: 0.65em, fill: palette-sipac-dims.art), baseline: -0.5pt) #h(0.35em) #text(size: 8pt, weight: "medium")[#tr.sipac-f1-art]],
          box[#box(rect(width: 1.4em, height: 0.65em, fill: palette-sipac-dims.ind), baseline: -0.5pt) #h(0.35em) #text(size: 8pt, weight: "medium")[#tr.sipac-f1-ind]],
        )
      ),
      lq.bar(x-pos, f1-gia, width: 0.15, offset: -0.30, fill: palette-sipac-dims.gia),
      lq.bar(x-pos, f1-act, width: 0.15, offset: -0.15, fill: palette-sipac-dims.act),
      lq.bar(x-pos, f1-ci,  width: 0.15, offset:  0.00, fill: palette-sipac-dims.ci),
      lq.bar(x-pos, f1-art, width: 0.15, offset:  0.15, fill: palette-sipac-dims.art),
      lq.bar(x-pos, f1-ind, width: 0.15, offset:  0.30, fill: palette-sipac-dims.ind),
    )
    #v(1.6cm)
  ]

  if show-caption {
    figure(
      chart-content,
      caption: tr.sipac-f1-caption,
    )
  } else {
    chart-content
  }
}

#let sipac-precision-recall-chart(lang: "es", show-caption: true) = {
  let tr = i18n.at(lang, default: i18n.es)
  let tags = all-models.map(m => m.name)
  let precs = all-models.map(m => get-sipac-metrics(m.id).overallPrecision * 100)
  let recs = all-models.map(m => get-sipac-metrics(m.id).overallRecall * 100)
  let f1s = all-models.map(m => get-sipac-metrics(m.id).overallF1 * 100)
  let n = tags.len()
  let x-pos = range(n)

  let diamond-mark(mark) = {
    let s = mark.size * 0.72
    place(center + horizon, rotate(45deg, std.rect(width: s, height: s, fill: palette-metrics.f1, stroke: (paint: palette-metrics.f1-border, thickness: 1.4pt))))
  }

  let chart-content = align(center)[
    #lq.diagram(
      title: [#tr.sipac-pr-title],
      width: 13.5cm,
      height: 6.0cm,
      xaxis: (
        lim: (-0.6, n - 0.4),
        ticks: tags.enumerate().map(p => (p.at(0), tick-label(p.at(1)))),
        subticks: none,
      ),
      yaxis: (
        lim: (0, 100),
        label: [#tr.sipac-pr-ylabel],
      ),
      legend: (
        position: top + left,
      ),
      lq.bar(x-pos, precs, width: 0.28, offset: -0.15, fill: palette-metrics.precision, label: text(size: 8pt)[#tr.sipac-pr-prec], z-index: 2),
      lq.bar(x-pos, recs, width: 0.28, offset: 0.15, fill: palette-metrics.recall, label: text(size: 8pt)[#tr.sipac-pr-rec], z-index: 2),
      // Diamantes de F1 aislados por modelo (sin línea conectora)
      ..range(n).map(i => {
        let f1 = f1s.at(i)
        lq.plot(
          (i,),
          (f1,),
          mark: diamond-mark,
          mark-size: 7.5pt,
          stroke: none,
          label: if i == 0 { text(size: 8pt)[#tr.sipac-pr-f1] } else { none },
          z-index: 3,
        )
      }),
    )
    #v(1.7cm)
  ]

  if show-caption {
    figure(
      chart-content,
      caption: tr.sipac-pr-caption,
    )
  } else {
    chart-content
  }
}

#let ahp-scores-chart(lang: "es", show-caption: true) = {
  let tr = i18n.at(lang, default: i18n.es)
  let tags = all-models.map(m => m.name)
  let rel = all-models.map(m => get-ahp-metrics(m.id).relevance)
  let non = all-models.map(m => get-ahp-metrics(m.id).nonOverlap)
  let comp = all-models.map(m => get-ahp-metrics(m.id).completeness)
  let just = all-models.map(m => get-ahp-metrics(m.id).justification)
  let n = tags.len()
  let x-pos = range(n)

  let end-rel = rel
  let end-non = rel.zip(non).map(p => p.at(0) + p.at(1))
  let end-comp = end-non.zip(comp).map(p => p.at(0) + p.at(1))
  let end-just = end-comp.zip(just).map(p => p.at(0) + p.at(1))

  // Etiquetas numéricas de cada segmento y total acumulado
  let seg-labels = ()
  for i in range(n) {
    let r = rel.at(i)
    let no = non.at(i)
    let co = comp.at(i)
    let ju = just.at(i)
    let tot = end-just.at(i)

    // Segmento 1: Adaptación Contextual
    if r > 0.4 {
      seg-labels.push(lq.place(i, r / 2, align: center + horizon)[
        #text(size: 6.8pt, weight: "bold", fill: white)[#fmt-dec(r, d: 1)]
      ])
    }
    // Segmento 2: Ortogonalidad
    if no > 0.4 {
      seg-labels.push(lq.place(i, r + no / 2, align: center + horizon)[
        #text(size: 6.8pt, weight: "bold", fill: white)[#fmt-dec(no, d: 1)]
      ])
    }
    // Segmento 3: Completitud
    if co > 0.4 {
      seg-labels.push(lq.place(i, r + no + co / 2, align: center + horizon)[
        #text(size: 6.8pt, weight: "bold", fill: rgb("#0f172a"))[#fmt-dec(co, d: 1)]
      ])
    }
    // Segmento 4: Racionalidad de Justificación
    if ju > 0.4 {
      seg-labels.push(lq.place(i, r + no + co + ju / 2, align: center + horizon)[
        #text(size: 6.8pt, weight: "bold", fill: rgb("#0f172a"))[#fmt-dec(ju, d: 1)]
      ])
    }
    // Etiqueta del Total Acumulado sobre la barra
    seg-labels.push(lq.place(i, tot + 0.45, align: center + horizon)[
      #text(size: 7.5pt, weight: "bold", fill: rgb("#0f172a"))[#fmt-dec(tot, d: 1)]
    ])
  }

  let chart-content = align(center)[
    #lq.diagram(
      title: [#tr.ahp-scores-title],
      width: 13.5cm,
      height: 6.4cm,
      xaxis: (
        ticks: tags.enumerate().map(p => (p.at(0), tick-label(p.at(1)))),
        subticks: none,
      ),
      yaxis: (
        lim: (0, 13.5),
        label: [#tr.ahp-scores-ylabel],
      ),
      legend: (
        position: top + right,
      ),
      lq.bar(x-pos, end-rel, base: 0, width: 0.48, fill: palette-metrics.ahp-rel, label: text(size: 8pt)[#tr.ahp-scores-rel]),
      lq.bar(x-pos, end-non, base: end-rel, width: 0.48, fill: palette-metrics.ahp-non, label: text(size: 8pt)[#tr.ahp-scores-non]),
      lq.bar(x-pos, end-comp, base: end-non, width: 0.48, fill: palette-metrics.ahp-comp, label: text(size: 8pt)[#tr.ahp-scores-comp]),
      lq.bar(x-pos, end-just, base: end-comp, width: 0.48, fill: palette-metrics.ahp-just, label: text(size: 8pt)[#tr.ahp-scores-just]),
      ..seg-labels,
    )
    #v(1.7cm)
  ]

  if show-caption {
    figure(
      chart-content,
      caption: tr.ahp-scores-caption,
    )
  } else {
    chart-content
  }
}

#let ahp-consistency-chart(lang: "es", show-caption: true) = {
  let tr = i18n.at(lang, default: i18n.es)
  let data = all-models.map(m => {
    let met = get-ahp-metrics(m.id)
    (
      id: m.id,
      tag: m.name,
      deploy: m.deploy,
      color: palette-models.at(m.id),
      cr: if met.cr != none { met.cr } else { 0.0 },
      just: met.justification,
      totalScore: if met.normScore != none { met.normScore * 12.0 } else { 0.0 },
    )
  })

  // Ordenar por tamaño de burbuja descendente para que las más pequeñas se dibujen encima
  let sorted-data = data.sorted(key: d => -d.totalScore)

  let chart-content = align(center)[
    #lq.diagram(
      title: [
        #text(size: 10.5pt, weight: "bold")[#tr.ahp-consistency-title] \
        #text(size: 8.2pt, fill: rgb("#475569"))[#tr.ahp-consistency-subtitle]
      ],
      width: 13.5cm,
      height: 7.2cm,
      xaxis: (
        lim: (0.00, 0.38),
        label: [#tr.ahp-consistency-xlabel],
        subticks: 4,
      ),
      yaxis: (
        lim: (0.6, 2.4),
        label: [#tr.ahp-consistency-ylabel],
        subticks: 3,
      ),
      // Sombreado verde de zona matemáticamente consistente (CR <= 0.10)
      lq.rect(0.00, 2.4, width: 0.10, height: 1.8, align: left + bottom, fill: palette-metrics.zone-opt, stroke: none, z-index: 0),
      // Línea vertical discontinua en el umbral de Saaty (CR = 0.10)
      lq.plot((0.10, 0.10), (0.6, 2.4), stroke: (paint: palette-metrics.baseline, dash: "dashed", thickness: 0.8pt), z-index: 1),
      // Etiqueta de zona
      lq.place(0.05, 2.28, align: center + horizon)[
        #text(size: 6.3pt, fill: rgb("#047857"), weight: "bold")[#tr.ahp-consistency-zone]
      ],
      // Modelos evaluados con burbujas proporcionales a la puntuación total en AHP (0 a 12 pts)
      ..sorted-data.map(d => {
        let r = 8.0pt + ((d.totalScore - 5.0) / 4.0) * 8.5pt
        let lbl = fmt-dec(d.totalScore, d: 1)
        lq.plot(
          (d.cr,),
          (d.just,),
          mark: bubble-mark(d.color, r, lbl),
          stroke: none,
          z-index: 3,
        )
      }),
    )
    #v(0.25cm)
    #grid(
      columns: (auto, auto, auto, auto),
      gutter: 1.0em,
      row-gutter: 0.5em,
      ..data.map(d => box[
        #box(circle(radius: 4pt, fill: d.color, stroke: none), baseline: -1pt)
        #h(0.3em)
        #text(size: 8.8pt)[#d.tag]
      ])
    )
  ]

  if show-caption {
    figure(
      chart-content,
      caption: tr.ahp-consistency-caption,
    )
  } else {
    chart-content
  }
}

#let local-models-stacked-time-chart(lang: "es", show-caption: true) = {
  let tr = i18n.at(lang, default: i18n.es)
  let names = local-models.map(m => m.tag)
  let y-pos = range(names.len())

  // Tiempos en minutos
  let altus-times = local-models.map(m => get-altus-metrics(m.id).timeMs / 60000)
  let sipac-times = local-models.map(m => get-sipac-metrics(m.id).timeMs / 60000)
  let ahp-times = local-models.map(m => get-ahp-metrics(m.id).timeMs / 60000)

  let end-altus = altus-times
  let end-sipac = altus-times.zip(sipac-times).map(p => p.at(0) + p.at(1))
  let end-ahp = end-sipac.zip(ahp-times).map(p => p.at(0) + p.at(1))

  let chart-content = align(center)[
    #lq.diagram(
      title: [#tr.local-time-title],
      width: 12.6cm,
      height: 6.2cm,
      xaxis: (
        label: [#tr.local-time-xlabel],
        lim: (0, 390),
      ),
      yaxis: (
        ticks: names.enumerate().map(p => (p.at(0), p.at(1))),
        subticks: none,
      ),
      legend: (
        position: bottom + right,
      ),
      lq.hbar(end-altus, y-pos, base: 0, width: 0.5, fill: palette-phases.altus, label: [#tr.local-time-altus]),
      lq.hbar(end-sipac, y-pos, base: end-altus, width: 0.5, fill: palette-phases.sipac, label: [#tr.local-time-sipac]),
      lq.hbar(end-ahp, y-pos, base: end-sipac, width: 0.5, fill: palette-phases.ahp, label: [#tr.local-time-ahp]),
    )
  ]

  if show-caption {
    figure(
      chart-content,
      caption: tr.local-time-caption,
    )
  } else {
    chart-content
  }
}
