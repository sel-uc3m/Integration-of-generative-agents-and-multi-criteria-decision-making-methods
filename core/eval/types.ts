export interface GroundTruthCapacity {
  capacityId: string;
  capacityName: string;
  question: string;
  expectedScore: number; // 1 - 5
  fullContext: string;
  initialVagueResponse: string; // Respuesta vaga inicial para Turno 1
}

export interface GroundTruthProceso {
  id: string;
  nombre: string;
}

export interface GroundTruthGIA {
  procesoId: string;
  giaNombre: string;
  activoIntangibleNombre?: string;
  intellectusCi?: string;
}

export interface GroundTruthArtefacto {
  giaId: string;
  artefactoNombre: string;
}

export interface GroundTruthIndicador {
  artefactoId: string;
  indicadorNombre: string;
  min: number;
  max: number;
  target: number;
}

export interface GroundTruthCase {
  caseId: string;
  companyName: string;
  description: string;
  isPilot: boolean;
  companyFullContext: string; // Dossier global extenso
  fullTranscript?: string;
  altus?: {
    capacities: GroundTruthCapacity[];
  };
  sipac?: {
    procesos: GroundTruthProceso[];
    activosGIA: GroundTruthGIA[];
    artefactos: GroundTruthArtefacto[];
    indicadores: GroundTruthIndicador[];
  };
}

export interface MatchingResult {
  agentItem: string;
  matchedGroundTruthItem: string | null;
  cosineSimilarity: number;
  score: number; // 0 a 3
  normalizedScore: number; // 0.0 a 1.0
  reasoning: string;
  evaluatedByLLM: boolean;
}

export interface SoftFieldMetrics {
  precision: number;
  recall: number;
  f1: number;
  matchedPairs: MatchingResult[];
}

export interface AltusEvalResult {
  caseId: string;
  accuracy: number;
  mae: number;
  redundancyRate: number;
  agenticHitRate: number;
  totalFollowUps: number;
  overAskingCount: number;
  agenticHitCount: number;
  prematureStopCount: number;
  averageFollowUpQuality: number;
  averageTurnCount: number;
  executionTimeMs?: number;
  conversationFile?: string;
  variablesFile?: string;
}

export interface SipacEvalResult {
  caseId: string;
  giaMetrics: SoftFieldMetrics;
  activoIntangibleMetrics: SoftFieldMetrics;
  intellectusCiMetrics: SoftFieldMetrics;
  artefactosMetrics: SoftFieldMetrics;
  indicadoresMetrics: SoftFieldMetrics;
  overallF1: number;
  executionTimeMs?: number;
  conversationFile?: string;
  variablesFile?: string;
}

export interface AhpEvalResult {
  caseId: string;
  relevanceScore: number; // 0 - 3 (Adaptación Contextual)
  nonOverlapScore: number; // 0 - 3 (Ortogonalidad)
  completenessScore: number; // 0 - 3 (Completitud)
  justificationScore: number; // 0 - 3 (Racionalidad de Justificaciones)
  totalScore: number; // 0 - 12
  normalizedScore: number; // 0.0 - 1.0
  reasoning: string;
  executionTimeMs?: number;
  conversationFile?: string;
  variablesFile?: string;
}

export interface CaseEvalResult {
  caseId: string;
  companyName: string;
  isPilot: boolean;
  modelName?: string;
  executionTimeMs?: number;
  altus?: AltusEvalResult;
  sipac?: SipacEvalResult;
  ahp?: AhpEvalResult;
}
