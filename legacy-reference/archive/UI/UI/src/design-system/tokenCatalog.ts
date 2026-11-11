export type TokenSwatch = {
  label: string;
  background: string;
  text?: string;
};

export const systemTokenCatalog: TokenSwatch[] = [
  { label: 'Warm Canvas', background: '--br-color-canvas' },
  { label: 'White', background: '--br-color-surface' },
  { label: 'Ink', background: '--br-color-ink' },
  { label: 'Quartz', background: '--br-color-quartz' },
  { label: 'Rosewood', background: '--br-color-rosewood' },
  { label: 'Porcelain', background: '--br-color-porcelain' },
  { label: 'Soft Rose', background: '--br-color-soft-rose' },
  { label: 'Neutral stroke', background: '--br-color-neutral-stroke' },
];

export const labelTokenCatalog: TokenSwatch[] = [
  { label: 'SUCCESS', background: '--br-label-success-bg', text: '--br-label-success-text' },
  { label: 'PROCESS', background: '--br-label-process-bg', text: '--br-label-process-text' },
  { label: 'PENDING', background: '--br-label-pending-bg', text: '--br-label-pending-text' },
  { label: 'SCHEDULED', background: '--br-label-scheduled-bg', text: '--br-label-scheduled-text' },
  { label: 'DRAFT', background: '--br-label-draft-bg', text: '--br-label-draft-text' },
  { label: 'ARCHIVE', background: '--br-label-archive-bg', text: '--br-label-archive-text' },
  { label: 'DOCUMENT', background: '--br-label-document-bg', text: '--br-label-document-text' },
  { label: 'FOLLOW-UP', background: '--br-label-follow-up-bg', text: '--br-label-follow-up-text' },
  { label: 'PROBLEM', background: '--br-label-problem-bg', text: '--br-label-problem-text' },
];

export const occupancyTokenCatalog: TokenSwatch[] = [
  { label: 'OCCUPIED', background: '--br-color-occupancy-occupied', text: '--br-color-active-text' },
  { label: 'VACANT', background: '--br-color-occupancy-vacant', text: '--br-color-active-text' },
  { label: 'RESERVED', background: '--br-color-occupancy-reserved', text: '--br-color-active-text' },
  { label: 'NOTICE GIVEN', background: '--br-color-occupancy-notice-given', text: '--br-color-active-text' },
  { label: 'TURNOVER', background: '--br-color-occupancy-turnover', text: '--br-color-active-text' },
  { label: 'PRE-LEASED', background: '--br-color-occupancy-pre-leased', text: '--br-color-active-text' },
];

export const attentionTokenCatalog: TokenSwatch[] = [
  { label: 'CLEAR', background: '--br-label-clear-bg', text: '--br-label-attention-text' },
  { label: 'CAUTION', background: '--br-label-caution-bg', text: '--br-label-attention-text' },
  { label: 'CRITICAL', background: '--br-label-critical-bg', text: '--br-label-attention-text' },
];

export const typeTokenCatalog = [
  ['Micro', '--br-type-micro-size'],
  ['Label', '--br-type-label-size'],
  ['Secondary', '--br-type-secondary-size'],
  ['Value weight', '--br-type-value-weight'],
  ['Label weight', '--br-type-label-weight'],
] as const;

export const spacingTokenCatalog = ['--br-space-1', '--br-space-2', '--br-space-3', '--br-space-4', '--br-space-6', '--br-space-8'] as const;
export const radiusTokenCatalog = ['--br-radius-sm', '--br-radius-md', '--br-radius-lg'] as const;

export const showcaseSectorCatalog = [
  { id: 'TOKENS', label: 'TOKENS' },
  { id: 'PRIMITIVES', label: 'PRIMITIVES' },
  { id: 'COMPONENTS', label: 'COMPONENTS' },
  { id: 'LAYOUTS', label: 'LAYOUTS' },
  { id: 'PAGES', label: 'PAGES' },
  { id: 'INTEGRATION_MOCKUP', label: 'INTEGRATION MOCKUP' },
] as const;
