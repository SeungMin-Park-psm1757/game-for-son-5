# Story Event System

## Delivery Types
- `toast`
- `overlay`
- `scene`

## Trigger Families
- `first_launch`
- `first_calibration_complete`
- `first_ten`
- `first_bullseye`
- `low_score_streak`
- `personal_best`
- `mode_unlocked`
- `match_end`
- `home_comment`

## Delivery Guidance
- `toast` is used inside live match flow for light cheers.
- `overlay` is for short encouragement or PB moments.
- `scene` is reserved for intro, unlocks, and ending beats.

## 72 Arrow Expansion
- `ranking72` already exists in `src/data/modes.ts`.
- Unlock logic is wired through match results and story events.
- Exposing it on the home screen later is mostly a UI decision plus tuning.
