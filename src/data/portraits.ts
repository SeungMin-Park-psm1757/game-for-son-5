export type PortraitKey =
  | 'char_dad'
  | 'char_mom'
  | 'char_seyeon'
  | 'char_jeongwoo'
  | 'rival_siwoo'
  | 'rival_siyeon'
  | 'rival_jihwan'
  | 'rival_junhong'
  | 'rival_carbot'
  | 'rival_pororo'
  | 'rival_loopy';

export interface PortraitDefinition {
  key: PortraitKey;
  label: string;
  initials: string;
  accent: string;
  accentSoft: string;
  assetPath: string;
  renderMode: 'photo' | 'pixel';
}

export const PORTRAITS: Record<PortraitKey, PortraitDefinition> = {
  char_dad: {
    key: 'char_dad',
    label: '아빠',
    initials: '아',
    accent: '#0f766e',
    accentSoft: '#99f6e4',
    assetPath: 'assets/family/char_dad.png',
    renderMode: 'photo',
  },
  char_mom: {
    key: 'char_mom',
    label: '엄마',
    initials: '엄',
    accent: '#be185d',
    accentSoft: '#fbcfe8',
    assetPath: 'assets/family/char_mom.png',
    renderMode: 'photo',
  },
  char_seyeon: {
    key: 'char_seyeon',
    label: '세연',
    initials: '세',
    accent: '#c2410c',
    accentSoft: '#fed7aa',
    assetPath: 'assets/family/char_seyeon.png',
    renderMode: 'photo',
  },
  char_jeongwoo: {
    key: 'char_jeongwoo',
    label: '정우',
    initials: '정',
    accent: '#1d4ed8',
    accentSoft: '#bfdbfe',
    assetPath: 'assets/family/char_jeongwoo.png',
    renderMode: 'photo',
  },
  rival_siwoo: {
    key: 'rival_siwoo',
    label: '시우',
    initials: '시',
    accent: '#0f766e',
    accentSoft: '#a7f3d0',
    assetPath: 'assets/rivals/siwoo.svg',
    renderMode: 'pixel',
  },
  rival_siyeon: {
    key: 'rival_siyeon',
    label: '시연',
    initials: '시',
    accent: '#2563eb',
    accentSoft: '#bfdbfe',
    assetPath: 'assets/rivals/siyeon.svg',
    renderMode: 'pixel',
  },
  rival_jihwan: {
    key: 'rival_jihwan',
    label: '지환',
    initials: '지',
    accent: '#7c3aed',
    accentSoft: '#ddd6fe',
    assetPath: 'assets/rivals/jihwan.svg',
    renderMode: 'pixel',
  },
  rival_junhong: {
    key: 'rival_junhong',
    label: '준홍',
    initials: '준',
    accent: '#b45309',
    accentSoft: '#fde68a',
    assetPath: 'assets/rivals/junhong.svg',
    renderMode: 'pixel',
  },
  rival_carbot: {
    key: 'rival_carbot',
    label: '카봇',
    initials: '카',
    accent: '#374151',
    accentSoft: '#cbd5e1',
    assetPath: 'assets/rivals/carbot.svg',
    renderMode: 'pixel',
  },
  rival_pororo: {
    key: 'rival_pororo',
    label: '뽀로로',
    initials: '뽀',
    accent: '#1d4ed8',
    accentSoft: '#bfdbfe',
    assetPath: 'assets/rivals/pororo.svg',
    renderMode: 'pixel',
  },
  rival_loopy: {
    key: 'rival_loopy',
    label: '루피',
    initials: '루',
    accent: '#db2777',
    accentSoft: '#fbcfe8',
    assetPath: 'assets/rivals/loopy.svg',
    renderMode: 'pixel',
  },
};

export function getPortraitImageUrl(key: PortraitKey): string {
  return resolvePublicAsset(PORTRAITS[key].assetPath);
}

function resolvePublicAsset(path: string): string {
  if (typeof window === 'undefined') {
    return path;
  }

  return new URL(path, window.location.href.split('#')[0]).toString();
}
