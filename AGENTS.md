# Project: Family Archery 3D

## Goal
Build a mobile-first 3D web archery game with:
- gyro aiming on mobile
- desktop mouse/keyboard fallback
- pre-match quick sync and first-time full calibration
- family story events
- hall of fame on the first screen
- local-only persistence
- lightweight static deployment

## Product rules
- Keep the emotional tone warm, supportive, and lightly humorous.
- The first screen must be the Hall of Fame home screen.
- A small reset button must exist, but it must require hold-to-confirm and a confirmation modal.
- Story events must be data-driven, not hardcoded inside scene logic.
- Support three event delivery types: toast, overlay dialog, full story scene.
- Use the existing family cast naming convention: dad, mom, seyeon, jeongwoo.
- Never block the match too often with story scenes.
- Failures should trigger encouragement, not punishment.

## Technical rules
- Use Vite + TypeScript + Three.js.
- Do not use a heavy physics engine in v1.
- Use custom projectile and scoring logic.
- Keep the game static-host friendly.
- Use localStorage with versioned keys.
- Separate input adapters: sensor, touch fallback, desktop.
- Calibration data must be stored independently from records.
- Match logic must support 6, 12, and 72 arrows via config.
- Build the 12-arrow mode first, but architect for 72 arrows.

## Performance rules
- Mobile-first.
- Prioritize smooth aiming and stable frame rate over visual effects.
- Prefer low-poly geometry and small textures.
- Avoid unnecessary post-processing.

## UX rules
- First launch: home -> start -> prologue -> calibration -> match.
- Every later match: home -> quick sync -> match.
- Recenter button must always be accessible during a match.
- Sensor permission flow must be explicit and user-friendly.
- If sensor access fails, automatically offer touch aiming.

## Coding rules
- Keep modules small and focused.
- Add tests for scoring, hall of fame sorting, and calibration math.
- After each phase, run build/tests and report changed files.
- Update README as features stabilize.
