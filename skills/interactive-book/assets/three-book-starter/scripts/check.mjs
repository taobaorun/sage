import assert from 'node:assert/strict';
import { pendulumPeriod, leverEffort } from '../src/lesson-math.js';
import { getPageTurnPose, PAGE_TURN_DURATION } from '../src/page-turn.mjs';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9);
near(pendulumPeriod(4) / pendulumPeriod(1), 2);
near(leverEffort(2), .5);
for (const value of [0, -1, NaN, Infinity]) {
  assert.throws(() => pendulumPeriod(value), RangeError);
  assert.throws(() => leverEffort(value), RangeError);
}
for (let i = 0; i <= 4000; i++) for (const direction of [-1, 1]) {
  const pose = getPageTurnPose(PAGE_TURN_DURATION * i / 4000, direction);
  assert.ok(!(pose.pageVisible && pose.modelVisible));
}
console.log('Lesson relationships and page/model phase separation passed. Real-browser checks remain required.');
