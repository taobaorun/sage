import './style.css';
import { book } from './content.js';
import { createBookViewer } from './book-viewer.js';
import { createDemoModel } from './demo-models.js';

const icons = {
  book: '<path d="M12 5c-3-2-7-2-10-1v15c4-1 7 0 10 2m0-16c3-2 7-2 10-1v15c-4-1-7 0-10 2V5Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  prev: '<path d="m14 5-7 7 7 7"/>', next: '<path d="m10 5 7 7-7 7"/>',
  theme: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16"/>',
  reset: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
document.querySelector('#app').innerHTML = `<main id="experience">
  <div id="scene"></div>
  <header><button id="home" class="wordmark" aria-label="返回封面">${icon('book')}<span></span></button><button id="read" aria-controls="reader" aria-expanded="false" hidden>${icon('book')}<span>阅读本页</span></button></header>
  <aside id="toc" class="glass" aria-label="目录" hidden><div class="panel-head"><strong>目录</strong><button id="toc-close" aria-label="关闭目录">${icon('close')}</button></div><div id="toc-items"></div></aside>
  <section id="experiment" class="glass" aria-label="本页实验" hidden><label for="value"><span id="value-label"></span><output id="value-output"></output></label><input id="value" type="range"><div class="experiment-bottom"><span id="readout" aria-live="polite"></span><button id="run" aria-pressed="true">暂停</button></div></section>
  <aside id="part" class="glass" hidden><div class="panel-head"><strong id="part-title"></strong><button id="part-close" aria-label="关闭零件说明">${icon('close')}</button></div><p id="part-body"></p></aside>
  <section id="reader" class="glass" aria-label="本页内容" data-expanded="false" hidden><div class="sheet-head"><button id="reader-toggle" aria-expanded="false" aria-controls="reader-body"><span id="reader-label"></span><span id="reader-pages"></span><span aria-hidden="true">⌃</span></button><button id="reader-close" aria-label="收起阅读" hidden>${icon('close')}</button></div><div id="reader-body" tabindex="0" hidden></div></section>
  <nav id="dock" class="glass" aria-label="翻书与导览"><button id="toc-toggle" aria-label="章节目录" aria-controls="toc" aria-expanded="false">${icon('menu')}</button><button id="prev" aria-label="上一页">${icon('prev')}</button><div class="position"><span id="position-label">封面</span><small id="pages"></small></div><button id="next" aria-label="下一页">${icon('next')}</button><i></i><button id="theme" aria-label="切换夜间阅读" aria-pressed="false">${icon('theme')}</button><button id="reset" aria-label="回到整本书">${icon('reset')}</button></nav>
  <section id="fallback" hidden><h1></h1><p>当前设备无法显示立体场景，仍可阅读本书内容。</p><div></div></section>
</main>`;
const $ = selector => document.querySelector(selector);
$('.wordmark span').textContent = book.title;
document.title = `${book.title} · 立体交互书`;
let viewer = null, latest = { index: -1, targetIndex: -1 }, renderedIndex = -2, readerOpen = false, readerOpener = 'read';

book.chapters.forEach((chapter, index) => {
  const button = document.createElement('button');
  button.textContent = `${index + 1}  ${chapter.title}　${index * 2 + 2}–${index * 2 + 3}`;
  button.addEventListener('click', () => { closeToc(); go(index); $('#toc-toggle').focus(); });
  $('#toc-items').append(button);
});

function closeToc() { $('#toc').hidden = true; $('#toc-toggle').setAttribute('aria-expanded', 'false'); }
function syncReaderSpace() {
  const occupied = readerOpen ? innerHeight - $('#reader').getBoundingClientRect().top + 16 : 0;
  document.documentElement.style.setProperty('--reading-occupied', `${occupied}px`);
}
function setReader(open, restoreFocus = false) {
  readerOpen = Boolean(open && latest.index >= 0);
  $('#reader').dataset.expanded = String(readerOpen);
  $('#reader-body').hidden = !readerOpen;
  $('#reader-close').hidden = !readerOpen;
  for (const id of ['read', 'reader-toggle']) $(`#${id}`).setAttribute('aria-expanded', String(readerOpen));
  document.body.classList.toggle('reading', readerOpen);
  syncReaderSpace();
  if (restoreFocus) document.getElementById(readerOpener)?.focus();
}
function render(state) {
  latest = state;
  $('#experience').dataset.phase = state.phase || 'complete';
  $('#experience').dataset.index = String(state.index);
  document.documentElement.dataset.theme = state.night ? 'dark' : 'light';
  $('#theme').setAttribute('aria-pressed', String(Boolean(state.night)));
  $('#prev').disabled = state.targetIndex < 0;
  $('#next').disabled = state.targetIndex >= book.chapters.length - 1;
  const chapter = book.chapters[state.index];
  $('#read').hidden = $('#reader').hidden = $('#experiment').hidden = !chapter;
  $('#position-label').textContent = chapter ? chapter.title : '封面';
  $('#pages').textContent = chapter ? `${state.index * 2 + 2}–${state.index * 2 + 3} 页` : '';
  if (state.index !== renderedIndex) {
    renderedIndex = state.index; setReader(false); $('#part').hidden = true;
    if (chapter) {
      $('#reader-label').textContent = chapter.title;
      $('#reader-pages').textContent = $('#pages').textContent;
      $('#reader-body').replaceChildren();
      const heading = document.createElement('h2'); heading.textContent = chapter.question; $('#reader-body').append(heading);
      for (const text of chapter.reading) { const p = document.createElement('p'); p.textContent = text; $('#reader-body').append(p); }
      const control = chapter.control;
      for (const key of ['min', 'max', 'step']) $('#value')[key] = control[key];
      $('#value-label').textContent = control.label;
      $('#run').hidden = !chapter.running;
    }
  }
  if (chapter) {
    $('#value').value = state.value;
    $('#value-output').textContent = `${Number(state.value).toFixed(2)} ${chapter.control.unit}`;
    $('#readout').textContent = chapter.readout(state.value);
    $('#run').textContent = state.running ? '暂停' : '运行';
    $('#run').setAttribute('aria-pressed', String(Boolean(state.running)));
    $('#value').disabled = $('#run').disabled = Boolean(state.busy);
  }
  [...$('#toc-items').children].forEach((el, i) => el.setAttribute('aria-current', i === state.index ? 'page' : 'false'));
}
function go(index) { setReader(false); closeToc(); $('#part').hidden = true; return viewer?.goTo(index); }
function fallback(error) {
  console.error('Book renderer unavailable:', error);
  $('#scene').hidden = $('#dock').hidden = true; $('#fallback').hidden = false;
  $('#fallback h1').textContent = book.title;
  for (const chapter of book.chapters) {
    const section = document.createElement('section'), title = document.createElement('h2');
    title.textContent = chapter.title; section.append(title);
    for (const text of [chapter.question, ...chapter.reading]) { const p = document.createElement('p'); p.textContent = text; section.append(p); }
    $('#fallback div').append(section);
  }
}
viewer = createBookViewer($('#scene'), {
  book, createModel: createDemoModel, onChange: render, onError: fallback,
  onSelect: part => {
    setReader(false); $('#part-title').textContent = part.title; $('#part-body').textContent = part.body;
    $('#part').hidden = false; $('#part-close').focus();
  },
});
if (viewer) render(viewer.getState());
$('#home').addEventListener('click', () => go(-1));
$('#prev').addEventListener('click', () => go(Math.max(-1, latest.targetIndex - 1)));
$('#next').addEventListener('click', () => go(Math.min(book.chapters.length - 1, latest.targetIndex + 1)));
$('#reset').addEventListener('click', () => viewer?.resetView());
$('#theme').addEventListener('click', () => viewer?.setNight(!latest.night));
$('#value').addEventListener('input', event => viewer?.setValue(Number(event.target.value)));
$('#run').addEventListener('click', () => viewer?.setRunning(!latest.running));
$('#toc-toggle').addEventListener('click', () => {
  const open = $('#toc').hidden; $('#toc').hidden = !open; $('#toc-toggle').setAttribute('aria-expanded', String(open));
  if (open) $('#toc-items button')?.focus();
});
$('#toc-close').addEventListener('click', () => { closeToc(); $('#toc-toggle').focus(); });
for (const id of ['read', 'reader-toggle']) $(`#${id}`).addEventListener('click', () => { readerOpener = id; setReader(!readerOpen); });
$('#reader-close').addEventListener('click', () => setReader(false, true));
$('#part-close').addEventListener('click', () => { $('#part').hidden = true; $('#reset').focus(); });
function keydown(event) {
  if (event.key === 'Escape') {
    if (!$('#toc').hidden) { closeToc(); $('#toc-toggle').focus(); }
    else if (readerOpen) setReader(false, true);
    else if (!$('#part').hidden) { $('#part').hidden = true; $('#reset').focus(); }
    return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable=true],#reader-body') || readerOpen || !$('#toc').hidden) return;
  if (event.key === 'ArrowRight' && latest.targetIndex < book.chapters.length - 1) { event.preventDefault(); go(latest.targetIndex + 1); }
  if (event.key === 'ArrowLeft' && latest.targetIndex >= 0) { event.preventDefault(); go(latest.targetIndex - 1); }
}
document.addEventListener('keydown', keydown);
const observer = new ResizeObserver(syncReaderSpace); observer.observe($('#reader'));
window.addEventListener('resize', syncReaderSpace);
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  observer.disconnect(); window.removeEventListener('resize', syncReaderSpace);
  document.removeEventListener('keydown', keydown); viewer?.dispose();
});
