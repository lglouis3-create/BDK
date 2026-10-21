(() => {
  'use strict';

  // ---------- deck structure (BDK Quizlet deck spec) ----------
  const DECKS = [
    { id: 'Cards', label: 'Cards' },
    { id: 'SelectALL', label: 'Select ALL' },
    { id: 'EssentialKnowledge', label: 'Essential Knowledge' },
    { id: 'Organisms', label: 'Organisms (ID pages)' },
  ];
  const CARD_KINDS = [
    { id: 'brand', label: 'Brand name' },
    { id: 'generic', label: 'Generic name' },
    { id: 'category', label: 'Pharmacologic category' },
    { id: 'classification', label: 'Classification' },
    { id: 'indication', label: 'Common indications' },
  ];
  const KIND_LABEL = {
    brand: 'Brand name', generic: 'Generic name', category: 'Pharmacologic category',
    classification: 'Classification', indication: 'Common indications',
    'sa-category': 'Select ALL · category', 'sa-classification': 'Select ALL · classification',
    'sa-indication': 'Select ALL · indication', 'ek-kse': 'Key side effects', 'ek-bw': 'US boxed warnings',
    'ek-notes': 'Other notes', organism: 'Organisms', 'sa-organism': 'Select ALL · organism',
  };

  // BDK quiz schedule, PHAR 4232 APC III syllabus (Fall 2026, last updated 08/20/26).
  // `until` is the last lab day of that week, so the next quiz can be preselected.
  const QUIZZES = [
    { label: 'Wk 2 · 8/25', pages: [11, 12, 13], until: '2026-08-27' },
    { label: 'Wk 3 · 8/31', pages: [14, 15], until: '2026-08-31' },
    { label: 'Wk 4 · 9/8', pages: [20, 21, 22], until: '2026-09-10' },
    { label: 'Wk 5 · 9/14', pages: [10, 23, 24, 25], until: '2026-09-14' },
    { label: 'Wk 6 · 9/21', pages: [6, 7, 8], until: '2026-09-21' },
    { label: 'Wk 8 · 10/5', pages: [2, 3, 4], until: '2026-10-05' },
    { label: 'Wk 10 · 10/20', pages: [16, 26, 27], until: '2026-10-22' },
    { label: 'Wk 11 · 10/27', pages: [17, 18, 19], until: '2026-10-29' },
    { label: 'Wk 14 · 11/17', pages: [5, 9], until: '2026-11-19' },
  ];
  const today = new Date().toISOString().slice(0, 10);
  const nextQuiz = QUIZZES.findIndex(q => q.until >= today);

  const GROUPS = [
    ['DEENT', /^DEENT/], ['Renal', /^Renal/], ['Cardiovascular', /^CV/], ['Pulmonary', /^Pulmonary/],
    ['Infectious diseases', /^ID/], ['Musculoskeletal', /^MSK/], ['Endocrine', /^Endo/],
    ['Central nervous system', /^CNS/], ['Gastroenterology', /^GI/], ['Pain, heme, onc', /^PainHemeOnc/],
  ];
  const MODES = [
    { id: 'mc', label: 'Multiple choice' },
    { id: 'written', label: 'Written' },
    { id: 'flash', label: 'Flashcards' },
  ];
  const COUNTS = [10, 25, 50, 0];

  // ---------- storage (per-browser conveniences only) ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('bdk2:' + key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('bdk2:' + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    },
  };

  // ---------- helpers ----------
  const $app = document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  };
  const norm = s => String(s).toLowerCase()
    .replace(/\((?:po|iv|im|sq|sc|sl|pr|inh|topical|ophthalmic|intranasal|transdermal|[a-z, ]*)\)/g, ' ')
    .replace(/&|\+/g, ' and ').replace(/[^a-z0-9]+/g, '');
  const pageName = p => `p${p.page} · ${p.short.replace(/(\D)(\d)$/, '$1 $2').replace('PainHemeOnc', 'Pain/Heme/Onc')}`;

  function similarity(a, b) {
    if (a === b) return 1;
    if (!a.length || !b.length) return 0;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return 1 - prev[b.length] / Math.max(a.length, b.length);
  }

  // "(#1) x; (#2) y" -> list markup; plain answers stay plain.
  function answerHtml(a) {
    const parts = a.split(/;\s*(?=\(#\d+\))/);
    if (parts.length < 2) return esc(a);
    return `<ol class="ans-list">${parts.map(p => `<li>${esc(p.replace(/^\(#\d+\)\s*/, ''))}</li>`).join('')}</ol>`;
  }

  function checkWritten(c, input) {
    const given = norm(input);
    if (!given) return false;
    if (c.k === 'brand') {
      const names = c.a.split(/[,;]/).map(s => s.replace(/^[^:]*:\s*/, '').trim());
      return [c.a, ...names].some(n => norm(n) === given);
    }
    if (c.k === 'generic') return [c.a, ...c.a.split(/\),\s*/)].some(g => norm(g) === given);
    return similarity(norm(c.a), given) >= 0.8;
  }

  // ---------- data ----------
  let DATA = null;
  let PAGES = [];
  let ALL = [];
  const byPage = {};

  function loadData(json) {
    DATA = json;
    PAGES = DATA.pages;
    ALL = [];
    for (const p of PAGES) {
      byPage[p.page] = p;
      p.cards.forEach((c, i) => { c.page = p; c.id = `${p.page}:${i}`; ALL.push(c); });
    }
  }

  // ---------- settings ----------
  const settings = Object.assign({
    pages: [], decks: DECKS.map(d => d.id), kinds: CARD_KINDS.map(k => k.id),
    mode: 'mc', count: 25, missedOnly: false,
  }, store.get('settings', {}));
  const saveSettings = () => store.set('settings', settings);
  const stats = store.get('stats', {});
  const saveStats = () => store.set('stats', stats);
  const statKey = c => c.page.page + '|' + c.q;

  function record(c, correct) {
    const s = stats[statKey(c)] || { right: 0, wrong: 0, last: 1 };
    correct ? s.right++ : s.wrong++;
    s.last = correct ? 1 : 0;
    stats[statKey(c)] = s;
    saveStats();
  }

  function pool() {
    const pages = new Set(settings.pages);
    return ALL.filter(c => pages.has(c.page.page)
      && settings.decks.includes(c.f)
      && (c.f !== 'Cards' || settings.kinds.includes(c.k))
      && (!settings.missedOnly || (stats[statKey(c)] && stats[statKey(c)].last === 0)));
  }
  function buildQuestions() {
    const s = shuffle(pool());
    return settings.count ? s.slice(0, settings.count) : s;
  }

  function distractors(c) {
    const pages = new Set(settings.pages);
    const tiers = [
      ALL.filter(x => x.page === c.page && x.k === c.k),
      ALL.filter(x => pages.has(x.page.page) && x.k === c.k),
      ALL.filter(x => x.k === c.k),
    ];
    const seen = new Set([norm(c.a) || c.a]);
    const picks = [];
    for (const tier of tiers) {
      for (const x of shuffle(tier)) {
        const n = norm(x.a) || x.a;
        if (picks.length < 3 && !seen.has(n)) { seen.add(n); picks.push(x.a); }
      }
      if (picks.length >= 3) break;
    }
    return picks;
  }

  // ---------- views ----------
  function setNav(view) {
    document.querySelectorAll('.topbar nav [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === view));
  }

  function rowCard(p, i, open = false) {
    const d = p.drugs[i];
    const rows = [
      ['Category', d.category], ['Generic', d.generic], ['Brand', d.brand],
      ['Classification', d.classification || '—'], ['Indications', d.indication],
    ];
    if (d.activity) rows.push(['Activity against', d.activity]);
    return `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${d.essential ? `<details${open ? ' open' : ''}><summary>Essential knowledge</summary><p class="ek">${esc(d.essential)}</p></details>` : ''}`;
  }
  function sourceBlock(c) {
    const rows = c.d.length <= 2 ? c.d.map(i => rowCard(c.page, i)).join('<hr>') : '';
    return `<div class="drug">${rows}<div class="src">${esc(pageName(c.page))} · ${esc(c.page.title)} · ${esc(c.f)} deck</div></div>`;
  }

  // Setup
  function viewSetup() {
    setNav('setup');
    const selected = new Set(settings.pages);
    const missedTotal = Object.values(stats).filter(s => s.last === 0).length;
    const groups = GROUPS.map(([name, re]) => ({ name, pages: PAGES.filter(p => re.test(p.short)) }));

    $app.innerHTML = `
      <h1>Basic Drug Knowledge</h1>
      <p class="sub">${ALL.length} cards from ${PAGES.length} pages of the ${esc(DATA.edition)}.</p>

      <div class="card">
        <h2>BDK quizzes (APC III schedule)</h2>
        <div class="row">${QUIZZES.map((q, i) => `<button class="chip${i === nextQuiz ? ' next' : ''}" data-quiz="${i}" title="pages ${q.pages.join(', ')}">${esc(q.label)}
          <span class="count">p${esc(q.pages.join(','))}</span></button>`).join('')}
          <button class="chip" data-all>Cumulative</button></div>
      </div>

      <div class="card">
        <div class="row spread"><h2>Pages</h2>
          <div><button class="linkbtn" data-all>All</button><button class="linkbtn" data-none>None</button></div></div>
        ${groups.map(g => `<div class="group"><div class="group-label">${esc(g.name)}</div><div class="row">${
          g.pages.map(p => `<button class="chip" data-page="${p.page}" aria-pressed="${selected.has(p.page)}"
            title="${esc(p.title)}">${esc(pageName(p))}</button>`).join('')}</div></div>`).join('')}
      </div>

      <div class="card">
        <h2>Decks</h2>
        ${DECKS.map(d => `<label class="check"><input type="checkbox" data-deck="${d.id}" ${settings.decks.includes(d.id) ? 'checked' : ''}> ${esc(d.label)}</label>`).join('')}
        <div class="indent" data-kinds>
          <div class="group-label">Cards deck questions</div>
          ${CARD_KINDS.map(k => `<label class="check"><input type="checkbox" data-kind="${k.id}" ${settings.kinds.includes(k.id) ? 'checked' : ''}> ${esc(k.label)}</label>`).join('')}
        </div>
      </div>

      <div class="card">
        <h2>Mode</h2>
        <div class="seg" data-seg="mode">${MODES.map(m => `<button data-val="${m.id}" aria-pressed="${settings.mode === m.id}">${m.label}</button>`).join('')}</div>
        <h2 style="margin-top:16px">Number of questions</h2>
        <div class="seg" data-seg="count">${COUNTS.map(c => `<button data-val="${c}" aria-pressed="${settings.count === c}">${c || 'All'}</button>`).join('')}</div>
        <label class="check" style="margin-top:12px"><input type="checkbox" data-missed ${settings.missedOnly ? 'checked' : ''}>
          Only questions I missed last time (${missedTotal})</label>
      </div>

      <div class="row spread">
        <span class="note" data-avail></span>
        <button class="primary" data-start>Start</button>
      </div>

      <div class="card" style="margin-top:20px">
        <h2>Quizlet import files</h2>
        <p class="note">One set of files per page (Cards, Select ALL, Essential Knowledge, and Organisms for ID pages),
          tab-separated, one card per line. Import in Quizlet with <b>Tab</b> between term and definition and <b>New line</b> between cards.</p>
        <p><a class="secondary" href="downloads/BDK_2026-2027_Quizlet_Decks.zip" download>Download all decks (.zip)</a></p>
      </div>`;

    const refresh = () => {
      const n = pool().length;
      const shown = settings.count ? Math.min(n, settings.count) : n;
      $app.querySelector('[data-avail]').textContent = settings.pages.length
        ? `${shown} of ${n} cards` : 'Pick at least one page';
      $app.querySelector('[data-start]').disabled = !n;
      $app.querySelector('[data-kinds]').style.display = settings.decks.includes('Cards') ? '' : 'none';
    };
    const setPages = ids => {
      settings.pages = ids;
      saveSettings();
      $app.querySelectorAll('[data-page]').forEach(b => b.setAttribute('aria-pressed', ids.includes(+b.dataset.page)));
      refresh();
    };

    $app.querySelectorAll('[data-page]').forEach(b => b.onclick = () => {
      const id = +b.dataset.page;
      setPages(settings.pages.includes(id) ? settings.pages.filter(x => x !== id) : [...settings.pages, id]);
    });
    $app.querySelectorAll('[data-all]').forEach(b => b.onclick = () => setPages(PAGES.map(p => p.page)));
    $app.querySelector('[data-none]').onclick = () => setPages([]);
    $app.querySelectorAll('[data-quiz]').forEach(b => b.onclick = () => setPages(QUIZZES[+b.dataset.quiz].pages.slice()));
    $app.querySelectorAll('[data-deck]').forEach(c => c.onchange = () => {
      settings.decks = DECKS.map(d => d.id).filter(id => $app.querySelector(`[data-deck="${id}"]`).checked);
      saveSettings(); refresh();
    });
    $app.querySelectorAll('[data-kind]').forEach(c => c.onchange = () => {
      settings.kinds = CARD_KINDS.map(k => k.id).filter(id => $app.querySelector(`[data-kind="${id}"]`).checked);
      saveSettings(); refresh();
    });
    $app.querySelectorAll('[data-seg]').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => {
      const key = seg.dataset.seg;
      settings[key] = key === 'count' ? +b.dataset.val : b.dataset.val;
      seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      saveSettings(); refresh();
    }));
    $app.querySelector('[data-missed]').onchange = e => { settings.missedOnly = e.target.checked; saveSettings(); refresh(); };
    $app.querySelector('[data-start]').onclick = () => startSession(buildQuestions(), settings.mode);
    refresh();
  }

  // Session
  let session = null;
  function startSession(questions, mode) {
    session = { mode, questions: questions.map(c => ({ c })), i: 0, results: [] };
    if (mode === 'mc') session.questions.forEach(q => { q.options = shuffle([q.c.a, ...distractors(q.c)]); });
    renderQuestion();
  }

  function header() {
    const { i, questions } = session;
    const right = session.results.filter(r => r.correct).length;
    return `<div class="qmeta"><span>${Math.min(i + 1, questions.length)} of ${questions.length}</span>
      <span>${right} correct</span></div>
      <div class="progress"><div style="width:${(i / questions.length) * 100}%"></div></div>`;
  }
  const termLabel = c => `${esc(pageName(c.page))} · ${esc(KIND_LABEL[c.k] || c.f)}`;

  function renderQuestion() {
    if (session.i >= session.questions.length) return viewResults();
    setNav('');
    const q = session.questions[session.i];
    const c = q.c;
    if (session.mode === 'flash') return renderFlash(c);
    $app.innerHTML = `${header()}
      <div class="card">
        <p class="term-label">${termLabel(c)}</p>
        <p class="prompt">${esc(c.q)}</p>
        ${session.mode === 'mc'
          ? `<div class="options${q.options.some(o => o.length > 60) ? ' long' : ''}">${q.options.map((o, k) =>
              `<button class="opt" data-opt="${k}"><span class="key">${k + 1}</span><span>${answerHtml(o)}</span></button>`).join('')}</div>`
          : `<form class="written" data-form><input data-input autocomplete="off" autocapitalize="off" spellcheck="false"
              placeholder="Type your answer" aria-label="Your answer"><button class="primary">Check</button></form>`}
        <div data-feedback></div>
      </div>
      <div class="actions"><button class="secondary" data-quit>End quiz</button></div>`;

    $app.querySelector('[data-quit]').onclick = viewResults;
    if (session.mode === 'mc') {
      $app.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => answerMC(+b.dataset.opt));
    } else {
      const input = $app.querySelector('[data-input]');
      input.focus();
      $app.querySelector('[data-form]').onsubmit = e => { e.preventDefault(); answerWritten(input.value); };
    }
  }

  function showFeedback(c, correct, givenText, canOverride) {
    const fb = $app.querySelector('[data-feedback]');
    fb.innerHTML = `<div class="verdict ${correct ? 'good' : 'bad'}"><span data-vtext>${correct ? 'Correct' : 'Not quite'}</span>
        ${correct && session.mode === 'mc' ? '' : `<div class="ans">${answerHtml(c.a)}</div>`}</div>
      ${sourceBlock(c)}
      <div class="actions">
        <button class="primary" data-next>Next <span class="hide-sm"><kbd>Enter</kbd></span></button>
        ${canOverride && !correct ? '<button class="secondary" data-override>I was right</button>' : ''}
      </div>`;
    session.results.push({ c, correct, given: givenText });
    record(c, correct);
    session.answered = true;
    const next = fb.querySelector('[data-next]');
    next.focus();
    next.onclick = () => { session.i++; session.answered = false; renderQuestion(); };
    const ov = fb.querySelector('[data-override]');
    if (ov) ov.onclick = () => {
      session.results[session.results.length - 1].correct = true;
      record(c, true);
      fb.querySelector('.verdict').className = 'verdict good';
      fb.querySelector('[data-vtext]').textContent = 'Counted as correct';
      ov.remove();
      next.focus();
    };
  }

  function answerMC(k) {
    if (session.answered) return;
    const q = session.questions[session.i];
    const choice = q.options[k];
    $app.querySelectorAll('[data-opt]').forEach(b => {
      const o = q.options[+b.dataset.opt];
      b.disabled = true;
      if (o === q.c.a) b.classList.add('correct');
      else if (+b.dataset.opt === k) b.classList.add('wrong');
    });
    showFeedback(q.c, choice === q.c.a, choice, false);
  }

  function answerWritten(text) {
    if (session.answered || !text.trim()) return;
    const c = session.questions[session.i].c;
    $app.querySelector('[data-input]').disabled = true;
    $app.querySelector('[data-form] button').disabled = true;
    showFeedback(c, checkWritten(c, text), text, true);
  }

  function renderFlash(c) {
    $app.innerHTML = `${header()}
      <div class="flash" data-card tabindex="0" role="button" aria-label="Flip card">
        <div class="flash-inner">
          <div class="face"><p class="term-label" style="text-align:center">${termLabel(c)}</p>
            <div class="big">${esc(c.q)}</div><div class="hint">Tap to flip <span class="hide-sm">· <kbd>Space</kbd></span></div></div>
          <div class="face back"><div class="big">${answerHtml(c.a)}</div>${sourceBlock(c)}</div>
        </div>
      </div>
      <div class="actions">
        <button class="secondary" data-learning>Still learning <span class="hide-sm"><kbd>1</kbd></span></button>
        <button class="primary" data-know>Know it <span class="hide-sm"><kbd>2</kbd></span></button>
        <button class="secondary" data-quit>End</button>
      </div>`;
    const card = $app.querySelector('[data-card]');
    const size = () => {
      const h = Math.max(260, ...[...card.querySelectorAll('.face')].map(f => f.scrollHeight));
      card.style.minHeight = card.querySelector('.flash-inner').style.minHeight = h + 'px';
    };
    size();
    card.onclick = e => { if (!e.target.closest('summary')) { card.classList.toggle('flipped'); size(); } };
    $app.querySelector('[data-know]').onclick = () => flashAnswer(true);
    $app.querySelector('[data-learning]').onclick = () => flashAnswer(false);
    $app.querySelector('[data-quit]').onclick = viewResults;
  }

  function flashAnswer(known) {
    const q = session.questions[session.i];
    session.results.push({ c: q.c, correct: known });
    record(q.c, known);
    // Like Quizlet: cards still being learned come back at the end of the round.
    if (!known) session.questions.push({ c: q.c });
    session.i++;
    renderQuestion();
  }

  // Results
  function viewResults() {
    setNav('');
    const firstTry = new Map();
    for (const r of session.results) if (!firstTry.has(r.c)) firstTry.set(r.c, r);
    const results = [...firstTry.values()];
    const right = results.filter(r => r.correct).length;
    const missed = results.filter(r => !r.correct);
    const pct = results.length ? Math.round((right / results.length) * 100) : 0;
    $app.innerHTML = `
      <div class="card">
        <p class="term-label">Your score</p>
        <p class="score">${pct}%</p>
        <p class="note">${right} of ${results.length} correct on the first try</p>
        <div class="actions">
          ${missed.length ? '<button class="primary" data-retry>Retry missed</button>' : ''}
          <button class="secondary" data-again>Same settings, new set</button>
          <button class="secondary" data-setup>Change settings</button>
        </div>
      </div>
      ${missed.length ? `<div class="card"><h2>Missed (${missed.length})</h2><ul class="missed">${missed.map(r => `
        <li><div class="q">${esc(r.c.q)}</div>
          ${r.given ? `<div class="you">You: ${answerHtml(r.given)}</div>` : ''}
          <div class="right">Answer: ${answerHtml(r.c.a)}</div></li>`).join('')}</ul></div>` : ''}`;
    const retry = $app.querySelector('[data-retry]');
    if (retry) retry.onclick = () => startSession(shuffle(missed.map(r => r.c)), session.mode);
    $app.querySelector('[data-again]').onclick = () => startSession(buildQuestions(), settings.mode);
    $app.querySelector('[data-setup]').onclick = viewSetup;
  }

  // Browse: the list laid out page by page, like the PDF
  function viewBrowse() {
    setNav('browse');
    $app.innerHTML = `<h1>Drug list</h1>
      <p class="sub">${esc(DATA.edition)}, page by page. Search any column; tap a row for essential knowledge.</p>
      <input class="search" data-q type="search" placeholder="Search generic, brand, category, indication…" aria-label="Search">
      <div data-body></div>`;
    const body = $app.querySelector('[data-body]');
    const render = term => {
      const t = term.trim().toLowerCase();
      let html = '';
      for (const p of PAGES) {
        const rows = p.drugs.map((d, i) => [d, i]).filter(([d]) => !t || [d.generic, d.brand, d.category, d.classification,
          d.indication, d.activity, d.essential].some(v => (v || '').toLowerCase().includes(t)));
        if (!rows.length) continue;
        html += `<section class="pagetable"><h2>${esc(pageName(p))} <span class="ed">${esc(p.title)}</span></h2>
          <div class="table-wrap"><table><thead><tr><th>Pharmacologic category</th><th>Generic</th><th>Brand</th><th>Class.</th><th>Common indications</th></tr></thead><tbody>
          ${rows.map(([d, i]) => `<tr data-p="${p.page}" data-i="${i}"><td>${esc(d.category)}</td><td>${esc(d.generic)}</td>
            <td>${esc(d.brand)}</td><td>${esc(d.classification || '')}</td><td>${esc(d.indication)}${d.activity ? `<div class="act">Activity against: ${esc(d.activity)}</div>` : ''}</td></tr>`).join('')}
          </tbody></table></div>${p.legend ? `<p class="legend">${esc(p.legend)}</p>` : ''}</section>`;
      }
      body.innerHTML = html || '<p class="note">No matches</p>';
    };
    body.onclick = e => {
      const tr = e.target.closest('tr[data-i]');
      if (!tr) return;
      const nxt = tr.nextElementSibling;
      if (nxt && nxt.classList.contains('detail')) return nxt.remove();
      const p = byPage[tr.dataset.p];
      const d = p.drugs[+tr.dataset.i];
      tr.insertAdjacentHTML('afterend', `<tr class="detail"><td colspan="5"><p class="ek">${esc(d.essential || '—')}</p></td></tr>`);
    };
    const input = $app.querySelector('[data-q]');
    input.oninput = () => render(input.value);
    render('');
  }

  // ---------- keyboard ----------
  document.addEventListener('keydown', e => {
    if (!session || !$app.querySelector('.progress')) return;
    if (e.target.tagName === 'INPUT' && !session.answered) return;
    if (session.mode === 'flash') {
      if (e.key === ' ') { e.preventDefault(); $app.querySelector('[data-card]')?.click(); }
      else if (e.key === '1') flashAnswer(false);
      else if (e.key === '2') flashAnswer(true);
      return;
    }
    if (e.key === 'Enter' && session.answered) {
      e.preventDefault();
      $app.querySelector('[data-next]')?.click();
    } else if (session.mode === 'mc' && /^[1-4]$/.test(e.key) && !session.answered) {
      answerMC(+e.key - 1);
    }
  });

  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    session = null;
    (b.dataset.go === 'browse' ? viewBrowse : viewSetup)();
  });

  // ---------- boot ----------
  const boot = json => {
    loadData(json);
    settings.pages = settings.pages.filter(n => byPage[n]);
    if (!settings.pages.length) settings.pages = (QUIZZES[nextQuiz] || { pages: PAGES.map(p => p.page) }).pages.slice();
    viewSetup();
  };
  if (window.BDK_DATA) boot(window.BDK_DATA);
  else fetch('data/decks.json').then(r => r.json()).then(boot).catch(() => {
    $app.innerHTML = '<div class="warnbox">The decks could not be loaded.</div>';
  });
})();
