#import "uc3m-thesis-ieee-typst/lib.typ": conf
#import "config/glossary.typ": glossary-entries
#import "config/gen-ai.typ": genai-declaration
#import "config/bibliography.typ": bibliography


#show: conf.with(
  degree: "Máster en Ciencia y Tecnología Informática",
  title: "Metodología para la integración de agentes generativos en la toma de decisiones en la fase de preproyecto",
  short-title: "Agentes generativos en la toma de decisiones",
  author: "Adrián Fernández Galán",
  advisors: ("María Isabel Sánchez Segura","Fuensanta Medina Domínguez"),
  location: "Leganés, Madrid",
  thesis-type: "TFM",
  date: datetime(year: 2026, month: 9, day: 20),
  language: "es",
  style: "fancy",
  logo: "portada-logo",
  license: true,
  double-sided: true,
  flyleaf: true,
  bibliography-content: bibliography,
  epigraph: (
    quote: [And every day, every week, every month and every year of my life, my hero’s always 10 years away. I’m never gonna be my hero. I’m not gonna attain that. I know I’m not, and that’s just fine with me because that keeps me with somebody to keep on chasing.],
    author: "Matthew McConaughey",
    // source: "",
  ),
  abstract: (
    body: [
      Las iniciativas de transformación digital experimentan una tasa de fracaso cercana al 70%, originada en gran medida por decisiones tecnológicas deficientes en la fase de preproyecto y la consiguiente acumulación de deuda técnica. Aunque marcos como SWEBOK formalizan el proceso de toma de decisiones en ingeniería, su adopción en PYMEs se ve frenada por el coste de la educción cualitativa manual de activos intangibles.

      Para resolver este cuello de botella, este Trabajo de Fin de Máster propone *AI-Driven DTGEP*, una metodología que automatiza la recolección cualitativa mediante agentes de Inteligencia Artificial. La solución descarga al ingeniero mediante un motor conversacional autónomo desarrollado en LangGraph (paradigma ReAct), con memoria jerárquica y persistencia en esquemas JSON estrictos. Estos datos alimentan de forma desacoplada tres tuberías deterministas: diagnóstico de madurez digital (ALTUS), deducción de activos y artefactos tecnológicos (SIPAC), y priorización multicriterio jerárquica (AHP), todo integrado en una plataforma web con visualización reactiva.

      La validación experimental sobre cuatro organizaciones reales evaluó siete modelos de lenguaje (desde 4B locales en hardware de consumo hasta ~300B en la nube). Los resultados confirman que el sistema alcanza un error medio absoluto (MAE) de 1.06--1.27 niveles en ALTUS (alineado con la variabilidad inter-evaluador humana), un _Weighted Recall_ del 88.9% en la recuperación de soluciones en SIPAC, y una estricta consistencia matemática en AHP ($"CR" < 0.10$, con ratios entre 0.04 y 0.08). Estos hallazgos validan la viabilidad de asistir y agilizar la consultoría técnica mediante agentes de IA sin comprometer el rigor formal.
    ],
    keywords: ("Inteligencia Artificial Agéntica", "Toma de Decisiones en Ingeniería", "Modelos de Lenguaje", "Software Engineering Economics"),
  ),
    acknowledgements: [
    En primer lugar, quiero expresar mi más sincero y profundo agradecimiento a mis padres por su apoyo incondicional en cada etapa de este camino. Gracias por estar siempre ahí, por creer en mí y por levantarme el ánimo en aquellos momentos en los que se hacía difícil avanzar en solitario. Su aliento y cariño constantes han sido mi mayor fortaleza.

    A mis tutoras, María Isabel Sánchez Segura y Fuensanta Medina Domínguez, por su dedicación, cercanía y valiosa orientación a lo largo de este proyecto. Gracias por cada una de sus ideas, por el tiempo y el material facilitados, y por impulsar este trabajo para que alcance su mejor versión. Sin su guía y confianza, la realización de este trabajo no habría sido posible.

    Asimismo, agradezco al Grupo de Usuarios de Linux de la Universidad Carlos III de Madrid (GUL UC3M) por desarrollar y compartir de forma abierta esta fantástica plantilla, cuya calidad, flexibilidad y rigor formal han facilitado enormemente la elaboración y maquetación de este documento.
  ],
  outlines: (
    // contents is compulsory
    figures: true,
    tables: true,
    listings: false,
    // custom: (
    //   outline(
    //     title: [List of algorithms],
    //     target: figure.where(kind: "algorithm"),
    //   ),
    // ),
  ),
  appendixes: include "parts/anexos.typ",
  //glossary: glossary-entries, // comment this line if you don't want a glossary
  //abbreviations: (TFG: "Trabajo de Fin de Grado"),
  genai-declaration: genai-declaration,
)


/* Custom set/show rules */

// prevent floating elements from spilling into the next section
#show heading.where(level: 2): it => {
  place.flush()
  it
}

// make code listings smaller
#show raw: set text(size: 8pt)

// "booktab" table style
#show table: block.with(stroke: (y: 0.8pt))
#set table(
  column-gutter: .2em,
  stroke: (x, y) => if y == 0 { (bottom: 0.6pt) } else { none },
)
#set table.hline(stroke: 0.4pt)



/* Thesis */

#include "parts/introduccion.typ"
#include "parts/estado_arte.typ"
#include "parts/solucion.typ"
#include "parts/evaluacion.typ"
//#include "parts/project_plan.typ"
#include "parts/conclusiones.typ"
