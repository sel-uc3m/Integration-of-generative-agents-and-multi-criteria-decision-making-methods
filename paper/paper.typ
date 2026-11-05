#set document(
  title: "AI-Driven DTGEP: An Agentic Methodology for Software Pre-Project Decision-Making",
  author: ("Adrián Fernández Galán", "María Isabel Sánchez Segura", "Fuensanta Medina Domínguez"),
)

#set text(lang: "en", size: 10pt)
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.1")

#show figure.caption: it => [
  #text(weight: "bold")[#it.supplement #context it.counter.display(it.numbering):] #it.body
]

#align(center)[
  #v(1em)
  #text(size: 16pt, weight: "bold")[AI-Driven DTGEP: An Agentic Methodology for Software Pre-Project Decision-Making] \
  #v(0.8em)
  #text(size: 11pt)[*Adrián Fernández Galán*, *María Isabel Sánchez Segura*, *Fuensanta Medina Domínguez*] \
  #v(0.3em)
  #text(size: 9.5pt, style: "italic")[Universidad Carlos III de Madrid (UC3M), Leganés, Madrid, Spain] \
  #v(1.2em)
]

#include "01_abstract.typ"
#include "02_introduction.typ"
#include "03_related_work.typ"
#include "04_methodology.typ"
#include "05_evaluation.typ"
#include "06_threats.typ"
#include "07_conclusions.typ"

#pagebreak()
#set bibliography(style: "ieee", title: "References")
#columns(2)[
  #set text(size: 7.5pt)
  #set par(leading: 0.5em, spacing: 0.65em)
  #bibliography("references.bib")
]
