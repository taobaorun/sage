import * as THREE from 'three';
import { pendulumPeriod, leverEffort } from './lesson-math.js';

// These two small physical scenes demonstrate the model adapter. Geometry,
// UI readings and motion use the same lesson equations, not alternate images.
function material(color, metalness = 0, roughness = .65) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function mesh(parent, geometry, surface, name, position, part) {
  const object = new THREE.Mesh(geometry, surface);
  object.name = name;
  object.position.set(...position);
  object.castShadow = object.receiveShadow = true;
  if (part) object.userData.part = part;
  parent.add(object);
  return object;
}

function box(parent, size, surface, name, position, part) {
  return mesh(parent, new THREE.BoxGeometry(...size), surface, name, position, part);
}

function cylinder(parent, radius, height, surface, name, position, part) {
  return mesh(parent, new THREE.CylinderGeometry(radius, radius, height, 32), surface, name, position, part);
}

function bounded(value, minimum, maximum, fallback) {
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, minimum, maximum) : fallback;
}

function createPendulum() {
  const root = new THREE.Group(); root.name = 'pendulum teaching model';
  const oak = material(0xc7a67c, 0, .86), enamel = material(0x395c60, .16, .53);
  const brass = material(0xba8a48, .68, .31), cordSurface = material(0x665d48, .1, .9);
  const dark = material(0x2d3c3b, .22, .7), ivory = material(0xeee7cc, 0, .8);
  const support = { title: '固定支架', body: '支点固定，摆锤可以绕它往返摆动。拖动页面可以从侧面观察支架、摆线和摆锤。' };
  const lengthPart = { title: '摆长', body: '摆长从悬点量到摆锤中心。这个理想小角摆中，周期 T = 2π√(L/g)，摆长越长，往返一次越慢。' };
  const bobPart = { title: '摆锤', body: '摆锤的往返由同一小角摆公式驱动；本例忽略空气阻力和摩擦，不模拟大角度摆动。' };

  box(root, [2.36, .11, 1.04], oak, 'pendulum wooden base', [0, .055, 0], support);
  box(root, [2.23, .025, .9], enamel, 'base top inlay', [0, .121, 0]);
  for (const x of [-.96, .96]) {
    cylinder(root, .055, 1.83, brass, 'pendulum upright', [x, 1.04, -.16], support);
    cylinder(root, .13, .065, brass, 'upright foot', [x, .16, -.16], support);
    mesh(root, new THREE.SphereGeometry(.08, 20, 12), brass, 'upright cap', [x, 1.97, -.16]);
  }
  box(root, [2.12, .12, .26], enamel, 'pendulum crossbar', [0, 1.96, -.13], support);
  const axle = cylinder(root, .075, .32, brass, 'pendulum pivot axle', [0, 1.92, .01], lengthPart);
  axle.rotation.x = Math.PI / 2;
  const pivot = new THREE.Group(); pivot.name = 'pendulum swinging pivot'; pivot.position.set(0, 1.92, .15); root.add(pivot);
  const cord = cylinder(pivot, .011, 1, cordSurface, 'pendulum cord', [0, -.5, 0], lengthPart);
  const bob = mesh(pivot, new THREE.SphereGeometry(.145, 40, 24), brass, 'pendulum bob', [0, -1, 0], bobPart);
  const bobBand = mesh(bob, new THREE.TorusGeometry(.146, .008, 8, 40), dark, 'bob equator', [0, 0, 0]);
  bobBand.rotation.x = Math.PI / 2;
  // A restrained angle scale is geometry on the support, not a foreground card.
  for (let step = -3; step <= 3; step++) {
    const angle = step * 5 * Math.PI / 180, radius = .23;
    const tick = box(root, [.012, step === 0 ? .075 : .04, .012], ivory, 'angle tick', [Math.sin(angle) * radius, 1.92 - Math.cos(angle) * radius, -.005]);
    tick.rotation.z = -angle;
  }
  let phase = 0;
  function update(dt, { running = false, value = .8 } = {}) {
    const length = bounded(value, .45, 1.1, .8), worldLength = length * 1.4;
    if (running && Number.isFinite(dt) && dt > 0) phase = (phase + 2 * Math.PI / pendulumPeriod(length) * dt) % (2 * Math.PI);
    pivot.rotation.z = Math.sin(phase) * THREE.MathUtils.degToRad(14);
    cord.scale.y = worldLength; cord.position.y = -worldLength / 2;
    bob.position.y = -worldLength;
  }
  update(0);
  return { root, update };
}

function createLever() {
  const root = new THREE.Group(); root.name = 'lever teaching model';
  const oak = material(0xc7a67c, 0, .86), enamel = material(0x385e63, .18, .5);
  const brass = material(0xbb8a48, .65, .33), copper = material(0xb2694f, .45, .45);
  const pale = material(0xded8bc, .12, .74), dark = material(0x344241, .18, .72);
  const fixedPart = { title: '固定负载', body: '左边负载取 1 单位，左力臂取 1 单位，作为对照条件保持不变。单位是教学约定，不代表实际砝码规格。' };
  const effortPart = { title: '平衡所需的力', body: '右端离支点越远，平衡所需的力越小。本例右力 = 1 ÷ 右力臂。砝码的高度表示力的相对大小；这不是动态下落实验。' };
  const pivotPart = { title: '支点', body: '理想平衡时，两边的力矩相等：力 × 力臂。这里忽略梁的自重与摩擦，梁始终保持水平来比较所需的力。' };
  box(root, [2.65, .11, .95], oak, 'lever wooden base', [0, .055, 0]);
  box(root, [2.52, .025, .82], pale, 'lever base inset', [0, .122, 0]);
  const triangle = new THREE.Shape(); triangle.moveTo(-.3, 0); triangle.lineTo(.3, 0); triangle.lineTo(0, .8); triangle.closePath();
  const fulcrumGeometry = new THREE.ExtrudeGeometry(triangle, { depth: .24, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2, steps: 1 });
  mesh(root, fulcrumGeometry, brass, 'lever fulcrum', [0, .15, -.12], pivotPart);
  const pin = cylinder(root, .075, .39, dark, 'lever pivot pin', [0, .95, 0], pivotPart); pin.rotation.x = Math.PI / 2;
  box(root, [2.65, .09, .24], enamel, 'horizontal lever beam', [0, .99, 0], pivotPart);
  const armScale = .72;
  for (let mark = -8; mark <= 8; mark++) {
    box(root, [.009, .006, mark % 2 ? .075 : .14], pale, 'beam ruler tick', [mark * .15, 1.038, 0]);
  }
  const leftPan = cylinder(root, .205, .035, brass, 'fixed load pan', [-armScale, 1.055, 0], fixedPart);
  const leftLoad = cylinder(root, .16, .22, copper, 'fixed unit load', [-armScale, 1.1825, 0], fixedPart);
  cylinder(leftLoad, .06, .04, dark, 'fixed load handle', [0, .13, 0]);
  const right = new THREE.Group(); right.name = 'movable effort assembly'; root.add(right);
  cylinder(right, .205, .035, brass, 'effort pan', [0, 1.055, 0], effortPart);
  const effort = cylinder(right, .16, .22, enamel, 'variable effort weight', [0, 1.1825, 0], effortPart);
  const handle = cylinder(right, .06, .04, dark, 'effort weight handle', [0, 1.3125, 0], effortPart);
  // Thin rods make the distances from the single central pivot visible.
  box(root, [armScale, .018, .018], copper, 'fixed arm measure', [-armScale / 2, .77, .19], fixedPart);
  const arm = box(root, [1, .018, .018], enamel, 'variable arm measure', [.36, .77, .19], effortPart);
  for (const x of [-armScale, 0]) box(root, [.018, .09, .018], dark, 'arm measure end', [x, .77, .19]);
  const endMark = box(root, [.018, .09, .018], dark, 'movable arm measure end', [armScale, .77, .19], effortPart);
  function update(_dt, { value = 1 } = {}) {
    const length = bounded(value, .6, 1.6, 1), force = leverEffort(length), worldLength = length * armScale;
    right.position.x = worldLength;
    effort.scale.y = force; effort.position.y = 1.0725 + .11 * force;
    handle.position.y = 1.0725 + .22 * force + .02;
    arm.scale.x = worldLength; arm.position.x = worldLength / 2; endMark.position.x = worldLength;
  }
  update(0);
  return { root, update };
}

export function createDemoModel(chapter) {
  if (chapter.id === 'pendulum') return createPendulum();
  if (chapter.id === 'lever') return createLever();
  throw new Error(`No demo model for chapter: ${chapter.id}`);
}
