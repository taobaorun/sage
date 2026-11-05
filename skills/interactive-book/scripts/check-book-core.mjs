// Run with Node.js. No browser, renderer, network, or npm dependencies.
import assert from 'node:assert/strict';
import { createPageTurnTimeline, getPageTurnPose, PAGE_TURN_DURATION } from '../assets/book-core/page-turn.mjs';
import { createPaperLayout, getSpreadPages, containsPaperPoint } from '../assets/book-core/paper-layout.mjs';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const assertClear = pose => assert.ok(!(pose.pageVisible && pose.modelVisible), 'moving/landing page overlaps a visible model');
let samples = 0;
for (const timeline of [createPageTurnTimeline(), createPageTurnTimeline({ fold: .15, flip: .8, land: 0, unfold: .4 })]) {
  const { fold, flip, land, unfold } = timeline.timing;
  for (const direction of [-1, 1]) {
    let lastProgress = 0, lastAngle = direction < 0 ? Math.PI : 0;
    for (let i = 0; i <= 2000; i++) {
      const pose = timeline.getPose(timeline.duration * i / 2000, direction);
      assertClear(pose);
      assert.ok(pose.modelScale >= 0 && pose.modelScale <= 1);
      assert.ok(pose.angle >= 0 && pose.angle <= Math.PI);
      assert.ok(pose.pageProgress >= lastProgress);
      assert.ok(direction < 0 ? pose.angle <= lastAngle + 1e-12 : pose.angle >= lastAngle - 1e-12);
      if (pose.pageProgress > 0 && pose.pageProgress < 1) assert.equal(pose.modelVisible, false);
      if (pose.pageVisible) assert.equal(pose.modelScale, 0);
      lastProgress = pose.pageProgress; lastAngle = pose.angle; samples++;
    }
    for (const boundary of [fold, fold + flip, fold + flip + land, timeline.duration]) {
      for (const delta of [-1e-9, 0, 1e-9]) assertClear(timeline.getPose(boundary + delta, direction));
    }
    const start = timeline.getPose(0, direction), finish = timeline.getPose(timeline.duration, direction);
    near(start.angle, direction < 0 ? Math.PI : 0); near(start.modelScale, 1);
    near(finish.angle, direction < 0 ? 0 : Math.PI); near(finish.modelScale, 1);
    assert.equal(finish.done, true); assert.equal(finish.pageVisible, false);
    near(timeline.getPose(fold / 2, direction).modelScale, .5);
    near(timeline.getPose(fold + flip / 2, direction).angle, Math.PI / 2);
    near(timeline.getPose(fold + flip + land + unfold / 2, direction).modelScale, .5);
    assert.deepEqual(timeline.getPose(-1, direction), start);
    assert.deepEqual(timeline.getPose(NaN, direction), start);
  }
}
assert.deepEqual(getPageTurnPose(PAGE_TURN_DURATION + 10), getPageTurnPose(PAGE_TURN_DURATION));
for (const timing of [{ fold: 0 }, { flip: -1 }, { land: -1 }, { unfold: Infinity }]) {
  assert.throws(() => createPageTurnTimeline(timing), RangeError);
}
assert.throws(() => getPageTurnPose(0, 0), RangeError);
const mutableTiming = { flip: .8 }, immutableTimeline = createPageTurnTimeline(mutableTiming);
mutableTiming.flip = 9;
assert.equal(immutableTimeline.timing.flip, .8);

// Negative control: the retired simultaneous fold/flip can put a sheet point
// inside a visible pop-up's box. The same visibility assertion must reject it.
const oldProgress = .1, oldAngle = oldProgress ** 2 * (3 - 2 * oldProgress) * Math.PI;
const oldScale = 1 - oldProgress / .25;
const sheetX = 1.7, sheetY = .259 + sheetX * Math.tan(oldAngle);
assert.ok(sheetX > .9 && sheetX < 2.5 && sheetY > .27 && sheetY < .27 + 1.5 * oldScale);
assert.throws(() => assertClear({ pageVisible: oldAngle > 0, modelVisible: oldScale > 0 }), assert.AssertionError);
assertClear(getPageTurnPose(.22 + .64 * oldProgress));

let coordinateChecks = 0;
for (const dimensions of [
  { width: 1200, height: 1600, worldWidth: 3.42, worldDepth: 4.54 },
  { width: 800, height: 600, worldWidth: 4, worldDepth: 3 },
]) {
  const layout = createPaperLayout(dimensions);
  assert.deepEqual(layout.paperPointFromUV({ x: 0, y: 1 }), { x: 0, y: 0 });
  assert.deepEqual(layout.paperPointFromUV({ x: 1, y: 0 }), { x: layout.width, y: layout.height });
  for (const side of ['left', 'right']) for (const u of [0, .2, .5, 1]) for (const v of [0, .1, .8, 1]) {
    const point = layout.paperPointFromUV({ x: u, y: v });
    const uv = layout.uvFromPaperPoint(point); near(uv.x, u); near(uv.y, v);
    const world = layout.rectToWorld({ ...point, w: 0, h: 0 }, side);
    const back = layout.worldToPaperPoint(world, side); near(back.x, point.x); near(back.y, point.y);
    coordinateChecks++;
  }
  const rect = { x: 80, y: 100, w: 160, h: 60 };
  for (const side of ['left', 'right']) {
    const world = layout.rectToWorld(rect, side);
    const center = layout.worldToPaperPoint(world, side);
    near(center.x, rect.x + rect.w / 2); near(center.y, rect.y + rect.h / 2);
    assert.ok(containsPaperPoint(rect, center));
    near(world.width, rect.w / layout.width * layout.worldWidth);
    near(world.depth, rect.h / layout.height * layout.worldDepth);
  }
  assert.ok(!containsPaperPoint(rect, { x: rect.x - 1, y: rect.y }));
  assert.ok(containsPaperPoint(rect, { x: rect.x + rect.w, y: rect.y + rect.h }));
  assert.throws(() => layout.rectToWorld(rect, 'unknown'), RangeError);
  // Reversing the V convention must fail the same expected top-edge check.
  assert.throws(() => assert.deepEqual({ x: 0, y: layout.height }, layout.paperPointFromUV({ x: 0, y: 1 })), assert.AssertionError);
}
assert.throws(() => createPaperLayout({ width: 0, height: 1, worldWidth: 1, worldDepth: 1 }), RangeError);
for (const firstPage of [2, 10]) for (let index = 0; index < 12; index++) {
  const pages = getSpreadPages(index, firstPage);
  assert.equal(pages.left, firstPage + index * 2); assert.equal(pages.right, pages.left + 1);
  assert.equal(getSpreadPages(index + 1, firstPage).left, pages.right + 1);
}
assert.deepEqual(getSpreadPages(0), { left: 2, right: 3 });
for (const invalid of [-1, .5, NaN, Infinity]) assert.throws(() => getSpreadPages(invalid), RangeError);
assert.throws(() => getSpreadPages(Number.MAX_SAFE_INTEGER), RangeError);
console.log(`Book core passed: ${samples} poses, boundaries, both directions, ${coordinateChecks} coordinate round trips, pages, and negative controls.`);
