import type { ResetScope } from '../types';
import { element } from './dom';

export function showResetConfirmModal(
  host: HTMLElement,
  onConfirm: (scope: ResetScope) => void,
): { close: () => void } {
  const scrim = element('div', 'modal-scrim');
  const card = element('div', 'modal-card panel');
  const title = element('h3', 'section-title', '초기화 범위 선택');
  const description = element(
    'p',
    'muted-text',
    '기록만 지우거나, 조준 관련 저장값만 비우거나, 전체 데이터를 안전하게 초기화할 수 있습니다.',
  );
  const actions = element('div', 'modal-action-list');
  const cancel = element('button', 'secondary-button', '취소');
  const recordsOnly = element('button', 'secondary-button', '기록만 초기화');
  const calibrationOnly = element('button', 'secondary-button', '조준 저장값 초기화');
  const fullReset = element('button', 'danger-button', '전체 초기화');

  actions.append(recordsOnly, calibrationOnly, fullReset);
  card.append(title, description, actions, cancel);
  scrim.append(card);
  host.append(scrim);

  const close = () => scrim.remove();

  cancel.addEventListener('click', close);
  recordsOnly.addEventListener('click', () => {
    onConfirm('records');
    close();
  });
  calibrationOnly.addEventListener('click', () => {
    onConfirm('calibration');
    close();
  });
  fullReset.addEventListener('click', () => {
    onConfirm('all');
    close();
  });

  return { close };
}
