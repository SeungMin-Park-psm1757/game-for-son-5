import type { ModeId } from '../types';

export type RouteName = 'home' | 'settings' | 'calibration' | 'match' | 'result';

export interface RouteState {
  name: RouteName;
  params: URLSearchParams;
}

export function parseRoute(hash: string): RouteState {
  const normalized = hash.startsWith('#/') ? hash.slice(2) : 'home';
  const [path = 'home', queryString = ''] = normalized.split('?');
  const name = (path || 'home') as RouteName;

  if (!['home', 'settings', 'calibration', 'match', 'result'].includes(name)) {
    return { name: 'home', params: new URLSearchParams() };
  }

  return {
    name,
    params: new URLSearchParams(queryString),
  };
}

export function buildRoute(name: RouteName, params?: Record<string, string>): string {
  const search = new URLSearchParams(params);
  const query = search.toString();
  return `#/${name}${query ? `?${query}` : ''}`;
}

export function parseModeId(value: string | null): ModeId {
  if (value === 'practice6' || value === 'trial12' || value === 'ranking72') {
    return value;
  }
  return 'practice6';
}
