import { PORTRAITS } from '../data/portraits';
import { element } from '../ui/dom';
import type { StoryEvent } from './types';

export class StoryOverlay {
  constructor(private readonly host: HTMLElement) {}

  public async present(event: StoryEvent): Promise<void> {
    if (event.delivery === 'toast') {
      await this.showToast(event);
      return;
    }

    if (event.delivery === 'overlay') {
      await this.showOverlay(event);
      return;
    }

    await this.showScene(event);
  }

  private async showToast(event: StoryEvent): Promise<void> {
    const line = event.lines[0];
    const toast = element('div', 'story-toast');
    toast.innerHTML = `<strong>${line.speaker}</strong> ${line.text}`;
    this.host.append(toast);

    await new Promise<void>((resolve) => {
      window.setTimeout(() => {
        toast.classList.add('is-leaving');
        window.setTimeout(() => {
          toast.remove();
          resolve();
        }, 280);
      }, 2200);
    });
  }

  private async showOverlay(event: StoryEvent): Promise<void> {
    const scrim = element('div', 'story-overlay-scrim');
    const dialog = element('div', 'story-overlay-card');
    const line = event.lines[0];
    const portrait = this.createPortrait(line.portraitKey);
    const speaker = element('div', 'story-speaker', line.speaker);
    const text = element('div', 'story-text');
    text.innerHTML = event.lines.map((entry) => `<p>${entry.text}</p>`).join('');
    const button = element('button', 'primary-button', '계속');

    dialog.append(portrait, speaker, text, button);
    scrim.append(dialog);
    this.host.append(scrim);

    await new Promise<void>((resolve) => {
      button.addEventListener('click', () => {
        scrim.remove();
        resolve();
      });
    });
  }

  private async showScene(event: StoryEvent): Promise<void> {
    const scrim = element('div', 'story-scene');
    const card = element('div', 'story-scene-card');
    const portraitSlot = element('div', 'story-scene-portrait');
    const speaker = element('div', 'story-speaker');
    const text = element('div', 'story-scene-text');
    const footer = element('div', 'story-scene-footer');
    const next = element('button', 'primary-button', '다음');
    const skip = element('button', 'secondary-button', '건너뛰기');
    footer.append(skip, next);
    card.append(portraitSlot, speaker, text, footer);
    scrim.append(card);
    this.host.append(scrim);

    let index = 0;
    const renderLine = () => {
      const current = event.lines[index];
      portraitSlot.replaceChildren(this.createPortrait(current.portraitKey));
      speaker.textContent = current.speaker;
      text.textContent = current.text;
      next.textContent = index === event.lines.length - 1 ? '마치기' : '다음';
    };

    renderLine();

    await new Promise<void>((resolve) => {
      next.addEventListener('click', () => {
        index += 1;
        if (index >= event.lines.length) {
          scrim.remove();
          resolve();
          return;
        }
        renderLine();
      });

      skip.addEventListener('click', () => {
        scrim.remove();
        resolve();
      });

      scrim.addEventListener('click', (eventTarget) => {
        if (eventTarget.target === scrim) {
          next.click();
        }
      });
    });
  }

  private createPortrait(key: keyof typeof PORTRAITS): HTMLElement {
    const portrait = element('div', 'story-portrait');
    const info = PORTRAITS[key];
    portrait.style.setProperty('--portrait-accent', info.accent);
    portrait.style.setProperty('--portrait-soft', info.accentSoft);
    portrait.innerHTML = `<span>${info.initials}</span><small>${info.label}</small>`;
    return portrait;
  }
}
