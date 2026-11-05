// Helper para marcar visualmente cambios en la memoria de revision v1.1

#let cambio(body, nota: none) = {
  block(
    width: 100%,
    stroke: (left: 3.5pt + rgb("#2563eb")),
    fill: rgb("#eff6ff"),
    inset: (left: 11pt, right: 9pt, top: 7pt, bottom: 7pt),
    radius: (right: 4pt),
    spacing: 1.2em,
  )[
    #if nota != none [
      #box(fill: rgb("#2563eb"), inset: (x: 5pt, y: 2.5pt), radius: 2.5pt)[
        #text(fill: white, size: 7pt, weight: "bold")[v1.1: #nota]
      ]
      #v(3pt)
    ]
    #body
  ]
}
