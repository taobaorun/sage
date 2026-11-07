// Shared authoring-only playback layer for the two Teacher prototypes.
// It consumes declared scene traces; it never executes the teaching source.
export function integrateTeachingMotion(html, context, data) {
  const block = '<!-- teacher-motion-data:start -->\n<script id="teacher-motion-data" type="application/json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>\n<!-- teacher-motion-data:end -->';
  const blockPattern = /<!-- teacher-motion-data:start -->[\s\S]*?<!-- teacher-motion-data:end -->/;
  html = blockPattern.test(html) ? html.replace(blockPattern, block) : html.replace('<script>\n"use strict";', block + '\n<script>\n"use strict";');
  const runtime = '/* teacher-motion-runtime:start */\n' + initializeTeacherPlayback.toString() + '\ninitializeTeacherPlayback(' + JSON.stringify(context) + ');\n/* teacher-motion-runtime:end */';
  const runtimePattern = /\/\* teacher-motion-runtime:start \*\/[\s\S]*?\/\* teacher-motion-runtime:end \*\//;
  html = runtimePattern.test(html) ? html.replace(runtimePattern, runtime) : html.replace('"use strict";', '"use strict";\n' + runtime);
  const style = '<style id="teacher-motion-style">\n' + motionCSS + '\n</style>';
  const stylePattern = /<style id="teacher-motion-style">[\s\S]*?<\/style>/;
  html = stylePattern.test(html) ? html.replace(stylePattern, style) : html.replace('</head>', style + '\n</head>');
  if (context === 'course') {
    if (!html.includes('teacherMotionControls(prefix)')) html = html.replace('<div data-diagram-canvas>', "'+teacherMotionControls(prefix)+'<div data-diagram-canvas>");
    if (!html.includes('/* motion-course-sync */')) html = html.replace('renderOutline();feedback();', 'renderOutline();feedback();\n /* motion-course-sync */ if(typeof teacherSyncMotion==="function")requestAnimationFrame(teacherSyncMotion);');
    const mark = 'figure.querySelector("[data-path-explanation]").textContent=diagramExplanation();';
    if (!html.includes('/* motion-path-sync */')) html = html.replace(mark, mark + '\n  /* motion-path-sync */ if(typeof teacherSyncMotion==="function")requestAnimationFrame(teacherSyncMotion);');
    const opened = 'homeAnchor=anchor;setTab("source");';
    if (!html.includes('/* motion-source-sync */')) html = html.replace(opened, '/* motion-source-sync */ if(typeof teacherSyncMotion==="function")requestAnimationFrame(teacherSyncMotion);\n '+opened);
  } else {
    html = html.replace(/^ if\(currentCase===5\)return [^\n]+$/m, ' if(currentCase===5)return "";');
    const mark = '+\'</div><figure class="viz-frame" id="visual-figure">\'+';
    if (!html.includes('teacherMotionControls("visual")')) html = html.replace(mark, '+\'</div>\'+teacherMotionControls("visual")+\'<figure class="viz-frame" id="visual-figure">\'+');
    const updated = 'document.querySelector(".viz-takeaway").textContent=visualTakeaway();';
    if (!html.includes('/* motion-workbench-sync */')) html = html.replace(updated, updated + '\n /* motion-workbench-sync */ if(typeof teacherSyncMotion==="function")teacherSyncMotion();');
    const rendered = '$("component-view").innerHTML=currentComponent==="map"?renderMap():RENDERERS[currentComponent]();';
    if (!html.includes('/* motion-render-sync */')) html = html.replace(rendered, rendered + '\n /* motion-render-sync */ if(typeof teacherSyncMotion==="function")requestAnimationFrame(teacherSyncMotion);');
  }
  return html;
}

const motionCSS = [
  '.teacher-motion{margin:18px 0 22px;padding:15px 0 17px;border-block:1px solid var(--reader-line);font:13px/1.85 var(--reader-font-ui);color:var(--reader-muted)}',
  '.teacher-motion-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.teacher-motion-heading strong{font:500 13px var(--reader-font-ui);color:var(--reader-ink)}.teacher-motion-count{font:11px var(--reader-font-mono);color:var(--reader-muted)}',
  '.teacher-motion-actions{display:flex;align-items:center;flex-wrap:wrap;gap:5px}.teacher-motion-actions button{min-height:42px;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--reader-accent);padding:8px 11px;font:13px/1.8 var(--reader-font-ui)}.teacher-motion-actions button:hover{background:var(--reader-surface-alt)}.teacher-motion-actions [data-motion-action="play"]{background:var(--reader-accent-soft);border-color:var(--reader-line)}.teacher-motion-actions button:disabled{opacity:.45;color:var(--reader-muted);background:transparent;cursor:default}',
  '.teacher-motion-caption{font:14px/1.9 var(--reader-font-ui);color:var(--reader-ink);margin:12px 0 5px!important}.teacher-motion-note{font:12px/1.8 var(--reader-font-ui);color:var(--reader-muted);margin:0!important}',
  'svg[data-teacher-renderer="pele"] .teacher-demo-current{opacity:1!important}svg[data-teacher-renderer="pele"] .teacher-demo-current>:is(rect,path,polygon,ellipse,circle){fill:var(--reader-accent-soft)!important;stroke:var(--reader-accent)!important;stroke-width:2.3px}',
  'svg[data-teacher-renderer="pele"] .teacher-demo-edge{opacity:1!important}svg[data-teacher-renderer="pele"] :is(path,line,polyline).teacher-demo-edge,svg[data-teacher-renderer="pele"] .teacher-demo-edge :is(path,line,polyline){stroke:var(--reader-accent)!important;stroke-width:2.5px}',
  '.teacher-request-token{fill:var(--reader-accent);stroke:var(--reader-surface);stroke-width:2px;pointer-events:none}',
  '@media(max-width:520px){.teacher-motion{margin:17px 0 22px}.teacher-motion-actions{gap:3px}.teacher-motion-actions button{font-size:12px;min-height:42px;padding-inline:9px}.teacher-motion-heading{align-items:baseline}.teacher-motion-heading strong{font-size:12px}.teacher-motion-count{font-size:11px}.teacher-motion-caption{font-size:13px}.teacher-motion-note{font-size:12px}}',
].join('\n');

function initializeTeacherPlayback(context) {
  const data = JSON.parse(document.getElementById('teacher-motion-data').textContent);
  const positions = new Map(), reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = null, revision = 0;
  function descriptor() {
    if (context === 'course') return data.specs[diagramPath === 'hit' ? 'cache-hit' : 'cache-miss'] || null;
    if (currentComponent !== 'visual') return null;
    const focus = effectiveVisualFocus();
    const key = currentCase === 1 ? (focus === 'failure' ? 'flow-failure' : focus === 'success' ? 'flow-hit' : 'flow-miss') : currentCase === 3 ? (focus === 'retry' ? 'state-retry' : focus === 'done' ? 'state-stop' : 'state-complete') : currentCase === 5 ? 'algorithm' : null;
    return key ? data.specs[key] || null : null;
  }
  function position(spec) {
    if (!positions.has(spec.key)) positions.set(spec.key, { frame: spec.mode === 'algorithm' ? visualStep : 0 });
    const state = positions.get(spec.key);
    if (spec.mode === 'algorithm' && state.frame !== visualStep) state.frame = visualStep;
    state.frame = Math.max(0, Math.min(spec.frames.length - 1, state.frame));
    return state;
  }
  function regionFor(element) { return element.closest('[data-teacher-motion]'); }
  function figures(region) {
    const owner = region.closest('[data-cache-figure]') || region.closest('.sample-body');
    return owner ? Array.from(owner.querySelectorAll('svg[data-teacher-renderer="pele"]')) : [];
  }
  function matching(svg, id) { return id ? Array.from(svg.querySelectorAll('[data-id="' + id + '"]')) : []; }
  function clearToken() { document.querySelectorAll('.teacher-request-token').forEach(token => token.remove()); }
  function cancel(snap) {
    revision += 1;
    if (!active) { if (snap) clearToken(); return; }
    clearTimeout(active.timer); cancelAnimationFrame(active.raf); active.timer = 0; active.raf = 0; active.playing = false;
    if (snap) { active.progress = 0; clearToken(); active = null; }
  }
  function stableFrame(spec, frame) {
    position(spec).frame = frame;
    if (spec.mode === 'algorithm' && context === 'workbench') { visualStep = frame; refreshVisual(); }
  }
  function sync() {
    if (active && !active.owner.isConnected) cancel(true);
    const spec = descriptor();
    if (!spec) return;
    if (context === 'workbench' && spec.mode === 'algorithm') document.querySelector('.viz-takeaway')?.removeAttribute('aria-live');
    const state = position(spec), frame = spec.frames[state.frame];
    document.querySelectorAll('[data-teacher-motion]').forEach(region => {
      region.dataset.demoKey = spec.key;
      const playing = Boolean(active && active.owner === region && active.playing), pausedTravel = Boolean(active && active.owner === region && active.progress > 0);
      region.querySelector('[data-motion-title]').textContent = spec.title;
      region.querySelector('[data-motion-count]').textContent = (state.frame + 1) + ' / ' + spec.frames.length;
      const previous = region.querySelector('[data-motion-action="previous"]'), next = region.querySelector('[data-motion-action="next"]');
      previous.disabled = state.frame === 0; next.disabled = state.frame === spec.frames.length - 1;
      previous.setAttribute('aria-label', spec.mode === 'algorithm' ? '上一个观察位置' : '演示上一步');
      next.setAttribute('aria-label', spec.mode === 'algorithm' ? '下一个观察位置' : '演示下一步');
      const play = region.querySelector('[data-motion-action="play"]');
      play.disabled = reduced.matches; play.setAttribute('aria-pressed', String(playing));
      play.textContent = reduced.matches ? '逐步查看' : playing ? '暂停' : pausedTravel ? '继续播放' : state.frame === spec.frames.length - 1 ? '重新播放' : '播放演示';
      region.querySelector('[data-motion-caption]').textContent = frame.text + (playing && active.progress > 0 ? '（正沿声明的路径进入下一步）' : '');
      region.querySelector('[data-motion-note]').textContent = reduced.matches ? '已遵循减少动态效果偏好，请使用上一步 / 下一步。' : '教学演示，不执行源码；播放速度不代表实际耗时。';
      figures(region).forEach(svg => {
        svg.querySelectorAll('.teacher-demo-current,.teacher-demo-edge').forEach(element => element.classList.remove('teacher-demo-current', 'teacher-demo-edge'));
        matching(svg, frame.node).forEach(element => element.classList.add('teacher-demo-current'));
        matching(svg, frame.edge).forEach(element => element.classList.add('teacher-demo-edge'));
      });
    });
  }
  function visibleFigures(owner, spec) {
    const visible = figures(owner).filter(svg => svg.getBoundingClientRect().width > 0 && svg.getBoundingClientRect().height > 0);
    visible.sort((a, b) => spec.frames.filter(frame => matching(b, frame.node).length).length - spec.frames.filter(frame => matching(a, frame.node).length).length);
    return visible;
  }
  function watchable(owner, spec) {
    // One deliberate response to Play, never a per-frame scroll.
    const svg = visibleFigures(owner, spec)[0];
    if (!svg) return;
    let container = owner.parentElement;
    while (container && container !== document.body) {
      if (/(auto|scroll)/.test(getComputedStyle(container).overflowY) && container.scrollHeight > container.clientHeight) break;
      container = container.parentElement;
    }
    const page = !container || container === document.body;
    if (page) container = document.scrollingElement || document.documentElement;
    const viewport = page ? { top: 0, bottom: window.innerHeight } : container.getBoundingClientRect();
    const toolbar = owner.getBoundingClientRect(), graphic = svg.getBoundingClientRect();
    const top = Math.min(toolbar.top, graphic.top), bottom = Math.max(toolbar.bottom, graphic.bottom), room = viewport.bottom - viewport.top - 16;
    const target = bottom - top <= room ? viewport.top + 8 + (room - (bottom - top)) / 2 : viewport.top + 8;
    container.scrollTop += (bottom - top <= room ? top : toolbar.top) - target;
  }
  function pathFor(owner, spec, edge) {
    const visible = visibleFigures(owner, spec);
    for (const svg of visible) for (const element of matching(svg, edge)) {
      const path = element.tagName.toLowerCase() === 'path' ? element : element.querySelector('path[d]');
      if (path && typeof path.getTotalLength === 'function' && path.getTotalLength() > 0) return { svg, path };
    }
    return null;
  }
  function schedule(entry, delay) {
    const stamp = revision;
    entry.timer = setTimeout(() => { entry.timer = 0; if (active === entry && entry.playing && stamp === revision && entry.owner.isConnected) advance(entry); }, delay);
  }
  function advance(entry) {
    const spec = entry.spec, state = position(spec), stamp = revision;
    if (!entry.playing || active !== entry || reduced.matches || state.frame >= spec.frames.length - 1) { cancel(true); sync(); return; }
    const next = spec.frames[state.frame + 1], geometry = spec.mode === 'request' && next.edge ? pathFor(entry.owner, spec, next.edge) : null;
    if (!geometry) {
      stableFrame(spec, state.frame + 1); entry.progress = 0; sync();
      if (state.frame >= spec.frames.length - 1) { cancel(true); sync(); } else schedule(entry, 1000);
      return;
    }
    clearToken();
    const token = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    token.setAttribute('class', 'teacher-request-token'); token.setAttribute('r', '5'); token.setAttribute('aria-hidden', 'true');
    if (geometry.path.getAttribute('transform')) token.setAttribute('transform', geometry.path.getAttribute('transform'));
    geometry.path.parentElement.appendChild(token);
    matching(geometry.svg, next.edge).forEach(element => element.classList.add('teacher-demo-edge'));
    const length = geometry.path.getTotalLength(), duration = 1100, start = performance.now() - entry.progress * duration;
    const tick = time => {
      if (active !== entry || !entry.playing || stamp !== revision || !entry.owner.isConnected) return;
      entry.progress = Math.min(1, Math.max(0, (time - start) / duration));
      const point = geometry.path.getPointAtLength(length * entry.progress);
      token.setAttribute('cx', String(point.x)); token.setAttribute('cy', String(point.y));
      if (entry.progress < 1) { entry.raf = requestAnimationFrame(tick); return; }
      entry.raf = 0; token.remove(); entry.progress = 0; stableFrame(spec, state.frame + 1); sync();
      if (state.frame >= spec.frames.length - 1) { cancel(true); sync(); } else schedule(entry, 650);
    };
    entry.raf = requestAnimationFrame(tick);
  }
  function play(owner) {
    const spec = descriptor(); if (!spec || reduced.matches) return;
    if (active && active.owner === owner && active.spec.key === spec.key && active.playing) { cancel(false); sync(); return; }
    const same = active && active.owner === owner && active.spec.key === spec.key;
    if (!same) { cancel(true); active = { owner, spec, playing: false, progress: 0, timer: 0, raf: 0 }; }
    const state = position(spec);
    if (state.frame === spec.frames.length - 1) { stableFrame(spec, 0); active.progress = 0; }
    watchable(owner, spec);
    active.playing = true; sync();
    if (spec.mode === 'request') advance(active); else schedule(active, 1000);
  }
  window.teacherMotionControls = function (prefix) {
    const spec = descriptor(); if (!spec) return '';
    const state = position(spec), id = 'teacher-demo-' + prefix + '-' + spec.key;
    return '<section class="teacher-motion" data-teacher-motion aria-labelledby="' + id + '-title"><div class="teacher-motion-heading"><strong id="' + id + '-title" data-motion-title>' + spec.title + '</strong><span class="teacher-motion-count" data-motion-count>' + (state.frame + 1) + ' / ' + spec.frames.length + '</span></div><div class="teacher-motion-actions" role="group" aria-label="教学演示控制"><button type="button" data-motion-action="previous" aria-label="演示上一步">上一步</button><button type="button" data-motion-action="play" aria-pressed="false">播放演示</button><button type="button" data-motion-action="next" aria-label="演示下一步">下一步</button><button type="button" data-motion-action="reset" aria-label="重置教学演示">重置</button></div><p class="teacher-motion-caption" data-motion-caption role="status" aria-live="polite">' + spec.frames[state.frame].text + '</p><p class="teacher-motion-note" data-motion-note>教学演示，不执行源码；播放速度不代表实际耗时。</p></section>';
  };
  window.teacherSyncMotion = sync;
  window.teacherPauseMotion = function () { cancel(true); sync(); };
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null; if (!target) return;
    const action = target.closest('[data-motion-action]');
    if (action) {
      const owner = regionFor(action), spec = descriptor(); if (!owner || !spec) return;
      if (action.dataset.motionAction === 'play') { play(owner); return; }
      cancel(true); const state = position(spec);
      stableFrame(spec, action.dataset.motionAction === 'reset' ? 0 : Math.max(0, Math.min(spec.frames.length - 1, state.frame + (action.dataset.motionAction === 'next' ? 1 : -1))));
      sync(); return;
    }
    if (target.closest('[data-component],[data-case],[data-vfocus],[data-vstep],[data-diagram-path],[data-step],#previous,#next,#reset-do,#reset-confirm-button')) { cancel(true); positions.clear(); }
    else if (target.closest('[data-anchor],#return-reader,[data-source-anchor],[data-file],#source-back,#source-forward,#source-home')) cancel(true);
  }, true);
  document.addEventListener('change', event => { if (event.target.id === 'mobile-nav') { cancel(true); positions.clear(); } }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && context === 'course' && sourceOpen && !document.getElementById('reader-settings')?.open && !document.getElementById('outline')?.open) { cancel(true); sync(); }
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { cancel(true); sync(); } });
  window.addEventListener('pagehide', () => cancel(true));
  window.addEventListener('resize', () => { cancel(true); sync(); });
  const reduceChanged = () => { if (reduced.matches) cancel(true); sync(); };
  if (reduced.addEventListener) reduced.addEventListener('change', reduceChanged);
  else if (reduced.addListener) reduced.addListener(reduceChanged);
}
