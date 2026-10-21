(() => {
  'use strict';

  // ---------- question types (wording from the BDK quiz schedule) ----------
  const QTYPES = [
    { id: 'brand', label: 'Brand name', term: 'Generic', field: 'brand',
      ask: d => ['What is the brand name of ', d.generic, '?'],
      answer: d => d.brand, ok: d => !!d.brand },
    { id: 'generic', label: 'Generic name', term: 'Brand', field: 'generic',
      ask: d => ['What is the generic name of ', d.brand, '?'],
      answer: d => d.generic, ok: d => !!d.brand },
    { id: 'category', label: 'Pharmacologic category', term: 'Generic', field: 'category',
      ask: d => ['What is the pharmacologic category of ', d.generic, '?'],
      answer: d => d.category, ok: d => !!d.category },
    { id: 'indication', label: 'Common indication', term: 'Generic', field: 'indication',
      ask: d => ['What is the common indication of ', d.generic, '?'],
      answer: d => d.indication, ok: d => !!d.indication },
    { id: 'classification', label: 'Classification', term: 'Generic', field: 'classification',
      ask: d => ['What is the classification of ', d.generic, '?'],
      answer: d => classOf(d), ok: () => true },
  ];
  const QT = Object.fromEntries(QTYPES.map(t => [t.id, t]));
  const CLASS_DEFAULTS = ['Rx only', 'OTC', 'CS-II', 'CS-III', 'CS-IV', 'CS-V'];

  // Section groups for the weekly BDK folders in Drive.
  const PRESETS = [
    { label: 'Week 3', ids: ['musculoskeletal', 'endocrine-1'] },
    { label: 'Week 4', ids: ['cns-3', 'cns-4', 'cns-5'] },
    { label: 'Week 5', ids: ['id-1', 'gi-1', 'gi-2', 'pain-heme-onc-1'] },
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
      try { const v = localStorage.getItem('bdk:' + key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('bdk:' + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    },
  };

  // ---------- helpers ----------
  const $app = document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const classOf = d => d.classification || 'Rx only';
  const shuffle = a => {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  };
  const norm = s => String(s).toLowerCase()
    .replace(/\([^)]*\)/g, ' ').replace(/&|\+/g, ' and ').replace(/[^a-z0-9]+/g, '');
  const qkey = q => q.drug.generic + '|' + q.type;

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

  // Individual names inside a brand cell such as "PO: Ambien, Ambien CR; SL: Edluar".
  const brandNames = brand => brand.split(/[,;]/)
    .map(s => s.replace(/^[^:]*:\s*/, '').trim()).filter(Boolean);
  const listItems = s => s.toLowerCase().split(/[,;]/).map(x => x.trim()).filter(Boolean);

  function checkWritten(q, input) {
    const given = norm(input);
    if (!given) return false;
    const d = q.drug;
    if (q.type === 'brand') return [d.brand, ...brandNames(d.brand)].some(b => norm(b) === given);
    if (q.type === 'generic') return [d.generic, ...d.generic.split(/\),\s*/)].some(g => norm(g) === given);
    return similarity(norm(q.answer), given) >= 0.8;
  }

  // ---------- data ----------
  let DATA = null;          // { sections: [...] }
  let ALL = [];             // flat list of drugs with .section
  const sectionById = {};

  function loadData(json) {
    DATA = json;
    ALL = [];
    for (const s of DATA.sections) {
      sectionById[s.id] = s;
      for (const d of s.drugs) ALL.push(Object.assign(d, { section: s }));
    }
  }

  // ---------- settings ----------
  const settings = Object.assign({
    sections: [], types: QTYPES.map(t => t.id), mode: 'mc', count: 25, missedOnly: false,
  }, store.get('settings', {}));
  const saveSettings = () => store.set('settings', settings);
  const stats = store.get('stats', {});
  const saveStats = () => store.set('stats', stats);

  function record(q, correct) {
    const s = stats[qkey(q)] || { right: 0, wrong: 0, last: 1 };
    correct ? s.right++ : s.wrong++;
    s.last = correct ? 1 : 0;
    stats[qkey(q)] = s;
    saveStats();
  }

  // ---------- question building ----------
  function buildQuestions() {
    const chosen = new Set(settings.sections);
    const qs = [];
    for (const d of ALL) {
      if (!chosen.has(d.section.id)) continue;
      for (const t of settings.types) {
        if (!QT[t].ok(d)) continue;
        const q = { drug: d, type: t, answer: QT[t].answer(d) };
        if (settings.missedOnly && !(stats[qkey(q)] && stats[qkey(q)].last === 0)) continue;
        qs.push(q);
      }
    }
    const s = shuffle(qs);
    return settings.count ? s.slice(0, settings.count) : s;
  }

  function distractors(q) {
    const t = QT[q.type];
    const correct = norm(q.answer);
    const correctItems = listItems(q.answer);
    const pool = new Set(settings.sections);
    const tiers = [
      ALL.filter(d => d.section === q.drug.section),
      ALL.filter(d => pool.has(d.section.id)),
      ALL,
    ];
    const seen = new Set([correct]);
    const picks = [];
    const consider = value => {
      if (!value || picks.length >= 3) return;
      const n = norm(value);
      if (seen.has(n)) return;
      if (q.type === 'indication') {
        // A list that is a subset or superset of the right answer would also be "right".
        const items = listItems(value);
        if (items.every(i => correctItems.includes(i)) || correctItems.every(i => items.includes(i))) return;
      }
      seen.add(n);
      picks.push(value);
    };
    for (const tier of tiers) {
      for (const d of shuffle(tier)) if (t.ok(d)) consider(t.answer(d));
      if (picks.length >= 3) break;
    }
    if (q.type === 'classification') shuffle(CLASS_DEFAULTS).forEach(consider);
    return picks;
  }

  // ---------- views ----------
  function setNav(view) {
    document.querySelectorAll('.topbar nav [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === view));
  }

  function promptHtml(q) {
    const [pre, term, post] = QT[q.type].ask(q.drug);
    return `${esc(pre)}<span class="hl">${esc(term)}</span>${esc(post)}`;
  }

  function drugCard(d, open = false) {
    const rows = [
      ['Generic', d.generic],
      ['Brand', d.brand || '—'],
      ['Category', d.category || '—'],
      ['Classification', classOf(d)],
      ['Indication', d.indication || '—'],
    ];
    if (d.activity) rows.push(['Activity against', d.activity]);
    const notes = d.notes.length
      ? `<details${open ? ' open' : ''}><summary>Essential knowledge</summary><ul>${
        d.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></details>`
      : '';
    return `<div class="drug"><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${notes}
      <div class="src">${esc(d.section.title)} · BDK list ${esc(d.section.edition)}</div></div>`;
  }

  // Setup
  function viewSetup() {
    setNav('setup');
    const groups = [];
    for (const s of DATA.sections) {
      const g = s.name.replace(/ \d$/, '');
      let grp = groups.find(x => x.name === g);
      if (!grp) groups.push(grp = { name: g, sections: [] });
      grp.sections.push(s);
    }
    const selected = new Set(settings.sections);
    const oldCount = DATA.sections.filter(s => !s.edition.startsWith('2026')).length;
    const missedTotal = Object.values(stats).filter(s => s.last === 0).length;

    $app.innerHTML = `
      <h1>Basic Drug Knowledge</h1>
      <p class="sub">Pick sections and question types, then start. ${ALL.length} drugs in ${DATA.sections.length} sections.</p>

      <div class="card">
        <div class="row spread"><h2>Sections</h2>
          <div><button class="linkbtn" data-all>All</button><button class="linkbtn" data-none>None</button></div></div>
        <div class="row">${PRESETS.map((p, i) => `<button class="chip" data-preset="${i}">${esc(p.label)}</button>`).join('')}</div>
        ${groups.map(g => `<div class="group"><div class="group-label">${esc(g.name)}</div><div class="row">${
          g.sections.map(s => `<button class="chip${s.edition.startsWith('2026') ? '' : ' old'}" data-sec="${s.id}"
            aria-pressed="${selected.has(s.id)}" title="BDK list ${esc(s.edition)}">${esc(s.name)}
            <span class="count">${s.drugs.length}</span></button>`).join('')}</div></div>`).join('')}
        ${oldCount ? `<p class="note" style="margin-top:12px">Sections tagged <b>25–26</b> come from the 2025-2026 list because the
          2026-2027 version of those pages is not in your Drive yet.</p>` : ''}
      </div>

      <div class="card">
        <h2>Question types</h2>
        ${QTYPES.map(t => `<label class="check"><input type="checkbox" data-type="${t.id}" ${
          settings.types.includes(t.id) ? 'checked' : ''}> ${esc(t.label)}</label>`).join('')}
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
      </div>`;

    const refresh = () => {
      const n = buildQuestions().length;
      $app.querySelector('[data-avail]').textContent = settings.sections.length
        ? `${n} question${n === 1 ? '' : 's'} ready` : 'Pick at least one section';
      $app.querySelector('[data-start]').disabled = !n;
    };
    const setSections = ids => {
      settings.sections = ids;
      saveSettings();
      $app.querySelectorAll('[data-sec]').forEach(b => b.setAttribute('aria-pressed', ids.includes(b.dataset.sec)));
      refresh();
    };

    $app.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => {
      const id = b.dataset.sec;
      setSections(settings.sections.includes(id) ? settings.sections.filter(x => x !== id) : [...settings.sections, id]);
    });
    $app.querySelector('[data-all]').onclick = () => setSections(DATA.sections.map(s => s.id));
    $app.querySelector('[data-none]').onclick = () => setSections([]);
    $app.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => setSections(PRESETS[+b.dataset.preset].ids.slice()));
    $app.querySelectorAll('[data-type]').forEach(c => c.onchange = () => {
      settings.types = QTYPES.map(t => t.id).filter(id =>
        $app.querySelector(`[data-type="${id}"]`).checked);
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
    session = { mode, questions, i: 0, results: [] };
    if (mode === 'mc') questions.forEach(q => { q.options = shuffle([q.answer, ...distractors(q)]); });
    renderQuestion();
  }

  function header() {
    const { i, questions } = session;
    const right = session.results.filter(r => r.correct).length;
    return `<div class="qmeta"><span>${Math.min(i + 1, questions.length)} of ${questions.length}</span>
      <span>${right} correct</span></div>
      <div class="progress"><div style="width:${(i / questions.length) * 100}%"></div></div>`;
  }

  function renderQuestion() {
    if (session.i >= session.questions.length) return viewResults();
    setNav('');
    const q = session.questions[session.i];
    if (session.mode === 'flash') return renderFlash(q);
    const t = QT[q.type];
    $app.innerHTML = `${header()}
      <div class="card">
        <p class="term-label">${esc(t.label)}</p>
        <p class="prompt">${promptHtml(q)}</p>
        ${session.mode === 'mc'
          ? `<div class="options">${q.options.map((o, k) => `<button class="opt" data-opt="${k}"><span class="key">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>`
          : `<form class="written" data-form><input data-input autocomplete="off" autocapitalize="off" spellcheck="false"
              placeholder="Type the ${esc(t.label.toLowerCase())}" aria-label="Your answer"><button class="primary">Check</button></form>`}
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

  function showFeedback(q, correct, givenText, canOverride) {
    const fb = $app.querySelector('[data-feedback]');
    fb.innerHTML = `<div class="verdict ${correct ? 'good' : 'bad'}">${correct ? 'Correct' : 'Not quite'}
        ${correct ? '' : `<span class="ans">Answer: ${esc(q.answer)}</span>`}</div>
      ${drugCard(q.drug)}
      <div class="actions">
        <button class="primary" data-next>Next <span class="hide-sm"><kbd>Enter</kbd></span></button>
        ${canOverride && !correct ? '<button class="secondary" data-override>I was right</button>' : ''}
      </div>`;
    session.results.push({ q, correct, given: givenText });
    record(q, correct);
    session.answered = true;
    const next = fb.querySelector('[data-next]');
    next.focus();
    next.onclick = () => { session.i++; session.answered = false; renderQuestion(); };
    const ov = fb.querySelector('[data-override]');
    if (ov) ov.onclick = () => {
      const r = session.results[session.results.length - 1];
      r.correct = true;
      record(q, true);
      fb.querySelector('.verdict').className = 'verdict good';
      fb.querySelector('.verdict').firstChild.textContent = 'Counted as correct ';
      ov.remove();
      next.focus();
    };
  }

  function answerMC(k) {
    if (session.answered) return;
    const q = session.questions[session.i];
    const choice = q.options[k];
    const correct = choice === q.answer;
    $app.querySelectorAll('[data-opt]').forEach(b => {
      const o = q.options[+b.dataset.opt];
      b.disabled = true;
      if (o === q.answer) b.classList.add('correct');
      else if (+b.dataset.opt === k) b.classList.add('wrong');
    });
    showFeedback(q, correct, choice, false);
  }

  function answerWritten(text) {
    if (session.answered || !text.trim()) return;
    const q = session.questions[session.i];
    const input = $app.querySelector('[data-input]');
    input.disabled = true;
    $app.querySelector('[data-form] button').disabled = true;
    showFeedback(q, checkWritten(q, text), text, true);
  }

  function renderFlash(q) {
    const t = QT[q.type];
    $app.innerHTML = `${header()}
      <div class="flash" data-card tabindex="0" role="button" aria-label="Flip card">
        <div class="flash-inner">
          <div class="face"><p class="term-label" style="text-align:center">${esc(t.label)}</p>
            <div class="big">${promptHtml(q)}</div><div class="hint">Tap to flip <span class="hide-sm">· <kbd>Space</kbd></span></div></div>
          <div class="face back"><div class="big">${esc(q.answer)}</div>${drugCard(q.drug)}</div>
        </div>
      </div>
      <div class="actions">
        <button class="secondary" data-learning>Still learning <span class="hide-sm"><kbd>1</kbd></span></button>
        <button class="primary" data-know>Know it <span class="hide-sm"><kbd>2</kbd></span></button>
        <button class="secondary" data-quit>End</button>
      </div>`;
    const card = $app.querySelector('[data-card]');
    const sizeToBack = () => {
      const back = card.querySelector('.back');
      card.style.minHeight = card.querySelector('.flash-inner').style.minHeight = Math.max(260, back.scrollHeight) + 'px';
    };
    card.onclick = e => { if (!e.target.closest('summary')) { card.classList.toggle('flipped'); sizeToBack(); } };
    $app.querySelector('[data-know]').onclick = () => flashAnswer(true);
    $app.querySelector('[data-learning]').onclick = () => flashAnswer(false);
    $app.querySelector('[data-quit]').onclick = viewResults;
  }

  function flashAnswer(known) {
    const q = session.questions[session.i];
    session.results.push({ q, correct: known });
    record(q, known);
    // Like Quizlet: cards you are still learning come back at the end of the round.
    if (!known) session.questions.push(q);
    session.i++;
    renderQuestion();
  }

  // Results
  function viewResults() {
    setNav('');
    // Score each question once, by its first attempt.
    const firstTry = new Map();
    for (const r of session.results) if (!firstTry.has(r.q)) firstTry.set(r.q, r);
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
        <li><div class="q">${promptHtml(r.q)}</div>
          ${r.given ? `<div class="you">You: ${esc(r.given)}</div>` : ''}
          <div class="right">Answer: ${esc(r.q.answer)}</div></li>`).join('')}</ul></div>` : ''}`;
    const retry = $app.querySelector('[data-retry]');
    if (retry) retry.onclick = () => startSession(shuffle(missed.map(r => ({ drug: r.q.drug, type: r.q.type, answer: r.q.answer }))), session.mode);
    $app.querySelector('[data-again]').onclick = () => startSession(buildQuestions(), settings.mode);
    $app.querySelector('[data-setup]').onclick = viewSetup;
  }

  // Browse
  function viewBrowse() {
    setNav('browse');
    $app.innerHTML = `<h1>Drug list</h1>
      <p class="sub">Search any column. Tap a row for essential knowledge.</p>
      <input class="search" data-q type="search" placeholder="Search generic, brand, category, indication…" aria-label="Search">
      <div class="table-wrap"><table><thead><tr><th>Generic</th><th>Brand</th><th>Category</th><th>Class.</th><th>Indication</th></tr></thead>
      <tbody data-body></tbody></table></div>`;
    const body = $app.querySelector('[data-body]');
    const render = term => {
      const t = term.trim().toLowerCase();
      let html = '';
      for (const s of DATA.sections) {
        const rows = s.drugs.filter(d => !t || [d.generic, d.brand, d.category, d.indication, classOf(d), d.activity]
          .some(v => (v || '').toLowerCase().includes(t)));
        if (!rows.length) continue;
        html += `<tr class="section-row"><td colspan="5">${esc(s.title)}<span class="ed">BDK list ${esc(s.edition)}</span></td></tr>`;
        html += rows.map(d => `<tr data-id="${d.id}" style="cursor:pointer"><td>${esc(d.generic)}</td><td>${esc(d.brand || '—')}</td>
          <td>${esc(d.category || '—')}</td><td>${esc(classOf(d))}</td><td>${esc(d.indication || '—')}</td></tr>`).join('');
      }
      body.innerHTML = html || '<tr><td colspan="5">No matches</td></tr>';
    };
    body.onclick = e => {
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      const nxt = tr.nextElementSibling;
      if (nxt && nxt.classList.contains('detail')) return nxt.remove();
      const d = ALL.find(x => String(x.id) === tr.dataset.id);
      tr.insertAdjacentHTML('afterend', `<tr class="detail"><td colspan="5">${drugCard(d, true)}</td></tr>`);
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
    if (!settings.sections.length) settings.sections = [DATA.sections[0].id];
    settings.sections = settings.sections.filter(id => sectionById[id]);
    viewSetup();
  };
  if (window.BDK_DATA) boot(window.BDK_DATA);
  else fetch('data/bdk.json').then(r => r.json()).then(boot).catch(() => {
    $app.innerHTML = '<div class="warnbox">The drug list could not be loaded.</div>';
  });
})();
