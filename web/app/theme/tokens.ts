/**
 * @tfm/web - Design Tokens & Recharts Color Mappings
 * 
 * Re-exports the canonical tokens from @tfm/core and provides
 * specialized color constants for Next.js, Recharts, and React Flow.
 */

export {
  COLOR_TOKENS,
  SEMANTIC_THEME,
  CHART_PALETTE,
  getProcessTheme,
  getSaatyStatus,
} from "@tfm/core/dist/theme.js";

import { COLOR_TOKENS } from "@tfm/core/dist/theme.js";

/**
 * Recharts Color Configurations for Dashboard
 */
export const RECHARTS_THEME = {
  altus: {
    radarStroke: COLOR_TOKENS.altus[700],
    radarFill: 'rgba(59, 161, 218, 0.4)',
    radarDot: COLOR_TOKENS.altus[600],
    gridColor: '#c2e2f7',
    axisColor: COLOR_TOKENS.neutral[600],
  },
  sipac: {
    strategic: COLOR_TOKENS.sipac[700],
    quickWins: COLOR_TOKENS.sipac[500],
    operational: COLOR_TOKENS.sipac[400],
    discard: COLOR_TOKENS.neutral[400],
  },
  ahp: {
    barFill: COLOR_TOKENS.ahp[600],
    barHover: COLOR_TOKENS.ahp[700],
    thresholdLine: COLOR_TOKENS.danger[600],
    consistencyFill: COLOR_TOKENS.success[600],
  },
};

/**
 * React Flow Technical Node Styling Tokens
 */
export const REACT_FLOW_NODE_THEME = {
  default: {
    background: '#ffffff',
    border: '#9cb6cb',
    text: '#09141a',
  },
  active: {
    background: '#f0f8fd',
    border: '#3ba1da',
    text: '#133147',
    pulseColor: '#3ba1da',
  },
  completed: {
    background: '#ecfdf5',
    border: '#10b981',
    text: '#022c22',
  },
  error: {
    background: '#fef2f2',
    border: '#ef4444',
    text: '#450a0a',
  },
};
