function positive(value) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError('Expected a positive finite number');
  return value;
}
export const pendulumPeriod = length => 2 * Math.PI * Math.sqrt(positive(length) / 9.81);
export const leverEffort = arm => 1 / positive(arm);
