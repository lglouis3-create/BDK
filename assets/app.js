(() => {
  'use strict';

  // ====================================================================== constants
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
  // Header colors sampled from the BDK PDF pages.
  const SYSTEM_COLOR = {
    DEENT: '#c1e4f5', Renal: '#8dd873', CV: '#ff5050', Pulmonary: '#ff99cc', ID: '#cc99ff',
    MSK: '#ffff00', Endo: '#ff9999', CNS: '#33cccc', GI: '#ccccff', PainHemeOnc: '#84e290',
  };
  const SYSTEM_NAME = {
    DEENT: 'DEENT', Renal: 'Renal', CV: 'Cardiovascular', Pulmonary: 'Pulmonary', ID: 'Infectious diseases',
    MSK: 'Musculoskeletal', Endo: 'Endocrine', CNS: 'Central nervous system', GI: 'Gastroenterology',
    PainHemeOnc: 'Pain, heme, onc',
  };
  // BDK quiz schedule, PHAR 4232 APC III syllabus (Fall 2026, last updated 08/20/26), pages 11-12.
  const QUIZZES = [
    { label: 'Week 2', start: '2026-08-25', until: '2026-08-27', pages: [11, 12, 13], calcs: 'Electrolyte solutions (mEq)' },
    { label: 'Week 3', start: '2026-08-31', until: '2026-08-31', pages: [14, 15], calcs: 'Electrolyte solutions (milliosmoles: mOsm, mOsm/L)' },
    { label: 'Week 4', start: '2026-09-08', until: '2026-09-10', pages: [20, 21, 22], calcs: 'Alligation' },
    { label: 'Week 5', start: '2026-09-14', until: '2026-09-14', pages: [10, 23, 24, 25], calcs: 'Buffer solution' },
    { label: 'Week 6', start: '2026-09-21', until: '2026-09-21', pages: [6, 7, 8], calcs: 'Ratio strengths' },
    { label: 'Week 8', start: '2026-10-05', until: '2026-10-05', pages: [2, 3, 4], calcs: 'Isotonic solutions' },
    { label: 'Week 10', start: '2026-10-20', until: '2026-10-22', pages: [16, 26, 27], calcs: 'Electrolyte solutions (mEq, mOsm, mOsm/L)' },
    { label: 'Week 11', start: '2026-10-27', until: '2026-10-29', pages: [17, 18, 19], calcs: 'Altering product strength and stock solutions' },
    { label: 'Week 14', start: '2026-11-17', until: '2026-11-19', pages: [5, 9], calcs: 'Nutritional calculations' },
    { label: 'Cumulative', start: '2026-11-30', until: '2026-11-30', pages: 'all', calcs: 'Cumulative BDK/Calcs Assessment' },
  ];
  const MODES = [
    { id: 'learn', label: 'Learn', hint: 'Adaptive rounds: multiple choice first, then recall, until each card is right twice.' },
    { id: 'mc', label: 'Test', hint: 'One question at a time. List answers use checkboxes.' },
    { id: 'scroll', label: 'Scroll', hint: 'All questions on one page; answer and keep scrolling.' },
    { id: 'written', label: 'Written', hint: 'Type each answer.' },
    { id: 'flash', label: 'Flashcards', hint: 'Flip cards and sort them into Know it / Still learning.' },
  ];
  const FILTERS = [
    { id: 'all', label: 'All cards' },
    { id: 'due', label: 'Due for review' },
    { id: 'missed', label: 'Missed last time' },
    { id: 'new', label: 'Not studied yet' },
  ];
  const COUNTS = [10, 25, 50, 0];
  const INTERVALS = [0, 1, 2, 4, 7, 14];   // days until next review, by box
  const THEMES = ['auto', 'light', 'dark', 'blue'];
  const SHORT_KINDS = new Set(['brand', 'generic', 'classification', 'organism', 'category', 'indication']);

  // ====================================================================== small helpers
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
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  const dayStr = d => {
    const z = new Date(d);
    return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
  };
  const today = () => dayStr(new Date());
  const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return dayStr(d); };
  const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  const fmtDay = s => new Date(s + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });

  function splitDepth0(s, sep) {
    const out = [];
    let depth = 0, cur = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if (depth === 0 && s.startsWith(sep, i)) { out.push(cur); cur = ''; i += sep.length - 1; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map(x => x.trim()).filter(Boolean);
  }

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

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('bdk2:' + key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('bdk2:' + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    },
  };

  // ====================================================================== theme
  const themeBtn = document.querySelector('[data-theme-toggle]');
  function applyTheme(t) {
    const resolved = t === 'auto'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'blue' : 'light') : t;
    document.documentElement.dataset.theme = resolved;
    if (themeBtn) {
      themeBtn.textContent = { auto: 'Auto', light: 'Light', dark: 'Dark', blue: 'Blue' }[t];
      themeBtn.setAttribute('aria-label', `Theme: ${themeBtn.textContent}. Change theme`);
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff';
  }
  let theme = store.get('theme', 'auto');
  applyTheme(theme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => theme === 'auto' && applyTheme('auto'));
  if (themeBtn) themeBtn.onclick = () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    store.set('theme', theme);
    applyTheme(theme);
  };

  // ====================================================================== data
  let DATA = null;
  let PAGES = [];
  let ALL = [];
  const byPage = {};
  const byId = {};

  function itemsOf(c) {
    if (/^\(#1\) /.test(c.a)) return splitDepth0(c.a, '; ').map(s => s.replace(/^\(#\d+\)\s*/, ''));
    if (c.f === 'EssentialKnowledge') {
      const it = splitDepth0(c.a, '; ');
      return it.length > 1 ? it : null;
    }
    return null;
  }

  function loadData(json) {
    DATA = json;
    PAGES = DATA.pages;
    ALL = [];
    for (const p of PAGES) {
      byPage[p.page] = p;
      p.sys = p.short.replace(/\d+$/, '');
      p.color = SYSTEM_COLOR[p.sys] || '#999';
      p.cards.forEach(c => {
        c.page = p;
        c.id = `${p.page}|${c.q}`;
        c.items = itemsOf(c);
        byId[c.id] = c;
        ALL.push(c);
      });
    }
    for (const q of QUIZZES) if (q.pages === 'all') q.pages = PAGES.map(p => p.page);
  }
  const pageName = p => `p${p.page} · ${p.short.replace(/(\D)(\d)$/, '$1 $2').replace('PainHemeOnc', 'Pain/Heme/Onc')}`;
  const dot = p => `<span class="pdot" style="--pc:${p.color}" aria-hidden="true"></span>`;

  // ====================================================================== progress model
  // cards: { id: { n, r, w, streak, box, due, okDay, last, h: [1,0,..] } }, days: { date: { n, c } }
  const PROGRESS = store.get('progress', null) || migrateOldStats();
  function migrateOldStats() {
    const p = { v: 3, cards: {}, days: {} };
    const old = store.get('stats', {});
    for (const [k, s] of Object.entries(old)) {
      p.cards[k] = { n: s.right + s.wrong, r: s.right, w: s.wrong, streak: s.last ? 1 : 0,
        box: s.last ? 1 : 0, due: today(), last: 0, h: [s.last] };
    }
    return p;
  }
  const saveProgress = () => store.set('progress', PROGRESS);
  const cs = c => PROGRESS.cards[c.id];

  function nextQuizFor(pageNo, after) {
    return QUIZZES.find(q => q.start > after && q.pages.includes(pageNo));
  }

  function record(c, ok) {
    const t = today();
    const s = PROGRESS.cards[c.id] || { n: 0, r: 0, w: 0, streak: 0, box: 0, due: t, last: 0, h: [] };
    const { prev, ...before } = s;           // one-step snapshot so "I was right" can undo a miss
    s.prev = s.n ? JSON.parse(JSON.stringify(before)) : null;
    s.n++;
    s.last = Date.now();
    s.h = [...(s.h || []), ok ? 1 : 0].slice(-8);
    if (ok) {
      s.r++;
      s.streak++;
      if (s.okDay !== t) { s.box = Math.min(s.box + 1, INTERVALS.length - 1); s.okDay = t; }
      let due = addDays(t, INTERVALS[s.box]);
      // Pull the review in to the day before the quiz that covers this page.
      const q = nextQuizFor(c.page.page, t);
      if (q && due >= q.start) due = [addDays(t, 1), addDays(q.start, -1)].sort().pop();
      s.due = due;
    } else {
      s.w++;
      s.streak = 0;
      s.box = 0;
      s.due = t;
    }
    PROGRESS.cards[c.id] = s;
    const d = PROGRESS.days[t] || { n: 0, c: 0 };
    d.n++;
    if (ok) d.c++;
    PROGRESS.days[t] = d;
    saveProgress();
  }
  function undoMiss(c) {   // "I was right" override on a written answer
    const s = cs(c);
    if (!s) return;
    if (s.prev) PROGRESS.cards[c.id] = s.prev; else delete PROGRESS.cards[c.id];
    const d = PROGRESS.days[today()];
    if (d) d.n--;
    record(c, true);
  }
  const stateOf = c => {
    const s = cs(c);
    if (!s || !s.n) return 'new';
    return s.streak >= 2 ? 'mastered' : 'learning';
  };
  const isDue = c => { const s = cs(c); return !!s && s.n > 0 && s.due <= today(); };
  const missedLast = c => { const s = cs(c); return !!s && s.h.length && s.h[s.h.length - 1] === 0; };

  function summarize(cards) {
    const out = { total: cards.length, new: 0, learning: 0, mastered: 0, due: 0, r: 0, w: 0 };
    for (const c of cards) {
      out[stateOf(c)]++;
      if (isDue(c)) out.due++;
      const s = cs(c);
      if (s) { out.r += s.r; out.w += s.w; }
    }
    return out;
  }

  // ====================================================================== settings & pools
  const settings = Object.assign({
    pages: [], decks: DECKS.map(d => d.id), kinds: CARD_KINDS.map(k => k.id),
    mode: 'learn', count: 25, filter: 'all', checkboxes: true, autoscroll: true,
  }, store.get('settings', {}));
  if (settings.missedOnly) { settings.filter = 'missed'; delete settings.missedOnly; }
  const saveSettings = () => store.set('settings', settings);

  function pool() {
    const pages = new Set(settings.pages);
    const f = {
      all: () => true, due: isDue, missed: missedLast, new: c => stateOf(c) === 'new',
    }[settings.filter] || (() => true);
    return ALL.filter(c => pages.has(c.page.page)
      && settings.decks.includes(c.f)
      && (c.f !== 'Cards' || settings.kinds.includes(c.k))
      && f(c));
  }
  // Learn order: due reviews, then missed, then new, then the rest; mastered last.
  function learnOrder(cards) {
    const rank = c => (isDue(c) ? 0 : missedLast(c) ? 1 : stateOf(c) === 'new' ? 2 : stateOf(c) === 'learning' ? 3 : 4);
    return shuffle(cards).sort((a, b) => rank(a) - rank(b));
  }
  function pick(cards, count) {
    const ordered = settings.mode === 'learn' ? learnOrder(cards) : shuffle(cards);
    return count ? ordered.slice(0, count) : ordered;
  }

  // ====================================================================== answer options
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
  const baseLabel = s => s.replace(/\s*\[[^\]]* only\]$/, '');
  function multiOptions(c) {
    const correct = c.items;
    const want = Math.min(Math.max(3, Math.ceil(correct.length * 0.75)), 8);
    const have = new Set(correct.map(x => norm(baseLabel(x))));
    const picks = [];
    const consider = v => {
      const n = norm(baseLabel(v));
      if (picks.length < want && n && !have.has(n)) { have.add(n); picks.push(v); }
    };
    if (c.k.startsWith('sa-')) {
      // Drugs from this page first; when every drug on the page is correct, borrow from the same body system.
      shuffle(c.page.drugs.map(d => d.label)).forEach(consider);
      shuffle(PAGES.filter(p => p !== c.page && p.sys === c.page.sys).flatMap(p => p.drugs.map(d => d.label))).forEach(consider);
      shuffle(PAGES.filter(p => p.sys !== c.page.sys).flatMap(p => p.drugs.map(d => d.label))).forEach(consider);
    } else {
      const pages = new Set(settings.pages);
      const tiers = [
        ALL.filter(x => x.page === c.page && x.k === c.k),
        ALL.filter(x => pages.has(x.page.page) && x.k === c.k),
        ALL.filter(x => x.k === c.k),
      ];
      for (const t of tiers) {
        for (const x of shuffle(t)) for (const it of shuffle(x.items || [x.a])) consider(it);
        if (picks.length >= want) break;
      }
    }
    return shuffle([...correct, ...picks]);
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

  // Which question format a card gets.
  function formatFor(c, mode, stage = 0) {
    const list = c.items && c.items.length > 1;
    if (mode === 'learn') {
      if (stage === 0) return 'mc';
      if (list) return 'multi';
      return SHORT_KINDS.has(c.k) && c.a.length <= 60 ? 'written' : 'self';
    }
    if (mode === 'written') return list ? 'multi' : c.a.length <= 80 ? 'written' : 'self';
    return list && settings.checkboxes ? 'multi' : 'mc';
  }

  // ====================================================================== shared pieces
  function answerHtml(a) {
    const parts = splitDepth0(a, '; ');
    if (!/^\(#1\)/.test(a) || parts.length < 2) return esc(a);
    return `<ol class="ans-list">${parts.map(p => `<li>${esc(p.replace(/^\(#\d+\)\s*/, ''))}</li>`).join('')}</ol>`;
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
    return `<div class="drug">${rows}<div class="src">${dot(c.page)}${esc(pageName(c.page))} · ${esc(c.page.title)} · ${esc(c.f)} deck</div></div>`;
  }
  const termLabel = c => `<span class="pchip" style="--pc:${c.page.color}">${esc(pageName(c.page))}</span> ${esc(KIND_LABEL[c.k] || c.f)}`;

  // ====================================================================== question widget
  // Renders one question into `el`; calls done(ok, given) once answered.
  let active = null;   // the widget that owns keyboard input
  function mountQuestion(el, c, fmt, done, opts = {}) {
    const w = { el, c, fmt, answered: false };
    const head = `<p class="term-label">${termLabel(c)}${opts.tag ? ` <span class="tag">${esc(opts.tag)}</span>` : ''}</p>
      <p class="prompt">${esc(c.q)}</p>`;
    let body = '';
    if (fmt === 'mc') {
      w.options = opts.options || shuffle([c.a, ...distractors(c)]);
      body = `<div class="options${w.options.some(o => o.length > 60) ? ' long' : ''}" role="group" aria-label="Answer choices">${w.options.map((o, k) =>
        `<button class="opt" data-opt="${k}"><span class="key">${k + 1}</span><span>${answerHtml(o)}</span></button>`).join('')}</div>`;
    } else if (fmt === 'multi') {
      w.options = opts.options || multiOptions(c);
      body = `<p class="note">Select all that apply (${c.items.length} correct).</p>
        <div class="checks" role="group" aria-label="Select all that apply">${w.options.map((o, k) =>
          `<label class="opt check-opt" data-copt="${k}"><input type="checkbox" value="${k}"><span class="key">${k + 1}</span><span>${esc(o)}</span></label>`).join('')}</div>
        <div class="actions"><button class="primary" data-submit>Check answer</button></div>`;
    } else if (fmt === 'written') {
      body = `<form class="written" data-form><input data-input autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="Type your answer" aria-label="Your answer"><button class="primary">Check</button></form>
        <button class="linkbtn" data-dontknow>I don't know</button>`;
    } else {
      body = `<div class="actions"><button class="primary" data-reveal>Show answer</button></div>`;
    }
    el.innerHTML = `${head}${body}<div data-feedback aria-live="polite"></div>`;

    const finish = (ok, given, extra = '') => {
      if (w.answered) return;
      w.answered = true;
      const fb = el.querySelector('[data-feedback]');
      const showAns = !(ok && fmt === 'mc');
      fb.innerHTML = `<div class="verdict ${ok ? 'good' : 'bad'}"><span data-vtext>${ok ? 'Correct' : 'Not quite'}</span>${extra}
          ${showAns ? `<div class="ans">${answerHtml(c.a)}</div>` : ''}</div>
        ${sourceBlock(c)}
        ${fmt === 'written' && !ok ? '<div class="actions"><button class="secondary" data-override>I was right</button></div>' : ''}
        <div data-after></div>`;
      const ov = fb.querySelector('[data-override]');
      if (ov) ov.onclick = () => {
        fb.querySelector('.verdict').className = 'verdict good';
        fb.querySelector('[data-vtext]').textContent = 'Counted as correct';
        ov.remove();
        opts.onOverride && opts.onOverride();
      };
      done(ok, given);
    };
    w.finish = finish;

    if (fmt === 'mc') {
      w.choose = k => {
        if (w.answered) return;
        el.querySelectorAll('[data-opt]').forEach(b => {
          const o = w.options[+b.dataset.opt];
          b.disabled = true;
          if (o === c.a) b.classList.add('correct');
          else if (+b.dataset.opt === k) b.classList.add('wrong');
        });
        finish(w.options[k] === c.a, w.options[k]);
      };
      el.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => w.choose(+b.dataset.opt));
    } else if (fmt === 'multi') {
      w.toggle = k => {
        const box = el.querySelector(`[data-copt="${k}"] input`);
        if (box && !w.answered) box.checked = !box.checked;
      };
      w.submit = () => {
        if (w.answered) return;
        const correct = new Set(c.items);
        const chosen = [...el.querySelectorAll('[data-copt] input')].filter(i => i.checked).map(i => w.options[+i.value]);
        if (!chosen.length) return;
        let right = 0, extra = 0;
        el.querySelectorAll('[data-copt]').forEach(l => {
          const o = w.options[+l.dataset.copt];
          const picked = l.querySelector('input').checked;
          l.querySelector('input').disabled = true;
          if (correct.has(o) && picked) { l.classList.add('correct'); right++; }
          else if (correct.has(o)) l.classList.add('missed');
          else if (picked) { l.classList.add('wrong'); extra++; }
        });
        el.querySelector('[data-submit]').remove();
        const ok = right === correct.size && extra === 0;
        finish(ok, chosen.join('; '), ok ? '' : ` <span class="score-inline">${right} of ${correct.size} found${extra ? `, ${extra} extra` : ''}</span>`);
      };
      el.querySelector('[data-submit]').onclick = w.submit;
    } else if (fmt === 'written') {
      const input = el.querySelector('[data-input]');
      if (opts.focus !== false) input.focus({ preventScroll: true });
      el.querySelector('[data-form]').onsubmit = e => {
        e.preventDefault();
        if (!input.value.trim() || w.answered) return;
        input.disabled = true;
        el.querySelector('[data-form] button').disabled = true;
        el.querySelector('[data-dontknow]').remove();
        finish(checkWritten(c, input.value), input.value);
      };
      el.querySelector('[data-dontknow]').onclick = () => {
        input.disabled = true;
        el.querySelector('[data-form] button').disabled = true;
        el.querySelector('[data-dontknow]').remove();
        finish(false, '');
      };
    } else {
      w.reveal = () => {
        const r = el.querySelector('[data-reveal]');
        if (!r) return;
        r.parentElement.innerHTML = `<div class="reveal"><div class="ans">${answerHtml(c.a)}</div>
          <p class="note">Did you recall it?</p>
          <div class="actions"><button class="secondary" data-self="0">Missed it <span class="hide-sm"><kbd>1</kbd></span></button>
          <button class="primary" data-self="1">Knew it <span class="hide-sm"><kbd>2</kbd></span></button></div></div>`;
        el.querySelectorAll('[data-self]').forEach(b => b.onclick = () => {
          el.querySelector('.reveal').remove();
          finish(b.dataset.self === '1', b.dataset.self === '1' ? 'Knew it' : 'Missed it');
        });
      };
      el.querySelector('[data-reveal]').onclick = w.reveal;
    }
    return w;
  }

  // ====================================================================== navigation
  function setNav(view) {
    document.querySelectorAll('.topbar nav [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === view));
  }
  let session = null;
  function go(view) {
    session = null;
    active = null;
    ({ setup: viewSetup, progress: viewProgress, browse: viewBrowse }[view] || viewSetup)();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));

  // ====================================================================== upcoming quiz banner
  function currentQuiz() {
    const t = today();
    const i = QUIZZES.findIndex(q => q.until >= t);
    return i < 0 ? null : { q: QUIZZES[i], next: QUIZZES[i + 1] };
  }
  function quizCards(q) {
    const pages = new Set(q.pages);
    return ALL.filter(c => pages.has(c.page.page));
  }
  function bannerHtml() {
    const cur = currentQuiz();
    if (!cur) return '';
    const { q, next } = cur;
    const t = today();
    const s = summarize(quizCards(q));
    const days = daysBetween(t, q.start);
    const when = t >= q.start ? (q.start === q.until ? 'Today' : `This week · ${fmtDay(q.start)}–${fmtDay(q.until)}`)
      : days === 1 ? `Tomorrow · ${fmtDay(q.start)}` : `In ${days} days · ${fmtDay(q.start)}${q.until !== q.start ? `–${fmtDay(q.until)}` : ''}`;
    const pages = q.pages.length > 6 ? `All ${q.pages.length} pages` : q.pages.map(n => `<span class="nowrap">${dot(byPage[n])}${esc(pageName(byPage[n]))}</span>`).join(' ');
    const mPct = pct(s.mastered, s.total);
    return `<section class="banner" aria-label="Upcoming quiz">
      <div class="banner-top">
        <div>
          <p class="term-label">Next BDK quiz · ${esc(q.label)}</p>
          <h2 class="banner-title">${esc(when)}</h2>
          <p class="banner-pages">${pages}</p>
          <p class="note">Calculations: ${esc(q.calcs)}</p>
        </div>
        <div class="ring" style="--p:${mPct}" role="img" aria-label="${mPct}% of quiz cards mastered"><span>${mPct}%</span><small>mastered</small></div>
      </div>
      ${stackBar(s)}
      <p class="note">${s.mastered} mastered · ${s.learning} learning · ${s.new} not studied · ${s.due} due for review, of ${s.total} cards</p>
      <div class="actions">
        <button class="primary" data-bq="learn">Learn these pages</button>
        <button class="secondary" data-bq="mc">Practice test (25)</button>
        <button class="secondary" data-bq="flash">Flashcards</button>
      </div>
      ${next ? `<p class="note banner-next">After that: ${esc(next.label)} · ${fmtDay(next.start)} · ${next.pages.length > 6 ? 'cumulative' : next.pages.map(n => esc(pageName(byPage[n]))).join(', ')}</p>` : ''}
    </section>`;
  }
  function wireBanner(root) {
    const cur = currentQuiz();
    root.querySelectorAll('[data-bq]').forEach(b => b.onclick = () => {
      const cards = quizCards(cur.q);
      const mode = b.dataset.bq;
      settings.pages = cur.q.pages.slice();
      saveSettings();
      if (mode === 'learn') startLearn(learnOrder(cards).slice(0, 25));
      else startSession(shuffle(cards).slice(0, mode === 'mc' ? 25 : 30), mode);
    });
  }

  // mastery bar: mastered / learning / not studied (one hue, light -> dark)
  function stackBar(s, label = '') {
    const segs = [['mastered', s.mastered], ['learning', s.learning], ['new', s.new]].filter(([, n]) => n);
    const names = { mastered: 'Mastered', learning: 'Learning', new: 'Not studied' };
    return `<div class="stack" role="img" aria-label="${label}${s.mastered} mastered, ${s.learning} learning, ${s.new} not studied">${segs.map(([k, n]) =>
      `<span class="seg seg-${k}" style="flex:${n}" data-tip="${names[k]}: ${n} of ${s.total} (${pct(n, s.total)}%)"></span>`).join('')}</div>`;
  }
  const legend = () => `<div class="legend-row"><span><i class="sw seg-mastered"></i>Mastered (right twice in a row)</span>
    <span><i class="sw seg-learning"></i>Learning</span><span><i class="sw seg-new"></i>Not studied</span></div>`;

  // ====================================================================== setup view
  function viewSetup() {
    setNav('setup');
    const selected = new Set(settings.pages);
    const cur = currentQuiz();
    const groups = [];
    for (const p of PAGES) {
      let g = groups.find(x => x.sys === p.sys);
      if (!g) groups.push(g = { sys: p.sys, pages: [] });
      g.pages.push(p);
    }

    $app.innerHTML = `
      ${bannerHtml()}
      <h1 class="h-study">Study</h1>
      <div class="card">
        <h2>BDK quizzes</h2>
        <div class="row">${QUIZZES.map((q, i) => `<button class="chip${cur && cur.q === q ? ' next' : ''}${q.until < today() ? ' past' : ''}" data-quiz="${i}">
          ${esc(q.label)} <span class="count">${q.pages.length > 6 ? fmtDay(q.start) : 'p' + q.pages.join(',')}</span></button>`).join('')}</div>
      </div>

      <div class="card">
        <div class="row spread"><h2>Pages</h2>
          <div><button class="linkbtn" data-all>All</button><button class="linkbtn" data-none>None</button></div></div>
        ${groups.map(g => `<div class="group"><div class="group-label"><span class="pdot" style="--pc:${SYSTEM_COLOR[g.sys]}"></span>${esc(SYSTEM_NAME[g.sys])}</div><div class="row">${
          g.pages.map(p => { const s = summarize(p.cards); return `<button class="chip pagechip" style="--pc:${p.color}" data-page="${p.page}" aria-pressed="${selected.has(p.page)}"
            title="${esc(p.title)} · ${s.mastered} of ${s.total} mastered">${esc(pageName(p))}<span class="mini" style="--m:${pct(s.mastered, s.total)}%"></span></button>`; }).join('')}</div></div>`).join('')}
        <p class="note" style="margin-top:10px">The line under each page shows how much of it you have mastered.</p>
      </div>

      <div class="card">
        <h2>Mode</h2>
        <div class="seg" data-seg="mode">${MODES.map(m => `<button data-val="${m.id}" aria-pressed="${settings.mode === m.id}">${m.label}</button>`).join('')}</div>
        <p class="note" data-modehint style="margin-top:8px"></p>
        <h2 style="margin-top:16px">Which cards</h2>
        <div class="seg" data-seg="filter">${FILTERS.map(f => `<button data-val="${f.id}" aria-pressed="${settings.filter === f.id}">${f.label}</button>`).join('')}</div>
        <h2 style="margin-top:16px" data-countlabel>How many</h2>
        <div class="seg" data-seg="count">${COUNTS.map(c => `<button data-val="${c}" aria-pressed="${settings.count === c}">${c || 'All'}</button>`).join('')}</div>
      </div>

      <details class="card" ${settings.decks.length < 4 || settings.kinds.length < 5 ? 'open' : ''}>
        <summary><h2 style="display:inline">Decks and question types</h2></summary>
        ${DECKS.map(d => `<label class="check"><input type="checkbox" data-deck="${d.id}" ${settings.decks.includes(d.id) ? 'checked' : ''}> ${esc(d.label)}</label>`).join('')}
        <div class="indent" data-kinds>
          <div class="group-label">Cards deck questions</div>
          ${CARD_KINDS.map(k => `<label class="check"><input type="checkbox" data-kind="${k.id}" ${settings.kinds.includes(k.id) ? 'checked' : ''}> ${esc(k.label)}</label>`).join('')}
        </div>
        <label class="check"><input type="checkbox" data-opt-checkboxes ${settings.checkboxes ? 'checked' : ''}> Answer list questions (ALL / Select ALL) with checkboxes</label>
        <label class="check"><input type="checkbox" data-opt-autoscroll ${settings.autoscroll ? 'checked' : ''}> Scroll mode: jump to the next question after answering</label>
      </details>

      <div class="startbar">
        <span class="note" data-avail></span>
        <button class="primary" data-start>Start</button>
      </div>

      <div class="card" style="margin-top:20px">
        <h2>Quizlet import files</h2>
        <p class="note">One set of files per page (Cards, Select ALL, Essential Knowledge, and Organisms for ID pages),
          tab-separated, one card per line. Import in Quizlet with <b>Tab</b> between term and definition and <b>New line</b> between cards.</p>
        <p><a class="secondary" href="downloads/BDK_2026-2027_Quizlet_Decks.zip" download>Download all decks (.zip)</a></p>
      </div>`;

    wireBanner($app);
    const refresh = () => {
      const n = pool().length;
      const shown = settings.count ? Math.min(n, settings.count) : n;
      const unit = settings.mode === 'learn' ? 'cards to learn' : 'questions';
      $app.querySelector('[data-avail]').textContent = !settings.pages.length ? 'Pick at least one page'
        : n ? `${shown} ${unit} (of ${n} matching)` : 'No cards match these settings';
      $app.querySelector('[data-start]').disabled = !n;
      $app.querySelector('[data-kinds]').style.display = settings.decks.includes('Cards') ? '' : 'none';
      $app.querySelector('[data-modehint]').textContent = MODES.find(m => m.id === settings.mode).hint;
      $app.querySelector('[data-countlabel]').textContent = settings.mode === 'learn' ? 'Cards per Learn session' : 'Number of questions';
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
    $app.querySelector('[data-all]').onclick = () => setPages(PAGES.map(p => p.page));
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
    $app.querySelector('[data-opt-checkboxes]').onchange = e => { settings.checkboxes = e.target.checked; saveSettings(); };
    $app.querySelector('[data-opt-autoscroll]').onchange = e => { settings.autoscroll = e.target.checked; saveSettings(); };
    $app.querySelectorAll('[data-seg]').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => {
      const key = seg.dataset.seg;
      settings[key] = key === 'count' ? +b.dataset.val : b.dataset.val;
      seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      saveSettings(); refresh();
    }));
    $app.querySelector('[data-start]').onclick = () => {
      const cards = pick(pool(), settings.count);
      settings.mode === 'learn' ? startLearn(cards) : startSession(cards, settings.mode);
    };
    refresh();
  }

  // ====================================================================== Test / Written / Flashcards
  function startSession(cards, mode) {
    if (mode === 'scroll') return startScroll(cards);
    if (mode === 'learn') return startLearn(cards);
    session = { kind: 'classic', mode, queue: cards.slice(), i: 0, results: [] };
    renderClassic();
  }
  function progressHeader(done, total, right) {
    return `<div class="qmeta"><span>${Math.min(done + 1, total)} of ${total}</span><span>${right} correct</span></div>
      <div class="progress"><div style="width:${(done / total) * 100}%"></div></div>`;
  }
  function renderClassic() {
    if (session.i >= session.queue.length) return viewResults();
    setNav('');
    const c = session.queue[session.i];
    if (session.mode === 'flash') return renderFlash(c);
    const right = session.results.filter(r => r.ok).length;
    $app.innerHTML = `${progressHeader(session.i, session.queue.length, right)}
      <div class="card" data-q></div>
      <div class="actions"><button class="secondary" data-quit>End</button></div>`;
    $app.querySelector('[data-quit]').onclick = viewResults;
    const fmt = formatFor(c, session.mode);
    active = mountQuestion($app.querySelector('[data-q]'), c, fmt, (ok, given) => {
      const r = { c, ok, given };
      session.results.push(r);
      record(c, ok);
      const after = $app.querySelector('[data-after]');
      after.innerHTML = `<div class="actions"><button class="primary" data-next>Next <span class="hide-sm"><kbd>Enter</kbd></span></button></div>`;
      const next = after.querySelector('[data-next]');
      next.focus({ preventScroll: true });
      next.onclick = () => { session.i++; renderClassic(); };
      active.next = () => next.click();
    }, { onOverride: () => { session.results[session.results.length - 1].ok = true; undoMiss(c); } });
  }

  function renderFlash(c) {
    const right = session.results.filter(r => r.ok).length;
    $app.innerHTML = `${progressHeader(session.i, session.queue.length, right)}
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
    const flip = () => { card.classList.toggle('flipped'); size(); };
    card.onclick = e => { if (!e.target.closest('summary')) flip(); };
    const answer = known => {
      session.results.push({ c, ok: known });
      record(c, known);
      if (!known) session.queue.push(c);   // like Quizlet: comes back at the end of the round
      session.i++;
      renderClassic();
    };
    $app.querySelector('[data-know]').onclick = () => answer(true);
    $app.querySelector('[data-learning]').onclick = () => answer(false);
    $app.querySelector('[data-quit]').onclick = viewResults;
    active = { flash: true, flip, answer };
  }

  // ====================================================================== Scroll mode
  function startScroll(cards) {
    setNav('');
    session = { kind: 'scroll', mode: 'scroll', queue: cards, results: [], rendered: 0 };
    $app.innerHTML = `<div class="scrollhead">
        <div class="qmeta"><span data-sh-count>0 of ${cards.length} answered</span><span data-sh-right>0 correct</span></div>
        <div class="progress"><div data-sh-bar style="width:0%"></div></div>
        <div class="actions" style="margin-top:8px"><button class="secondary" data-quit>Finish</button></div>
      </div>
      <ol class="feed" data-feed></ol>
      <div data-sentinel></div>
      <div class="actions" data-feed-end hidden><button class="primary" data-finish>See results</button></div>`;
    $app.querySelector('[data-quit]').onclick = viewResults;
    $app.querySelector('[data-finish]').onclick = viewResults;
    const feed = $app.querySelector('[data-feed]');
    const update = () => {
      const n = session.results.length;
      const right = session.results.filter(r => r.ok).length;
      $app.querySelector('[data-sh-count]').textContent = `${n} of ${cards.length} answered`;
      $app.querySelector('[data-sh-right]').textContent = `${right} correct`;
      $app.querySelector('[data-sh-bar]').style.width = `${pct(n, cards.length)}%`;
      $app.querySelector('[data-feed-end]').hidden = n < cards.length;
    };
    const renderMore = () => {
      const start = session.rendered;
      const end = Math.min(cards.length, start + 12);
      for (let i = start; i < end; i++) {
        const li = document.createElement('li');
        li.className = 'card feed-item';
        li.dataset.idx = i;
        feed.appendChild(li);
        const c = cards[i];
        const w = mountQuestion(li, c, formatFor(c, 'scroll'), (ok, given) => {
          session.results.push({ c, ok, given });
          record(c, ok);
          li.classList.add(ok ? 'done-good' : 'done-bad');
          update();
          if (settings.autoscroll) {
            const nextLi = feed.querySelector(`[data-idx="${i + 1}"]`);
            if (nextLi) setTimeout(() => nextLi.scrollIntoView({ behavior: 'smooth', block: 'start' }), ok ? 450 : 1400);
          }
        }, { focus: false });
        li.addEventListener('focusin', () => { active = w; });
        li.addEventListener('pointerdown', () => { active = w; });
        if (i === 0) active = w;
      }
      session.rendered = end;
    };
    renderMore();
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting) && session && session.kind === 'scroll' && session.rendered < cards.length) renderMore();
    }, { rootMargin: '600px' });
    io.observe($app.querySelector('[data-sentinel]'));
    session.io = io;
  }

  // ====================================================================== Learn mode
  // Quizlet-style rounds of 7: a card is answered by multiple choice first, then by recall
  // (typed, checkboxes, or self-check). Right twice = mastered for the session. Misses reset
  // the card and it comes back later in the round. Every answer also updates the spaced
  // review schedule used by "Due for review".
  const ROUND = 7;
  function startLearn(cards) {
    if (!cards.length) return;
    session = {
      kind: 'learn', cards, waiting: cards.slice(), work: [], stage: new Map(), missed: new Set(),
      round: 1, inRound: 0, roundLog: [], last: null, results: [],
    };
    fillWork();
    renderLearn();
  }
  function fillWork() {
    const L = session;
    while (L.work.length < ROUND && L.waiting.length) {
      const c = L.waiting.shift();
      L.work.push(c);
      L.stage.set(c, 0);
    }
  }
  function learnCounts() {
    const L = session;
    let mastered = 0, familiar = 0;
    for (const c of L.cards) {
      const st = L.stage.get(c);
      if (st === 2) mastered++;
      else if (st === 1) familiar++;
    }
    return { mastered, familiar, remaining: L.cards.length - mastered - familiar };
  }
  function learnBar() {
    const n = learnCounts();
    const T = session.cards.length;
    return `<div class="learnbar" role="img" aria-label="${n.mastered} mastered, ${n.familiar} familiar, ${n.remaining} remaining">
      <div class="stack">${[['mastered', n.mastered], ['learning', n.familiar], ['new', n.remaining]].filter(([, v]) => v)
        .map(([k, v]) => `<span class="seg seg-${k}" style="flex:${v}" data-tip="${v} of ${T}"></span>`).join('')}</div>
      <div class="qmeta"><span>${n.mastered} mastered</span><span>${n.familiar} familiar</span><span>${n.remaining} to go</span></div></div>`;
  }
  function nextLearnCard() {
    const L = session;
    let options = L.work.filter(c => c !== L.last);
    if (!options.length) options = L.work;
    const minStage = Math.min(...options.map(c => L.stage.get(c)));
    const low = options.filter(c => L.stage.get(c) === minStage);
    return low[Math.floor(Math.random() * low.length)];
  }
  function renderLearn() {
    const L = session;
    setNav('');
    if (!L.work.length) return learnDone();
    if (L.inRound >= ROUND) return learnRoundSummary();
    const c = nextLearnCard();
    L.last = c;
    const stage = L.stage.get(c);
    const fmt = formatFor(c, 'learn', stage);
    $app.innerHTML = `<div class="learnhead"><span class="term-label">Learn · round ${L.round}</span>${learnBar()}</div>
      <div class="card" data-q></div>
      <div class="actions"><button class="secondary" data-quit>End session</button></div>`;
    $app.querySelector('[data-quit]').onclick = learnDone;
    const tag = stage === 0 ? 'Multiple choice' : fmt === 'multi' ? 'Recall · select all' : fmt === 'written' ? 'Recall · type it' : 'Recall · check yourself';
    active = mountQuestion($app.querySelector('[data-q]'), c, fmt, (ok, given) => {
      record(c, ok);
      L.results.push({ c, ok, given });
      L.roundLog.push({ c, ok });
      L.inRound++;
      if (ok) {
        L.stage.set(c, stage + 1);
        if (stage + 1 >= 2) { L.work = L.work.filter(x => x !== c); fillWork(); }
      } else {
        L.stage.set(c, 0);
        L.missed.add(c);
      }
      const after = $app.querySelector('[data-after]');
      const msg = ok ? (stage + 1 >= 2 ? 'Mastered for this session.' : 'Next time you will answer it from memory.')
        : 'This card comes back later in the round.';
      after.innerHTML = `<p class="note">${msg}</p><div class="actions"><button class="primary" data-next>Continue <span class="hide-sm"><kbd>Enter</kbd></span></button></div>`;
      const next = after.querySelector('[data-next]');
      next.focus({ preventScroll: true });
      next.onclick = renderLearn;
      active.next = () => next.click();
    }, {
      tag,
      onOverride: () => {
        undoMiss(c);
        L.missed.delete(c);
        L.stage.set(c, stage + 1);
        if (stage + 1 >= 2) { L.work = L.work.filter(x => x !== c); fillWork(); }
      },
    });
  }
  function learnRoundSummary() {
    const L = session;
    const misses = L.roundLog.filter(r => !r.ok);
    const right = L.roundLog.length - misses.length;
    $app.innerHTML = `<div class="card">
        <p class="term-label">Round ${L.round} complete</p>
        <p class="score">${right} / ${L.roundLog.length}</p>
        ${learnBar()}
        ${misses.length ? `<h2 style="margin-top:16px">Review before the next round</h2><ul class="missed">${[...new Set(misses.map(m => m.c))].map(c => `
          <li><div class="q">${esc(c.q)}</div><div class="right">${answerHtml(c.a)}</div></li>`).join('')}</ul>`
          : '<p class="note">No misses this round.</p>'}
        <div class="actions"><button class="primary" data-cont>Continue to round ${L.round + 1} <span class="hide-sm"><kbd>Enter</kbd></span></button>
          <button class="secondary" data-quit>End session</button></div></div>`;
    const cont = $app.querySelector('[data-cont]');
    cont.focus({ preventScroll: true });
    cont.onclick = () => { L.round++; L.inRound = 0; L.roundLog = []; renderLearn(); };
    $app.querySelector('[data-quit]').onclick = learnDone;
    active = { next: () => cont.click() };
  }
  function learnDone() {
    const L = session;
    const n = learnCounts();
    const firstTry = new Map();
    for (const r of L.results) if (!firstTry.has(r.c)) firstTry.set(r.c, r.ok);
    const firstRight = [...firstTry.values()].filter(Boolean).length;
    const hard = [...L.missed];
    active = null;
    $app.innerHTML = `<div class="card">
        <p class="term-label">Learn session ${L.work.length ? 'ended' : 'complete'}</p>
        <p class="score">${n.mastered} / ${L.cards.length}</p>
        <p class="note">cards mastered this session · ${firstRight} of ${firstTry.size} right on the first try · ${L.results.length} answers</p>
        ${learnBar()}
        <div class="actions">
          ${L.work.length ? '<button class="primary" data-resume>Keep going</button>' : ''}
          ${hard.length ? `<button class="${L.work.length ? 'secondary' : 'primary'}" data-hard>Learn the ${hard.length} I missed again</button>` : ''}
          <button class="secondary" data-progress>See progress</button>
          <button class="secondary" data-setup>Back to Study</button>
        </div>
        <p class="note">Each card's next review is scheduled from these answers. Choose “Due for review” on the Study page to see them on the right day.</p>
      </div>
      ${hard.length ? `<div class="card"><h2>Missed at least once (${hard.length})</h2><ul class="missed">${hard.map(c => `
        <li><div class="q">${esc(c.q)}</div><div class="right">${answerHtml(c.a)}</div></li>`).join('')}</ul></div>` : ''}`;
    const resume = $app.querySelector('[data-resume]');
    if (resume) resume.onclick = () => { L.inRound = 0; L.roundLog = []; renderLearn(); };
    const hb = $app.querySelector('[data-hard]');
    if (hb) hb.onclick = () => startLearn(shuffle(hard));
    $app.querySelector('[data-progress]').onclick = () => go('progress');
    $app.querySelector('[data-setup]').onclick = () => go('setup');
  }

  // ====================================================================== results (Test / Scroll / Written / Flashcards)
  function viewResults() {
    setNav('');
    if (session.io) session.io.disconnect();
    active = null;
    const firstTry = new Map();
    for (const r of session.results) if (!firstTry.has(r.c)) firstTry.set(r.c, r);
    const results = [...firstTry.values()];
    const right = results.filter(r => r.ok).length;
    const missed = results.filter(r => !r.ok);
    const byKind = {};
    for (const r of results) {
      const k = KIND_LABEL[r.c.k] || r.c.f;
      byKind[k] = byKind[k] || { n: 0, r: 0 };
      byKind[k].n++;
      if (r.ok) byKind[k].r++;
    }
    const mode = session.mode;
    $app.innerHTML = `
      <div class="card">
        <p class="term-label">Your score</p>
        <p class="score">${pct(right, results.length)}%</p>
        <p class="note">${right} of ${results.length} correct on the first try</p>
        ${results.length ? `<div class="kindbars">${Object.entries(byKind).sort((a, b) => a[1].r / a[1].n - b[1].r / b[1].n).map(([k, v]) => barRow(k, v.r, v.n)).join('')}</div>` : ''}
        <div class="actions">
          ${missed.length ? '<button class="primary" data-retry>Learn the missed cards</button>' : ''}
          <button class="secondary" data-again>New set, same settings</button>
          <button class="secondary" data-setup>Change settings</button>
        </div>
      </div>
      ${missed.length ? `<div class="card"><h2>Missed (${missed.length})</h2><ul class="missed">${missed.map(r => `
        <li><div class="q">${esc(r.c.q)}</div>
          ${r.given ? `<div class="you">You: ${esc(r.given)}</div>` : ''}
          <div class="right">Answer: ${answerHtml(r.c.a)}</div></li>`).join('')}</ul></div>` : ''}`;
    const retry = $app.querySelector('[data-retry]');
    if (retry) retry.onclick = () => startLearn(shuffle(missed.map(r => r.c)));
    $app.querySelector('[data-again]').onclick = () => startSession(pick(pool(), settings.count), mode);
    $app.querySelector('[data-setup]').onclick = () => go('setup');
    window.scrollTo(0, 0);
  }
  function barRow(label, r, n, extra = '') {
    const p = pct(r, n);
    return `<div class="barrow"><span class="bl">${esc(label)}</span>
      <span class="bt"><span class="bf" style="width:${Math.max(p, 1)}%" data-tip="${esc(label)}: ${r} of ${n} correct (${p}%)"></span></span>
      <span class="bv">${p}% <small>of ${n}</small></span>${extra}</div>`;
  }

  // ====================================================================== Progress view
  function viewProgress() {
    setNav('progress');
    const t = today();
    const all = summarize(ALL);
    const studied = all.total - all.new;
    const last7 = Array.from({ length: 7 }, (_, i) => PROGRESS.days[addDays(t, -i)] || { n: 0, c: 0 });
    const w7 = last7.reduce((a, d) => ({ n: a.n + d.n, c: a.c + d.c }), { n: 0, c: 0 });
    let streak = 0;
    for (let i = PROGRESS.days[t] ? 0 : 1; PROGRESS.days[addDays(t, -i)]; i++) streak++;
    const cur = currentQuiz();
    const dueCards = ALL.filter(isDue);

    // accuracy by question type
    const kinds = {};
    for (const c of ALL) {
      const s = cs(c);
      if (!s) continue;
      const k = c.k;
      kinds[k] = kinds[k] || { r: 0, n: 0, cards: [] };
      kinds[k].r += s.r;
      kinds[k].n += s.r + s.w;
      kinds[k].cards.push(c);
    }
    const kindRows = Object.entries(kinds).filter(([, v]) => v.n).sort((a, b) => a[1].r / a[1].n - b[1].r / b[1].n);
    const weakKind = kindRows.find(([, v]) => v.n >= 8 && v.r / v.n < 0.8);

    // trouble cards: missed at least twice, or missed most recently with a low hit rate
    const trouble = ALL.map(c => ({ c, s: cs(c) })).filter(x => x.s && x.s.w >= 2 && x.s.w >= x.s.r - 1)
      .sort((a, b) => (b.s.w - b.s.r) - (a.s.w - a.s.r) || b.s.w - a.s.w).slice(0, 12);

    // activity, last 14 days
    const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
    const maxN = Math.max(1, ...days.map(d => (PROGRESS.days[d] || { n: 0 }).n));

    const tips = [];
    if (dueCards.length) tips.push({ text: `${dueCards.length} card${dueCards.length === 1 ? ' is' : 's are'} due for review today. Reviewing a card on its scheduled day, after a gap, builds longer-lasting recall than repeating it several times in one sitting.`, act: 'due', label: 'Review due cards' });
    if (cur) {
      const qs = summarize(quizCards(cur.q));
      if (qs.new) tips.push({ text: `${qs.new} of ${qs.total} cards for the ${cur.q.label} quiz (${fmtDay(cur.q.start)}) are not studied yet. Learn mode introduces them in rounds of 7.`, act: 'quiz', label: `Learn ${cur.q.label} cards` });
    }
    if (weakKind) tips.push({ text: `Your lowest accuracy is on ${KIND_LABEL[weakKind[0]]} (${pct(weakKind[1].r, weakKind[1].n)}% of ${weakKind[1].n} answers). Studying one question type at a time lets you compare similar answers side by side.`, act: 'kind:' + weakKind[0], label: `Practice ${KIND_LABEL[weakKind[0]]}` });
    if (trouble.length) tips.push({ text: `${trouble.length} card${trouble.length === 1 ? ' has' : 's have'} been missed more often than answered right. In Learn mode each one must be answered from memory (typed or checkboxes) before it counts as mastered.`, act: 'trouble', label: 'Learn trouble cards' });
    if (!studied) tips.push({ text: 'No answers recorded on this device yet. Start with the next quiz above, in Learn mode.' });

    $app.innerHTML = `
      <h1>Progress</h1>
      <p class="sub">Saved in this browser. Use Export / Import below to move it to another device.</p>
      <div class="tiles">
        <div class="tile"><span class="tv">${pct(all.mastered, all.total)}%</span><span class="tl">mastered<br><small>${all.mastered} of ${all.total} cards</small></span></div>
        <div class="tile"><span class="tv">${studied}</span><span class="tl">cards studied<br><small>${all.learning} still learning</small></span></div>
        <div class="tile"><span class="tv">${w7.n ? pct(w7.c, w7.n) + '%' : '—'}</span><span class="tl">accuracy, last 7 days<br><small>${w7.n} answers</small></span></div>
        <div class="tile"><span class="tv">${dueCards.length}</span><span class="tl">due for review<br><small>${streak ? `${streak}-day study streak` : 'no streak yet'}</small></span></div>
      </div>

      ${tips.length ? `<div class="card"><h2>How to improve</h2><ul class="tips">${tips.map((tp, i) => `<li><p>${esc(tp.text)}</p>${tp.act ? `<button class="secondary" data-tip-act="${i}">${esc(tp.label)}</button>` : ''}</li>`).join('')}</ul></div>` : ''}

      ${cur ? `<div class="card"><h2>${esc(cur.q.label)} quiz readiness · ${fmtDay(cur.q.start)}</h2>${legend()}
        ${cur.q.pages.map(n => pageRow(byPage[n])).join('')}</div>` : ''}

      <div class="card">
        <h2>Accuracy by question type</h2>
        <p class="note">All recorded answers, weakest first.</p>
        ${kindRows.length ? `<div class="kindbars">${kindRows.map(([k, v]) => barRow(KIND_LABEL[k] || k, v.r, v.n,
          `<button class="linkbtn" data-kind-learn="${k}">Practice</button>`)).join('')}</div>` : '<p class="note">No answers yet.</p>'}
      </div>

      <div class="card">
        <h2>Cards answered per day</h2>
        <p class="note">Last 14 days. Darker part of each column = answered correctly.</p>
        <div class="cols" role="img" aria-label="Cards answered per day for the last 14 days">${days.map(d => {
          const v = PROGRESS.days[d] || { n: 0, c: 0 };
          return `<div class="col" data-tip="${fmtDay(d)}: ${v.n} answered, ${v.c} correct">
            <span class="colv">${v.n === maxN && v.n ? v.n : ''}</span>
            <span class="colbar" style="height:${(v.n / maxN) * 100}%"><span class="colok" style="height:${v.n ? (v.c / v.n) * 100 : 0}%"></span></span>
            <span class="coll">${new Date(d + 'T12:00:00').getDate()}</span></div>`;
        }).join('')}</div>
      </div>

      ${trouble.length ? `<div class="card"><h2>Trouble cards</h2><p class="note">Missed at least twice.</p><ul class="missed">${trouble.map(({ c, s }) => `
        <li><div class="q">${dot(c.page)}${esc(c.q)}</div><div class="right">${answerHtml(c.a)}</div>
        <div class="note">${s.r} right · ${s.w} missed</div></li>`).join('')}</ul></div>` : ''}

      <div class="card"><h2>All pages</h2>${legend()}${PAGES.map(pageRow).join('')}</div>

      <div class="card">
        <h2>How reviews are scheduled</h2>
        <p class="note">Each right answer moves a card's next review further out: 1, 2, 4, 7, then 14 days (at most one step per day).
          A miss brings it back the same day. If a quiz covers the card's page, its review is moved up to the day before that quiz.
          A card counts as mastered once it has been answered right twice in a row.</p>
        <div class="actions">
          <button class="secondary" data-export>Export progress</button>
          <label class="secondary filebtn">Import progress<input type="file" accept="application/json,.json" data-import hidden></label>
          <button class="secondary danger" data-reset>Reset progress</button>
        </div>
        <p class="note" data-io-msg></p>
      </div>`;

    $app.querySelectorAll('[data-tip-act]').forEach(b => b.onclick = () => {
      const act = tips[+b.dataset.tipAct].act;
      if (act === 'due') startLearn(learnOrder(dueCards).slice(0, 50));
      else if (act === 'quiz') startLearn(learnOrder(quizCards(cur.q)).slice(0, 25));
      else if (act === 'trouble') startLearn(trouble.map(x => x.c));
      else if (act.startsWith('kind:')) startLearn(learnOrder(kinds[act.slice(5)].cards).slice(0, 25));
    });
    $app.querySelectorAll('[data-kind-learn]').forEach(b => b.onclick = () =>
      startLearn(learnOrder(kinds[b.dataset.kindLearn].cards).slice(0, 25)));
    $app.querySelectorAll('[data-page-learn]').forEach(b => b.onclick = () =>
      startLearn(learnOrder(byPage[b.dataset.pageLearn].cards).slice(0, 25)));
    $app.querySelector('[data-export]').onclick = () => {
      const blob = new Blob([JSON.stringify({ app: 'bdk-quiz', exported: new Date().toISOString(), progress: PROGRESS }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `bdk-progress-${t}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $app.querySelector('[data-import]').onchange = async e => {
      const msg = $app.querySelector('[data-io-msg]');
      try {
        const json = JSON.parse(await e.target.files[0].text());
        const p = json.progress || json;
        if (!p.cards || !p.days) throw new Error('not a progress file');
        // Keep whichever record has more answers for each card; add daily counts.
        for (const [k, v] of Object.entries(p.cards)) if (!PROGRESS.cards[k] || v.n > PROGRESS.cards[k].n) PROGRESS.cards[k] = v;
        for (const [d, v] of Object.entries(p.days)) if (!PROGRESS.days[d] || v.n > PROGRESS.days[d].n) PROGRESS.days[d] = v;
        saveProgress();
        viewProgress();
      } catch (err) {
        msg.textContent = `Import failed: ${err.message}`;
      }
    };
    $app.querySelector('[data-reset]').onclick = () => {
      if (!confirm('Delete all progress saved in this browser?')) return;
      PROGRESS.cards = {};
      PROGRESS.days = {};
      saveProgress();
      viewProgress();
    };
  }
  function pageRow(p) {
    const s = summarize(p.cards);
    return `<div class="pagerow">
      <span class="pl">${dot(p)}<span>${esc(pageName(p))}</span></span>
      ${stackBar(s, pageName(p) + ': ')}
      <span class="bv">${pct(s.mastered, s.total)}% <small>${s.due ? `${s.due} due` : `of ${s.total}`}</small></span>
      <button class="linkbtn" data-page-learn="${p.page}">Learn</button></div>`;
  }

  // ====================================================================== Drug list (page by page, PDF colors)
  function viewBrowse() {
    setNav('browse');
    $app.innerHTML = `<h1>Drug list</h1>
      <p class="sub">${esc(DATA.edition)}, page by page. Search any column; tap a row for essential knowledge.</p>
      <div class="jump">${PAGES.map(p => `<a href="#pg${p.page}" class="pchip" style="--pc:${p.color}">${p.page}</a>`).join('')}</div>
      <input class="search" data-q type="search" placeholder="Search generic, brand, category, indication…" aria-label="Search">
      <div data-body></div>`;
    const body = $app.querySelector('[data-body]');
    const render = term => {
      const tq = term.trim().toLowerCase();
      let html = '';
      for (const p of PAGES) {
        const rows = p.drugs.map((d, i) => [d, i]).filter(([d]) => !tq || [d.generic, d.brand, d.category, d.classification,
          d.indication, d.activity, d.essential].some(v => (v || '').toLowerCase().includes(tq)));
        if (!rows.length) continue;
        html += `<section class="pagetable" id="pg${p.page}"><h2 class="pagehead" style="--pc:${p.color}">${esc(p.title)} <span class="ed">p${p.page}</span></h2>
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
      const d = byPage[tr.dataset.p].drugs[+tr.dataset.i];
      tr.insertAdjacentHTML('afterend', `<tr class="detail"><td colspan="5"><p class="ek">${esc(d.essential || '—')}</p></td></tr>`);
    };
    const input = $app.querySelector('[data-q]');
    input.oninput = () => render(input.value);
    render('');
  }

  // ====================================================================== tooltips (bars, segments, columns)
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.hidden = true;
  document.body.appendChild(tip);
  const showTip = (el, x, y) => {
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2)) + 'px';
    tip.style.top = Math.max(8, y - r.height - 12) + 'px';
  };
  document.addEventListener('pointermove', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true;
  });
  document.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

  // ====================================================================== keyboard
  document.addEventListener('keydown', e => {
    if (!active || e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = e.target.tagName === 'INPUT' && e.target.type !== 'checkbox';
    if (active.flash) {
      if (e.key === ' ') { e.preventDefault(); active.flip(); }
      else if (e.key === '1') active.answer(false);
      else if (e.key === '2') active.answer(true);
      return;
    }
    if (active.answered || (!active.fmt && active.next)) {
      if (e.key === 'Enter' && active.next) { e.preventDefault(); active.next(); }
      return;
    }
    if (typing) return;
    if (active.fmt === 'mc' && /^[1-9]$/.test(e.key) && +e.key <= active.options.length) active.choose(+e.key - 1);
    else if (active.fmt === 'multi') {
      if (/^[1-9]$/.test(e.key)) active.toggle(+e.key - 1);
      else if (e.key === 'Enter') { e.preventDefault(); active.submit(); }
    } else if (active.fmt === 'self') {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); active.reveal(); }
      else if (e.key === '1') active.el.querySelector('[data-self="0"]')?.click();
      else if (e.key === '2') active.el.querySelector('[data-self="1"]')?.click();
    }
  });

  // ====================================================================== boot
  const boot = json => {
    loadData(json);
    settings.pages = settings.pages.filter(n => byPage[n]);
    if (!settings.pages.length) {
      const cur = currentQuiz();
      settings.pages = (cur ? cur.q.pages : PAGES.map(p => p.page)).slice();
    }
    viewSetup();
  };
  if (window.BDK_DATA) boot(window.BDK_DATA);
  else fetch('data/decks.json').then(r => r.json()).then(boot).catch(() => {
    $app.innerHTML = '<div class="warnbox">The decks could not be loaded.</div>';
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
