import { getPortraitImageUrl, PORTRAITS } from '../data/portraits';
import { listRivals } from '../data/rival';
import type { ModeId, RivalId } from '../types';
import { element } from './dom';

interface RivalPickerOptions {
  modeId: Exclude<ModeId, 'practice6'>;
  initialRivalId?: RivalId | null;
}

export async function presentRivalPicker(host: HTMLElement, options: RivalPickerOptions): Promise<RivalId | null> {
  const rivals = listRivals(options.modeId);
  if (rivals.length === 0) {
    return null;
  }

  return new Promise<RivalId | null>((resolve) => {
    const scrim = element('div', 'modal-scrim rival-picker-scrim');
    const card = element('div', 'modal-card rival-picker-card');
    const header = element('div', 'rival-picker-header');
    const titleBlock = element('div', 'rival-picker-title');
    const eyebrow = element('span', 'eyebrow', '\ub9e4\uce58\uc5c5');
    const title = element('h2', 'section-title', '\uc0c1\ub300 \uc120\ud0dd');
    const description = element(
      'p',
      'muted-text rival-picker-description',
      '\uc5f0\uc2b5 \uc678 \uacbd\uae30\uc5d0\uc11c\ub294 \ub204\uad6c\uc640 \ubd99\uc744\uc9c0 \uba3c\uc800 \uace0\ub97c \uc218 \uc788\uc5b4\uc694.',
    );
    const closeButton = element('button', 'topbar-icon-button', '\ub2eb\uae30');
    const body = element('div', 'rival-picker-grid');
    const footer = element('div', 'rival-picker-footer');
    const cancelButton = element('button', 'secondary-button', '\uba54\uc778\uc73c\ub85c');
    const confirmButton = element('button', 'primary-button', '\uc120\ud0dd\ud558\uace0 \uc2dc\uc791');

    let settled = false;
    let selectedId: RivalId = options.initialRivalId && rivals.some((rival) => rival.id === options.initialRivalId) ? options.initialRivalId : rivals[0].id;

    const finish = (result: RivalId | null) => {
      if (settled) {
        return;
      }

      settled = true;
      scrim.remove();
      resolve(result);
    };

    const setSelected = (nextId: RivalId) => {
      selectedId = nextId;
      confirmButton.disabled = false;

      [...body.querySelectorAll<HTMLElement>('.rival-picker-option')].forEach((node) => {
        node.dataset.selected = node.dataset.rivalId === nextId ? 'true' : 'false';
      });
    };

    titleBlock.append(eyebrow, title, description);
    header.append(titleBlock, closeButton);

    for (const rival of rivals) {
      const portrait = PORTRAITS[rival.portraitKey];
      const option = element('button', 'rival-picker-option');
      option.type = 'button';
      option.dataset.rivalId = rival.id;
      option.style.setProperty('--rival-accent', rival.accent);
      option.style.setProperty('--rival-soft', rival.accentSoft);
      option.innerHTML = `
        <span class="rival-picker-photo-wrap">
          <img class="rival-picker-photo" src="${getPortraitImageUrl(rival.portraitKey)}" alt="${portrait.label}" />
        </span>
        <strong>${rival.name}</strong>
        <small>${rival.title}</small>
      `;
      option.addEventListener('click', () => setSelected(rival.id));
      body.append(option);
    }

    footer.append(cancelButton, confirmButton);
    card.append(header, body, footer);
    scrim.append(card);
    host.append(scrim);

    closeButton.addEventListener('click', () => finish(null));
    cancelButton.addEventListener('click', () => finish(null));
    confirmButton.addEventListener('click', () => finish(selectedId));
    scrim.addEventListener('click', (event) => {
      if (event.target === scrim) {
        finish(null);
      }
    });

    setSelected(selectedId);
  });
}
