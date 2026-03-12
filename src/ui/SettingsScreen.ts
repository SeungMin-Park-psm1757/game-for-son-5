import type { AppSettings, InputMode } from '../types';
import { element, type ScreenController } from './dom';

interface SettingsScreenOptions {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onBack: () => void;
}

export function createSettingsScreen(options: SettingsScreenOptions): ScreenController {
  const screen = element('section', 'screen settings-screen');
  const card = element('div', 'panel settings-panel');
  const title = element('h2', 'section-title', '설정');
  const intro = element('p', 'muted-text', '사운드, 진동, 입력 방식처럼 지금 바로 체감되는 옵션만 남겨두었습니다.');
  const form = element('div', 'settings-grid');

  const profileInput = createTextControl('프로필 이름', options.settings.profileName);
  const inputModeSelect = createSelectControl('기본 조준 방식', options.settings.preferredInput, [
    ['auto', '자동'],
    ['touch', '터치'],
    ['desktop', '데스크톱'],
  ]);
  const reduceMotion = createCheckboxControl('모션 줄이기', options.settings.reduceMotion);
  const audioEnabled = createCheckboxControl('사운드 켜기', options.settings.audioEnabled);
  const hapticsEnabled = createCheckboxControl('진동 및 햅틱 켜기', options.settings.hapticsEnabled);
  const debugOverlay = createCheckboxControl('디버그 오버레이', options.settings.debugOverlay);

  form.append(
    profileInput.wrapper,
    inputModeSelect.wrapper,
    reduceMotion.wrapper,
    audioEnabled.wrapper,
    hapticsEnabled.wrapper,
    debugOverlay.wrapper,
  );

  const actions = element('div', 'action-row');
  const back = element('button', 'secondary-button', '뒤로');
  const save = element('button', 'primary-button', '저장');
  actions.append(back, save);
  card.append(title, intro, form, actions);
  screen.append(card);

  const collect = (): AppSettings => ({
    ...options.settings,
    profileName: profileInput.input.value.trim() || options.settings.profileName,
    preferredInput: inputModeSelect.select.value as InputMode | 'auto',
    reduceMotion: reduceMotion.input.checked,
    audioEnabled: audioEnabled.input.checked,
    hapticsEnabled: hapticsEnabled.input.checked,
    debugOverlay: debugOverlay.input.checked,
  });

  back.addEventListener('click', options.onBack);
  save.addEventListener('click', () => {
    options.onSave(collect());
    options.onBack();
  });

  return { element: screen };
}

function createCheckboxControl(label: string, checked: boolean) {
  const wrapper = element('label', 'settings-item');
  const title = element('span', 'settings-label', label);
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  wrapper.append(title, input);
  return { wrapper, input };
}

function createTextControl(label: string, value: string) {
  const wrapper = element('label', 'settings-item');
  const title = element('span', 'settings-label', label);
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  wrapper.append(title, input);
  return { wrapper, input };
}

function createSelectControl(label: string, value: string, options: Array<[string, string]>) {
  const wrapper = element('label', 'settings-item');
  const title = element('span', 'settings-label', label);
  const select = document.createElement('select');
  for (const [optionValue, optionLabel] of options) {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = optionValue === value;
    select.append(option);
  }
  wrapper.append(title, select);
  return { wrapper, select };
}
