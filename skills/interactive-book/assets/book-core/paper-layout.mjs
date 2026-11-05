// Zero-based spread index, independent of chapter numbering.
export function getSpreadPages(spreadIndex, firstPage = 2) {
  if (!Number.isSafeInteger(spreadIndex) || spreadIndex < 0
    || !Number.isSafeInteger(firstPage) || firstPage < 1) {
    throw new RangeError('Expected a non-negative spread index and a positive first page');
  }
  const left = firstPage + spreadIndex * 2;
  if (!Number.isSafeInteger(left + 1)) throw new RangeError('Page number exceeds safe integer range');
  return { left, right: left + 1 };
}

export function containsPaperPoint(rect, point) {
  return point.x >= rect.x && point.x <= rect.x + rect.w
    && point.y >= rect.y && point.y <= rect.y + rect.h;
}

// Pixels: top-left origin, y down. UVs: bottom-left origin.
// World: paper lies in XZ, spine at x=0, depth centered on z=0.
export function createPaperLayout({ width, height, worldWidth, worldDepth }) {
  for (const [name, value] of Object.entries({ width, height, worldWidth, worldDepth })) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive and finite`);
  }
  function leftEdge(side) {
    if (side !== 'left' && side !== 'right') throw new RangeError('Side must be left or right');
    return side === 'left' ? -worldWidth : 0;
  }
  const paperPointFromUV = uv => ({ x: uv.x * width, y: (1 - uv.y) * height });
  const uvFromPaperPoint = point => ({ x: point.x / width, y: 1 - point.y / height });
  function rectToWorld(rect, side = 'left') {
    return {
      x: leftEdge(side) + (rect.x + rect.w / 2) / width * worldWidth,
      z: -worldDepth / 2 + (rect.y + rect.h / 2) / height * worldDepth,
      width: rect.w / width * worldWidth, depth: rect.h / height * worldDepth,
    };
  }
  function worldToPaperPoint(point, side = 'left') {
    return {
      x: (point.x - leftEdge(side)) / worldWidth * width,
      y: (point.z + worldDepth / 2) / worldDepth * height,
    };
  }
  return Object.freeze({ width, height, worldWidth, worldDepth,
    paperPointFromUV, uvFromPaperPoint, rectToWorld, worldToPaperPoint });
}
