import * as THREE from 'three';

// A static, locally generated wool-felt surface. It is scenery, so it carries
// no pickable part IDs and never participates in the book's moving hierarchy.
const WIDTH = 12.6, DEPTH = 9.2, CORNER = .28;
const SURFACE_Y = -.037;

function randomSequence(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function canvasSurface(size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

function fibreTextures() {
  const size = 512, gridSize = 24, random = randomSequence(0x79a32f);
  const colour = canvasSurface(size), height = canvasSurface(size);
  const colourPixels = colour.ctx.createImageData(size, size);
  const heightPixels = height.ctx.createImageData(size, size);
  const cloud = Float32Array.from({ length: gridSize * gridSize }, () => random());
  const smooth = n => n * n * (3 - 2 * n);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = x / size * gridSize, gy = y / size * gridSize;
    const ix = Math.floor(gx), iy = Math.floor(gy), u = smooth(gx - ix), v = smooth(gy - iy);
    const sample = (dx, dy) => cloud[((iy + dy) % gridSize) * gridSize + (ix + dx) % gridSize];
    const coarse = (sample(0, 0) * (1 - u) + sample(1, 0) * u) * (1 - v)
      + (sample(0, 1) * (1 - u) + sample(1, 1) * u) * v;
    const grain = random() - .5, index = (y * size + x) * 4;
    const shade = Math.round(231 + (coarse - .5) * 12 + grain * 17);
    const relief = Math.round(128 + (coarse - .5) * 8 + grain * 35);
    for (let channel = 0; channel < 3; channel++) {
      colourPixels.data[index + channel] = shade;
      heightPixels.data[index + channel] = relief;
    }
    colourPixels.data[index + 3] = heightPixels.data[index + 3] = 255;
  }
  colour.ctx.putImageData(colourPixels, 0, 0);
  height.ctx.putImageData(heightPixels, 0, 0);
  colour.ctx.lineCap = height.ctx.lineCap = 'round';
  // Random short fibres, not a woven grid. Wrapping edge strokes keeps the
  // repeat seamless; a whole mat needs just these two small texture images.
  for (let i = 0; i < 30000; i++) {
    const x = random() * size, y = random() * size;
    const angle = random() * Math.PI * 2, length = 1.2 + random() * 5;
    const dx = Math.cos(angle) * length, dy = Math.sin(angle) * length;
    const light = random() > .45, alpha = .08 + random() * .15;
    colour.ctx.strokeStyle = light ? `rgba(255,255,249,${alpha})` : `rgba(56,66,59,${alpha * .65})`;
    height.ctx.strokeStyle = light ? 'rgba(220,220,220,.20)' : 'rgba(62,62,62,.15)';
    colour.ctx.lineWidth = height.ctx.lineWidth = .45 + random() * .5;
    const offsetsX = [0], offsetsY = [0];
    if (x < length) offsetsX.push(size); else if (x > size - length) offsetsX.push(-size);
    if (y < length) offsetsY.push(size); else if (y > size - length) offsetsY.push(-size);
    for (const ox of offsetsX) for (const oy of offsetsY) for (const ctx of [colour.ctx, height.ctx]) {
      ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + dx, y + oy + dy); ctx.stroke();
    }
  }
  const map = new THREE.CanvasTexture(colour.canvas), bumpMap = new THREE.CanvasTexture(height.canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [map, bumpMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(WIDTH / 2, DEPTH / 2);
    texture.anisotropy = 4;
  }
  return { map, bumpMap };
}

function outline() {
  const shape = new THREE.Shape(), x = -WIDTH / 2, y = -DEPTH / 2, r = CORNER;
  shape.moveTo(x + r, y); shape.lineTo(x + WIDTH - r, y);
  shape.quadraticCurveTo(x + WIDTH, y, x + WIDTH, y + r);
  shape.lineTo(x + WIDTH, y + DEPTH - r);
  shape.quadraticCurveTo(x + WIDTH, y + DEPTH, x + WIDTH - r, y + DEPTH);
  shape.lineTo(x + r, y + DEPTH);
  shape.quadraticCurveTo(x, y + DEPTH, x, y + DEPTH - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

export function createFeltMat() {
  const root = new THREE.Group(); root.name = 'sage felt desk mat'; root.position.set(.2, 0, .2);
  const { map, bumpMap } = fibreTextures();
  const surface = new THREE.MeshPhysicalMaterial({
    color: 0x4f6f65, map, bumpMap, bumpScale: .006,
    roughness: .98, metalness: 0, sheen: .55, sheenColor: 0x93aaa1, sheenRoughness: 1,
  });
  const edge = new THREE.MeshStandardMaterial({ color: 0x526b5f, roughness: 1, metalness: 0 });
  const shape = outline();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: .014, bevelEnabled: true, bevelThickness: .002, bevelSize: .003, bevelSegments: 2,
    steps: 1, curveSegments: 12,
  });
  const positions = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i,
    (positions.getX(i) + WIDTH / 2) / WIDTH,
    (positions.getY(i) + DEPTH / 2) / DEPTH);
  geometry.rotateX(-Math.PI / 2);
  const mat = new THREE.Mesh(geometry, [surface, edge]); mat.name = 'thin rounded felt body';
  // Extrusion including its bevel occupies [-.055, -.037], below the book.
  mat.position.y = SURFACE_Y - .016; mat.castShadow = mat.receiveShadow = true; root.add(mat);

  const shadow = canvasSurface(512), shadowWidth = WIDTH + .44, shadowDepth = DEPTH + .44;
  const insetX = .22 / shadowWidth * 512, insetY = .22 / shadowDepth * 512;
  shadow.ctx.filter = 'blur(7px)'; shadow.ctx.fillStyle = '#ffffff';
  shadow.ctx.beginPath(); shadow.ctx.roundRect(insetX, insetY, 512 - insetX * 2, 512 - insetY * 2, 14); shadow.ctx.fill();
  const shadowMap = new THREE.CanvasTexture(shadow.canvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowMap, color: 0x283b30, transparent: true, opacity: .19,
    depthWrite: false, toneMapped: false,
    // A small constant offset separates the decal without lifting it through
    // the felt at grazing angles, as a slope-dependent offset could.
    polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -2,
  });
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(shadowWidth, shadowDepth), shadowMaterial);
  contactShadow.name = 'felt contact shadow'; contactShadow.rotation.x = -Math.PI / 2; contactShadow.position.y = -.052;
  root.add(contactShadow);

  // A single low-opacity batch softens the cut edge without expensive fur shells.
  const random = randomSequence(0x8251), border = shape.getSpacedPoints(700), fibres = [], colours = [];
  for (let i = 0; i < border.length - 1; i++) {
    const point = border[i], next = border[i + 1];
    const tx = next.x - point.x, ty = next.y - point.y, length = Math.hypot(tx, ty);
    if (!length) continue;
    const outwardX = ty / length, outwardZ = tx / length, reach = .008 + random() * .022;
    fibres.push(point.x, SURFACE_Y - .001, -point.y,
      point.x + outwardX * reach, SURFACE_Y - .003 - random() * .004, -point.y + outwardZ * reach);
    const shade = .72 + random() * .28;
    colours.push(shade, shade, shade, shade, shade, shade);
  }
  const fibreGeometry = new THREE.BufferGeometry();
  fibreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fibres, 3));
  fibreGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  const fibreMaterial = new THREE.LineBasicMaterial({ color: 0x91a992, vertexColors: true, transparent: true, opacity: .26, depthWrite: false });
  const fringe = new THREE.LineSegments(fibreGeometry, fibreMaterial); fringe.name = 'short felt edge fibres'; root.add(fringe);

  function setTheme(night = false) {
    surface.color.setHex(night ? 0x405c51 : 0x4f6f65);
    surface.sheenColor.setHex(night ? 0x718a7a : 0x93aaa1);
    edge.color.setHex(night ? 0x304b40 : 0x526b5f);
    fibreMaterial.color.setHex(night ? 0x627f6d : 0x91a992);
    shadowMaterial.opacity = night ? .27 : .19;
  }
  return { root, textures: [map, bumpMap, shadowMap], setTheme };
}
