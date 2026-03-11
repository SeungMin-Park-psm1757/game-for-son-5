# Calibration Structure

## Stored Data
- `inputMode`
- `dominantHand`
- `neutral`
- `zeroOffset`
- `sensitivity`
- `deadzone`
- `smoothingAlpha`
- `jitter`

## Full Calibration
1. Choose input path and request sensor permission if available.
2. Select dominant hand.
3. Capture neutral pose.
4. Measure movement range.
5. Measure micro-jitter.
6. Save and continue.

## Quick Sync
1. Reuse the saved profile.
2. Hold the device centered for about 1 second.
3. Update `zeroOffset` only.
4. Go straight into the next match.

## Notes
- Sensor denial falls back to touch mode.
- Desktop uses mouse aim plus keyboard support.
- Calibration data is stored separately from match records.
