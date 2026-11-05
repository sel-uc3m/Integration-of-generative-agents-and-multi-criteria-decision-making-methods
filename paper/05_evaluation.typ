= Experimental Evaluation and Results <sec:evaluacion>

Since _AI-Driven DTGEP_ proposes the agentic operationalization of a standardized pre-project methodology, the experimental evaluation empirically analyzes agent performance across the successive phases of DTGEP, complemented by a qualitative contrast against unprincipled prompting and a runtime viability study. The evaluation is structured around four research questions:

- _RQ1 (ALTUS Phase - Maturity Assessment):_ How do agents perform when conducting the ALTUS maturity assessment compared to human consultant evaluations?
- _RQ2 (SIPAC Phase - Solution Deduction):_ What is the capability and relevance of agents in identifying intangible assets and deducing technological artifacts in the SIPAC phase compared to the organizational Ground Truth?
- _RQ3 (AHP Phase - Multicriteria Prioritization):_ How do agents assist in AHP prioritization, and what degree of qualitative coherence and mathematical consistency do they bring to decision-making?
- _RQ4 (Methodological Contrast against Direct Prompting):_ What qualitative and rigor advantages does the structured agentic methodology provide over direct LLM prompting without methodology?

== Experimental Setup and Benchmark <sec:evaluacion:configuracion>

The empirical validation of _AI-Driven DTGEP_ was conducted across a benchmark comprising four real-world organizations spanning disparate sectors (specialized e-commerce, herbal distribution, customized textile manufacturing, and renovation/installation services). Derived from original field interviews conducted by human consultants, two reference documentary corpora were compiled: on one hand, the _Organizational Context Dossier_, summarizing each company's factual and operational reality; on the other hand, the formal _Ground Truth_, consisting of the scoring of the 51 ALTUS capabilities ($0$ to $5$), the formal catalog of intangible assets and artifacts deduced in SIPAC, and analytical prioritization matrices in AHP.

To avoid overfitting, pilot case `G1_empresa_a` was exclusively utilized to calibrate the semantic vector filtering threshold ($tau^* = 0.35$), while final performance was evaluated blindly on the remaining three cases (`G2_empresa_b`, `G3_empresa_c`, `G4_empresa_d`). Seven representative language models were evaluated: three compact local models on consumer hardware (MacBook Air M4, 16 GB unified memory: Gemma 4 E4B, DeepSeek R1 7B, Ornith 9B), three large-scale models served via API (Qwen 3.8 27B, Muse Glimmer 30B, Gemma 4 31B), and one frontier model (Gemini 3.7 Flash \~300B).

== Evaluation of ALTUS Phase: Maturity Assessment (RQ1) <sec:evaluacion:rq1>

To evaluate the agent's capability to conduct diagnostic interviews against a simulated stakeholder, a conversational stress test was designed: the interlocutor initially provides deliberately terse or ambiguous responses. Faced with this deficit, the agentic engine must detect insufficient evidence and employ follow-up inquiry questions to elicit necessary details before scoring each of the 51 capabilities.

#figure(
  image("figures/fig2_altus_tradeoff_hitrate.png", width: 80%),
  caption: [Trade-off between extractive efficacy (Hit Rate, X axis), diagnostic error (MAE, Y axis), and dialectical quality (bubble radius) in ALTUS.],
) <fig:altus_tradeoff>

In diagnostic evaluation, exact ordinal agreement (_Accuracy_) ranged between $16.3\%$ and $24.8\%$, reflecting the rigidity of requiring univocal concordance on qualitative scales. However, Mean Absolute Error (_MAE_) demonstrated a drastic reduction compared to random chance ($1.06$ to $1.27$ points of actual deviation versus $1.94$ expected by pure chance, reducing error by $35\%$ to $45\%$). When considering tolerant accuracy within $plus.minus 1$ discrepancy level ($"Accuracy"_(plus.minus 1)$), agreement rose to $72\% - 84\%$, falling squarely within the acceptable margin of inter-assessor variability among human consultants @elemam_1996_assessor.

To holistically analyze diagnostic precision alongside conversational dynamics, @fig:altus_tradeoff illustrates the trade-off between extractive efficacy (_Hit Rate_, X axis, mean $88.0\%$), resulting diagnostic error (_MAE_, Y axis), and follow-up question quality (bubble radius, audited by GPT-5.6 Luna using a graded 0 to 3 rubric). Models such as Qwen 3.8 27B (quality $2.85$), Muse Glimmer 30B ($2.67$), and the local compact Gemma 4 E4B ($2.63$) converge in the optimal quadrant by uniting high factual extraction with low error, proving they do not predict blindly but through rigorous dialectical inquiry.

== Evaluation of SIPAC Phase: Asset and Artifact Deduction (RQ2) <sec:evaluacion:rq2>

In SIPAC, the agent generates open-ended natural language proposals structured into process assets and technological artifacts. To isolate the performance of each deductive stage, the evaluation applied _Teacher Forcing_, initializing each stage with validated Ground Truth reference data. Semantic alignment against the Ground Truth was resolved via optimal bipartite matching (Hungarian Algorithm) after applying an embedding cosine similarity pre-filter ($tau^* = 0.35$). To prevent penalizing valid synonyms, the LLM judge assigned graded equivalence scores ($0$: discrepancy, $2/3$: partial functional equivalence, $1$: exact match), computing weighted metrics (_Weighted Recall_ and _Weighted Precision_) over actual solution coverage.

#figure(
  image("figures/fig4_sipac_f1_dimensions.png", width: 85%),
  caption: [Balance of Weighted Precision, Weighted Recall, and Global F1 in SIPAC across evaluated models.],
) <fig:sipac_f1>

@fig:sipac_f1 summarizes metric balance across models. The agents prioritize exhaustiveness over parsimony, achieving a mean _Weighted Recall_ of $70.4\%$ that reaches $88.9\%$ for technological artifacts, ensuring that the system comprehensively covers engineering solutions formulated by human consultants without omitting critical pain points.

== Evaluation of AHP Phase: Multicriteria Prioritization (RQ3) <sec:evaluacion:rq3>

In strategic prioritization, the system combined agentic generation of orthogonal criteria with deterministic resolution of Saaty's matrix.

#figure(
  image("figures/fig6_ahp_criteria_quality.png", width: 80%),
  caption: [Qualitative quality of generated criteria and analytical consistency in AHP.],
) <fig:ahp_quality>

As reflected in @fig:ahp_quality, generated criteria were evaluated by the LLM judge across four dimensions graded from 0 to 3 points (contextual adaptation, orthogonality, holistic completeness, and pairwise justification rationality), with models such as Gemini 3.7 Flash and Gemma 4 E4B achieving average scores exceeding $65\%$ of the overall scale. Algebraically, models with superior contextualization strictly satisfied the transitive consistency constraint imposed by Saaty ($"CR" = "CI"/"RI" < 0.10$, recording mean ratios between $0.05$ and $0.08$), validating that business-grounded argumentation produces algebraically coherent comparison matrices.

== Qualitative Contrast Against Direct Prompting (RQ4) <sec:evaluacion:rq4>

To assess the differential value provided by an agentic architecture over unprincipled direct prompting of frontier foundation models, the system was contrasted against a direct prompting baseline. Gemini 3.7 Flash ($T=0.0$) was supplied with the entire enterprise dossier in a single expert prompt with reasoning, requesting direct generation of the maturity diagnosis, solution catalog, and AHP prioritization.

#figure(
  table(
    columns: (1.5fr, 2.5fr, 3fr),
    align: (left, left, left),
    table.header([*Dimension*], [*Direct Prompting Baseline (Gemini 3.7)*], [*AI-Driven DTGEP (Proposed)*]),
    [Format and Structure], [Unstructured Markdown narrative; types unverified.], [Strict JSON Schema validated at runtime.],
    [Maturity Assessment], [Approximate global scores without per-capability evidence.], [Auditable per-capability evaluation (51 ALTUS variables).],
    [Technological Solutions], [Premature prescription of commercial SaaS brands (Shopify, HubSpot).], [Grounded deduction of custom functional artifacts and KPIs.],
    [AHP Prioritization], [Sycophantic weights; mathematically impossible to verify $"CR" < 0.10$.], [Principal eigenvector resolution with verified consistency ($"CR" in [0.04, 0.08]$).],
    [Intangible Asset Capture], [Strictly confined to initial prompt content.], [Active elicitation via contextualized follow-up questions.],
  ),
  caption: [Empirical qualitative and functional comparison between the direct prompting baseline and AI-Driven DTGEP.],
) <tbl:baseline_comparativa>

The empirical evidence in @tbl:baseline_comparativa reveals four essential methodological divergences between both paradigms:

In maturity diagnosis (ALTUS), direct prompting acts as a passive recipient: when encountering information gaps, it assumes premises and invents arbitrary ratings without verifying operational reality. In contrast, _AI-Driven DTGEP_ continuously monitors factual sufficiency and deploys adaptive follow-up inquiries across the 51 capabilities, guaranteeing an auditable fact-grounded assessment.

In solution deduction (SIPAC), direct prompting incurs _premature commercial solutionism_, prescribing closed third-party SaaS tools (Shopify, HubSpot, Airtable) that induce unjustified early vendor lock-in before requirements are formalized. _AI-Driven DTGEP_ deduces vendor-neutral functional specifications guided by business processes and assets.

In multicriteria prioritization (AHP), the baseline assigns sycophantic weights via linear additions, violating criterion orthogonality and precluding transitivity verification. The agentic approach grounds judgments on Saaty's scale and algebraically solves the principal eigenvector, axiomatically guaranteeing the consistency ratio ($"CR" < 0.10$).

Finally, in deliverable formalization, direct prompting yields untyped Markdown text unsuitable for automated downstream processing. The agentic architecture persists a typed variable graph in JSON schemas, enabling requirement traceability and seamless export to BPMN models or executive dashboards.
