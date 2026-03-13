# Family Archery 3D

Family Archery 3D is a mobile-first 3D web archery game with a warm family cheering tone. The first screen is a compact family home stage, and the core loop is built around touch aiming, hold-to-draw timing, short repeatable matches, and family story events that cheer the player on instead of punishing mistakes.

## Game Overview
- Family home stage with quick access to `게임 시작`, `명예의 전당`, and `설정`.
- Quiz gate before each match with chapter-sensitive math, spelling, and dictation challenges.
- Touch-first hold-to-draw aiming with desktop mouse fallback.
- Stylized 3D range with scoped aiming, chapter-based wind difficulty, and ring scoring.
- Practice 6 arrows and chapter record matches for Korea, Japan, and USA.
- Progression level reduces tremor and updates arrow tip, feather, and bow grip colors.
- Data-driven family events support toast, overlay dialog, and full story scene delivery.

## Play Link
- GitHub Pages: https://seungmin-park-psm1757.github.io/game-for-son-5/
- Repository: https://github.com/SeungMin-Park-psm1757/game-for-son-5
- If the page is not live yet, wait for the Pages workflow to finish and make sure GitHub Pages is enabled in the repository settings.

## Controls
- Mobile: drag on the range to aim, hold the draw button, release to shoot.
- Desktop: move the mouse to aim, hold the draw button or `Space`, release to shoot.
- Recenter during a match: HUD `재중앙` button or `R`.
- Pause during a match: HUD `일시정지`.

## Development
```bash
npm install
npm run dev
```

## Build And Test
```bash
npm run build
npm run test
```

## GitHub Pages Deployment
1. Push the repository to GitHub.
2. Enable GitHub Pages with GitHub Actions.
3. The included workflow at `.github/workflows/deploy.yml` builds `dist/` and deploys it.
4. `vite.config.ts` uses a relative `base`, so static hosting works without repo-name edits.

## Project Structure
```text
src/
  app/           routing and app orchestration
  data/          modes, portraits, record sorting helpers
  game/          three.js range, ballistics, scoring, match controller
  input/         sensor/touch/desktop aim and calibration math
  persistence/   localStorage keys and hydration
  services/      audio and haptic helpers
  story/         event data, selection engine, story overlay
  ui/            home, calibration, HUD, result, settings, reset modal
  tests/         scoring, records, calibration unit tests
```

## Docs
- `docs/calibration.md`
- `docs/art-direction.md`
- `docs/hall-of-fame.md`
- `docs/story-events.md`

## Current Gaps
- Real mobile gyroscope behavior still needs hands-on device testing.
- Portrait rendering currently uses stylized placeholders instead of reused legacy images.
- `three-vendor` is still the biggest production chunk, so there is room for deeper asset/code trimming later.
