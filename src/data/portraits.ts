export type PortraitKey = 'char_dad' | 'char_mom' | 'char_seyeon' | 'char_jeongwoo';

export interface PortraitDefinition {
  key: PortraitKey;
  label: string;
  initials: string;
  accent: string;
  accentSoft: string;
}

export const PORTRAITS: Record<PortraitKey, PortraitDefinition> = {
  char_dad: {
    key: 'char_dad',
    label: '아빠',
    initials: '아',
    accent: '#0f766e',
    accentSoft: '#99f6e4',
  },
  char_mom: {
    key: 'char_mom',
    label: '엄마',
    initials: '엄',
    accent: '#be185d',
    accentSoft: '#fbcfe8',
  },
  char_seyeon: {
    key: 'char_seyeon',
    label: '세연',
    initials: '세',
    accent: '#c2410c',
    accentSoft: '#fed7aa',
  },
  char_jeongwoo: {
    key: 'char_jeongwoo',
    label: '정우',
    initials: '정',
    accent: '#1d4ed8',
    accentSoft: '#bfdbfe',
  },
};
