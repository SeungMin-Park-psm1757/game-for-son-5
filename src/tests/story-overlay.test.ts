import { describe, expect, it } from 'vitest';
import { StoryOverlay } from '../story/StoryOverlay';

describe('story overlay scene layout', () => {
  it('renders the illustrated story scene with portrait imagery', async () => {
    const host = document.createElement('div');
    document.body.append(host);

    const overlay = new StoryOverlay(host);
    const presentPromise = overlay.present({
      id: 'test-scene',
      delivery: 'scene',
      priority: 1,
      trigger: { type: 'first_launch' },
      lines: [{ speaker: '아빠', portraitKey: 'char_dad', text: '가족 응원으로 첫 장면을 연다.' }],
    });

    await Promise.resolve();

    const scene = host.querySelector('.story-scene');
    expect(scene).not.toBeNull();
    expect(scene?.querySelector('.story-scene-illustration')).not.toBeNull();

    const portraitImage = scene?.querySelector<HTMLImageElement>('.story-portrait-media img');
    expect(portraitImage?.getAttribute('src')).toContain('assets/family/char_dad.png');

    scene?.querySelector<HTMLButtonElement>('.secondary-button')?.click();
    await presentPromise;

    expect(host.querySelector('.story-scene')).toBeNull();
  });
});
