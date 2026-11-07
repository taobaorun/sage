'use strict';
// Runtime for Teacher's bundled, offline course format.
function initializeTeacherReader() {
  const course = JSON.parse(document.getElementById('course-data').textContent),
    themes = JSON.parse(document.getElementById('theme-data').textContent);
  const $ = (id) => document.getElementById(id),
    escape = (value) =>
      String(value).replace(
        /[&<>"]/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
      );
  const key = course.storageKey,
    appearanceKey = 'teacher-reader.appearance.v1',
    sectionIds = course.sections.map((section) => section.id);
  const first = () => ({
    version: course.version,
    section: sectionIds[0],
    scrolls: {},
    read: [],
    quizzes: {},
    drafts: {},
  });
  let state = first(),
    storageOK = true,
    recovered = false,
    sectionIndex = 0,
    sourceOpen = false,
    readingReturn = null,
    sourceHome = null,
    sourcePosition = null,
    past = [],
    future = [],
    wrap = false;
  let comparisonTop = 0,
    comparisonReady = false,
    scrollTimer = 0,
    noticeTimer = 0,
    appearanceOpener = null,
    graphTimer = 0,
    modelMotion = 0,
    graphRevision = 0,
    openerSequence = 0;
  const graphViews = new Map();
  const isRecord = (value) =>
    value && typeof value === 'object' && !Array.isArray(value);
  let savedText = null;
  try {
    savedText = localStorage.getItem(key);
  } catch (error) {
    storageOK = false;
  }
  try {
    const saved = JSON.parse(savedText || 'null');
    if (saved && saved.version === course.version) {
      state = { ...first(), ...saved };
      if (!sectionIds.includes(state.section)) state.section = sectionIds[0];
      state.scrolls = Object.fromEntries(
        Object.entries(isRecord(state.scrolls) ? state.scrolls : {}).filter(
          ([id, top]) =>
            sectionIds.includes(id) && Number.isFinite(top) && top >= 0,
        ),
      );
      state.read = Array.isArray(state.read)
        ? [...new Set(state.read.filter((id) => sectionIds.includes(id)))]
        : [];
      const questions = new Map(
        course.sections.flatMap((s) =>
          s.quiz.map((q) => [s.id + '/' + q.id, q]),
        ),
      );
      state.quizzes = Object.fromEntries(
        Object.entries(isRecord(state.quizzes) ? state.quizzes : {})
          .filter(([id, value]) => questions.has(id) && isRecord(value))
          .map(([id, value]) => {
            const valid = questions
              .get(id)
              .options.some((o) => o.id === value.answer);
            return [
              id,
              {
                answer: valid ? value.answer : null,
                checked: valid && value.checked === true,
              },
            ];
          }),
      );
      state.drafts = Object.fromEntries(
        Object.entries(isRecord(state.drafts) ? state.drafts : {}).filter(
          ([id, value]) => sectionIds.includes(id) && typeof value === 'string',
        ),
      );
    }
  } catch (error) {
    recovered = true;
  }
  sectionIndex = sectionIds.indexOf(state.section);
  const linkedSection = chapterFromHash();
  if (linkedSection) {
    state.section = linkedSection;
    sectionIndex = sectionIds.indexOf(linkedSection);
  }
  writeChapterAddress('replace');
  function chapterFromHash() {
    try {
      const id = decodeURIComponent(location.hash.slice(1));
      return sectionIds.includes(id) ? id : null;
    } catch (error) {
      return null;
    }
  }
  function writeChapterAddress(mode) {
    const hash = '#' + encodeURIComponent(section().id);
    if (mode === 'push' && location.hash === hash) return;
    const prior =
      history.state && typeof history.state === 'object' ? history.state : {};
    history[mode === 'replace' ? 'replaceState' : 'pushState'](
      { ...prior, teacherReaderSection: section().id },
      '',
      hash,
    );
  }
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      storageOK = false;
      $('storage-warning').hidden = false;
    }
  }
  function section() {
    return course.sections[sectionIndex];
  }
  function remember() {
    if (!sourceOpen)
      state.scrolls[section().id] = $('reading-scroll').scrollTop;
  }
  function notice(text) {
    clearTimeout(noticeTimer);
    $('notice').textContent = text;
    $('notice').hidden = false;
    noticeTimer = setTimeout(() => {
      $('notice').hidden = true;
    }, 4300);
  }
  function sourceButton(target, label) {
    return (
      '<button type="button" class="source-link" data-source="' +
      escape(target.file) +
      '" data-start="' +
      (target.start || 1) +
      '" data-end="' +
      (target.end || target.start || 1) +
      '">' +
      escape(label || '对照完整源码') +
      ' →</button>'
    );
  }
  function diagramHTML(key, prefix) {
    const diagram = course.diagrams[key];
    if (!diagram) return '';
    const layouts = diagram[prefix] || diagram.main;
    const scrollRegion =
      prefix === 'model'
        ? ' tabindex="0" role="region" aria-label="可横向滚动的模型概览"'
        : '';
    return (
      '<figure class="figure">' +
      (diagram.readingCue
        ? '<p class="figure-cue">' + escape(diagram.readingCue) + '</p>'
        : '') +
      '<div class="wide"' +
      scrollRegion +
      '>' +
      layouts.wide +
      '</div><div class="narrow"' +
      scrollRegion +
      '>' +
      layouts.narrow +
      '</div>' +
      (diagram.caption
        ? '<figcaption>' + escape(diagram.caption) + '</figcaption>'
        : '') +
      '</figure>'
    );
  }
  function lectureHTML(prefix) {
    const item = section();
    const mounted = new Set();
    const body = item.body.replace(
      /<div\b([^>]*\bdata-teacher-diagram\s*=\s*["']([A-Za-z0-9_-]+)["'][^>]*)>\s*<\/div>/g,
      (_, attrs, key) => {
        mounted.add(key);
        return diagramHTML(key, prefix);
      },
    );
    return (
      '<div class="eyebrow"><span class="number">' +
      String(sectionIndex + 1).padStart(2, '0') +
      ' / ' +
      String(course.sections.length).padStart(2, '0') +
      '</span><span>' +
      escape(item.kicker || course.title) +
      '</span></div><h1 id="' +
      prefix +
      '-heading" tabindex="-1">' +
      escape(item.title) +
      '</h1>' +
      (item.goal ? '<p class="goal">' + escape(item.goal) + '</p>' : '') +
      '<div class="prose">' +
      body +
      '</div>' +
      (item.diagram && !mounted.has(item.diagram)
        ? diagramHTML(item.diagram, prefix)
        : '') +
      (item.source
        ? '<div class="source-entry"><p>把这一节的解释放回真实文件：</p>' +
          sourceButton(item.source, item.source.label || item.source.file) +
          '</div>'
        : '') +
      (item.run ? resultHTML(item.run, '本节性质 / 行为检查') : '')
    );
  }
  function quizKey(quiz) {
    return section().id + '/' + quiz.id;
  }
  function quizState(quiz) {
    const id = quizKey(quiz),
      stored = state.quizzes[id];
    if (!stored || typeof stored !== 'object')
      state.quizzes[id] = { answer: null, checked: false };
    const value = state.quizzes[id];
    if (!quiz.options.some((option) => option.id === value.answer)) {
      value.answer = null;
      value.checked = false;
    }
    return value;
  }
  function quizHTML() {
    const quizzes = section().quiz || [];
    return quizzes.length
      ? '<section class="quiz-area" aria-label="本节理解检查"><h2>停一下，核对自己的思路</h2><p class="dialog-note">可以先跳过再回来。这里只核对预设问题，不把已读或已答当作掌握。</p>' +
          quizzes
            .map((quiz) => {
              const id = quizKey(quiz),
                q = quizState(quiz);
              return (
                '<section class="quiz-block" data-quiz="' +
                escape(quiz.id) +
                '"><fieldset><legend>' +
                escape(quiz.prompt) +
                '</legend>' +
                quiz.options
                  .map(
                    (option) =>
                      '<label class="quiz-option"><input type="radio" name="question-' +
                      escape(id) +
                      '" value="' +
                      escape(option.id) +
                      '" data-quiz-choice="' +
                      escape(quiz.id) +
                      '"' +
                      (q.answer === option.id ? ' checked' : '') +
                      '><span>' +
                      escape(option.text) +
                      '</span></label>',
                  )
                  .join('') +
                '</fieldset><div class="actions"><button class="button" data-quiz-check="' +
                escape(quiz.id) +
                '">核对思路</button><button class="button secondary" data-quiz-reset="' +
                escape(quiz.id) +
                '">重新想一遍</button></div><p class="quiz-hint" data-quiz-hint></p><div class="quiz-feedback" data-quiz-feedback role="status" aria-live="polite" hidden></div></section>'
              );
            })
            .join('') +
          '</section>'
      : '';
  }
  function exerciseHTML() {
    const exercise = section().exercise;
    if (!exercise) return '';
    const draft = Object.hasOwn(state.drafts, section().id)
      ? state.drafts[section().id]
      : '';
    return (
      '<section class="exercise"><h2>' +
      escape(exercise.title || '迁移到自己的理解') +
      '</h2><p>' +
      escape(exercise.prompt) +
      '</p><label class="dialog-note" for="exercise-text">写下预测、理由或你要检查的性质：</label><textarea id="exercise-text" data-exercise-text>' +
      escape(draft) +
      '</textarea><div class="actions"><button class="button" id="exercise-save">保存这段解释</button></div><p class="status" id="exercise-status">只保存在当前浏览器，不自动评判自由文本。</p>' +
      (exercise.hints?.length
        ? '<details><summary>按需展开提示</summary><ol>' +
          exercise.hints
            .map((hint) => '<li>' + escape(hint) + '</li>')
            .join('') +
          '</ol></details>'
        : '') +
      (exercise.reference
        ? '<details><summary>再对照参考思路</summary><div>' +
          escape(exercise.reference).replace(/\n/g, '<br>') +
          '</div></details>'
        : '') +
      '</section>'
    );
  }
  function render() {
    $('reading-article').innerHTML =
      lectureHTML('main') +
      (section().graph ? explorerHTML(section().graph) : '') +
      quizHTML() +
      exerciseHTML();
    $('previous').disabled = sectionIndex === 0;
    $('next').textContent =
      sectionIndex === course.sections.length - 1 ? '标记本节已读' : '下一节 →';
    $('step-count').textContent =
      String(sectionIndex + 1).padStart(2, '0') +
      ' / ' +
      String(course.sections.length).padStart(2, '0');
    $('progress').style.width =
      (state.read.length / course.sections.length) * 100 + '%';
    renderOutline();
    updateQuizzes();
    requestAnimationFrame(() => {
      $('reading-scroll').scrollTop = Number(state.scrolls[section().id]) || 0;
    });
  }
  function go(index, mark, address = 'push') {
    const targetIndex = Math.max(
      0,
      Math.min(course.sections.length - 1, index),
    );
    if (targetIndex === sectionIndex) {
      if (mark && !state.read.includes(section().id)) {
        state.read.push(section().id);
        save();
        renderOutline();
      }
      if (address !== 'none') writeChapterAddress(address);
      return;
    }
    pauseTrace();
    const wasSource = sourceOpen;
    if (wasSource) closeSource(false);
    else remember();
    if (mark && !state.read.includes(section().id))
      state.read.push(section().id);
    sectionIndex = targetIndex;
    state.section = section().id;
    if (address !== 'none') writeChapterAddress(address);
    render();
    save();
    requestAnimationFrame(() => {
      $('main-heading').focus({ preventScroll: true });
    });
  }
  function renderOutline() {
    $('outline-list').innerHTML = course.sections
      .map(
        (item, index) =>
          '<li><button class="outline-step" data-section="' +
          index +
          '"' +
          (index === sectionIndex ? ' aria-current="step"' : '') +
          '><span class="num">' +
          String(index + 1).padStart(2, '0') +
          '</span><span>' +
          escape(item.title) +
          '</span><span class="read">' +
          (state.read.includes(item.id) ? '已读' : '') +
          '</span></button></li>',
      )
      .join('');
    const checked = Object.values(state.quizzes).filter(
      (value) => value?.checked,
    ).length;
    $('outline-progress').textContent =
      '已读 ' +
      state.read.length +
      ' / ' +
      course.sections.length +
      ' 节；已核对 ' +
      checked +
      ' 题。阅读与核对记录都不等于掌握。';
  }
  function updateQuizzes() {
    document
      .querySelectorAll('#reading-article [data-quiz]')
      .forEach((block) => {
        const quiz = section().quiz.find(
          (item) => item.id === block.dataset.quiz,
        );
        if (!quiz) return;
        const q = quizState(quiz);
        block.querySelectorAll('input[data-quiz-choice]').forEach((input) => {
          input.checked = input.value === q.answer;
        });
        const check = block.querySelector('[data-quiz-check]');
        check.disabled = !q.answer || q.checked;
        check.textContent = q.checked ? '已核对' : '核对思路';
        block.querySelector('[data-quiz-hint]').textContent = q.checked
          ? '这是对本题预设思路的核对，不代表已经掌握主题。'
          : q.answer
            ? '已保留选择，准备好后再核对。'
            : '先做自己的判断，再展开参考。';
        const output = block.querySelector('[data-quiz-feedback]');
        output.hidden = !q.checked;
        output.innerHTML = q.checked
          ? '<strong>' +
            (q.answer === quiz.answer
              ? '✓ 这条思路对上了'
              : '再看一个关键条件') +
            '</strong>' +
            escape(quiz.explanation || '').replace(/\n/g, '<br>')
          : '';
      });
  }
  function openSource(target, opener) {
    if (!course.sources[target.file]) {
      notice('这份课程没有收录该文件，未尝试联网补取。');
      return;
    }
    pauseTrace();
    if (!sourceOpen) {
      remember();
      save();
      readingReturn = {
        id: section().id,
        top: $('reading-scroll').scrollTop,
        opener: opener?.id || null,
      };
      comparisonTop = readingReturn.top;
      comparisonReady = false;
      $('compare-article').innerHTML = lectureHTML('compare');
      $('source-context').textContent = section().title;
      $('source-mode').dataset.tab = 'code';
      $('reader').hidden = true;
      $('source-mode').hidden = false;
      sourceOpen = true;
      past = [];
      future = [];
      sourcePosition = null;
      requestAnimationFrame(() => {
        if ($('source-explanation').clientHeight) {
          $('source-explanation').scrollTop = comparisonTop;
          comparisonReady = true;
        }
      });
    }
    sourceHome = {
      file: target.file,
      start: Number(target.start) || 1,
      end: Number(target.end) || Number(target.start) || 1,
    };
    setSourceTab('code');
    navigateSource({ ...sourceHome, top: 0, left: 0 });
    $('source-close').focus({ preventScroll: true });
  }
  function closeSource(focus = true) {
    if (!sourceOpen) return;
    sourceOpen = false;
    $('source-mode').hidden = true;
    $('reader').hidden = false;
    const graphId = currentGraphId(),
      graph = course.graphs[graphId],
      svg = document.querySelector('.model-scene svg');
    if (graph?.projection && svg) {
      const view = graphView(graphId);
      focusModelScene(
        svg,
        view,
        svgEdge(svg, graph, currentTransition(graph, view)),
      );
    }
    if (readingReturn) {
      state.scrolls[readingReturn.id] = readingReturn.top;
      requestAnimationFrame(() => {
        $('reading-scroll').scrollTop = readingReturn.top;
        if (focus) {
          const opener = readingReturn.opener && $(readingReturn.opener);
          (opener || $('main-heading')).focus({ preventScroll: true });
        }
      });
    }
    save();
  }
  function sourceSnapshot() {
    return sourcePosition
      ? {
          ...sourcePosition,
          top: $('code-scroll').scrollTop,
          left: $('code-scroll').scrollLeft,
        }
      : null;
  }
  function navigateSource(target, history = true, restore = false) {
    if (!course.sources[target.file]) {
      notice('未收录该源码目标，可沿已知文件继续阅读。');
      return;
    }
    if (history && sourcePosition) {
      past.push(sourceSnapshot());
      future = [];
    }
    sourcePosition = { ...target };
    renderCode(restore);
  }
  function sourceHistory(direction) {
    const from = direction < 0 ? past : future,
      to = direction < 0 ? future : past;
    if (!from.length) return;
    to.push(sourceSnapshot());
    navigateSource(from.pop(), false, true);
  }
  function fileOptions() {
    const groups = [
        [
          '程序源码',
          (file) =>
            /\.(?:[cm]?[jt]sx?|py|go|rs|java|swift|c|h|cpp|rb|sh)$/i.test(file),
        ],
        ['规格与配置', (file) => /\.(tla|cfg|json|ya?ml|toml)$/i.test(file)],
        ['运行证据', (file) => /(?:^evidence\/|\.(out|log)$)/i.test(file)],
        ['参考材料', () => true],
      ],
      done = new Set();
    return groups
      .map(([title, test]) => {
        const files = Object.keys(course.sources).filter(
          (file) => !done.has(file) && test(file),
        );
        files.forEach((file) => done.add(file));
        return files.length
          ? '<optgroup label="' +
              title +
              '">' +
              files
                .map(
                  (file) =>
                    '<option value="' +
                    escape(file) +
                    '"' +
                    (file === sourcePosition.file ? ' selected' : '') +
                    '>' +
                    escape(file) +
                    '</option>',
                )
                .join('') +
              '</optgroup>'
          : '';
      })
      .join('');
  }
  function sourceLine(text, file, line) {
    const source = course.sources[file],
      links = source.links.filter(
        (link) =>
          Number(link.line) === line &&
          link.target &&
          course.sources[link.target.file],
      );
    if (links.length) {
      let result = '',
        cursor = 0;
      for (const link of links) {
        const token = link.label || link.token,
          at = text.indexOf(token, cursor);
        if (at < 0) continue;
        result +=
          escape(text.slice(cursor, at)) +
          '<button class="code-jump" data-code-file="' +
          escape(link.target.file) +
          '" data-start="' +
          (link.target.start || 1) +
          '" data-end="' +
          (link.target.end || link.target.start || 1) +
          '">' +
          escape(token) +
          '</button>';
        cursor = at + token.length;
      }
      return result + escape(text.slice(cursor));
    }
    const language = String(source.language).toLowerCase();
    if (
      /^(js|javascript|ts|typescript)$/.test(language) ||
      /\.[cm]?[jt]sx?$/i.test(file)
    )
      return text
        .split(
          /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/.*$|\b(?:export|import|from|const|let|var|function|return|if|else|async|await|class|new|throw|true|false|null|undefined)\b)/g,
        )
        .map((part) =>
          /^\/\//.test(part)
            ? '<span class="code-comment">' + escape(part) + '</span>'
            : /^["']/.test(part)
              ? '<span class="code-string">' + escape(part) + '</span>'
              : /^(export|import|from|const|let|var|function|return|if|else|async|await|class|new|throw|true|false|null|undefined)$/.test(
                    part,
                  )
                ? '<span class="code-key">' + escape(part) + '</span>'
                : escape(part),
        )
        .join('');
    if (
      language !== 'tla' &&
      language !== 'tla+' &&
      !/\.(tla|cfg)$/i.test(file)
    )
      return escape(text);
    return text
      .split(
        /("(?:[^"\\]|\\.)*"|\\\*.*$|\b(?:MODULE|EXTENDS|CONSTANTS?|VARIABLES?|ASSUME|THEOREM|INSTANCE|INVARIANT|PROPERTY|INIT|NEXT|SPECIFICATION|TRUE|FALSE|CHOOSE|LET|IN|IF|THEN|ELSE|UNCHANGED|Init|Next|Spec)\b)/g,
      )
      .map((part) =>
        part.startsWith('\\*')
          ? '<span class="code-comment">' + escape(part) + '</span>'
          : part.startsWith('"')
            ? '<span class="code-string">' + escape(part) + '</span>'
            : /^(MODULE|EXTENDS|CONSTANTS?|VARIABLES?|ASSUME|THEOREM|INSTANCE|INVARIANT|PROPERTY|INIT|NEXT|SPECIFICATION|TRUE|FALSE|CHOOSE|LET|IN|IF|THEN|ELSE|UNCHANGED|Init|Next|Spec)$/.test(
                  part,
                )
              ? '<span class="code-key">' + escape(part) + '</span>'
              : escape(part),
      )
      .join('');
  }
  function renderCode(restore) {
    const source = course.sources[sourcePosition.file],
      lines = source.text.split('\n');
    $('source-select').innerHTML = fileOptions();
    $('source-name').textContent = sourcePosition.file;
    $('source-origin').textContent = [
      source.origin?.label || '课程固定快照',
      source.origin?.revision ? '版本 ' + source.origin.revision : '',
      source.origin?.path || '',
      'SHA-256 ' + source.sha256,
    ]
      .filter(Boolean)
      .join(' · ');
    $('source-symbol').hidden = !source.symbols.length;
    $('source-symbol').innerHTML =
      '<option value="">跳到定义…</option>' +
      source.symbols
        .map(
          (symbol) =>
            '<option value="' +
            escape(symbol.id) +
            '">' +
            escape(symbol.label) +
            '</option>',
        )
        .join('');
    $('source-range').textContent =
      (sourcePosition.start
        ? '当前 L' + sourcePosition.start + '–' + sourcePosition.end + '；'
        : '完整文件；') +
      (sourcePosition.file === sourceHome.file &&
      sourcePosition.start === sourceHome.start
        ? '讲解对应。'
        : '正在追读，讲解保持原位。');
    $('source-lines').textContent = '完整文件 · ' + lines.length + ' 行';
    $('source-back').disabled = !past.length;
    $('source-forward').disabled = !future.length;
    $('source-copy-status').textContent = '';
    $('code-lines').innerHTML = lines
      .map(
        (text, index) =>
          '<div class="code-line ' +
          (sourcePosition.start &&
          index + 1 >= sourcePosition.start &&
          index + 1 <= sourcePosition.end
            ? 'target'
            : '') +
          '" data-line="' +
          (index + 1) +
          '"><span class="line-num" aria-hidden="true">' +
          (index + 1) +
          '</span><code>' +
          (sourceLine(text, sourcePosition.file, index + 1) || ' ') +
          '</code></div>',
      )
      .join('');
    requestAnimationFrame(() => {
      if (restore) {
        $('code-scroll').scrollTop = sourcePosition.top || 0;
        $('code-scroll').scrollLeft = sourcePosition.left || 0;
        return;
      }
      const row = $('code-lines').querySelector(
        '[data-line="' + sourcePosition.start + '"]',
      );
      $('code-scroll').scrollTop = row
        ? Math.max(0, row.offsetTop - $('code-lines').offsetTop - 55)
        : 0;
      $('code-scroll').scrollLeft = 0;
    });
  }
  function setSourceTab(tab) {
    const pane = $('source-explanation');
    if (
      $('source-mode').dataset.tab === 'explanation' &&
      comparisonReady &&
      pane.clientHeight
    )
      comparisonTop = pane.scrollTop;
    if (tab === 'explanation') comparisonReady = false;
    $('source-mode').dataset.tab = tab;
    document.querySelectorAll('[data-source-tab]').forEach((button) => {
      const active = button.dataset.sourceTab === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    if (tab === 'explanation')
      requestAnimationFrame(() => {
        if (sourceOpen && pane.clientHeight) {
          pane.scrollTop = comparisonTop;
          comparisonReady = true;
        }
      });
  }
  async function copySource() {
    const button = $('source-copy'),
      file = sourcePosition.file,
      text = course.sources[file].text;
    let copied = false;
    button.disabled = true;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (error) {}
      }
      if (!copied) {
        const field = document.createElement('textarea');
        field.value = text;
        field.style.cssText = 'position:fixed;left:-10000px;top:0';
        document.body.appendChild(field);
        try {
          field.select();
          copied = Boolean(document.execCommand('copy'));
        } finally {
          field.remove();
        }
      }
      $('source-copy-status').textContent = copied
        ? '已复制 ' + file + ' 的完整内容。'
        : '未能复制，可在文件区手动选择文本。';
    } catch (error) {
      $('source-copy-status').textContent =
        '未能复制，可在文件区手动选择文本。';
    } finally {
      button.disabled = false;
      button.focus({ preventScroll: true });
    }
  }
  function graphView(id) {
    const graph = course.graphs[id];
    if (!graph) return null;
    if (!graphViews.has(id))
      graphViews.set(id, {
        current: graph.initialStates[0] || graph.states[0]?.id,
        initial: graph.initialStates[0] || graph.states[0]?.id,
        past: [],
        future: [],
        pastEdges: [],
        futureEdges: [],
        overview: false,
        trace: graph.traces[0]?.id || null,
        frame: 0,
        replay: false,
      });
    return graphViews.get(id);
  }
  function currentGraphId() {
    return document.querySelector('[data-explorer]')?.dataset.explorer;
  }
  function resultHTML(runId, context) {
    const run = course.runs[runId];
    if (!run) return '';
    const statuses = {
      violated: '本次检查发现性质违反',
      holds: '本次范围内未发现所检查性质的违反',
      incomplete: '本次检查未完成',
      'tool-error': '工具或输入错误，未完成检查',
      timeout: '达到时间限制，检查未完成',
      unavailable: '检查工具不可用',
      'not-checked': '此项尚未检查',
    };
    const target =
      typeof run.logSource === 'string'
        ? { file: run.logSource, start: 1, end: 1 }
        : run.logSource;
    return (
      '<details class="run-details"><summary>' +
      escape(context) +
      ' · ' +
      escape(
        run.title || statuses[run.outcome || run.status] || '实际运行结果',
      ) +
      '</summary><div class="run-result"><strong>' +
      escape(
        statuses[run.outcome || run.status] ||
          run.outcome ||
          run.status ||
          '预先导出的运行结果',
      ) +
      '</strong>' +
      (run.summary
        ? '<p>' + escape(run.summary).replace(/\n/g, '<br>') + '</p>'
        : '') +
      ((run.outcome || run.status) === 'violated'
        ? '<p>这是 TLC 对模型行为或所声明性质的发现，不把它误写为工具故障。</p>'
        : '') +
      (run.counts
        ? '<p>本次生成 ' +
          escape(run.counts.generated ?? '未提供') +
          ' 个状态；不同状态 ' +
          escape(run.counts.distinct ?? '未提供') +
          ' 个；待探索队列 ' +
          escape(run.counts.queue ?? '未提供') +
          '。</p>'
        : '') +
      (run.toolVersion ? '<p>' + escape(run.toolVersion) + '</p>' : '') +
      (target && course.sources[target.file]
        ? sourceButton(target, '对照完整原始日志')
        : '') +
      (run.command
        ? '<details><summary>查看这次实际运行的命令</summary><pre>' +
          escape(run.command) +
          '</pre></details>'
        : '') +
      (run.limitations
        ? '<p class="export-limits">' +
          escape(
            Array.isArray(run.limitations)
              ? run.limitations.join('；')
              : run.limitations,
          ) +
          '</p>'
        : '') +
      '</div></details>'
    );
  }
  function runHTML(graph) {
    return resultHTML(graph.runId, '状态图导出运行（与本节性质检查分开）');
  }
  function stateHTML(id) {
    const graph = course.graphs[id],
      view = graphView(id),
      current = graph.states.find((item) => item.id === view.current);
    if (!current)
      return '<p class="dialog-note">导出数据缺少当前状态，无法补造变量值。</p>';
    const edges = graph.edges.filter((edge) => edge.from === current.id);
    return (
      '<details class="model-values"><summary>查看全部变量与具体状态</summary><p class="state-name" tabindex="-1" id="graph-current-state">' +
      (view.replay ? '参考路径回放' : '自由探索') +
      ' · 当前状态：' +
      escape(current.id) +
      (current.label ? ' · ' + escape(current.label) : '') +
      '</p><table class="variables"><caption class="dialog-note">' +
      (graph.basis === 'tlc' ? 'TLC 已导出的变量值' : '教学示意中的变量值') +
      '</caption><tbody>' +
      Object.entries(current.variables)
        .map(
          ([name, value]) =>
            '<tr><th scope="row">' +
            escape(name) +
            '</th><td>' +
            escape(
              typeof value === 'string'
                ? value
                : JSON.stringify(value, null, 2),
            ) +
            '</td></tr>',
        )
        .join('') +
      '</tbody></table>' +
      (current.violations?.length
        ? '<p class="model-violation">日志在此状态报告：' +
          current.violations.map(escape).join('、') +
          '。请结合模型假设和源码理解。</p>'
        : '') +
      (graph.projection
        ? '<p class="dialog-note">图中当前标签对应 ' +
          (graph.projection.nodes.find((n) => n.id === current.diagramNode)
            ?.members.length || 1) +
          ' 个具体状态；下面只列当前变量值所允许的已导出动作。</p>'
        : '') +
      '</details><p>也可以自己选择下一步：</p><div class="action-list">' +
      (edges.length
        ? edges
            .map(
              (edge) =>
                '<div class="actions"><button type="button" data-graph-edge="' +
                escape(edge.id) +
                '">' +
                escape(edge.label || edge.action) +
                '</button>' +
                (edge.source && course.sources[edge.source.file]
                  ? sourceButton(edge.source, '对照动作源码')
                  : '') +
                '</div>',
            )
            .join('')
        : '<p>没有其他已导出的 Next 边。不能据此把公式允许的停留自动排除。</p>') +
      '</div><div class="actions"><button class="button secondary" id="graph-back"' +
      (!view.past.length ? ' disabled' : '') +
      '>返回上个状态</button><button class="button secondary" id="graph-forward"' +
      (!view.future.length ? ' disabled' : '') +
      '>前往下个状态</button><button class="button" id="graph-reset">回到初始状态</button></div><details><summary>查看走过的具体状态</summary><p class="graph-history">本次浏览路径：' +
      escape([...view.past, view.current].join(' → ')) +
      '</p></details>'
    );
  }
  function traceHTML(id) {
    const graph = course.graphs[id],
      view = graphView(id);
    return (
      '<section class="model-player" id="model-player" aria-label="动态学习图"><div class="model-path-picker"><label for="trace-select">选择一条路径</label><select id="trace-select"' +
      (!graph.traces.length ? ' disabled' : '') +
      '>' +
      graph.traces
        .map(
          (trace) =>
            '<option value="' +
            escape(trace.id) +
            '"' +
            (view.trace === trace.id ? ' selected' : '') +
            '>' +
            escape(trace.title || trace.id) +
            '</option>',
        )
        .join('') +
      '</select></div>' +
      (graph.diagram
        ? '<div class="model-stage-heading"><span>当前图景</span><button type="button" id="model-overview" aria-pressed="false">查看全图</button></div><div class="model-figure model-scene"><div class="model-viewport" tabindex="0" role="region" aria-label="当前步骤图，可滚动查看">' +
          course.diagrams[graph.diagram].model.wide +
          '</div></div>'
        : '') +
      '<div class="model-observation" id="model-observation"></div>' +
      (graph.traces.length
        ? '<div class="trace-tools"><button class="button secondary" id="trace-previous">上一步</button><button class="button" id="trace-play" aria-pressed="false">播放路径</button><button class="button secondary" id="trace-next">下一步</button><button class="button secondary" id="trace-reset">回到起点</button><span class="trace-count" id="trace-count"></span></div><p class="trace-caption" id="trace-caption" role="status" aria-live="polite"></p><p class="trace-note" id="trace-note"></p>'
        : '<p>当前没有预设路径，可以在下方选择合法动作。</p>') +
      '</section>'
    );
  }
  function explorerHTML(id) {
    const graph = course.graphs[id];
    if (!graph)
      return '<p class="dialog-note">本节模型数据未载入，因此不展示虚构的状态探索。</p>';
    graphView(id);
    setTimeout(updateTrace, 0);
    return (
      '<section class="explorer" data-explorer="' +
      escape(id) +
      '" aria-label="探索已导出的模型状态"><h2>跟着状态走</h2><p>先预测下一步，再播放或亲手选择。</p>' +
      '<div class="model-row"><label for="model-select">模型</label><select id="model-select">' +
      Object.entries(course.graphs)
        .map(
          ([key, item]) =>
            '<option value="' +
            escape(key) +
            '"' +
            (key === id ? ' selected' : '') +
            '>' +
            escape(item.title) +
            '</option>',
        )
        .join('') +
      '</select>' +
      (graph.initialStates.length > 1
        ? '<label for="initial-select">初始状态</label><select id="initial-select">' +
          graph.initialStates
            .map(
              (stateId) =>
                '<option value="' +
                escape(stateId) +
                '"' +
                (graphView(id).initial === stateId ? ' selected' : '') +
                '>' +
                escape(stateId) +
                '</option>',
            )
            .join('') +
          '</select>'
        : '') +
      '</div>' +
      traceHTML(id) +
      '<details class="model-assumptions"><summary>模型的假设与边界</summary><p class="export-limits">' +
      escape(
        graph.note ||
          (graph.basis === 'tlc'
            ? '这里展示导出的 Next 转换；[Next]_vars 允许的隐含停留未必逐一画出。'
            : '只展示教学模型中明确给定的转换。'),
      ) +
      '</p></details><div id="graph-state">' +
      stateHTML(id) +
      '</div>' +
      runHTML(graph) +
      '</section>'
    );
  }
  function replaceExplorer(id) {
    pauseTrace();
    const old = document.querySelector('[data-explorer]');
    if (!old || !course.graphs[id]) return;
    old.outerHTML = explorerHTML(id);
    updateTrace();
  }
  function currentTransition(graph, view) {
    const from = view.past.at(-1);
    if (from == null) return null;
    const id = view.pastEdges.at(-1);
    const candidates = graph.edges.filter(
      (edge) =>
        edge.from === from &&
        edge.to === view.current &&
        (!id || edge.id === id),
    );
    return candidates.length === 1 ? candidates[0] : null;
  }
  function cancelModelMotion() {
    cancelAnimationFrame(modelMotion);
    modelMotion = 0;
    document
      .querySelectorAll('.model-token')
      .forEach((token) => token.remove());
  }
  function updateObservation(graph, view, edge) {
    const current = graph.states.find((s) => s.id === view.current),
      before = edge && graph.states.find((s) => s.id === edge.from),
      changed = [
        ...new Set([
          ...Object.keys(current.variables),
          ...Object.keys(before?.variables || {}),
        ]),
      ]
        .filter(
          (key) =>
            !before ||
            JSON.stringify(current.variables[key]) !==
              JSON.stringify(before.variables[key]),
        )
        .map((key) => [key, current.variables[key]]),
      valueText = (value) => {
        const text =
          value === undefined
            ? '—'
            : typeof value === 'string'
              ? value
              : JSON.stringify(value);
        return text.length > 80 ? text.slice(0, 77) + '…' : text;
      };
    const html =
      '<p class="model-now" tabindex="-1">' +
      escape(current.label || current.id).replace(/\n/g, ' · ') +
      '</p><div class="model-changes">' +
      (changed.length
        ? changed
            .map(
              ([key, value]) =>
                '<span><code>' +
                escape(key) +
                '</code> ' +
                (before
                  ? escape(valueText(before.variables[key])) + ' → '
                  : '') +
                '<strong>' +
                escape(valueText(value)) +
                '</strong></span>',
            )
            .join('')
        : '<span>这一步没有改变变量值</span>') +
      '</div>' +
      (edge
        ? '<div class="model-action"><span>' +
          escape(edge.label || edge.action) +
          '</span>' +
          (edge.source ? sourceButton(edge.source, '对照这一步源码') : '') +
          '</div>'
        : '<p class="model-action">从这里开始，先想想哪个动作可以发生。</p>');
    const observation = $('model-observation');
    if (observation.renderedObservation !== html) {
      observation.innerHTML = html;
      observation.renderedObservation = html;
    }
  }
  function svgEdge(svg, graph, edge) {
    if (!edge) return null;
    const from = graph.states.find((s) => s.id === edge.from)?.diagramNode,
      to = graph.states.find((s) => s.id === edge.to)?.diagramNode,
      candidates = [...svg.querySelectorAll('.pele-edge[data-from]')].filter(
        (el) => el.dataset.from === from && el.dataset.to === to,
      ),
      exact = candidates.filter(
        (el) => el.dataset.label === (edge.label || edge.action),
      ),
      alternatives =
        (Array.isArray(graph.projection?.edges)
          ? graph.projection.edges
          : []
        ).filter((item) => item.from === from && item.to === to) || [];
    return exact.length === 1
      ? exact[0]
      : candidates.length === 1 &&
          alternatives.length === 1 &&
          alternatives[0].members?.includes(edge.id)
        ? candidates[0]
        : null;
  }
  function updateModelFigure(animate = false) {
    cancelModelMotion();
    if (sourceOpen) return;
    const id = currentGraphId(),
      graph = course.graphs[id],
      view = id && graphView(id);
    if (!graph || !view) return;
    const edge = currentTransition(graph, view);
    updateObservation(graph, view, edge);
    if (!graph.projection) return;
    const nodeId = graph.states.find((s) => s.id === view.current)?.diagramNode;
    const path = new Set(
      [...view.past, view.current].map(
        (stateId) => graph.states.find((s) => s.id === stateId)?.diagramNode,
      ),
    );
    document
      .querySelectorAll('[data-explorer] .model-figure .pele-node[data-id]')
      .forEach((node) => {
        const current = node.dataset.id === nodeId;
        node.classList.toggle('is-model-current', current);
        node.classList.toggle('is-model-path', path.has(node.dataset.id));
        if (current) node.setAttribute('aria-current', 'step');
        else node.removeAttribute('aria-current');
      });
    const svg = document.querySelector('[data-explorer] .model-scene svg');
    if (!svg) return;
    const activeEdge = svgEdge(svg, graph, edge),
      traversed = new Set(
        view.pastEdges
          .map((edgeId) =>
            svgEdge(
              svg,
              graph,
              graph.edges.find((e) => e.id === edgeId),
            ),
          )
          .filter(Boolean),
      );
    svg.querySelectorAll('.pele-edge').forEach((el) => {
      el.classList.toggle('is-model-transition', el === activeEdge);
      el.classList.toggle('is-model-traversed', traversed.has(el));
    });
    svg
      .querySelectorAll('.pele-edge-label')
      .forEach((el) =>
        el.classList.toggle(
          'is-model-transition',
          el.dataset.id === activeEdge?.dataset.id,
        ),
      );
    focusModelScene(svg, view, activeEdge);
    if (
      animate &&
      activeEdge &&
      !reduced.matches &&
      !sourceOpen &&
      document.visibilityState !== 'hidden'
    )
      animateModelEdge(svg, activeEdge);
  }
  function focusModelScene(svg, view, edge) {
    const viewport = svg.closest('.model-viewport');
    if (!svg.dataset.fullView)
      svg.dataset.fullView = svg.getAttribute('viewBox');
    const original = svg.dataset.fullView.split(/\s+/).map(Number);
    let box = original;
    if (!view.overview) {
      const nodes = [...svg.querySelectorAll('.pele-node')].filter(
        (el) =>
          el.classList.contains('is-model-current') ||
          (edge && el.dataset.id === edge.dataset.from),
      );
      const parts = [...nodes, ...(edge ? [edge] : [])]
        .map((el) => {
          const b = el.getBBox(),
            matrix = el.getCTM(),
            root = svg.getCTM();
          if (!matrix || !root) return null;
          const transform = root.inverse().multiply(matrix);
          const points = [
            [b.x, b.y],
            [b.x + b.width, b.y],
            [b.x, b.y + b.height],
            [b.x + b.width, b.y + b.height],
          ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(transform));
          return {
            x: Math.min(...points.map((p) => p.x)),
            y: Math.min(...points.map((p) => p.y)),
            right: Math.max(...points.map((p) => p.x)),
            bottom: Math.max(...points.map((p) => p.y)),
          };
        })
        .filter(Boolean);
      if (parts.length) {
        const x = Math.min(...parts.map((p) => p.x)),
          y = Math.min(...parts.map((p) => p.y)),
          right = Math.max(...parts.map((p) => p.right)),
          bottom = Math.max(...parts.map((p) => p.bottom)),
          width = Math.max(viewport.clientWidth, right - x + 48),
          height = Math.max(viewport.clientHeight, bottom - y + 48);
        box = [
          (x + right - width) / 2,
          (y + bottom - height) / 2,
          width,
          height,
        ];
      }
    }
    svg.setAttribute('viewBox', box.join(' '));
    svg.style.width = box[2] + 'px';
    svg.style.height = box[3] + 'px';
    if (!view.overview) {
      viewport.scrollTop = Math.max(0, (box[3] - viewport.clientHeight) / 2);
      viewport.scrollLeft = Math.max(0, (box[2] - viewport.clientWidth) / 2);
    }
    const toggle = $('model-overview');
    toggle.textContent = view.overview ? '回到当前步骤' : '查看全图';
    toggle.setAttribute('aria-pressed', String(view.overview));
  }
  function animateModelEdge(svg, edge) {
    const path = edge.querySelector('path:not(.pele-marker)');
    if (!path) return;
    const length = path.getTotalLength();
    if (!length) return;
    const token = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    );
    token.setAttribute('r', '5');
    token.setAttribute('class', 'model-token');
    token.setAttribute('aria-hidden', 'true');
    edge.append(token);
    const start = performance.now();
    function frame(now) {
      if (!token.isConnected) return;
      const progress = Math.min(1, (now - start) / 650),
        point = path.getPointAtLength(length * progress);
      token.setAttribute('cx', point.x);
      token.setAttribute('cy', point.y);
      if (progress < 1) modelMotion = requestAnimationFrame(frame);
      else {
        token.remove();
        modelMotion = 0;
      }
    }
    frame(start);
  }
  function updateGraph(focus = false, animate = false) {
    const id = currentGraphId();
    if (!id) return;
    $('graph-state').innerHTML = stateHTML(id);
    updateTrace(animate);
    if (focus)
      $('model-observation')
        .querySelector('.model-now')
        ?.focus({ preventScroll: true });
  }
  function moveGraph(edgeId) {
    const id = currentGraphId(),
      graph = course.graphs[id],
      view = graphView(id);
    if (!view) return;
    const edge = graph.edges.find(
      (item) => item.id === edgeId && item.from === view.current,
    );
    if (!edge) return;
    pauseTrace();
    view.replay = false;
    view.past.push(view.current);
    view.pastEdges.push(edge.id);
    view.future = [];
    view.futureEdges = [];
    view.current = edge.to;
    updateGraph(true, true);
  }
  function pauseTrace() {
    cancelModelMotion();
    clearTimeout(graphTimer);
    graphTimer = 0;
    graphRevision += 1;
    const button = $('trace-play');
    if (button) {
      button.textContent = '播放路径';
      button.setAttribute('aria-pressed', 'false');
    }
  }
  function activeTrace() {
    const id = currentGraphId(),
      graph = course.graphs[id],
      view = id && graphView(id);
    return graph && view
      ? {
          id,
          graph,
          view,
          trace:
            graph.traces.find((item) => item.id === view.trace) ||
            graph.traces[0],
        }
      : null;
  }
  function updateTrace(animate = false) {
    updateModelFigure(animate);
    const active = activeTrace();
    if (!active || !active.trace || !$('trace-count')) return;
    const { view, trace } = active,
      states = trace.states || [];
    view.frame = Math.max(0, Math.min(states.length - 1, view.frame));
    $('trace-count').textContent = states.length
      ? view.replay
        ? view.frame + 1 + ' / ' + states.length
        : '参考路径共 ' + states.length + ' 帧'
      : '未提供状态';
    $('trace-previous').disabled = !view.replay || view.frame <= 0;
    $('trace-next').disabled =
      !states.length || (view.replay && view.frame >= states.length - 1);
    $('trace-next').textContent = view.replay ? '下一步' : '从起点逐步看';
    $('trace-play').disabled = !states.length || reduced.matches;
    $('trace-note').textContent = reduced.matches
      ? '已遵循减少动态效果偏好，请手动逐步查看。'
      : (active.graph.basis === 'tlc'
          ? '沿预先计算的模型路径演示，'
          : '沿作者给定的教学路径演示，') + '播放节奏不代表真实耗时。';
    if (!view.replay) {
      $('trace-play').textContent = '播放参考路径';
      $('trace-caption').textContent =
        '当前可自由选择下一步，也可以从起点播放所选路径。';
      return;
    }
    const current = String(states[view.frame] ?? ''),
      property = trace.property ? ' · ' + trace.property : '';
    const edgeId = view.frame ? trace.edges?.[view.frame - 1] : null,
      edge = edgeId
        ? active.graph.edges.find((item) => item.id === edgeId)
        : view.frame
          ? active.graph.edges.find(
              (item) =>
                item.from === String(states[view.frame - 1]) &&
                item.to === current,
            )
          : null;
    $('trace-caption').textContent =
      (trace.type === 'counterexample'
        ? 'TLC 导出的反例'
        : trace.type === 'example'
          ? '沿模型中合法边构造的教学路径'
          : '导出的轨迹') +
      property +
      '：第 ' +
      (view.frame + 1) +
      ' 步：' +
      (edge ? edge.label || edge.action : '初始状态') +
      '。' +
      (edge &&
      active.graph.states.find((s) => s.id === edge.from)?.diagramNode &&
      active.graph.states.find((s) => s.id === edge.from)?.diagramNode ===
        active.graph.states.find((s) => s.id === edge.to)?.diagramNode
        ? ' 该动作没有改变图中的阶段，请观察变量。'
        : '') +
      (trace.loopStart != null && view.frame >= Number(trace.loopStart)
        ? ' 此处属于日志标注的循环段。'
        : '');
  }
  function showTraceFrame(index, animate = false) {
    const active = activeTrace();
    if (!active?.trace) return false;
    const states = active.trace.states || [],
      next = Math.max(0, Math.min(states.length - 1, index)),
      stateId = String(states[next] ?? '');
    if (!active.graph.states.some((item) => item.id === stateId)) {
      notice('轨迹引用了未导出的状态，无法补造变量。');
      return false;
    }
    if (next > 0) {
      const from = String(states[next - 1]),
        edgeId = active.trace.edges?.[next - 1],
        exists = active.graph.edges.some(
          (edge) =>
            edge.from === from &&
            edge.to === stateId &&
            (!edgeId || edge.id === edgeId),
        );
      if (!exists) {
        notice(
          '这一步没有对应的已导出 Next 边，请对照实际日志；浏览器不会补造转换。',
        );
        return false;
      }
    }
    active.view.frame = next;
    active.view.current = stateId;
    active.view.past = states.slice(0, next).map(String);
    active.view.pastEdges = states.slice(0, next).map(
      (from, i) =>
        active.trace.edges?.[i] ||
        (() => {
          const edges = active.graph.edges.filter(
            (e) => e.from === String(from) && e.to === String(states[i + 1]),
          );
          return edges.length === 1 ? edges[0].id : null;
        })(),
    );
    active.view.future = [];
    active.view.futureEdges = [];
    active.view.replay = true;
    updateGraph(false, animate);
    return true;
  }
  function playTrace() {
    if (graphTimer) {
      pauseTrace();
      return;
    }
    const active = activeTrace();
    if (!active?.trace || reduced.matches) return;
    const states = active.trace.states || [];
    if (!states.length) return;
    if (active.view.frame >= states.length - 1 || !active.view.replay)
      showTraceFrame(0);
    $('model-player').scrollIntoView({ block: 'center', behavior: 'auto' });
    const stamp = graphRevision,
      owner = section().id,
      graphId = active.id;
    $('trace-play').textContent = '暂停轨迹';
    $('trace-play').setAttribute('aria-pressed', 'true');
    function step() {
      graphTimer = 0;
      if (
        stamp !== graphRevision ||
        owner !== section().id ||
        graphId !== currentGraphId() ||
        sourceOpen ||
        document.visibilityState === 'hidden'
      )
        return;
      const now = activeTrace();
      if (!now || !showTraceFrame(now.view.frame + 1, true)) {
        pauseTrace();
        return;
      }
      if (now.view.frame >= states.length - 1) {
        // Let the final transition finish; there is no next playback timer.
        $('trace-play').textContent = '再播放一次';
        $('trace-play').setAttribute('aria-pressed', 'false');
        return;
      }
      graphTimer = setTimeout(step, 1200);
    }
    graphTimer = setTimeout(step, 1200);
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.addEventListener)
    reduced.addEventListener('change', () => {
      pauseTrace();
      updateTrace();
    });
  function applyTheme(id, persist) {
    if (!Object.hasOwn(themes.themes, id)) return;
    document.documentElement.dataset.theme = id;
    document.documentElement.style.colorScheme = themes.themes[id].scheme;
    $('settings')
      .querySelectorAll(
        'input[type="radio"][name="teacher-reader-theme"][data-theme-choice]',
      )
      .forEach((input) => {
        input.checked = input.value === id;
      });
    if (persist) {
      try {
        localStorage.setItem(appearanceKey, JSON.stringify({ theme: id }));
        $('settings-status').textContent =
          '外观已保存，阅读位置与练习选择保持不变。';
      } catch (error) {
        $('settings-status').textContent =
          '主题仅在本次打开中生效；浏览器未允许保存设置。';
      }
    }
  }
  let theme = themes.default;
  try {
    const saved = JSON.parse(localStorage.getItem(appearanceKey) || 'null');
    if (saved && Object.hasOwn(themes.themes, saved.theme)) theme = saved.theme;
  } catch (error) {}
  applyTheme(theme, false);
  $('settings').addEventListener('change', (event) => {
    const input = event.target;
    if (
      input instanceof HTMLInputElement &&
      input.matches(
        'input[type="radio"][name="teacher-reader-theme"][data-theme-choice]',
      ) &&
      input.checked
    )
      applyTheme(input.value, true);
  });
  $('settings-open').addEventListener('click', (event) => {
    appearanceOpener = event.currentTarget;
    $('settings').showModal();
  });
  function closeSettings() {
    $('settings').close();
    appearanceOpener?.focus({ preventScroll: true });
  }
  $('settings-close').addEventListener('click', closeSettings);
  $('outline-open').addEventListener('click', () => {
    pauseTrace();
    renderOutline();
    $('reset-confirm').hidden = true;
    $('outline').showModal();
  });
  $('outline-close').addEventListener('click', () => $('outline').close());
  $('reset-open').addEventListener('click', () => {
    $('reset-confirm').hidden = false;
    $('reset-confirm-button').focus();
  });
  $('reset-cancel').addEventListener('click', () => {
    $('reset-confirm').hidden = true;
    $('reset-open').focus();
  });
  $('reset-confirm-button').addEventListener('click', () => {
    pauseTrace();
    if (sourceOpen) closeSource(false);
    state = first();
    sectionIndex = 0;
    graphViews.clear();
    $('reset-confirm').hidden = true;
    $('outline').close();
    writeChapterAddress('replace');
    render();
    save();
    notice('已从第一节重新开始，其他课程不受影响。');
  });
  $('previous').addEventListener('click', () => go(sectionIndex - 1, false));
  $('next').addEventListener('click', () => {
    if (sectionIndex < course.sections.length - 1) go(sectionIndex + 1, true);
    else {
      if (!state.read.includes(section().id)) state.read.push(section().id);
      save();
      renderOutline();
      $('progress').style.width =
        (state.read.length / course.sections.length) * 100 + '%';
      notice('本节已记录为已读；掌握仍需通过解释和迁移来判断。');
    }
  });
  $('source-close').addEventListener('click', () => closeSource());
  $('source-back').addEventListener('click', () => sourceHistory(-1));
  $('source-forward').addEventListener('click', () => sourceHistory(1));
  $('source-home').addEventListener('click', () =>
    navigateSource({ ...sourceHome, top: 0, left: 0 }),
  );
  $('source-select').addEventListener('change', (event) =>
    navigateSource({
      file: event.target.value,
      start: null,
      end: null,
      top: 0,
      left: 0,
    }),
  );
  $('source-symbol').addEventListener('change', (event) => {
    const symbol = course.sources[sourcePosition.file].symbols.find(
      (item) => item.id === event.target.value,
    );
    if (symbol)
      navigateSource({
        file: sourcePosition.file,
        start: symbol.start,
        end: symbol.end,
        top: 0,
        left: 0,
      });
  });
  $('source-wrap').addEventListener('click', () => {
    wrap = !wrap;
    $('code-scroll').classList.toggle('wrap', wrap);
    $('source-wrap').setAttribute('aria-pressed', String(wrap));
  });
  $('source-copy').addEventListener('click', copySource);
  $('reading-scroll').addEventListener(
    'scroll',
    () => {
      if (sourceOpen) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        remember();
        save();
      }, 130);
    },
    { passive: true },
  );
  $('source-explanation').addEventListener(
    'scroll',
    () => {
      if (sourceOpen && comparisonReady && $('source-explanation').clientHeight)
        comparisonTop = $('source-explanation').scrollTop;
    },
    { passive: true },
  );
  $('reading-article').addEventListener('change', (event) => {
    const input = event.target;
    if (
      !(input instanceof HTMLInputElement) ||
      !input.matches('input[type="radio"][data-quiz-choice]')
    )
      return;
    const quiz = section().quiz.find(
      (item) => item.id === input.dataset.quizChoice,
    );
    if (!quiz) return;
    const q = quizState(quiz);
    q.answer = input.value;
    q.checked = false;
    updateQuizzes();
    save();
  });
  $('reading-article').addEventListener('input', (event) => {
    if (event.target.matches('[data-exercise-text]'))
      state.drafts[section().id] = event.target.value;
  });
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const source = target.closest('[data-source]');
    if (source) {
      if (!source.id)
        source.id = 'source-opener-' + section().id + '-' + ++openerSequence;
      openSource(
        {
          file: source.dataset.source,
          start: source.dataset.start,
          end: source.dataset.end,
        },
        source,
      );
      return;
    }
    const code = target.closest('[data-code-file]');
    if (code) {
      navigateSource({
        file: code.dataset.codeFile,
        start: Number(code.dataset.start),
        end: Number(code.dataset.end),
        top: 0,
        left: 0,
      });
      return;
    }
    const chapter = target.closest('[data-section]');
    if (chapter) {
      $('outline').close();
      go(Number(chapter.dataset.section), false);
      return;
    }
    const tab = target.closest('[data-source-tab]');
    if (tab) {
      setSourceTab(tab.dataset.sourceTab);
      return;
    }
    const check = target.closest('[data-quiz-check]');
    if (check) {
      const quiz = section().quiz.find(
        (item) => item.id === check.dataset.quizCheck,
      );
      if (quiz && quizState(quiz).answer) {
        quizState(quiz).checked = true;
        updateQuizzes();
        save();
        renderOutline();
      }
      return;
    }
    const retry = target.closest('[data-quiz-reset]');
    if (retry) {
      const quiz = section().quiz.find(
        (item) => item.id === retry.dataset.quizReset,
      );
      if (quiz) {
        state.quizzes[quizKey(quiz)] = { answer: null, checked: false };
        updateQuizzes();
        save();
        retry
          .closest('[data-quiz]')
          .querySelector('input')
          .focus({ preventScroll: true });
      }
      return;
    }
    if (target.closest('#exercise-save')) {
      save();
      $('exercise-status').textContent = storageOK
        ? '解释已保存在当前浏览器；未被自动评判。'
        : '本次无法保存，文本仍可在当前页面继续编辑。';
      return;
    }
    const edge = target.closest('[data-graph-edge]');
    if (edge) {
      moveGraph(edge.dataset.graphEdge);
      return;
    }
    const id = currentGraphId(),
      view = id && graphView(id);
    if (target.closest('#model-overview') && view) {
      cancelModelMotion();
      view.overview = !view.overview;
      updateModelFigure();
      return;
    }
    if (target.closest('#graph-back') && view?.past.length) {
      pauseTrace();
      view.replay = false;
      view.future.push(view.current);
      view.futureEdges.push(view.pastEdges.pop());
      view.current = view.past.pop();
      updateGraph(true);
      return;
    }
    if (target.closest('#graph-forward') && view?.future.length) {
      pauseTrace();
      view.replay = false;
      view.past.push(view.current);
      view.pastEdges.push(view.futureEdges.pop());
      view.current = view.future.pop();
      updateGraph(true, true);
      return;
    }
    if (target.closest('#graph-reset') && view) {
      pauseTrace();
      view.current = view.initial;
      view.past = [];
      view.future = [];
      view.pastEdges = [];
      view.futureEdges = [];
      view.replay = false;
      updateGraph(true);
      return;
    }
    if (target.closest('#trace-play')) {
      playTrace();
      return;
    }
    if (target.closest('#trace-previous')) {
      pauseTrace();
      const current = activeTrace();
      if (current) showTraceFrame(current.view.frame - 1);
      return;
    }
    if (target.closest('#trace-next')) {
      pauseTrace();
      const current = activeTrace();
      if (current)
        showTraceFrame(current.view.replay ? current.view.frame + 1 : 0, true);
      return;
    }
    if (target.closest('#trace-reset')) {
      pauseTrace();
      showTraceFrame(0);
    }
  });
  document.addEventListener('change', (event) => {
    if (event.target.id === 'model-select') replaceExplorer(event.target.value);
    else if (event.target.id === 'trace-select') {
      pauseTrace();
      const active = activeTrace();
      if (active) {
        active.view.trace = event.target.value;
        active.view.frame = 0;
        showTraceFrame(0);
      }
    } else if (event.target.id === 'initial-select') {
      pauseTrace();
      const id = currentGraphId(),
        view = graphView(id);
      view.initial = event.target.value;
      view.current = view.initial;
      view.past = [];
      view.future = [];
      view.pastEdges = [];
      view.futureEdges = [];
      view.replay = false;
      updateGraph();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (
      event.target.matches?.('[data-source-tab]') &&
      ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
    ) {
      event.preventDefault();
      const tab =
        event.key === 'Home'
          ? 'explanation'
          : event.key === 'End'
            ? 'code'
            : event.target.dataset.sourceTab === 'code'
              ? 'explanation'
              : 'code';
      setSourceTab(tab);
      document
        .querySelector('[data-source-tab="' + tab + '"]')
        .focus({ preventScroll: true });
      return;
    }
    if (event.key !== 'Escape') return;
    if ($('settings').open) {
      event.preventDefault();
      closeSettings();
      return;
    }
    if ($('outline').open) return;
    if (sourceOpen) {
      event.preventDefault();
      closeSource();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      pauseTrace();
      remember();
      save();
    }
  });
  window.addEventListener('pagehide', () => {
    pauseTrace();
    remember();
    save();
  });
  window.addEventListener('resize', () => {
    pauseTrace();
    if (!sourceOpen && currentGraphId()) updateModelFigure();
  });
  function followAddress() {
    const id = chapterFromHash();
    if (id && id !== section().id) go(sectionIds.indexOf(id), false, 'none');
  }
  window.addEventListener('hashchange', followAddress);
  window.addEventListener('popstate', followAddress);
  $('storage-warning').hidden = storageOK;
  render();
  if (recovered) {
    save();
    notice('旧阅读记录无法解析，已恢复本课程起点；其他课程与外观保持。');
  } else if (sectionIndex > 0 || (state.scrolls[section().id] || 0) > 35)
    notice('已接着上次的章节与阅读位置继续。');
}
initializeTeacherReader();
