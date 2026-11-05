// Renderer-independent timing only. The scene owns snapshots, cancellation,
// model selection and resource disposal. These seconds are example defaults.
export const PAGE_TURN_TIMING = Object.freeze({ fold: .22, flip: .64, land: .08, unfold: .26 });

export function createPageTurnTimeline(overrides = {}) {
  const timing = Object.freeze({ ...PAGE_TURN_TIMING, ...overrides });
  for (const key of ['fold', 'flip', 'land', 'unfold']) {
    const value = timing[key];
    if (!Number.isFinite(value) || (key === 'land' ? value < 0 : value <= 0)) {
      throw new RangeError(`${key} must be finite and ${key === 'land' ? 'non-negative' : 'positive'}`);
    }
  }
  const { fold, flip, land, unfold } = timing;
  const flipEnd = fold + flip, unfoldStart = flipEnd + land;
  const duration = unfoldStart + unfold;
  if (!Number.isFinite(duration)) throw new RangeError('Total duration must be finite');
  const unit = value => Math.max(0, Math.min(1, value));
  const smooth = value => value * value * (3 - 2 * value);

  function getPose(elapsed, direction = 1) {
    if (direction !== 1 && direction !== -1) throw new RangeError('Direction must be 1 or -1');
    // Invalid elapsed input starts at zero; a finite time past the end completes.
    const time = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
    const phase = time < fold ? 'fold' : time < flipEnd ? 'flip'
      : time < unfoldStart ? 'land' : time < duration ? 'unfold' : 'complete';
    const pageProgress = smooth(unit((time - fold) / flip));
    const modelScale = phase === 'fold' ? 1 - smooth(unit(time / fold))
      : phase === 'unfold' ? smooth(unit((time - unfoldStart) / unfold)) : phase === 'complete' ? 1 : 0;
    return {
      phase, pageProgress,
      angle: (direction < 0 ? 1 - pageProgress : pageProgress) * Math.PI,
      pageVisible: phase === 'flip' || phase === 'land',
      modelScale, modelVisible: modelScale > 0, done: phase === 'complete',
    };
  }

  return Object.freeze({ timing, duration, getPose });
}

const defaultTimeline = createPageTurnTimeline();
export const PAGE_TURN_DURATION = defaultTimeline.duration;
export const getPageTurnPose = defaultTimeline.getPose;
