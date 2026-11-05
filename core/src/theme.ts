/**
 * @tfm/core - Canonical Design System & Semantic Color Tokens
 * 
 * Formalización del sistema cromático para la suite metodológica DTGEP:
 * - ALTUS: Azure Blue (#3ba1da)
 * - SIPAC: Soft Purple (#9b96db)
 * - AHP Saaty: Deep Teal (#0d9488)
 * - Éxito / Validación: Emerald Green (#059669)
 * - Guardas / Advertencia: Amber (#b97509)
 * - Riesgo / Baseline: Rose Red (#dc2626)
 */

export const COLOR_TOKENS = {
  neutral: {
    50: '#f8fbfc',
    100: '#e9f2f6',
    200: '#d6e5ed', // Surface technical border
    300: '#bed6e3',
    400: '#9cb6cb',
    500: '#6d93b1',
    600: '#365977', // High contrast metadata
    700: '#29445c', // Paragraphs
    800: '#1b2e3f', // Subheadings
    900: '#0f1c27', // Headings
    950: '#09141a', // Maximum contrast text
  },
  altus: {
    50: '#f0f8fd',
    100: '#deeffb',
    200: '#c2e2f7',
    300: '#95cff2',
    400: '#60b6eb',
    500: '#3ba1da', // Primary Azure
    600: '#268bc5',
    700: '#1e6fa1', // Text & Icons
    800: '#1d5c83',
    900: '#1c4d6c',
    950: '#133147',
  },
  sipac: {
    50: '#f5f4fc',
    100: '#ecebf9',
    200: '#dcdaf5',
    300: '#c4c1ee',
    400: '#aaa5e4',
    500: '#9b96db', // Primary Purple
    600: '#7c75cb',
    700: '#5f57b6', // Text & Icons
    800: '#463e96',
    900: '#29246a',
    950: '#181545',
  },
  ahp: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488', // Primary Teal
    700: '#0f766e', // Text & Icons
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669', // Primary Validation Emerald
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  accent: {
    50: '#fef9ee',
    100: '#fdf0d5',
    200: '#fae0ab',
    300: '#f8cd79',
    400: '#f6b144',
    500: '#ee961d',
    600: '#cc7612',
    700: '#b97509', // Primary Amber
    800: '#884b0f',
    900: '#6e3e11',
    950: '#3f1e05',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626', // Primary Rose / Crimson
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
} as const;

export const SEMANTIC_THEME = {
  altus: {
    id: 'altus',
    name: 'Tubería ALTUS · Madurez Organizacional',
    themeColor: COLOR_TOKENS.altus[500],
    textColor: COLOR_TOKENS.altus[700],
    bgLight: COLOR_TOKENS.altus[50],
    borderColor: COLOR_TOKENS.altus[200],
    borderAccent: COLOR_TOKENS.altus[500],
    radar: {
      grid: '#c2e2f7',
      web: '#60b6eb',
      fill: 'rgba(59, 161, 218, 0.35)',
      stroke: '#1e6fa1',
      strokeWidth: 2,
    },
    badge: 'font-mono text-[8px] font-bold text-primary-800 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200',
  },
  sipac: {
    id: 'sipac',
    name: 'Tubería SIPAC · Intangibles & BMC',
    themeColor: COLOR_TOKENS.sipac[500],
    textColor: COLOR_TOKENS.sipac[700],
    bgLight: COLOR_TOKENS.sipac[50],
    borderColor: COLOR_TOKENS.sipac[200],
    borderAccent: COLOR_TOKENS.sipac[500],
    quadrants: {
      strategic: { name: 'Estratégico (Q1)', bg: '#dcdaf5', stroke: '#5f57b6', text: '#181545' },
      quickWins: { name: 'Quick Wins (Q2)', bg: '#ecebf9', stroke: '#7c75cb', text: '#29246a' },
      coreOperational: { name: 'Operativo (Q3)', bg: '#f5f4fc', stroke: '#9b96db', text: '#463e96' },
      lowPriority: { name: 'Descarte (Q4)', bg: '#f8fbfc', stroke: '#d6e5ed', text: '#6d93b1' },
    },
    badge: 'font-mono text-[8px] font-bold text-secondary-800 bg-secondary-50 px-1.5 py-0.5 rounded border border-secondary-200',
  },
  ahp: {
    id: 'ahp',
    name: 'Tubería AHP · Priorización Saaty',
    themeColor: COLOR_TOKENS.ahp[600],
    textColor: COLOR_TOKENS.ahp[700],
    bgLight: COLOR_TOKENS.ahp[50],
    borderColor: COLOR_TOKENS.ahp[200],
    borderAccent: COLOR_TOKENS.ahp[600],
    charts: {
      bar: '#0d9488',
      barHover: '#0f766e',
      weightStroke: '#115e59',
    },
    badge: 'font-mono text-[8px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200',
  },
  validation: {
    successColor: COLOR_TOKENS.success[600],
    bgLight: COLOR_TOKENS.success[50],
    borderColor: COLOR_TOKENS.success[200],
    thresholdCR: 0.10,
    badgeValid: 'font-mono text-[8px] font-bold text-success-800 bg-success-50 px-1.5 py-0.5 rounded border border-success-200',
    badgeInvalid: 'font-mono text-[8px] font-bold text-danger-800 bg-danger-50 px-1.5 py-0.5 rounded border border-danger-200',
  },
} as const;

/**
 * Recharts & Web SVG Color Palette
 */
export const CHART_PALETTE = {
  primary: COLOR_TOKENS.altus[500],
  secondary: COLOR_TOKENS.sipac[500],
  teal: COLOR_TOKENS.ahp[600],
  success: COLOR_TOKENS.success[600],
  accent: COLOR_TOKENS.accent[700],
  danger: COLOR_TOKENS.danger[600],
  grid: COLOR_TOKENS.neutral[200],
  text: COLOR_TOKENS.neutral[800],
  tooltipBg: '#ffffff',
  tooltipBorder: COLOR_TOKENS.neutral[200],
  series: [
    '#3ba1da', // ALTUS Azure
    '#9b96db', // SIPAC Purple
    '#0d9488', // AHP Teal
    '#ee961d', // Accent Amber
    '#059669', // Validation Emerald
    '#dc2626', // Warning Red
    '#497294', // Slate
  ],
} as const;

/**
 * Helper to get semantic color based on process type
 */
export function getProcessTheme(processType: string) {
  const normalized = processType.toLowerCase();
  if (normalized.includes('altus')) return SEMANTIC_THEME.altus;
  if (normalized.includes('sipac')) return SEMANTIC_THEME.sipac;
  if (normalized.includes('ahp')) return SEMANTIC_THEME.ahp;
  return SEMANTIC_THEME.altus;
}

/**
 * Helper to get Saaty CR verification color and label
 */
export function getSaatyStatus(cr: number) {
  const isConsistent = cr < 0.10;
  return {
    isConsistent,
    color: isConsistent ? COLOR_TOKENS.success[600] : COLOR_TOKENS.danger[600],
    bgColor: isConsistent ? COLOR_TOKENS.success[50] : COLOR_TOKENS.danger[50],
    borderColor: isConsistent ? COLOR_TOKENS.success[200] : COLOR_TOKENS.danger[200],
    label: isConsistent ? `✓ CR = ${cr.toFixed(3)} < 0.10 (Consistente)` : `✕ CR = ${cr.toFixed(3)} ≥ 0.10 (Inconsistente)`,
  };
}
