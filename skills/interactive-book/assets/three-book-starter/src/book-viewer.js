import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createFeltMat } from './felt-mat.js';
import { getPageTurnPose, PAGE_TURN_TIMING } from './page-turn.mjs';

const W = 3.42, D = 4.54, PAPER_Y = .245;
const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';
const SERIF = '"Songti SC", "Noto Serif CJK SC", "SimSun", Georgia, serif';
const smooth = x => { const t = THREE.MathUtils.clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const mix = THREE.MathUtils.lerp;

function surface() {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1600;
  return { canvas, ctx: canvas.getContext('2d') };
}
function wrap(ctx, text, x, y, width, lineHeight, maxLines = 5) {
  const lines = []; let line = '';
  for (const character of String(text ?? '')) {
    if (character === '\n' || (line && ctx.measureText(line + character).width > width)) {
      lines.push(line); line = character === '\n' ? '' : character;
    } else line += character;
  }
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => {
    let output = value;
    if (index === maxLines - 1 && lines.length > maxLines) {
      while (output && ctx.measureText(output + '…').width > width) output = output.slice(0, -1);
      output += '…';
    }
    ctx.fillText(output, x, y + index * lineHeight);
  });
}
function paperBase(ctx, side) {
  ctx.fillStyle = '#f6f0df'; ctx.fillRect(0, 0, 1200, 1600);
  for (let i = 0; i < 4800; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(105,83,48,.025)' : 'rgba(255,255,255,.12)';
    ctx.fillRect((i * 137.93) % 1200, (i * 71.17) % 1600, 1.4, 1.4);
  }
  const shade = ctx.createLinearGradient(0, 0, 1200, 0);
  if (side === 'left') {
    shade.addColorStop(0, '#7b5b2e08'); shade.addColorStop(.8, '#7b5b2e00'); shade.addColorStop(1, '#53412830');
  } else {
    shade.addColorStop(0, '#5341282b'); shade.addColorStop(.16, '#7b5b2e00'); shade.addColorStop(1, '#7b5b2e08');
  }
  ctx.fillStyle = shade; ctx.fillRect(0, 0, 1200, 1600);
}
function printPaper(ctx, chapter, index, side) {
  paperBase(ctx, side); ctx.textAlign = 'left'; ctx.fillStyle = '#9c563d';
  ctx.font = `25px ${FONT}`;
  ctx.fillText(side === 'left' ? (chapter?.kicker || `第 ${index + 1} 章`) : '立体实验', 90, 115);
  ctx.fillStyle = '#273c3f';
  if (side === 'left' && chapter) {
    ctx.font = `bold 78px ${SERIF}`; wrap(ctx, chapter.title, 90, 280, 1015, 108, 3);
    ctx.fillStyle = '#ae6246'; ctx.fillRect(91, 555, 130, 5);
    ctx.fillStyle = '#283d3e'; ctx.font = `43px ${FONT}`;
    wrap(ctx, chapter.question, 90, 655, 1000, 68, 3);
    ctx.font = `35px ${FONT}`; ctx.fillStyle = '#61675c';
    wrap(ctx, chapter.summary, 90, 965, 995, 57, 5);
    ctx.fillStyle = '#e7e4d1'; ctx.fillRect(90, 1320, 1015, 130);
    ctx.font = `29px ${FONT}`; ctx.fillStyle = '#596754';
    wrap(ctx, chapter.hint || '改变一个条件，观察模型和读数。', 123, 1372, 945, 43, 2);
  }
  if (side === 'right') {
    ctx.font = `25px ${FONT}`; ctx.fillStyle = '#858a78'; ctx.textAlign = 'center';
    ctx.fillText('拖动观察 · 点选部件', 600, 1420);
  }
  ctx.textAlign = side === 'left' ? 'left' : 'right'; ctx.fillStyle = '#898b79'; ctx.font = `30px ${SERIF}`;
  if (index >= 0) ctx.fillText(String(index * 2 + (side === 'left' ? 2 : 3)), side === 'left' ? 90 : 1105, 1535);
}
function printCover(ctx, book) {
  ctx.fillStyle = book.coverColor || '#173541'; ctx.fillRect(0, 0, 1200, 1600);
  for (let i = 0; i < 1200; i += 4) {
    ctx.fillStyle = i % 8 ? '#ffffff04' : '#00000005';
    ctx.fillRect(i, 0, 1, 1600); ctx.fillRect(0, i * 1.4, 1200, 1);
  }
  ctx.strokeStyle = '#b5aa80'; ctx.lineWidth = 2;
  ctx.strokeRect(69, 69, 1062, 1462); ctx.strokeRect(83, 83, 1034, 1434);
  ctx.textAlign = 'center'; ctx.fillStyle = '#dfd6b7'; ctx.font = `26px ${FONT}`;
  ctx.fillText('AN INTERACTIVE FIELD BOOK', 600, 190);
  ctx.font = `bold 116px ${SERIF}`; wrap(ctx, book.title, 600, 450, 960, 155, 3);
  if (book.subtitle) { ctx.font = `32px ${FONT}`; wrap(ctx, book.subtitle, 600, 695, 960, 48, 2); }
  // Original emblem; replace this drawing when adapting the book to a subject.
  ctx.strokeStyle = '#b5c6bf'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(245, 1190); ctx.lineTo(245, 855); ctx.lineTo(955, 855); ctx.lineTo(955, 1190); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(600, 855); ctx.lineTo(720, 1160); ctx.stroke();
  ctx.beginPath(); ctx.arc(720, 1160, 55, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([12, 12]); ctx.beginPath(); ctx.arc(600, 855, 327, .95, 2.2); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#aebbb1'; ctx.font = `26px ${FONT}`; ctx.fillText('观察 · 操作 · 理解', 600, 1380);
}

export function createBookViewer(container, {
  book, createModel, onChange = () => {}, onSelect = () => {}, onError = () => {},
}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
  catch (error) { onError(error); return null; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', '立体交互书；点击封面打开，拖动观察，点选模型部件。');
  Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block', touchAction: 'none' });
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe5dfd1);
  const camera = new THREE.PerspectiveCamera(37, 1, .05, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .08, minDistance: 3, maxDistance: 32,
    minPolarAngle: .12, maxPolarAngle: Math.PI * .47, rotateSpeed: .55, screenSpacePanning: true });
  const environment = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromScene(environment, .025);
  scene.environment = environmentTarget.texture; scene.environmentIntensity = .6;
  environment.dispose(); pmrem.dispose();
  const ambient = new THREE.HemisphereLight(0xfffcf0, 0x9b8c75, 2.4); scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xfff6dc, 3.5); keyLight.position.set(-3.5, 8, 4);
  keyLight.castShadow = true; keyLight.shadow.mapSize.set(2048, 2048);
  Object.assign(keyLight.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: .5, far: 24 });
  keyLight.shadow.normalBias = .018; keyLight.shadow.bias = -.0002; scene.add(keyLight);
  const fill = new THREE.DirectionalLight(0xdbe9ee, 1.4); fill.position.set(6, 4, -5); scene.add(fill);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshStandardMaterial({ color: 0xe5dfd1, roughness: 1 }));
  desk.rotation.x = -Math.PI / 2; desk.position.y = -.055; desk.receiveShadow = true; scene.add(desk);
  const mat = createFeltMat(); scene.add(mat.root);
  const textures = new Set(mat.textures);
  const texture = canvas => {
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); textures.add(map); return map;
  };
  for (const map of mat.textures) map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const binding = new THREE.Group(); scene.add(binding);
  const cloth = new THREE.MeshStandardMaterial({ color: book.coverColor || 0x183640, roughness: .88 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xf3ecd9, roughness: .96 });
  function block(w, h, d, material, x, y, z, parent = binding) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  block(W + .13, .08, D + .13, cloth, W / 2, .005, 0);
  const leftBase = block(W + .13, .08, D + .13, cloth, -W / 2, .005, 0);
  block(W, .17, D, paper, W / 2, .13, 0);
  const leftStack = block(W, .17, D, paper, -W / 2, .13, 0);
  block(.085, .23, D + .12, cloth, 0, .105, 0);
  const ribbon = block(.10, .008, .74, new THREE.MeshStandardMaterial({ color: 0xa94d3d, roughness: .9 }), -.13, .249, D / 2 + .25);
  ribbon.rotation.y = -.13;
  const edges = new THREE.Group(); binding.add(edges);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xc3b99e, transparent: true, opacity: .4 });
  for (let j = 1; j < 14; j++) for (const side of [-1, 1]) {
    const y = .052 + j * .012;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(.025 * side, y, D / 2), new THREE.Vector3(W * side, y, D / 2), new THREE.Vector3(W * side, y, -D / 2),
    ]);
    const line = new THREE.Line(geometry, edgeMaterial); line.userData.side = side; edges.add(line);
  }
  const leftSurface = surface(), rightSurface = surface();
  const leftTexture = texture(leftSurface.canvas), rightTexture = texture(rightSurface.canvas);
  function leaf(map, x) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map, toneMapped: false, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, PAPER_Y, 0); binding.add(mesh); return mesh;
  }
  const leftPage = leaf(leftTexture, -W / 2), rightPage = leaf(rightTexture, W / 2);
  const modelShadow = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.ShadowMaterial({ opacity: .2, depthWrite: false }));
  modelShadow.rotation.x = -Math.PI / 2; modelShadow.position.set(W / 2, PAPER_Y + .003, 0);
  modelShadow.receiveShadow = true; binding.add(modelShadow);
  const coverHinge = new THREE.Group(); coverHinge.position.y = .285; binding.add(coverHinge);
  const cover = block(W + .13, .065, D + .13, cloth, W / 2, 0, 0, coverHinge); cover.userData.cover = true;
  const coverSurface = surface(); printCover(coverSurface.ctx, book);
  const coverPrint = new THREE.Mesh(new THREE.PlaneGeometry(W + .10, D + .10), new THREE.MeshStandardMaterial({ map: texture(coverSurface.canvas), roughness: .9 }));
  coverPrint.rotation.x = -Math.PI / 2; coverPrint.position.set(W / 2, .034, 0); coverPrint.userData.cover = true; coverHinge.add(coverPrint);
  const turnHinge = new THREE.Group(); turnHinge.position.y = PAPER_Y + .014; binding.add(turnHinge);
  const turnGeometry = new THREE.PlaneGeometry(W, D, 28, 1), backGeometry = turnGeometry.clone();
  for (let i = 0; i < backGeometry.attributes.uv.count; i++) backGeometry.attributes.uv.setX(i, 1 - backGeometry.attributes.uv.getX(i));
  const turnFront = new THREE.Mesh(turnGeometry, new THREE.MeshBasicMaterial({ side: THREE.FrontSide, toneMapped: false }));
  const turnBack = new THREE.Mesh(backGeometry, new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false }));
  for (const face of [turnFront, turnBack]) {
    face.rotation.x = -Math.PI / 2; face.position.x = W / 2; face.castShadow = true; turnHinge.add(face);
  }
  turnHinge.visible = false;

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { index: -1, targetIndex: -1, running: false, value: 0, busy: false, phase: 'cover', night: false };
  const models = new Map(); let active = null, openAmount = 0, popupAmount = 0, transition = null, token = 0;
  let cameraTween = null, raf = 0, lastTime = performance.now(), disposed = false;
  const notify = () => { if (!disposed) onChange({ ...state }); };
  const setPhase = phase => { if (phase !== state.phase) { state.phase = phase; notify(); } };
  function printCurrent() {
    const chapter = book.chapters[state.index];
    printPaper(leftSurface.ctx, chapter, state.index, 'left'); printPaper(rightSurface.ctx, chapter, state.index, 'right');
    leftTexture.needsUpdate = rightTexture.needsUpdate = true;
  }
  function activate(index) {
    if (index !== state.index) {
      state.index = index;
      const chapter = book.chapters[index];
      state.value = chapter?.control?.initial ?? 0;
      state.running = Boolean(chapter?.running) && !motionPreference.matches;
    }
    if (index >= 0 && !models.has(index)) {
      const model = createModel(book.chapters[index]);
      const popup = new THREE.Group(); popup.position.set(W / 2, PAPER_Y + .014, -.05); popup.add(model.root);
      binding.add(popup); models.set(index, { ...model, popup });
    }
    active = models.get(index) || null;
    for (const model of models.values()) model.popup.visible = false;
    if (active) active.update?.(0, { running: false, value: state.value });
    printCurrent();
  }
  function fullCamera() {
    const isOpen = state.targetIndex >= 0;
    const direction = new THREE.Vector3(.015, .86, .58).normalize();
    const navigating = state.busy && isOpen;
    const target = new THREE.Vector3(isOpen ? 0 : W / 2, navigating ? 1.05 : .26, 0);
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    let distance = Math.max((isOpen ? 7.45 : 4.2) / camera.aspect, 5.7) / (2 * tangent) * 1.08;
    if (navigating) {
      // Fit the full swept volume, including the upright leaf, rather than
      // fitting only the flat spread. The near side also has less view depth.
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
      const up = new THREE.Vector3().crossVectors(direction, right);
      for (const x of [-W - .14, W + .14]) for (const y of [-.055, PAPER_Y + W + .2]) for (const z of [-D / 2 - .1, D / 2 + .1]) {
        const offset = new THREE.Vector3(x, y, z).sub(target), near = offset.dot(direction);
        distance = Math.max(distance, near + Math.abs(offset.dot(up)) / (tangent * .92),
          near + Math.abs(offset.dot(right)) / (tangent * camera.aspect * .92));
      }
    }
    return { target, position: target.clone().addScaledVector(direction, distance) };
  }
  function resetView(instant = false) {
    const next = fullCamera();
    if (instant || motionPreference.matches || (state.busy && state.targetIndex >= 0)) {
      camera.position.copy(next.position); controls.target.copy(next.target); cameraTween = null;
    }
    else cameraTween = next;
  }
  function releaseSnapshots(current) {
    leftPage.material.map = leftTexture; rightPage.material.map = rightTexture;
    turnFront.material.map = turnBack.material.map = null; turnHinge.visible = false;
    if (current?.snapshots) for (const pair of Object.values(current.snapshots)) for (const map of Object.values(pair)) {
      map.dispose(); textures.delete(map);
    }
  }
  function cancelTransition() {
    if (!transition) return;
    const old = transition; transition = null; releaseSnapshots(old); printCurrent(); old.resolve(false);
  }
  function snapshot(index) {
    const result = {};
    for (const side of ['left', 'right']) {
      const drawing = surface(); printPaper(drawing.ctx, book.chapters[index], index, side); result[side] = texture(drawing.canvas);
    }
    return result;
  }
  function finish(current) {
    if (transition !== current || current.token !== token) return;
    releaseSnapshots(current); transition = null; state.busy = false; controls.enabled = true; resetView();
    state.phase = state.index < 0 ? 'cover' : 'complete'; notify(); current.resolve(true);
  }
  function goTo(index) {
    if (disposed) return Promise.resolve(false);
    if (!Number.isInteger(index) || index < -1 || index >= book.chapters.length) return Promise.resolve(false);
    ++token; cancelTransition(); state.targetIndex = index;
    if (motionPreference.matches) {
      activate(index); openAmount = index < 0 ? 0 : 1; popupAmount = index < 0 ? 0 : 1;
      state.busy = false; controls.enabled = true; state.phase = index < 0 ? 'cover' : 'complete'; resetView(); notify(); return Promise.resolve(true);
    }
    // Establish the safe frame before any cover/page movement can be rendered.
    state.busy = true; controls.enabled = false; resetView(state.targetIndex >= 0);
    return new Promise(resolve => {
      const current = { token, resolve, elapsed: 0, startPopup: popupAmount, startOpen: openAmount, target: index };
      transition = current;
      if (index < 0) {
        current.type = 'close'; current.coverDuration = Math.max(.12, openAmount * .72); setPhase('fold');
      } else if (openAmount < .999) {
        current.type = 'open'; current.coverDuration = Math.max(.12, (1 - openAmount) * .72);
        popupAmount = 0; activate(index); setPhase('open');
      } else if (index === state.index) {
        current.type = 'settle'; setPhase('unfold');
      } else {
        current.type = 'turn'; current.direction = index < state.index ? -1 : 1;
        current.snapshots = { previous: snapshot(state.index), next: snapshot(index) };
        leftPage.material.map = current.snapshots.previous.left; rightPage.material.map = current.snapshots.previous.right;
        turnFront.material.map = current.direction < 0 ? current.snapshots.next.right : current.snapshots.previous.right;
        turnBack.material.map = current.direction < 0 ? current.snapshots.previous.left : current.snapshots.next.left;
        turnFront.material.needsUpdate = turnBack.material.needsUpdate = true; setPhase('fold');
      }
      notify();
    });
  }
  function setValue(value) {
    if (state.index < 0 || disposed) return;
    const control = book.chapters[state.index].control;
    if (!Number.isFinite(value) || !control) return;
    state.value = THREE.MathUtils.clamp(value, control.min, control.max); notify();
  }
  function setRunning(running) { if (!disposed && state.index >= 0) { state.running = Boolean(running); notify(); } }
  function setNight(night) {
    if (disposed) return;
    state.night = Boolean(night); mat.setTheme(state.night);
    scene.background.setHex(state.night ? 0x263437 : 0xe5dfd1); desk.material.color.setHex(state.night ? 0x263437 : 0xe5dfd1);
    ambient.intensity = state.night ? 1.5 : 2.4; keyLight.intensity = state.night ? 2.5 : 3.5; notify();
  }

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(); let pointerStart = null;
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const targets = state.index < 0 ? [coverHinge] : active?.popup.visible ? [active.root] : [];
    return raycaster.intersectObjects(targets, true).find(hit => {
      for (let object = hit.object; object; object = object.parent) if (!object.visible) return false;
      return true;
    });
  }
  const down = event => { pointerStart = { x: event.clientX, y: event.clientY }; };
  function up(event) {
    const start = pointerStart; pointerStart = null;
    if (!start || state.busy || Math.hypot(start.x - event.clientX, start.y - event.clientY) > 6) return;
    const hit = pick(event); if (!hit) return;
    if (hit.object.userData.cover) { void goTo(0); return; }
    for (let object = hit.object; object; object = object.parent) if (object.userData.part) { onSelect(object.userData.part); break; }
  }
  function move(event) {
    const hit = state.busy ? null : pick(event);
    let selectable = hit?.object.userData.cover;
    for (let object = hit?.object; object; object = object.parent) selectable ||= Boolean(object.userData.part);
    renderer.domElement.style.cursor = selectable ? 'pointer' : 'grab';
  }
  const leave = () => { pointerStart = null; renderer.domElement.style.cursor = 'grab'; };
  const controlStart = () => { cameraTween = null; };
  const visible = () => { lastTime = performance.now(); };
  renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up);
  renderer.domElement.addEventListener('pointermove', move); renderer.domElement.addEventListener('pointerleave', leave);
  controls.addEventListener('start', controlStart); document.addEventListener('visibilitychange', visible);
  function resize() {
    const bounds = container.getBoundingClientRect(), width = Math.max(1, bounds.width), height = Math.max(1, bounds.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 600 ? 1.5 : 2)); renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix(); resetView();
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  const initialCamera = fullCamera(); camera.position.copy(initialCamera.position); controls.target.copy(initialCamera.target); cameraTween = null;
  printCurrent();
  function frame(now) {
    if (disposed) return;
    const dt = document.hidden ? 0 : Math.min(Math.max((now - lastTime) / 1000, 0), .05); lastTime = now;
    let modelAllowed = true;
    const current = transition;
    if (current) {
      current.elapsed += dt;
      if (current.type === 'turn') {
        const pose = getPageTurnPose(current.elapsed, current.direction); setPhase(pose.phase);
        turnHinge.visible = pose.pageVisible; turnHinge.rotation.z = pose.angle;
        popupAmount = pose.modelScale * (pose.phase === 'fold' ? current.startPopup : 1); modelAllowed = pose.modelVisible;
        if (pose.pageVisible && !current.underlaid) {
          if (current.direction < 0) leftPage.material.map = current.snapshots.next.left;
          else rightPage.material.map = current.snapshots.next.right;
          current.underlaid = true;
        }
        for (const face of [turnFront, turnBack]) {
          const positions = face.geometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i) + W / 2;
            positions.setZ(i, Math.sin(x / W * Math.PI) * Math.sin(pose.pageProgress * Math.PI) * .18);
          }
          positions.needsUpdate = true; face.geometry.computeVertexNormals();
        }
        if ((pose.phase === 'unfold' || pose.done) && !current.swapped) {
          activate(current.target); current.swapped = true;
          leftPage.material.map = current.snapshots.next.left; rightPage.material.map = current.snapshots.next.right;
          notify();
        }
        if (pose.done) { popupAmount = 1; finish(current); }
      } else if (current.type === 'open') {
        const coverProgress = smooth(current.elapsed / current.coverDuration);
        openAmount = mix(current.startOpen, 1, coverProgress);
        const unfolding = current.elapsed >= current.coverDuration;
        popupAmount = unfolding ? smooth((current.elapsed - current.coverDuration) / PAGE_TURN_TIMING.unfold) : 0;
        modelAllowed = unfolding; setPhase(unfolding ? 'unfold' : 'open');
        if (current.elapsed >= current.coverDuration + PAGE_TURN_TIMING.unfold) { openAmount = popupAmount = 1; finish(current); }
      } else if (current.type === 'close') {
        const folding = current.elapsed < PAGE_TURN_TIMING.fold;
        popupAmount = folding ? current.startPopup * (1 - smooth(current.elapsed / PAGE_TURN_TIMING.fold)) : 0;
        modelAllowed = folding;
        if (!folding) openAmount = mix(current.startOpen, 0, smooth((current.elapsed - PAGE_TURN_TIMING.fold) / current.coverDuration));
        setPhase(folding ? 'fold' : 'close');
        if (current.elapsed >= PAGE_TURN_TIMING.fold + current.coverDuration) { activate(-1); openAmount = popupAmount = 0; finish(current); }
      } else {
        popupAmount = mix(current.startPopup, 1, smooth(current.elapsed / PAGE_TURN_TIMING.unfold));
        if (current.elapsed >= PAGE_TURN_TIMING.unfold) { popupAmount = 1; finish(current); }
      }
    }
    coverHinge.rotation.z = smooth(openAmount) * Math.PI; coverHinge.position.y = .285 - openAmount * .29;
    leftBase.visible = leftStack.visible = leftPage.visible = openAmount > .2;
    for (const line of edges.children) line.visible = line.userData.side > 0 || openAmount > .2;
    ribbon.visible = openAmount > .8; modelShadow.visible = openAmount > .99;
    for (const model of models.values()) model.popup.visible = model === active && openAmount > .999 && popupAmount > 0 && modelAllowed && !turnHinge.visible;
    if (active) {
      active.popup.scale.y = Math.max(.001, popupAmount);
      active.update?.(dt, { running: state.running && !transition && openAmount > .999, value: state.value });
    }
    if (cameraTween) {
      const damping = 1 - Math.exp(-dt * 9);
      camera.position.lerp(cameraTween.position, damping); controls.target.lerp(cameraTween.target, damping);
      if (camera.position.distanceTo(cameraTween.position) < .003 && controls.target.distanceTo(cameraTween.target) < .003) cameraTween = null;
    }
    controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame); queueMicrotask(notify);
  return {
    goTo, setValue, setRunning, setNight, resetView, getState: () => ({ ...state }),
    dispose() {
      if (disposed) return; disposed = true; ++token; cancelTransition(); cancelAnimationFrame(raf);
      observer.disconnect(); controls.removeEventListener('start', controlStart); controls.dispose();
      document.removeEventListener('visibilitychange', visible);
      renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerleave', leave);
      const geometries = new Set(), materials = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
          materials.add(material); for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        }
      });
      // Factory hooks own non-Three resources; this viewer owns the GPU objects.
      for (const model of models.values()) model.dispose?.();
      for (const geometry of geometries) geometry.dispose(); for (const material of materials) material.dispose();
      for (const map of textures) map.dispose(); environmentTarget.dispose(); keyLight.shadow.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
