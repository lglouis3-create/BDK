(() => {
  'use strict';

  // ====================================================================== constants
  // Plain-language topics; each covers question kinds from the Quizlet decks.
  const TOPICS = [
    { id: 'names', label: 'Brand ↔ generic', kinds: ['brand', 'generic'] },
    { id: 'class', label: 'Drug class', kinds: ['category', 'sa-category'] },
    { id: 'ind', label: 'Indications', kinds: ['indication', 'sa-indication'] },
    { id: 'rx', label: 'Rx / OTC / schedule', kinds: ['classification', 'sa-classification'] },
    { id: 'safety', label: 'Side effects & boxed warnings', kinds: ['ek-kse', 'ek-bw', 'ek-which'] },
    { id: 'notes', label: 'Other notes', kinds: ['ek-notes'] },
    { id: 'org', label: 'Organisms (ID pages)', kinds: ['organism', 'sa-organism'] },
  ];
  const TOPIC_PRESETS = [
    { label: 'BDK quiz questions', topics: ['names', 'class', 'ind', 'rx'], hint: 'The five question types on the BDK quiz schedule: brand, generic, category, indication, classification.' },
    { label: 'Everything', topics: TOPICS.map(t => t.id) },
    { label: 'Safety only', topics: ['safety', 'notes'] },
  ];
  const KIND_LABEL = {
    brand: 'Brand name', generic: 'Generic name', category: 'Drug class', classification: 'Rx / OTC / schedule',
    indication: 'Indications', 'sa-category': 'Select ALL · drug class', 'sa-classification': 'Select ALL · Rx / OTC',
    'sa-indication': 'Select ALL · indication', 'ek-kse': 'Key side effects', 'ek-bw': 'US boxed warnings',
    'ek-notes': 'Other notes', organism: 'Organisms', 'sa-organism': 'Select ALL · organism',
    'ek-which': 'Which drug? · side effect or warning',
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
    { id: 'learn', label: 'Learn', hint: 'New cards: multiple choice, then recall twice. Cards you know: one recall. Misses come back later in the round.' },
    { id: 'mc', label: 'Test', hint: 'One question at a time. List answers use checkboxes.' },
    { id: 'scroll', label: 'Scroll', hint: 'All questions on one page; answer and keep scrolling.' },
    { id: 'written', label: 'Written', hint: 'Type each answer; long answers use a self-check.' },
    { id: 'flash', label: 'Flashcards', hint: 'Flip cards and sort them into Know it / Still learning.' },
    { id: 'match', label: 'Match', hint: 'Tap matching pairs as fast as you can. A wrong pair adds 1 second.' },
    { id: 'cram', label: 'Cram', hint: 'For a quiz today or tomorrow: skips cards you know well, shows each new card once, then tests it again at growing gaps. Ends with a last-look sheet of what you missed.' },
  ];
  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'due', label: 'Due for review' },
    { id: 'missed', label: 'Missed last time' },
    { id: 'new', label: 'Not studied yet' },
  ];
  const MATCH_TYPES = [
    { id: 'names', label: 'Generic ↔ brand' },
    { id: 'class', label: 'Drug ↔ class' },
    { id: 'ind', label: 'Drug ↔ indications' },
  ];
  const COUNTS = [10, 25, 50, 0];
  const THEMES = ['auto', 'light', 'dark', 'blue'];
  const SHORT_KINDS = new Set(['brand', 'generic', 'classification', 'organism', 'category', 'indication']);
  const ROUND = 7;              // Learn round size
  const NEW_PER_DAY = 20;       // new cards suggested in today's plan
  const LEECH = 4;              // misses before a card is flagged as a trouble card

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
  const uniq = a => [...new Set(a)];

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
  const THEME_NAME = { auto: 'Auto', light: 'Light', dark: 'Dark', blue: 'Blue' };
  function applyTheme(t) {
    const resolved = t === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'blue' : 'light') : t;
    document.documentElement.dataset.theme = resolved;
    if (themeBtn) {
      themeBtn.querySelector('[data-theme-name]').textContent = THEME_NAME[t];
      themeBtn.setAttribute('aria-label', `Theme: ${THEME_NAME[t]}. Tap to change.`);
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
  const KIND_TO_TOPIC = Object.fromEntries(TOPICS.flatMap(t => t.kinds.map(k => [k, t.id])));

  function itemsOf(c) {
    if (/^\(#1\) /.test(c.a)) return splitDepth0(c.a, '; ').map(s => s.replace(/^\(#\d+\)\s*/, ''));
    if (c.f === 'EssentialKnowledge') {
      const it = splitDepth0(c.a, '; ');
      return it.length > 1 ? it : null;
    }
    return null;
  }
  const EK_Q = /^What (?:is|are) the (Key Side Effects?|US Boxed Warnings?|Other Notes?)(?: (\([^)]*\)))? (?:of|for) /;

  function loadData(json) {
    DATA = json;
    PAGES = DATA.pages;
    ALL = [];
    for (const p of PAGES) {
      byPage[p.page] = p;
      p.sys = p.short.replace(/\d+$/, '');
      p.color = SYSTEM_COLOR[p.sys] || '#999';
      p.drugs.forEach((d, i) => {
        d.ref = `${p.page}:${i}`;
        d.page = p;
        d.i = i;
        d.facts = { kse: [], bw: [], notes: [], ind: [], org: [], cls: [] };
        d.cards = [];
        // "generic (Brand1, Brand2)" -> name parts for Match
        const m = d.label.match(/^(.*) \(([^()]*(?:\([^()]*\)[^()]*)*)\)$/);
        d.short = d.brand && d.brand !== '---' && m ? m[1] : d.label;
        d.brandNames = d.brand && d.brand !== '---' && m ? m[2] : '';
      });
      p.cards.forEach(c => {
        c.page = p;
        c.id = `${p.page}|${c.q}`;
        c.items = itemsOf(c);
        c.topic = KIND_TO_TOPIC[c.k];
        byId[c.id] = c;
        ALL.push(c);
        for (const di of c.d) p.drugs[di].cards.push(c);
        // structured facts per drug, for Compare
        const list = c.items || [c.a];
        if (c.k === 'indication') c.d.forEach(di => { p.drugs[di].facts.ind = list; });
        else if (c.k === 'classification') c.d.forEach(di => { p.drugs[di].facts.cls = list; });
        else if (c.k === 'category') c.d.forEach(di => { p.drugs[di].facts.cat = c.a; });
        else if (c.k === 'organism') c.d.forEach(di => { p.drugs[di].facts.org = list; });
        else if (c.f === 'EssentialKnowledge') {
          const m = c.q.match(EK_Q);
          if (!m) return;
          const key = m[1].startsWith('Key') ? 'kse' : m[1].startsWith('US') ? 'bw' : 'notes';
          const q = m[2] ? `${m[2]} ` : '';
          const its = (c.items || [c.a]).map(x => q + x);
          c.d.forEach(di => p.drugs[di].facts[key].push(...its));
        }
      });
    }
    resolveSeeAbove();
    for (const p of PAGES) generateWhichCards(p);
    for (const q of QUIZZES) if (q.pages === 'all') q.pages = PAGES.map(p => p.page);
  }
  // "US Boxed Warnings (all opioid analgesics): See above" on p25-26 points to the shared list on p25.
  function resolveSeeAbove() {
    const shared = {};
    for (const p of PAGES) for (const d of p.drugs) for (const it of d.facts.bw) {
      const m = it.match(/^(\([^)]*\)) (.*)$/);
      if (m && !/^See above/i.test(m[2])) (shared[m[1]] = shared[m[1]] || { page: p, items: new Set() }).items.add(m[2]);
    }
    for (const c of ALL) {
      if (c.k !== 'ek-bw' || !/^See above/i.test(c.a)) continue;
      const q = (c.q.match(EK_Q) || [])[2];
      if (q && shared[q]) { c.resolved = [...shared[q].items]; c.resolvedFrom = shared[q].page; }
    }
    for (const p of PAGES) for (const d of p.drugs) {
      d.facts.bw = d.facts.bw.flatMap(it => {
        const m = it.match(/^(\([^)]*\)) See above/i);
        return m && shared[m[1]] ? [...shared[m[1]].items].map(x => `${m[1]} ${x}`) : [it];
      });
    }
  }
  // Reverse questions for distinctive facts: a side effect or boxed warning that only 1-2 drugs
  // on the page have is the cue that tells those drugs apart from their neighbors.
  function generateWhichCards(p) {
    const withEk = p.drugs.filter(d => d.facts.kse.length || d.facts.bw.length);
    if (withEk.length < 3) return;
    const strip = x => x.replace(/^\([^)]*\) /, '');
    for (const [key, word] of [['bw', 'US boxed warning'], ['kse', 'key side effect']]) {
      const owners = new Map();
      for (const d of p.drugs) for (const it of uniq(d.facts[key].map(strip))) {
        if (/^(no major side effects|see above)/i.test(it)) continue;
        owners.set(it, [...(owners.get(it) || []), d]);
      }
      for (const [it, ds] of owners) {
        if (ds.length > 2 || (key === 'kse' && ds.length === withEk.length)) continue;
        const single = ds.length === 1;
        const c = {
          f: 'Generated', k: 'ek-which', d: ds.map(d => d.i), page: p, topic: 'safety',
          q: single ? `On p${p.page}, which drug has the ${word}: ${it}?` : `On p${p.page}, select ALL drugs with the ${word}: ${it}`,
          a: single ? ds[0].label : ds.map((d, i) => `(#${i + 1}) ${d.label}`).join('; '),
        };
        c.id = `${p.page}|${c.q}`;
        c.items = itemsOf(c);
        byId[c.id] = c;
        ALL.push(c);
        p.cards.push(c);
        ds.forEach(d => d.cards.push(c));
      }
    }
  }
  const drugByRef = ref => { const [pg, i] = ref.split(':'); return byPage[pg] && byPage[pg].drugs[+i]; };
  const pageName = p => `p${p.page} · ${p.short.replace(/(\D)(\d)$/, '$1 $2').replace('PainHemeOnc', 'Pain/Heme/Onc')}`;
  const dot = p => `<span class="pdot" style="--pc:${p.color}" aria-hidden="true"></span>`;

  // ====================================================================== memory model (FSRS-4.5)
  // Forgetting curve R(t,S) = (1 + 19/81 * t/S)^-0.5; with 90% target retention the interval equals S.
  // Default parameters and update formulas from the open-spaced-repetition wiki ("The Algorithm").
  const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367,
    1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
  const DECAY = -0.5, FACTOR = 19 / 81, RETENTION = 0.9;
  const clampD = d => Math.min(10, Math.max(1, d));
  const D0 = g => clampD(W[4] - (g - 3) * W[5]);
  const recall = (t, S) => Math.pow(1 + FACTOR * Math.max(0, t) / S, DECAY);
  const intervalDays = S => Math.max(1, Math.round((S / FACTOR) * (Math.pow(RETENTION, 1 / DECAY) - 1)));
  function fsrs(m, g, t) {
    if (!m) return { S: W[g - 1], D: D0(g) };
    const r = recall(t, m.S);
    const D = clampD(W[7] * D0(3) + (1 - W[7]) * (m.D - W[6] * (g - 3)));
    let S;
    if (g === 1) {
      S = Math.min(m.S, W[11] * Math.pow(m.D, -W[12]) * (Math.pow(m.S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)));
    } else {
      S = m.S * (Math.exp(W[8]) * (11 - m.D) * Math.pow(m.S, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1)
        * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1) + 1);
    }
    return { S: Math.max(0.1, S), D };
  }

  // ====================================================================== progress store
  // cards: { id: { n, r, w, streak, lapses, S, D, day, due, last, h:[1,0..], prev } }
  // days: { date: { n, c } }   confusions: { "refA|refB": count }   match: { key: bestSeconds }
  const PROGRESS = loadProgress();
  function loadProgress() {
    const p = store.get('progress', null) || { cards: {}, days: {} };
    if (!p.cards) p.cards = {};
    if (!p.days) p.days = {};
    p.confusions = p.confusions || {};
    p.match = p.match || {};
    if (p.v !== 4) {   // older versions: rebuild the memory fields from the answer history
      const old = store.get('stats', {});
      for (const [k, s] of Object.entries(old)) if (!p.cards[k]) p.cards[k] = { n: s.right + s.wrong, r: s.right, w: s.wrong, h: [s.last] };
      for (const s of Object.values(p.cards)) {
        if (s.S) continue;
        const lastOk = s.h && s.h[s.h.length - 1] === 1;
        s.S = lastOk ? [1, 1, 2, 4, 7, 14][s.box || 1] || 1 : 0.5;
        s.D = 5;
        s.day = s.okDay || (s.last ? dayStr(s.last) : today());
        s.due = lastOk ? addDays(s.day, intervalDays(s.S)) : s.day;
        s.lapses = s.lapses || 0;
        s.streak = s.streak || (lastOk ? 1 : 0);
        delete s.box; delete s.okDay; delete s.prev;
      }
      p.v = 4;
    }
    return p;
  }
  const saveProgress = () => store.set('progress', PROGRESS);
  const cs = c => PROGRESS.cards[c.id];
  // Lab-week quizzes run over several lab days; with a lab day chosen, use that student's own date.
  const WEEKDAY = { tue: 2, wed: 3, thu: 4 };
  const isLabWeek = q => q.start !== q.until;
  function myDate(q) {
    if (!isLabWeek(q) || !settings.labDay) return q.start;
    for (let d = q.start; d <= q.until; d = addDays(d, 1)) if (new Date(d + 'T12:00:00').getDay() === WEEKDAY[settings.labDay]) return d;
    return q.start;
  }
  const lastDay = q => (isLabWeek(q) && settings.labDay ? myDate(q) : q.until);
  const nextQuizFor = (pageNo, after) => QUIZZES.find(q => myDate(q) > after && q.pages.includes(pageNo));

  // Pass/fail grading: a right answer is "Good" (3), a miss is "Again" (1).
  function record(c, ok) {
    const t = today();
    const s = PROGRESS.cards[c.id] || { n: 0, r: 0, w: 0, streak: 0, lapses: 0, h: [] };
    const { prev, ...before } = s;
    s.prev = s.n ? JSON.parse(JSON.stringify(before)) : null;
    s.n++;
    s.last = Date.now();
    s.h = [...(s.h || []), ok ? 1 : 0].slice(-10);
    if (ok) { s.r++; s.streak++; } else { s.w++; s.streak = 0; if (s.S) s.lapses = (s.lapses || 0) + 1; }
    // Only the first answer of a day changes memory strength; later answers that day are practice.
    if (s.day !== t) {
      const m = s.S ? { S: s.S, D: s.D } : null;
      const nm = fsrs(m, ok ? 3 : 1, s.day ? daysBetween(s.day, t) : 0);
      s.S = nm.S;
      s.D = nm.D;
      s.day = t;
    }
    if (ok) {
      let due = addDays(t, intervalDays(s.S));
      const q = nextQuizFor(c.page.page, t);
      if (q && due >= myDate(q)) due = [addDays(t, 1), addDays(myDate(q), -1)].sort().pop();
      s.due = due;
    } else s.due = t;
    PROGRESS.cards[c.id] = s;
    const d = PROGRESS.days[t] || { n: 0, c: 0 };
    d.n++;
    if (ok) d.c++;
    PROGRESS.days[t] = d;
    saveProgress();
  }
  function undoMiss(c) {   // "I was right" on a typed answer
    const s = cs(c);
    if (!s) return;
    if (s.prev) PROGRESS.cards[c.id] = s.prev; else delete PROGRESS.cards[c.id];
    const d = PROGRESS.days[today()];
    if (d) d.n--;
    record(c, true);
  }
  function confuse(refA, refB) {
    if (!refA || !refB || refA === refB) return;
    const k = [refA, refB].sort().join('|');
    PROGRESS.confusions[k] = (PROGRESS.confusions[k] || 0) + 1;
    saveProgress();
  }
  const lastRight = s => s.h.length && s.h[s.h.length - 1] === 1;
  // new -> learning -> familiar (holds 2+ days) -> mastered (holds 7+ days at 90% recall)
  const stateOf = c => {
    const s = cs(c);
    if (!s || !s.n) return 'new';
    if (!lastRight(s)) return 'learning';
    return s.S >= 7 ? 'mastered' : s.S >= 2 ? 'familiar' : 'learning';
  };
  const isDue = c => { const s = cs(c); return !!s && s.n > 0 && s.due <= today(); };
  const missedLast = c => { const s = cs(c); return !!s && s.n > 0 && !lastRight(s); };
  const recallOn = (c, date) => { const s = cs(c); return s && s.S ? recall(daysBetween(s.day, date), s.S) : 0; };

  function summarize(cards, onDate) {
    const out = { total: cards.length, new: 0, learning: 0, familiar: 0, mastered: 0, due: 0, r: 0, w: 0, rsum: 0 };
    for (const c of cards) {
      out[stateOf(c)]++;
      if (isDue(c)) out.due++;
      const s = cs(c);
      if (s) { out.r += s.r; out.w += s.w; }
      if (onDate) out.rsum += recallOn(c, onDate);
    }
    out.predicted = cards.length ? Math.round((out.rsum / cards.length) * 100) : 0;
    return out;
  }

  // ====================================================================== settings & pools
  const saved = store.get('settings', {});
  const settings = Object.assign({
    pages: [], topics: TOPIC_PRESETS[0].topics.slice(), selectAll: true, mode: 'learn', count: 25,
    filter: 'all', autoscroll: true, matchType: 'names', labDay: null, cramMin: 30,
  }, saved);
  if (saved.kinds && !saved.topics) {   // settings from the deck/question-type version
    const kinds = new Set([...(saved.kinds || []), ...(saved.decks || []).flatMap(d => ({
      SelectALL: ['sa-category', 'sa-indication', 'sa-classification'], EssentialKnowledge: ['ek-kse', 'ek-bw', 'ek-notes'],
      Organisms: ['organism', 'sa-organism'] }[d] || []))]);
    settings.topics = TOPICS.filter(t => t.kinds.some(k => kinds.has(k))).map(t => t.id);
    if (!settings.topics.length) settings.topics = TOPIC_PRESETS[0].topics.slice();
  }
  for (const k of ['kinds', 'decks', 'checkboxes', 'missedOnly']) delete settings[k];
  const saveSettings = () => store.set('settings', settings);

  const topicKinds = () => new Set(TOPICS.filter(t => settings.topics.includes(t.id)).flatMap(t => t.kinds)
    .filter(k => settings.selectAll || !k.startsWith('sa-')));
  function pool(filter = settings.filter) {
    const pages = new Set(settings.pages);
    const kinds = topicKinds();
    const f = { all: () => true, due: isDue, missed: missedLast, new: c => stateOf(c) === 'new' }[filter] || (() => true);
    return ALL.filter(c => pages.has(c.page.page) && kinds.has(c.k) && f(c));
  }
  // Learn order: most-forgotten reviews first, then missed, then new; well-known cards last.
  function learnOrder(cards) {
    const t = today();
    const rank = c => (isDue(c) ? recallOn(c, t) : missedLast(c) ? 1.5 : stateOf(c) === 'new' ? 2 : 3 + recallOn(c, t));
    return shuffle(cards).sort((a, b) => rank(a) - rank(b));
  }
  // Mix question kinds and pages so similar cards are practiced side by side (interleaving).
  const interleave = cards => shuffle(cards);
  function pick(cards, count, mode = settings.mode) {
    const ordered = mode === 'learn' ? learnOrder(cards) : interleave(cards);
    return count ? ordered.slice(0, count) : ordered;
  }

  // ====================================================================== answer options
  function confusedRefs(c) {
    if (c.d.length !== 1) return [];
    const ref = c.page.drugs[c.d[0]].ref;
    return Object.keys(PROGRESS.confusions).filter(k => k.split('|').includes(ref))
      .map(k => k.split('|').find(r => r !== ref));
  }
  function distractors(c) {
    if (c.k === 'ek-which') {   // other drugs on the same page, look-alikes you confused first
      const conf = confusedRefs(c).map(drugByRef).filter(d => d && d.page === c.page).map(d => d.label);
      return uniq([...shuffle(conf), ...shuffle(c.page.drugs.map(d => d.label))]).filter(l => l !== c.a).slice(0, 3);
    }
    const pages = new Set(settings.pages);
    // Answers you have mixed up with this drug come first: they are the comparisons that need practice.
    const confused = confusedRefs(c).map(drugByRef).filter(Boolean)
      .flatMap(d => d.cards.filter(x => x.k === c.k && x.d.length === 1));
    const tiers = [
      confused,
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
    if (c.k.startsWith('sa-') || c.k === 'ek-which') {
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
    if (c.k === 'ek-which') {
      const d = c.page.drugs[c.d[0]];
      return [d.label, d.short, d.generic, ...(d.brandNames || '').split(',')].some(n => n && norm(n) === given);
    }
    return similarity(norm(c.a), given) >= 0.8;
  }

  function recallFormat(c) {
    if (c.items && c.items.length > 1) return 'multi';
    if (c.k === 'ek-which') return 'written';
    return SHORT_KINDS.has(c.k) && c.a.length <= 60 ? 'written' : 'self';
  }
  function formatFor(c, mode) {
    const list = c.items && c.items.length > 1;
    if (mode === 'written') return list ? 'multi' : c.a.length <= 80 ? 'written' : 'self';
    return list ? 'multi' : 'mc';
  }

  // ====================================================================== shared pieces
  // ====================================================================== tap-to-define medical terms
  let GLOSS = new Map();     // lowercased term or alias -> entry
  let glossRe = null;
  const isAbbr = t => /^[A-Z][A-Z0-9]+[a-z]?$/.test(t) && t.length <= 5;   // EPS, SJS, QTc: case must match
  function loadGlossary(list) {
    GLOSS = new Map();
    for (const e of list || []) for (const t of [e.t, ...(e.a || [])]) GLOSS.set(t.toLowerCase().replace(/’/g, "'"), { ...e, abbr: isAbbr(t) ? t : null });
    const keys = [...GLOSS.keys()].sort((a, b) => b.length - a.length)
      .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]").replace(/ /g, '\\s+'));
    glossRe = keys.length ? new RegExp(`(?<![\\w-])(${keys.join('|')})(?![\\w-])`, 'gi') : null;
  }
  // Escapes text and wraps known medical terms in a button that shows a definition.
  function gloss(text) {
    text = String(text ?? '');
    if (!glossRe) return esc(text);
    let out = '', last = 0;
    for (const m of text.matchAll(glossRe)) {
      const e = GLOSS.get(m[0].toLowerCase().replace(/’/g, "'").replace(/\s+/g, ' '));
      if (!e || (e.abbr && m[0] !== e.abbr)) continue;
      out += esc(text.slice(last, m.index)) + `<button type="button" class="term" data-term="${esc(e.t)}">${esc(m[0])}</button>`;
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }
  const glossByTerm = t => [...GLOSS.values()].find(e => e.t === t);
  const termPop = document.createElement('div');
  termPop.className = 'termpop';
  termPop.hidden = true;
  termPop.setAttribute('role', 'dialog');
  document.body.appendChild(termPop);
  function closeTerm() { termPop.hidden = true; }
  function openTerm(btn) {
    const e = glossByTerm(btn.dataset.term);
    if (!e) return;
    const url = `https://vsearch.nlm.nih.gov/vivisimo/cgi-bin/query-meta?v%3Aproject=medlineplus&v%3Asources=medlineplus-bundle&query=${encodeURIComponent(e.t)}`;
    termPop.innerHTML = `<div class="termpop-in"><div class="row spread"><b>${esc(e.t)}</b><button type="button" class="linkbtn" data-term-close aria-label="Close">✕</button></div>
      <p>${esc(e.d)}</p><a href="${url}" target="_blank" rel="noopener">Look it up on MedlinePlus ↗</a></div>`;
    termPop.setAttribute('aria-label', e.t);
    termPop.hidden = false;
    termPop.querySelector('[data-term-close]').onclick = closeTerm;
  }
  // Capture phase, so tapping a term inside a clickable row opens the definition only.
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-term]');
    if (b) { ev.preventDefault(); ev.stopPropagation(); openTerm(b); return; }
    if (!termPop.hidden && !termPop.contains(ev.target)) closeTerm();
  }, true);
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !termPop.hidden) { closeTerm(); ev.stopPropagation(); } }, true);

  function answerHtml(a, c) {
    if (c && c.resolved) {
      return `${esc(a)} <span class="note">— the shared list on ${esc(pageName(c.resolvedFrom))}:</span>
        <ul class="ans-list">${c.resolved.map(x => `<li>${gloss(x)}</li>`).join('')}</ul>`;
    }
    const t = c ? gloss : esc;
    const parts = splitDepth0(a, '; ');
    if (/^\(#1\)/.test(a) && parts.length > 1) {
      return `<ol class="ans-list">${parts.map(p => `<li>${t(p.replace(/^\(#\d+\)\s*/, ''))}</li>`).join('')}</ol>`;
    }
    if (c && c.f === 'EssentialKnowledge' && parts.length > 1) return `<ul class="ans-list">${parts.map(p => `<li>${gloss(p)}</li>`).join('')}</ul>`;
    return t(a);
  }
  const classmates = d => d.page.drugs.filter(x => x.category && x.category === d.category);
  // Essential knowledge in sections. Side effects every drug in the class shares are grayed,
  // so what is specific to this drug stands out.
  function ekHtml(d) {
    const f = d.facts;
    if (!f.kse.length && !f.bw.length && !f.notes.length) return '';
    const mates = classmates(d).filter(x => x !== d);
    const classShared = it => mates.length > 0 && mates.every(m => m.facts.kse.includes(it));
    const qual = it => { const m = it.match(/^(\([^)]*\)) (.*)$/); return m ? [m[1].slice(1, -1), m[2]] : ['', it]; };
    const kse = f.kse.map(it => { const [q, t] = qual(it); return `<li class="${classShared(it) ? 'cls' : 'own'}">${q ? `<span class="qual">${esc(q)}</span> ` : ''}${gloss(t)}</li>`; }).join('');
    const bw = f.bw.map(it => { const [q, t] = qual(it); return `<li>${q ? `<span class="qual">${esc(q)}</span> ` : ''}${gloss(t)}</li>`; }).join('');
    const notes = f.notes.map(it => { const [q, t] = qual(it); return `<li>${q ? `<span class="qual">${esc(q)}</span> ` : ''}${gloss(t)}</li>`; }).join('');
    const anyShared = mates.length && f.kse.some(classShared);
    return `<div class="ekbox">
      ${kse ? `<div class="eksec"><h4>Key side effects</h4><ul class="sechips">${kse}</ul>${anyShared ? `<p class="note">Gray = shared by every ${esc(d.category)} on this page; bold = this drug's own.</p>` : ''}</div>` : ''}
      ${bw ? `<div class="eksec bwsec"><h4>⚠ US boxed warning${f.bw.length > 1 ? 's' : ''}</h4><ul>${bw}</ul></div>` : ''}
      ${notes ? `<div class="eksec"><h4>Other notes</h4><ul>${notes}</ul></div>` : ''}
    </div>`;
  }
  // Which row of the drug's list entry a question kind asks about.
  const ASKED_ROW = {
    brand: 'Brand', generic: 'Generic', category: 'Category', 'sa-category': 'Category', classification: 'Classification',
    'sa-classification': 'Classification', indication: 'Indications', 'sa-indication': 'Indications', organism: 'Activity against', 'sa-organism': 'Activity against',
  };
  const ROW_KEY = { Category: 'cat', Indications: 'ind' };
  function rowCard(p, i, open = false, kind = '') {
    const d = p.drugs[i];
    const rows = [
      ['Category', d.category], ['Generic', d.generic], ['Brand', d.brand],
      ['Classification', d.classification || '—'], ['Indications', d.indication],
    ];
    if (d.activity) rows.push(['Activity against', d.activity]);
    const ek = ekHtml(d);
    const asked = ASKED_ROW[kind];
    return `<dl>${rows.map(([k, v]) => {
      const cls = [ROW_KEY[k] ? `k-${ROW_KEY[k]}` : '', k === asked ? 'asked' : ''].filter(Boolean).join(' ');
      return `<dt${cls ? ` class="${cls}"` : ''}>${k}</dt><dd${cls ? ` class="${cls}"` : ''}>${k === 'Indications' ? gloss(v) : esc(v)}</dd>`;
    }).join('')}</dl>
      ${ek ? `<details${open ? ' open' : ''}><summary>Essential knowledge</summary>${ek}</details>` : ''}`;
  }
  function sourceBlock(c) {
    const ekCard = c.f === 'EssentialKnowledge' || c.k === 'ek-which';
    const rows = c.d.length <= 2 ? c.d.map(i => rowCard(c.page, i, ekCard, c.k)).join('<hr>') : '';
    let cmp = '';
    if (c.d.length === 1) {
      const d = c.page.drugs[c.d[0]];
      const mates = classmates(d);
      const confused = confusedRefs(c);
      const refs = confused.length ? uniq([d.ref, ...confused]).slice(0, 4) : mates.length > 1 ? mates.slice(0, 5).map(x => x.ref) : [];
      if (refs.length > 1) cmp = `<button class="linkbtn" data-compare="${refs.join(',')}">${confused.length ? 'Compare with drugs you mixed up' : `Compare the ${mates.length} drugs in this class`}</button>`;
    } else if (c.d.length > 1 && c.d.length <= 5) {
      cmp = `<button class="linkbtn" data-compare="${c.d.map(i => c.page.drugs[i].ref).join(',')}">Compare these drugs</button>`;
    }
    return `<div class="drug">${rows}${cmp}<div class="src">${dot(c.page)}${esc(pageName(c.page))} · ${esc(c.page.title)}</div></div>`;
  }
  const kindClass = k => (ROW_KEY[ASKED_ROW[k]] ? ` class="k-${ROW_KEY[ASKED_ROW[k]]}"` : '');
  const termLabel = c => `<span class="pchip" style="--pc:${c.page.color}">${esc(pageName(c.page))}</span> <span${kindClass(c.k)}>${esc(KIND_LABEL[c.k] || c.f)}</span>`;

  // ====================================================================== "what you picked" on a wrong answer
  const KIND_NOUN = {
    brand: 'brand name', generic: 'generic name', category: 'drug class', classification: 'classification',
    indication: 'indications', 'ek-kse': 'key side effects', 'ek-bw': 'US boxed warnings', 'ek-notes': 'other notes',
    organism: 'organisms covered',
  };
  const PLURAL_NOUNS = new Set(['indications', 'key side effects', 'US boxed warnings', 'other notes', 'organisms covered']);
  const subjectRef = c => (c.d.length === 1 ? c.page.drugs[c.d[0]].ref : null);
  const drugsByLabel = (label, page) => {
    const all = PAGES.flatMap(p => p.drugs).filter(d => d.label === baseLabel(label));
    return all.filter(d => d.page === page).concat(all.filter(d => d.page !== page));
  };
  const who = ds => ds.slice(0, 3).map(d => `${dot(d.page)}<b>${esc(d.label)}</b> <span class="note">${esc(pageName(d.page))}</span>`).join(', ')
    + (ds.length > 3 ? ` and ${ds.length - 3} more` : '');
  function ownersOfAnswer(c, text) {   // drugs whose card of the same kind has exactly this answer
    const hits = ALL.filter(x => x.k === c.k && x !== c && x.a === text);
    const same = hits.filter(x => x.page === c.page);
    return uniq((same.length ? same : hits).flatMap(x => x.d.map(i => x.page.drugs[i])));
  }
  function ownersOfItem(c, item) {     // drugs that list this item for the same kind of fact
    const hits = ALL.filter(x => x.k === c.k && x !== c && (x.items || [x.a]).includes(item));
    const same = hits.filter(x => x.page === c.page);
    return uniq((same.length ? same : hits).flatMap(x => x.d.map(i => x.page.drugs[i])));
  }
  function fieldOf(d, k) {
    if (k === 'sa-category') return `drug class: ${d.category || '—'}`;
    if (k === 'sa-indication') return `indications: ${d.indication || '—'}`;
    if (k === 'sa-classification') return `classification: ${d.classification || 'Rx only'}`;
    if (k === 'sa-organism') return d.activity ? `activity against: ${d.activity}` : 'no organisms listed';
    return '';
  }
  // Returns { html, refs } explaining where the wrong choice(s) come from.
  function explainWrong(c, picks, track = true) {
    const lines = [];
    const refs = [];
    const subj = subjectRef(c);
    for (const p of picks) {
      if (c.k.startsWith('sa-') || c.k === 'ek-which') {
        const d = drugsByLabel(p, c.page)[0];
        if (!d) continue;
        refs.push(d.ref);
        const extra = c.k === 'ek-which' ? 'does not have this one' : esc(fieldOf(d, c.k));
        lines.push(`${who([d])} — ${extra}`);
        continue;
      }
      const owners = c.items && !/^\(#1\)|; /.test(p) && c.items.length > 1 ? ownersOfItem(c, p) : ownersOfAnswer(c, p);
      if (!owners.length) { lines.push(`“${esc(p)}” is not on the list for this question.`); continue; }
      owners.slice(0, 3).forEach(d => refs.push(d.ref));
      const noun = KIND_NOUN[c.k] || 'answer';
      lines.push(picks.length > 1 || (c.items && c.items.length > 1 && !/; /.test(p))
        ? `“${esc(p)}” belongs to ${who(owners)}`
        : `${PLURAL_NOUNS.has(noun) ? 'Those are' : 'That is'} the ${noun} of ${who(owners)}.`);
    }
    if (!lines.length) return { html: '', refs: [] };
    const cmpRefs = uniq([subj, ...refs].filter(Boolean)).slice(0, 5);
    if (track && subj) refs.slice(0, 3).forEach(r => confuse(subj, r));
    return {
      refs: cmpRefs,
      html: `<div class="whybox"><p class="whyhead">What you picked</p><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>
        ${cmpRefs.length > 1 ? `<button class="linkbtn" data-compare="${cmpRefs.join(',')}">Compare side by side</button>` : ''}</div>`,
    };
  }

  // ====================================================================== question widget
  let active = null;   // the widget that owns keyboard input
  function mountQuestion(el, c, fmt, done, opts = {}) {
    const w = { el, c, fmt, answered: false };
    const head = `<p class="term-label">${termLabel(c)}${opts.tag ? ` <span class="tag">${esc(opts.tag)}</span>` : ''}</p>
      <p class="prompt">${esc(c.q)}</p>`;
    let body = '';
    if (fmt === 'mc') {
      w.options = shuffle([c.a, ...distractors(c)]);
      body = `<div class="options${w.options.some(o => o.length > 60) ? ' long' : ''}" role="group" aria-label="Answer choices">${w.options.map((o, k) =>
        `<button class="opt" data-opt="${k}"><span class="key">${k + 1}</span><span>${answerHtml(o)}</span></button>`).join('')}</div>`;
    } else if (fmt === 'multi') {
      w.options = multiOptions(c);
      body = `<p class="note">Select all that apply (${c.items.length} correct).</p>
        <div class="checks" role="group" aria-label="Select all that apply">${w.options.map((o, k) =>
          `<label class="opt check-opt" data-copt="${k}"><input type="checkbox" value="${k}"><span class="key">${k + 1}</span><span>${esc(o)}</span></label>`).join('')}</div>
        <div class="actions"><button class="primary" data-submit>Check answer</button></div>`;
    } else if (fmt === 'written') {
      body = `<form class="written" data-form><input data-input autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="Type your answer" aria-label="Your answer"><button class="primary">Check</button></form>
        <button class="linkbtn" data-dontknow>I don't know</button>`;
    } else {
      body = `<p class="note">Say or think the answer, then check it.</p><div class="actions"><button class="primary" data-reveal>Show answer <span class="hide-sm"><kbd>Space</kbd></span></button></div>`;
    }
    el.innerHTML = `${head}${body}<div data-feedback aria-live="polite"></div>`;

    const finish = (ok, given, extra = '', why = '') => {
      if (w.answered) return;
      w.answered = true;
      const fb = el.querySelector('[data-feedback]');
      const showAns = !(ok && fmt === 'mc');
      const vtext = opts.guess ? (ok ? 'Correct — good guess' : 'Not this time — here is the answer') : ok ? 'Correct' : 'Not quite';
      fb.innerHTML = `<div class="verdict ${ok ? 'good' : 'bad'}"><span data-vtext>${vtext}</span>${extra}
          ${showAns ? `<div class="ans">${ok ? '' : '<span class="anslabel">Correct answer</span>'}${answerHtml(c.a, c)}</div>` : ''}</div>
        ${why}
        ${sourceBlock(c)}
        ${fmt === 'written' && !ok && given ? '<div class="actions"><button class="secondary" data-override>I was right</button></div>' : ''}
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
        const ok = w.options[k] === c.a;
        finish(ok, w.options[k], '', ok ? '' : explainWrong(c, [w.options[k]], !opts.guess).html);
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
        if (!chosen.length) { el.querySelector('.note').textContent = `Select at least one (${c.items.length} correct).`; return; }
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
        const extras = chosen.filter(o => !correct.has(o));
        finish(ok, chosen.join('; '), ok ? '' : ` <span class="score-inline">${right} of ${correct.size} found${extra ? `, ${extra} extra` : ''}</span>`,
          extras.length ? explainWrong(c, extras, !opts.guess).html : '');
      };
      el.querySelector('[data-submit]').onclick = w.submit;
    } else if (fmt === 'written') {
      const input = el.querySelector('[data-input]');
      if (opts.focus !== false) input.focus({ preventScroll: true });
      const lock = () => {
        input.disabled = true;
        el.querySelector('[data-form] button').disabled = true;
        el.querySelector('[data-dontknow]')?.remove();
      };
      el.querySelector('[data-form]').onsubmit = e => {
        e.preventDefault();
        if (!input.value.trim() || w.answered) return;
        lock();
        const ok = checkWritten(c, input.value);
        let why = '';
        if (!ok) {
          const hit = ALL.find(x => x.k === c.k && x !== c && x.page === c.page && checkWritten(x, input.value));
          if (hit) why = explainWrong(c, [hit.a], !opts.guess).html;
        }
        finish(ok, input.value, '', why);
      };
      el.querySelector('[data-dontknow]').onclick = () => { if (w.answered) return; lock(); finish(false, ''); };
    } else {
      w.reveal = () => {
        const r = el.querySelector('[data-reveal]');
        if (!r) return;
        el.querySelector('.note').remove();
        r.parentElement.innerHTML = `<div class="reveal"><div class="ans">${answerHtml(c.a, c)}</div>
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
  function endSession() {
    if (session && session.io) session.io.disconnect();
    if (session && session.timer) clearInterval(session.timer);
    session = null;
    active = null;
  }
  // Opening Compare from a question pauses the session so "Back" returns to the same screen.
  let paused = null;
  function pauseSession() {
    paused = { session, active, nodes: [...$app.childNodes], y: window.scrollY, at: Date.now(), perf: performance.now(), nav: document.querySelector('.topbar nav .active')?.dataset.go || '' };
    session = null;
    active = null;
  }
  function resumeSession() {
    const P = paused;
    paused = null;
    session = P.session;
    active = P.active;
    if (session && session.kind === 'cram') session.start += Date.now() - P.at;   // time spent comparing is not cram time
    else if (session && typeof session.start === 'number' && session.timer) session.start += performance.now() - P.perf;
    $app.replaceChildren(...P.nodes);
    setNav(P.nav);
    window.scrollTo(0, P.y);
  }
  function dropPaused() {
    if (!paused) return;
    const keep = session;
    session = paused.session;
    endSession();
    session = keep;
    paused = null;
  }
  const backBar = () => paused ? `<div class="backbar"><button class="primary" data-resume-session>← Back to your ${paused.session && paused.session.kind === 'cram' ? 'cram' : 'questions'}</button></div>` : '';
  function go(view, arg) {
    if (view !== 'compare') dropPaused();
    endSession();
    ({ setup: viewSetup, progress: viewProgress, browse: viewBrowse, compare: viewCompare }[view] || viewSetup)(arg);
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
  // any "Compare" link anywhere in the app
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-compare]');
    if (!b) return;
    e.preventDefault();
    if (session && !paused) pauseSession();
    go('compare', b.dataset.compare.split(','));
  });

  // ====================================================================== upcoming quiz + today's plan
  function currentQuiz() {
    const t = today();
    const i = QUIZZES.findIndex(q => lastDay(q) >= t);
    return i < 0 ? null : { q: QUIZZES[i], next: QUIZZES[i + 1] };
  }
  const quizCards = q => { const pages = new Set(q.pages); return ALL.filter(c => pages.has(c.page.page)); };
  function todaysPlan() {
    const due = learnOrder(ALL.filter(isDue));
    const cur = currentQuiz();
    const toQuiz = cur ? daysBetween(today(), myDate(cur.q)) : 99;
    // Up to 20 new cards a day; in the last 2 days before the quiz, every unstudied quiz card.
    const fresh = cur && toQuiz <= 14
      ? shuffle(quizCards(cur.q).filter(c => stateOf(c) === 'new' && TOPIC_PRESETS[0].topics.includes(c.topic))).slice(0, toQuiz <= 2 ? Infinity : NEW_PER_DAY) : [];
    return { due, fresh, cards: [...due.slice(0, 60), ...fresh] };
  }
  function bannerHtml() {
    const cur = currentQuiz();
    const plan = todaysPlan();
    const planHtml = `<div class="plan">
      <div><p class="term-label">Today's plan</p>
      <p class="plan-text">${plan.due.length ? `<b>${plan.due.length}</b> review${plan.due.length === 1 ? '' : 's'} due` : 'No reviews due'}${plan.fresh.length ? ` · <b>${plan.fresh.length}</b> new card${plan.fresh.length === 1 ? '' : 's'} for ${esc(cur.q.label)}` : ''}</p></div>
      <button class="primary" data-plan ${plan.cards.length ? '' : 'disabled'}>${plan.cards.length ? 'Start' : 'All done'}</button></div>`;
    if (!cur) return `<section class="banner">${planHtml}</section>`;
    const { q, next } = cur;
    const t = today();
    const date = myDate(q);
    const quizDay = t >= date ? t : date;
    const s = summarize(quizCards(q), quizDay);
    const days = daysBetween(t, date);
    const range = `${fmtDay(q.start)}–${fmtDay(q.until)}`;
    const mine = isLabWeek(q) && settings.labDay ? ' (your lab day)' : '';
    const when = isLabWeek(q) && !settings.labDay
      ? (t >= q.start ? `This week · ${range}` : `In ${days} days · ${range}`)
      : days <= 0 ? `Today${mine}` : days === 1 ? `Tomorrow · ${fmtDay(date)}${mine}` : `In ${days} days · ${fmtDay(date)}${mine}`;
    const labPick = isLabWeek(q) ? `<div class="labpick"><span class="note">${settings.labDay ? 'Your lab day:' : 'Pick your lab day to count down to your quiz:'}</span>
      ${Object.keys(WEEKDAY).map(k => `<button class="chip" data-labday="${k}" aria-pressed="${settings.labDay === k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>` : '';
    const pages = q.pages.length > 6 ? `All ${q.pages.length} pages` : q.pages.map(n => `<span class="nowrap">${dot(byPage[n])}${esc(pageName(byPage[n]))}</span>`).join(' ');
    return `<section class="banner" aria-label="Upcoming quiz">
      <div class="banner-top">
        <div>
          <p class="term-label">Next BDK quiz · ${esc(q.label)}</p>
          <h2 class="banner-title">${esc(when)}</h2>
          ${labPick}
          <p class="banner-pages">${pages}</p>
          <p class="note">Calculations: ${esc(q.calcs)}</p>
        </div>
        <div class="ring" style="--p:${s.predicted}" role="img" aria-label="Predicted recall on quiz day: ${s.predicted}%"><span>${s.predicted}%</span><small>recall on<br>quiz day</small></div>
      </div>
      ${stackBar(s)}
      <p class="note">${s.mastered} mastered · ${s.familiar} familiar · ${s.learning} learning · ${s.new} not studied, of ${s.total} cards</p>
      ${days <= 1 ? `<div class="actions">
        <button class="primary" data-bq="cram">Cram for this quiz</button>
        <button class="secondary" data-bq="last">Last look</button>
        <button class="secondary" data-bq="learn">Learn</button>
        <button class="secondary" data-bq="match">Match</button>
        <button class="secondary" data-bq="pdf">PDF pages</button>
      </div>
      <p class="note">Quiz ${days <= 0 ? 'today' : 'tomorrow'}: Cram works through the cards you don't know yet; Last look is a one-page list of your weakest cards to read right before the quiz.${days === 1 ? ' If you study tonight, sleep soon after: sleep shortly after learning helps you keep it.' : ''}</p>`
      : `<div class="actions">
        <button class="primary" data-bq="learn">Learn these pages</button>
        <button class="secondary" data-bq="mc">Practice test (25)</button>
        <button class="secondary" data-bq="match">Match</button>
        <button class="secondary" data-bq="pdf">PDF pages</button>
      </div>`}
      ${planHtml}
      ${next ? `<p class="note banner-next">After that: ${esc(next.label)} · ${fmtDay(next.start)} · ${next.pages.length > 6 ? 'cumulative' : next.pages.map(n => esc(pageName(byPage[n]))).join(', ')}</p>` : ''}
    </section>`;
  }
  function wireBanner(root) {
    const cur = currentQuiz();
    root.querySelectorAll('[data-bq]').forEach(b => b.onclick = () => {
      if (b.dataset.bq === 'pdf') return go('browse', { quiz: QUIZZES.indexOf(cur.q), view: 'pdf' });
      const cards = quizCards(cur.q).filter(c => settings.topics.includes(c.topic));
      settings.pages = cur.q.pages.slice();
      saveSettings();
      const mode = b.dataset.bq;
      if (mode === 'learn') startLearn(learnOrder(cards).slice(0, 25));
      else if (mode === 'match') startMatch();
      else if (mode === 'cram') startCram(cards, cur.q);
      else if (mode === 'last') viewLastLook(cur.q);
      else startSession(interleave(cards).slice(0, 25), mode);
    });
    root.querySelectorAll('[data-labday]').forEach(b => b.onclick = () => {
      settings.labDay = settings.labDay === b.dataset.labday ? null : b.dataset.labday;
      saveSettings();
      go('setup');
    });
    const plan = root.querySelector('[data-plan]');
    if (plan) plan.onclick = () => startLearn(todaysPlan().cards, 'Today\'s plan');
  }

  // mastery bar: one hue, light -> dark = not studied -> mastered
  const STATES = [['mastered', 'Mastered'], ['familiar', 'Familiar'], ['learning', 'Learning'], ['new', 'Not studied']];
  function stackBar(s, label = '') {
    return `<div class="stack" role="img" aria-label="${label}${STATES.map(([k, n]) => `${s[k]} ${n.toLowerCase()}`).join(', ')}">${STATES.filter(([k]) => s[k]).map(([k, n]) =>
      `<span class="seg seg-${k}" style="flex:${s[k]}" data-tip="${n}: ${s[k]} of ${s.total} (${pct(s[k], s.total)}%)"></span>`).join('')}</div>`;
  }
  const legend = () => `<div class="legend-row"><span><i class="sw seg-mastered"></i>Mastered (recall holds 7+ days)</span>
    <span><i class="sw seg-familiar"></i>Familiar (2+ days)</span><span><i class="sw seg-learning"></i>Learning</span><span><i class="sw seg-new"></i>Not studied</span></div>`;

  // ====================================================================== Study view
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
        <h2><span class="stepnum">1</span>Pages</h2>
        <div class="row">${QUIZZES.map((q, i) => `<button class="chip${cur && cur.q === q ? ' next' : ''}${lastDay(q) < today() ? ' past' : ''}" data-quiz="${i}">
          ${esc(q.label)} <span class="count">${q.pages.length > 6 ? fmtDay(q.start) : 'p' + q.pages.join(',')}</span></button>`).join('')}</div>
        <div class="row spread" style="margin-top:10px"><span class="note">Or pick pages:</span>
          <div><button class="linkbtn" data-all>All</button><button class="linkbtn" data-none>None</button></div></div>
        ${groups.map(g => `<div class="group"><div class="group-label"><span class="pdot" style="--pc:${SYSTEM_COLOR[g.sys]}"></span>${esc(SYSTEM_NAME[g.sys])}</div><div class="row">${
          g.pages.map(p => { const s = summarize(p.cards); return `<button class="chip pagechip" style="--pc:${p.color}" data-page="${p.page}" aria-pressed="${selected.has(p.page)}"
            title="${esc(p.title)} · ${s.mastered + s.familiar} of ${s.total} familiar or mastered">${esc(pageName(p))}<span class="mini" style="--m:${pct(s.mastered + s.familiar, s.total)}%"></span></button>`; }).join('')}</div></div>`).join('')}
        <p class="note" style="margin-top:10px">The line under each page grows as its cards become familiar or mastered.</p>
      </div>

      <div class="card" data-topics-card>
        <h2><span class="stepnum">2</span>What to practice</h2>
        <div class="row">${TOPIC_PRESETS.map((p, i) => `<button class="linkbtn preset" data-preset="${i}">${esc(p.label)}</button>`).join('')}</div>
        <div class="row" style="margin-top:6px">${TOPICS.map(t => `<button class="chip" data-topic="${t.id}" aria-pressed="${settings.topics.includes(t.id)}">${esc(t.label)}<span class="count" data-tcount="${t.id}"></span></button>`).join('')}</div>
        <label class="check" style="margin-top:10px"><input type="checkbox" data-selectall ${settings.selectAll ? 'checked' : ''}>
          Include “Select ALL drugs with…” questions</label>
        <p class="note" data-topic-hint></p>
      </div>

      <div class="card">
        <h2><span class="stepnum">3</span>How</h2>
        <div class="seg" data-seg="mode">${MODES.map(m => `<button data-val="${m.id}" aria-pressed="${settings.mode === m.id}">${m.label}</button>`).join('')}</div>
        <p class="note" data-modehint style="margin-top:8px"></p>
        <div data-nonmatch>
          <h2 style="margin-top:16px">Which cards</h2>
          <div class="seg" data-seg="filter">${FILTERS.map(f => `<button data-val="${f.id}" aria-pressed="${settings.filter === f.id}">${f.label}<span class="count" data-fcount="${f.id}"></span></button>`).join('')}</div>
          <h2 style="margin-top:16px" data-countlabel>How many</h2>
          <div class="seg" data-seg="count">${COUNTS.map(c => `<button data-val="${c}" aria-pressed="${settings.count === c}">${c || 'All'}</button>`).join('')}</div>
          <label class="check" data-autoscroll-row style="margin-top:10px"><input type="checkbox" data-autoscroll ${settings.autoscroll ? 'checked' : ''}> Jump to the next question after answering</label>
        </div>
        <div data-cramonly>
          <h2 style="margin-top:16px">Time you have</h2>
          <div class="seg" data-seg="cramMin">${[15, 30, 60, 90].map(m => `<button data-val="${m}" aria-pressed="${settings.cramMin === m}">${m} min</button>`).join('')}</div>
        </div>
        <div data-matchonly>
          <h2 style="margin-top:16px">Pairs</h2>
          <div class="seg" data-seg="matchType">${MATCH_TYPES.map(m => `<button data-val="${m.id}" aria-pressed="${settings.matchType === m.id}">${m.label}</button>`).join('')}</div>
          <p class="note" data-best></p>
        </div>
      </div>

      <div class="startbar">
        <span class="note" data-avail></span>
        <button class="primary" data-start>Start</button>
      </div>`;

    wireBanner($app);
    const refresh = () => {
      const isMatch = settings.mode === 'match';
      $app.querySelector('[data-topics-card]').hidden = isMatch;
      const isCram = settings.mode === 'cram';
      $app.querySelector('[data-nonmatch]').hidden = isMatch || isCram;
      $app.querySelector('[data-cramonly]').hidden = !isCram;
      $app.querySelector('[data-matchonly]').hidden = !isMatch;
      $app.querySelector('[data-autoscroll-row]').hidden = settings.mode !== 'scroll';
      $app.querySelector('[data-modehint]').textContent = MODES.find(m => m.id === settings.mode).hint;
      $app.querySelector('[data-countlabel]').textContent = settings.mode === 'learn' ? 'Cards per Learn session' : 'Number of questions';
      const pages = new Set(settings.pages);
      const inPages = ALL.filter(c => pages.has(c.page.page));
      for (const t of TOPICS) {
        const n = inPages.filter(c => c.topic === t.id && (settings.selectAll || !c.k.startsWith('sa-'))).length;
        const el = $app.querySelector(`[data-tcount="${t.id}"]`);
        el.textContent = n;
        el.closest('.chip').classList.toggle('empty', !n);
      }
      for (const f of FILTERS) $app.querySelector(`[data-fcount="${f.id}"]`).textContent = ` ${pool(f.id).length}`;
      const preset = TOPIC_PRESETS.find(p => p.topics.length === settings.topics.length && p.topics.every(t => settings.topics.includes(t)));
      $app.querySelector('[data-topic-hint]').textContent = preset && preset.hint ? preset.hint : '';
      $app.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('on', TOPIC_PRESETS[+b.dataset.preset] === preset));
      const start = $app.querySelector('[data-start]');
      if (isCram) {
        const plan = cramPlan(pool('all'));
        $app.querySelector('[data-avail]').textContent = !settings.pages.length ? 'Pick at least one page'
          : plan.cards.length ? `${plan.cards.length} cards in ~${settings.cramMin} min${plan.skipped ? ` · skips ${plan.skipped} you know well` : ''}` : 'You know every card here well';
        start.disabled = !plan.cards.length;
        return;
      }
      if (isMatch) {
        const drugs = matchCandidates();
        const best = PROGRESS.match[matchKey()];
        $app.querySelector('[data-best]').textContent = best ? `Best time for these pages: ${best.toFixed(1)} s` : '';
        $app.querySelector('[data-avail]').textContent = !settings.pages.length ? 'Pick at least one page'
          : drugs.length >= 3 ? `${Math.min(6, drugs.length)} pairs per board, from ${drugs.length} drugs` : 'Not enough drugs with this pair type';
        start.disabled = drugs.length < 3;
        return;
      }
      const n = pool().length;
      const shown = settings.count ? Math.min(n, settings.count) : n;
      const unit = settings.mode === 'learn' ? 'cards to learn' : 'questions';
      $app.querySelector('[data-avail]').textContent = !settings.pages.length ? 'Pick at least one page'
        : !settings.topics.length ? 'Pick at least one topic'
          : n ? `${shown} ${unit} (of ${n})` : settings.filter === 'due' ? 'Nothing due on these pages' : 'No cards match';
      start.disabled = !n;
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
    const setTopics = ids => {
      settings.topics = ids;
      saveSettings();
      $app.querySelectorAll('[data-topic]').forEach(b => b.setAttribute('aria-pressed', ids.includes(b.dataset.topic)));
      refresh();
    };
    $app.querySelectorAll('[data-topic]').forEach(b => b.onclick = () => {
      const id = b.dataset.topic;
      setTopics(settings.topics.includes(id) ? settings.topics.filter(x => x !== id) : [...settings.topics, id]);
    });
    $app.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => setTopics(TOPIC_PRESETS[+b.dataset.preset].topics.slice()));
    $app.querySelector('[data-selectall]').onchange = e => { settings.selectAll = e.target.checked; saveSettings(); refresh(); };
    $app.querySelector('[data-autoscroll]').onchange = e => { settings.autoscroll = e.target.checked; saveSettings(); };
    $app.querySelectorAll('[data-seg]').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => {
      const key = seg.dataset.seg;
      settings[key] = key === 'count' || key === 'cramMin' ? +b.dataset.val : b.dataset.val;
      seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      saveSettings(); refresh();
    }));
    $app.querySelector('[data-start]').onclick = () => {
      if (settings.mode === 'match') return startMatch();
      if (settings.mode === 'cram') { const cur = currentQuiz(); return startCram(pool('all'), cur && cur.q.pages.every(n => settings.pages.includes(n)) ? cur.q : null); }
      const cards = pick(pool(), settings.count);
      settings.mode === 'learn' ? startLearn(cards) : startSession(cards, settings.mode);
    };
    refresh();
  }

  // ====================================================================== Test / Written / Flashcards
  function startSession(cards, mode) {
    endSession();
    if (!cards.length) return go('setup');
    if (mode === 'scroll') return startScroll(cards);
    if (mode === 'learn') return startLearn(cards);
    if (mode === 'match') return startMatch();
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
    active = mountQuestion($app.querySelector('[data-q]'), c, formatFor(c, session.mode), (ok, given) => {
      session.results.push({ c, ok, given });
      record(c, ok);
      const after = $app.querySelector('[data-after]');
      after.innerHTML = `<div class="actions"><button class="primary" data-next>Next <span class="hide-sm"><kbd>Enter</kbd></span></button></div>`;
      const next = after.querySelector('[data-next]');
      next.focus({ preventScroll: true });
      next.onclick = () => { session.i++; renderClassic(); window.scrollTo(0, 0); };
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
          <div class="face back"><div class="big">${answerHtml(c.a, c)}</div>${sourceBlock(c)}</div>
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
    card.onclick = e => { if (!e.target.closest('summary, button')) flip(); };
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
        <div class="qmeta"><span data-sh-count>0 of ${cards.length} answered</span><span data-sh-right>0 correct</span>
          <button class="linkbtn" data-quit>Finish</button></div>
        <div class="progress"><div data-sh-bar style="width:0%"></div></div>
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
        const w = mountQuestion(li, c, formatFor(c, 'scroll'), ok => {
          session.results.push({ c, ok, given: '' });
          record(c, ok);
          li.classList.add(ok ? 'done-good' : 'done-bad');
          update();
          const nextLi = feed.querySelector(`[data-idx="${i + 1}"]`);
          if (nextLi && settings.autoscroll) setTimeout(() => nextLi.scrollIntoView({ behavior: 'smooth', block: 'start' }), ok ? 450 : 1400);
          if (nextLi) active = nextLi.widget;
        }, { focus: false });
        li.widget = w;
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
  // Successive relearning: a new card must be answered right 3 times in the session
  // (multiple choice, then recall twice, spaced apart by other cards); a card you already
  // know needs one recall. A miss sends the card back to multiple choice later in the round.
  function startLearn(cards, title = 'Learn') {
    endSession();
    if (!cards.length) return go('setup');
    session = {
      kind: 'learn', title, cards: uniq(cards), waiting: uniq(cards), work: [], step: new Map(), plan: new Map(), need: new Map(), hw: new Map(),
      missed: new Set(), round: 1, inRound: 0, roundLog: [], history: [], results: [], done: new Set(),
    };
    fillWork();
    renderLearn();
  }
  function planFor(c) {
    const st = stateOf(c);
    return st === 'familiar' || st === 'mastered' ? ['recall'] : ['mc', 'recall', 'recall'];
  }
  function fillWork() {
    const L = session;
    while (L.work.length < ROUND && L.waiting.length) {
      const c = L.waiting.shift();
      L.work.push(c);
      L.plan.set(c, planFor(c));
      L.need.set(c, L.plan.get(c).length);
      L.step.set(c, 0);
    }
  }
  // Progress credits every right answer toward each card's finish and never moves backward;
  // a miss shows up in "to redo" instead of shrinking the bar.
  function learnCounts() {
    const L = session;
    let started = 0, credit = 0;
    for (const c of L.cards) {
      if (L.done.has(c)) { credit += 1; continue; }
      const hw = L.hw.get(c) || 0;
      if (hw > 0) started++;
      if (L.need.has(c)) credit += Math.min(hw, L.need.get(c) - 1) / L.need.get(c);
    }
    const redo = [...L.missed].filter(c => !L.done.has(c)).length;
    return { done: L.done.size, started, remaining: L.cards.length - L.done.size - started, redo, pct: (credit / L.cards.length) * 100 };
  }
  function learnBar() {
    const n = learnCounts();
    return `<div class="learnbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(n.pct)}" aria-label="Session progress">
      <div class="progress"><div style="width:${n.pct.toFixed(1)}%"></div></div>
      <div class="qmeta"><span>${n.done} done</span><span>${n.started} in progress</span><span>${n.remaining} to go</span>${n.redo ? `<span class="redo">${n.redo} to redo</span>` : ''}</div></div>`;
  }
  function nextLearnCard() {
    const L = session;
    const recent = L.history.slice(-2);
    let options = L.work.filter(c => !recent.includes(c));
    if (!options.length) options = L.work.filter(c => c !== recent[recent.length - 1]);
    if (!options.length) options = L.work;
    const minStep = Math.min(...options.map(c => L.step.get(c)));
    const low = options.filter(c => L.step.get(c) === minStep);
    return low[Math.floor(Math.random() * low.length)];
  }
  function renderLearn() {
    const L = session;
    setNav('');
    if (!L.work.length) return learnDone();
    if (L.inRound >= ROUND) return learnRoundSummary();
    const c = nextLearnCard();
    L.history.push(c);
    const plan = L.plan.get(c);
    const step = L.step.get(c);
    const kind = plan[step];
    const fmt = kind === 'mc' ? 'mc' : recallFormat(c);
    const tag = kind === 'mc' ? 'Multiple choice' : fmt === 'multi' ? 'Recall · select all' : fmt === 'written' ? 'Recall · type it' : 'Recall · check yourself';
    $app.innerHTML = `<div class="learnhead"><span class="term-label">${esc(L.title)} · round ${L.round}</span>${learnBar()}</div>
      <div class="card" data-q></div>
      <div class="actions"><button class="secondary" data-quit>End session</button></div>`;
    $app.querySelector('[data-quit]').onclick = learnDone;
    const advance = ok => {
      if (ok) {
        L.hw.set(c, Math.max(L.hw.get(c) || 0, step + 1));
        L.step.set(c, step + 1);
        if (step + 1 >= plan.length) { L.done.add(c); L.work = L.work.filter(x => x !== c); fillWork(); }
      } else {
        L.plan.set(c, ['mc', 'recall', 'recall']);
        L.step.set(c, 0);
        L.missed.add(c);
      }
    };
    active = mountQuestion($app.querySelector('[data-q]'), c, fmt, (ok, given) => {
      record(c, ok);
      L.results.push({ c, ok, given });
      L.roundLog.push({ c, ok });
      L.inRound++;
      advance(ok);
      const left = plan.length - step - 1;
      const msg = ok ? (left <= 0 ? 'Done for this session.' : `Right. ${left} more recall${left === 1 ? '' : 's'} later in the session.`)
        : 'This card comes back later, starting with multiple choice.';
      const after = $app.querySelector('[data-after]');
      after.innerHTML = `<p class="note" data-learnmsg>${msg}</p><div class="actions"><button class="primary" data-next>Continue <span class="hide-sm"><kbd>Enter</kbd></span></button></div>`;
      const next = after.querySelector('[data-next]');
      next.focus({ preventScroll: true });
      next.onclick = () => { renderLearn(); window.scrollTo(0, 0); };
      active.next = () => next.click();
    }, {
      tag,
      onOverride: () => {
        undoMiss(c);
        L.missed.delete(c);
        L.results[L.results.length - 1].ok = true;
        L.roundLog[L.roundLog.length - 1].ok = true;
        L.plan.set(c, plan);
        L.step.set(c, step);
        if (!L.work.includes(c)) L.work.push(c);
        advance(true);
        const left = plan.length - step - 1;
        const m = $app.querySelector('[data-learnmsg]');
        if (m) m.textContent = left <= 0 ? 'Done for this session.' : `Counted. ${left} more recall${left === 1 ? '' : 's'} later in the session.`;
      },
    });
  }
  function learnRoundSummary() {
    const L = session;
    const misses = uniq(L.roundLog.filter(r => !r.ok).map(r => r.c));
    const right = L.roundLog.filter(r => r.ok).length;
    $app.innerHTML = `<div class="card">
        <p class="term-label">Round ${L.round} complete</p>
        <p class="score">${right} / ${L.roundLog.length}</p>
        ${learnBar()}
        ${misses.length ? `<h2 style="margin-top:16px">Look these over before the next round</h2><ul class="missed">${misses.map(c => `
          <li><div class="q">${esc(c.q)}</div><div class="right">${answerHtml(c.a, c)}</div></li>`).join('')}</ul>`
          : '<p class="note">No misses this round.</p>'}
        <div class="actions"><button class="primary" data-cont>Continue to round ${L.round + 1} <span class="hide-sm"><kbd>Enter</kbd></span></button>
          <button class="secondary" data-quit>End session</button></div></div>`;
    const cont = $app.querySelector('[data-cont]');
    cont.focus({ preventScroll: true });
    cont.onclick = () => { L.round++; L.inRound = 0; L.roundLog = []; renderLearn(); };
    $app.querySelector('[data-quit]').onclick = learnDone;
    active = { next: () => cont.click() };
    window.scrollTo(0, 0);
  }
  function learnDone() {
    const L = session;
    const firstTry = new Map();
    for (const r of L.results) if (!firstTry.has(r.c)) firstTry.set(r.c, r.ok);
    const firstRight = [...firstTry.values()].filter(Boolean).length;
    const hard = [...L.missed];
    active = null;
    $app.innerHTML = `<div class="card">
        <p class="term-label">${esc(L.title)} ${L.work.length ? 'paused' : 'complete'}</p>
        <p class="score">${L.done.size} / ${L.cards.length}</p>
        <p class="note">cards finished · ${firstRight} of ${firstTry.size} right on the first try · ${L.results.length} answers</p>
        ${learnBar()}
        <div class="actions">
          ${L.work.length ? '<button class="primary" data-resume>Keep going</button>' : ''}
          ${hard.length ? `<button class="${L.work.length ? 'secondary' : 'primary'}" data-hard>Learn the ${hard.length} I missed again</button>` : ''}
          <button class="secondary" data-progress>See progress</button>
          <button class="secondary" data-setup>Back to Study</button>
        </div>
        <p class="note">Each card's next review is scheduled from today's answers. Come back when “Today's plan” lists reviews: recalling a card again on a later day is what makes it stick.</p>
      </div>
      ${hard.length ? `<div class="card"><h2>Missed at least once (${hard.length})</h2><ul class="missed">${hard.map(c => `
        <li><div class="q">${esc(c.q)}</div><div class="right">${answerHtml(c.a)}</div></li>`).join('')}</ul></div>` : ''}`;
    const resume = $app.querySelector('[data-resume]');
    if (resume) resume.onclick = () => { L.inRound = 0; L.roundLog = []; renderLearn(); };
    const hb = $app.querySelector('[data-hard]');
    if (hb) hb.onclick = () => startLearn(shuffle(hard), 'Missed cards');
    $app.querySelector('[data-progress]').onclick = () => go('progress');
    $app.querySelector('[data-setup]').onclick = () => go('setup');
    window.scrollTo(0, 0);
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
          <div class="right">Answer: ${answerHtml(r.c.a, r.c)}</div></li>`).join('')}</ul></div>` : ''}`;
    const retry = $app.querySelector('[data-retry]');
    if (retry) retry.onclick = () => startLearn(shuffle(missed.map(r => r.c)), 'Missed cards');
    $app.querySelector('[data-again]').onclick = () => {
      const cards = pick(pool(), settings.count, mode);
      cards.length ? startSession(cards, mode) : go('setup');
    };
    $app.querySelector('[data-setup]').onclick = () => go('setup');
    window.scrollTo(0, 0);
  }
  function barRow(label, r, n, extra = '') {
    const p = pct(r, n);
    return `<div class="barrow"><span class="bl">${esc(label)}</span>
      <span class="bt"><span class="bf" style="width:${Math.max(p, 1)}%" data-tip="${esc(label)}: ${r} of ${n} correct (${p}%)"></span></span>
      <span class="bv">${p}% <small>of ${n}</small></span>${extra}</div>`;
  }

  // ====================================================================== Cram mode
  // For a quiz within hours: restudy helps more than testing at very short delays, and spacing
  // repetitions apart within the session (one big stack) beats short gaps. So: skip cards that
  // are already strong, show each unfamiliar card once, then test it at growing gaps.
  const CRAM_SECONDS_PER_CARD = 30;   // about three short exposures per card
  function cramPlan(cards, quizDate) {
    const t = today();
    const date = quizDate || t;
    const strong = c => recallOn(c, date) >= 0.9 && !missedLast(c);
    const weak = cards.filter(c => !strong(c));
    const rank = c => (missedLast(c) ? 0 : stateOf(c) === 'new' ? 1 : 2) + recallOn(c, date);
    const ordered = shuffle(weak).sort((a, b) => rank(a) - rank(b));
    const fit = Math.max(5, Math.floor((settings.cramMin * 60) / CRAM_SECONDS_PER_CARD));
    return { cards: ordered.slice(0, fit), skipped: cards.length - weak.length, more: Math.max(0, ordered.length - fit) };
  }
  function startCram(cards, quiz) {
    endSession();
    const plan = cramPlan(cards, quiz ? myDate(quiz) : null);
    if (!plan.cards.length) return go('setup');
    const queue = plan.cards.map(c => {
      const look = stateOf(c) === 'new' || missedLast(c);
      return { c, phase: look ? 'look' : 'test', wins: 0, tests: 0, need: (look ? 1 : 0) + 2, hw: 0, looked: false };
    });
    session = { kind: 'cram', mode: 'cram', queue, items: queue.slice(), total: queue.length, done: 0, missed: new Set(), results: [], quiz,
      start: Date.now(), budget: settings.cramMin * 60 * 1000, skipped: plan.skipped, more: plan.more };
    renderCram();
  }
  function cramInsert(item, lag) {
    const Q = session.queue;
    Q.splice(Math.min(lag, Q.length), 0, item);
  }
  function cramHead() {
    const S = session;
    const left = Math.max(0, Math.round((S.budget - (Date.now() - S.start)) / 60000));
    const credit = S.items.reduce((a, i) => a + Math.min(i.hw, i.need) / i.need, 0);
    const redo = S.items.filter(i => S.missed.has(i.c) && i.wins < 2).length;
    return `<div class="qmeta"><span>${S.done} of ${S.total} done${redo ? ` · <span class="redo">${redo} to redo</span>` : ''}</span><span>${left} min left</span><button class="linkbtn" data-quit>Finish</button></div>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round((credit / S.total) * 100)}" aria-label="Cram progress"><div style="width:${((credit / S.total) * 100).toFixed(1)}%"></div></div>`;
  }
  function renderCram() {
    const S = session;
    setNav('');
    if (!S.queue.length || Date.now() - S.start > S.budget + 60000) return cramDone();
    const item = S.queue.shift();
    const c = item.c;
    if (item.phase === 'look') {
      // Guess first: trying to answer before seeing it helps the answer stick, even when the guess is wrong.
      // A guess is not graded: it does not change memory strength or count as a miss.
      $app.innerHTML = `${cramHead()}<div class="card" data-q></div>`;
      $app.querySelector('[data-quit]').onclick = cramDone;
      const q = $app.querySelector('[data-q]');
      active = mountQuestion(q, c, c.items && c.items.length > 1 ? 'multi' : 'mc', ok => {
        item.phase = 'test'; item.looked = true; item.hw = Math.max(item.hw, 1);
        const after = q.querySelector('[data-after]');
        after.innerHTML = `<p class="note">${ok ? 'Nice.' : 'A wrong guess is fine: it does not count against you.'} You get tested on this in a few cards.</p>
          <div class="actions"><button class="primary" data-next>Continue <span class="hide-sm"><kbd>Enter</kbd></span></button></div>`;
        const next = after.querySelector('[data-next]');
        next.focus({ preventScroll: true });
        next.onclick = () => { cramInsert(item, 3); renderCram(); window.scrollTo(0, 0); };
        active.next = () => next.click();
      }, { tag: 'Guess first', guess: true });
      const note = document.createElement('p');
      note.className = 'note guessnote';
      note.textContent = 'You have not studied this card yet. Guess anyway, then read the answer.';
      q.querySelector('.prompt').after(note);
      return;
    }
    const fmt = item.tests === 0 && !(c.items && c.items.length > 1) ? 'mc' : recallFormat(c);
    $app.innerHTML = `${cramHead()}<div class="card" data-q></div>`;
    $app.querySelector('[data-quit]').onclick = cramDone;
    active = mountQuestion($app.querySelector('[data-q]'), c, fmt, (ok, given) => {
      record(c, ok);
      S.results.push({ c, ok, given });
      item.tests++;
      if (ok) {
        item.wins++;
        item.hw = Math.max(item.hw, (item.looked ? 1 : 0) + item.wins);
        if (item.wins >= 2) { S.done++; item.hw = item.need; }
        else cramInsert(item, 8);           // second check after a longer gap
      } else {
        S.missed.add(c);
        item.wins = 0;
        cramInsert(item, 3);                // back soon
      }
      const after = $app.querySelector('[data-after]');
      after.innerHTML = `<p class="note">${ok ? (item.wins >= 2 ? 'Done.' : 'Right. One more check later.') : 'It comes back in a few cards.'}</p>
        <div class="actions"><button class="primary" data-next>Continue <span class="hide-sm"><kbd>Enter</kbd></span></button></div>`;
      const next = after.querySelector('[data-next]');
      next.focus({ preventScroll: true });
      next.onclick = () => { renderCram(); window.scrollTo(0, 0); };
      active.next = () => next.click();
    }, { tag: item.tests === 0 ? 'Quick check' : 'Recall', onOverride: () => { undoMiss(c); S.missed.delete(c); } });
  }
  function cramDone() {
    const S = session;
    active = null;
    store.set('lastCram', [...S.missed].map(c => c.id));
    const left = S.queue.filter(i => i.wins < 2).length;
    $app.innerHTML = `<div class="card">
      <p class="term-label">Cram ${left ? 'stopped' : 'complete'}</p>
      <p class="score">${S.done} / ${S.total}</p>
      <p class="note">cards done · ${S.missed.size} missed at least once${S.skipped ? ` · ${S.skipped} skipped because you know them well` : ''}${S.more ? ` · ${S.more} more weak cards did not fit the time` : ''}</p>
      <div class="actions">
        <button class="primary" data-last>Last look (${S.missed.size + left} cards)</button>
        ${left ? '<button class="secondary" data-resume>Keep going</button>' : ''}
        <button class="secondary" data-setup>Back to Study</button>
      </div>
      <p class="note">Right before the quiz, read the last-look sheet once: at very short delays, rereading helps as much as testing. ${S.quiz && daysBetween(today(), myDate(S.quiz)) === 1 ? 'Then sleep: sleep soon after studying helps you keep what you learned.' : ''}</p></div>`;
    $app.querySelector('[data-last]').onclick = () => viewLastLook(S.quiz, uniq([...S.missed, ...S.queue.filter(i => i.wins < 2).map(i => i.c)]));
    const r = $app.querySelector('[data-resume]');
    if (r) r.onclick = () => { S.start = Date.now(); S.budget = 15 * 60 * 1000; renderCram(); };
    $app.querySelector('[data-setup]').onclick = () => go('setup');
    window.scrollTo(0, 0);
  }
  // One page to read right before the quiz: the cards you missed, then the weakest of the rest.
  function viewLastLook(quiz, firstCards = []) {
    endSession();
    setNav('');
    const pages = quiz ? quiz.pages : settings.pages;
    const date = quiz ? myDate(quiz) : today();
    const fromCram = (store.get('lastCram', []) || []).map(id => byId[id]).filter(Boolean);
    const pinned = uniq([...firstCards, ...fromCram]).filter(c => pages.includes(c.page.page));
    const kinds = topicKinds();
    const rest = ALL.filter(c => pages.includes(c.page.page) && kinds.has(c.k) && !pinned.includes(c))
      .sort((a, b) => recallOn(a, date) - recallOn(b, date)).slice(0, Math.max(0, 40 - pinned.length));
    const list = [...pinned, ...rest];
    const byPg = {};
    list.forEach(c => { (byPg[c.page.page] = byPg[c.page.page] || []).push(c); });
    $app.innerHTML = `<h1>Last look${quiz ? ` · ${esc(quiz.label)}` : ''}</h1>
      <p class="sub">${pinned.length ? `${pinned.length} card${pinned.length === 1 ? '' : 's'} you missed while cramming (marked ●), then` : ''} the cards with the lowest predicted recall on ${fmtDay(date)}. Read each answer once.</p>
      ${Object.keys(byPg).sort((a, b) => a - b).map(n => `<section class="pagetable"><h2 class="pagehead" style="--pc:${byPage[n].color}">${esc(byPage[n].title)} <span class="ed">p${n}</span></h2>
        <div class="card lastlook"><ul class="missed">${byPg[n].map(c => `<li>${pinned.includes(c) ? '<span class="pin">●</span> ' : ''}<div class="q">${esc(c.q)}</div><div class="right">${answerHtml(c.a, c)}</div></li>`).join('')}</ul></div></section>`).join('')}
      <div class="actions"><button class="primary" data-quiz-me>Quiz me on these ${list.length}</button><button class="secondary" data-setup>Back to Study</button></div>`;
    $app.querySelector('[data-quiz-me]').onclick = () => startSession(interleave(list), 'mc');
    $app.querySelector('[data-setup]').onclick = () => go('setup');
    window.scrollTo(0, 0);
  }

  // ====================================================================== Match game
  const matchKey = () => `${settings.matchType}|${settings.pages.slice().sort((a, b) => a - b).join(',')}`;
  function matchPair(d) {
    if (settings.matchType === 'names') return d.brandNames ? [d.short, d.brandNames] : null;
    if (settings.matchType === 'class') return d.category && d.category !== 'See individual drug components' ? [d.label, d.category] : null;
    return d.indication && !d.indication.startsWith('See individual') ? [d.label, d.indication] : null;
  }
  function matchCandidates() {
    const pages = new Set(settings.pages);
    return PAGES.filter(p => pages.has(p.page)).flatMap(p => p.drugs).filter(matchPair);
  }
  function startMatch() {
    endSession();
    const cands = shuffle(matchCandidates());
    // 6 pairs, no two sharing a left or right text (so every pair is unambiguous)
    const board = [];
    const L = new Set(), R = new Set();
    for (const d of cands) {
      const [l, r] = matchPair(d);
      if (L.has(norm(l)) || R.has(norm(r))) continue;
      L.add(norm(l)); R.add(norm(r));
      board.push(d);
      if (board.length === 6) break;
    }
    if (board.length < 3) return go('setup');
    const tiles = shuffle(board.flatMap((d, k) => { const [l, r] = matchPair(d); return [{ k, side: 'l', text: l, d }, { k, side: 'r', text: r, d }]; }));
    session = { kind: 'match', tiles, left: board.length, penalty: 0, misses: [], start: performance.now(), sel: null };
    setNav('');
    $app.innerHTML = `<div class="matchhead">
        <span class="term-label">Match · ${esc(MATCH_TYPES.find(m => m.id === settings.matchType).label)}</span>
        <span class="timer" data-timer aria-live="off">0.0 s</span>
        <button class="linkbtn" data-quit>End</button></div>
      <p class="note">Tap a drug, then its partner. A wrong pair adds 1 second.</p>
      <div class="tiles-grid${settings.matchType === 'ind' ? ' wide' : ''}">${tiles.map((t, i) =>
        `<button class="tile-btn" data-tile="${i}" style="--pc:${t.d.page.color}">${esc(t.text)}</button>`).join('')}</div>`;
    const timerEl = $app.querySelector('[data-timer]');
    const elapsed = () => (performance.now() - session.start) / 1000 + session.penalty;
    session.timer = setInterval(() => { timerEl.textContent = `${elapsed().toFixed(1)} s`; }, 100);
    $app.querySelector('[data-quit]').onclick = () => go('setup');
    $app.querySelectorAll('[data-tile]').forEach(b => b.onclick = () => {
      const S = session;
      const i = +b.dataset.tile;
      const t = S.tiles[i];
      if (t.gone) return;
      if (S.sel === null) { S.sel = i; b.classList.add('sel'); return; }
      if (S.sel === i) { S.sel = null; b.classList.remove('sel'); return; }
      const a = S.tiles[S.sel];
      const ba = $app.querySelector(`[data-tile="${S.sel}"]`);
      S.sel = null;
      ba.classList.remove('sel');
      if (a.k === t.k && a.side !== t.side) {
        a.gone = t.gone = true;
        [ba, b].forEach(x => { x.classList.add('gone'); x.disabled = true; });
        if (--S.left === 0) matchDone(elapsed());
      } else {
        S.penalty += 1;
        if (a.side !== t.side) { S.misses.push([a.d, t.d]); confuse(a.d.ref, t.d.ref); }
        [ba, b].forEach(x => { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 450); });
      }
    });
  }
  function matchDone(secs) {
    const S = session;
    clearInterval(S.timer);
    const key = matchKey();
    const best = PROGRESS.match[key];
    const isBest = !best || secs < best;
    if (isBest) { PROGRESS.match[key] = +secs.toFixed(1); saveProgress(); }
    const mixed = uniq(S.misses.map(([a, b]) => [a.ref, b.ref].sort().join(','))).map(k => k.split(',').map(drugByRef));
    $app.innerHTML = `<div class="card">
      <p class="term-label">Match complete</p>
      <p class="score">${secs.toFixed(1)} s</p>
      <p class="note">${isBest ? (best ? `New best (previous ${best.toFixed(1)} s)` : 'First time on these pages') : `Best: ${best.toFixed(1)} s`} · ${S.penalty} wrong pair${S.penalty === 1 ? '' : 's'} (+${S.penalty} s)</p>
      ${mixed.length ? `<h2 style="margin-top:14px">Mixed up</h2><ul class="missed">${mixed.map(([a, b]) => `<li>
        <div class="q">${dot(a.page)}${esc(a.label)} ↔ ${dot(b.page)}${esc(b.label)}</div>
        <button class="linkbtn" data-compare="${a.ref},${b.ref}">Compare side by side</button></li>`).join('')}</ul>` : ''}
      <div class="actions"><button class="primary" data-again>Play again</button><button class="secondary" data-setup>Back to Study</button></div></div>`;
    $app.querySelector('[data-again]').onclick = startMatch;
    $app.querySelector('[data-setup]').onclick = () => go('setup');
    session.timer = null;
  }

  // ====================================================================== Compare view
  const COMPARE_ROWS = [
    ['cat', 'Drug class'], ['brand', 'Brand'], ['cls', 'Rx / OTC / schedule'], ['ind', 'Indications'],
    ['kse', 'Key side effects'], ['bw', 'US boxed warnings'], ['notes', 'Other notes'], ['org', 'Activity against'],
  ];
  function factList(d, key) {
    if (key === 'brand') return d.brand && d.brand !== '---' ? [d.brand] : [];
    if (key === 'cat') return d.facts.cat ? [d.facts.cat] : [];
    if (key === 'cls') return d.facts.cls.length ? d.facts.cls : ['Rx only'];
    return d.facts[key] || [];
  }
  let compareSel = [];
  function viewCompare(refs) {
    setNav('compare');
    if (refs) compareSel = refs.filter(drugByRef).slice(0, 5);
    const sel = compareSel.map(drugByRef);
    const cur = currentQuiz();
    const pickPage = byPage[store.get('comparePage', cur ? cur.q.pages[0] : 2)] || PAGES[0];
    const classes = [];
    for (const d of pickPage.drugs) {
      if (!d.category || d.category === 'See individual drug components') continue;
      let g = classes.find(x => x.name === d.category);
      if (!g) classes.push(g = { name: d.category, drugs: [] });
      g.drugs.push(d);
    }
    const confusions = Object.entries(PROGRESS.confusions).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([k, n]) => ({ refs: k.split('|'), n })).filter(x => x.refs.every(drugByRef));

    let table = '';
    if (sel.length >= 2) {
      const rows = COMPARE_ROWS.map(([key, label]) => {
        const lists = sel.map(d => factList(d, key));
        if (lists.every(l => !l.length)) return '';
        const shared = new Set(lists[0].filter(x => lists.every(l => l.includes(x))));
        const same = lists.every(l => l.length === lists[0].length && l.every(x => shared.has(x)));
        return `<tr class="${same ? 'same' : ''}"><th scope="row"${key === 'cat' || key === 'ind' ? ` class="k-${key}"` : ''}>${label}${same ? '<span class="samebadge">same</span>' : ''}</th>${lists.map(l =>
          `<td>${l.length ? `<ul>${l.map(x => `<li class="${shared.has(x) ? 'shared' : 'diff'}">${gloss(x)}</li>`).join('')}</ul>` : '<span class="note">—</span>'}</td>`).join('')}</tr>`;
      }).join('');
      table = `<div class="card">
        <div class="row spread"><h2>Side by side</h2>
          <label class="check"><input type="checkbox" data-onlydiff ${store.get('onlyDiff', false) ? 'checked' : ''}> Only differences</label></div>
        <p class="note"><span class="diffkey">Bold</span> = differs between these drugs · gray = the same for all of them.</p>
        <div class="table-wrap cmp-wrap${store.get('onlyDiff', false) ? ' onlydiff' : ''}"><table class="cmp">
          <thead><tr><th></th>${sel.map(d => `<th scope="col">${dot(d.page)}${esc(d.label)}<div class="note">${esc(pageName(d.page))}</div>
            <button class="linkbtn" data-remove="${d.ref}" aria-label="Remove ${esc(d.label)}">Remove</button></th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody></table></div>
        <div class="actions"><button class="primary" data-cmp-learn>Learn these ${sel.length} drugs together</button></div>
      </div>`;
    }

    $app.innerHTML = `${backBar()}<h1>Compare</h1>
      <p class="sub">Put look-alike drugs side by side to see exactly how they differ.</p>
      ${table}
      ${sel.length === 1 ? `<div class="card"><p>Selected: ${dot(sel[0].page)}<b>${esc(sel[0].label)}</b>. Add at least one more drug.</p></div>` : ''}
      ${confusions.length ? `<div class="card"><h2>Drugs you have mixed up</h2><ul class="missed">${confusions.map(x => {
        const [a, b] = x.refs.map(drugByRef);
        return `<li><div class="q">${dot(a.page)}${esc(a.label)} ↔ ${dot(b.page)}${esc(b.label)} <small>· ${x.n}×</small></div>
          <button class="linkbtn" data-compare="${a.ref},${b.ref}">Compare</button></li>`;
      }).join('')}</ul></div>` : ''}
      <div class="card">
        <h2>Choose drugs</h2>
        <div class="jump">${PAGES.map(p => `<button class="pchip pagepick${p === pickPage ? ' on' : ''}" style="--pc:${p.color}" data-pickpage="${p.page}">${p.page}</button>`).join('')}</div>
        <p class="note" style="margin-top:10px">${dot(pickPage)}${esc(pageName(pickPage))} · ${esc(pickPage.title)}</p>
        ${classes.filter(g => g.drugs.length > 1).length ? `<div class="group-label">Whole class</div><div class="row">${classes.filter(g => g.drugs.length > 1).map(g =>
          `<button class="chip" data-compare="${g.drugs.slice(0, 5).map(d => d.ref).join(',')}">${esc(g.name)} <span class="count">${g.drugs.length}</span></button>`).join('')}</div>` : ''}
        <div class="group-label">One at a time (up to 5)</div>
        <div class="row">${pickPage.drugs.map(d => `<button class="chip" data-toggle="${d.ref}" aria-pressed="${compareSel.includes(d.ref)}">${esc(d.short)}</button>`).join('')}</div>
        ${compareSel.length ? '<div class="actions"><button class="secondary" data-clear>Clear selection</button></div>' : ''}
      </div>`;

    const back = $app.querySelector('[data-resume-session]');
    if (back) back.onclick = resumeSession;
    const rerender = () => viewCompare();
    $app.querySelectorAll('[data-pickpage]').forEach(b => b.onclick = () => { store.set('comparePage', +b.dataset.pickpage); rerender(); });
    $app.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => {
      const r = b.dataset.toggle;
      compareSel = compareSel.includes(r) ? compareSel.filter(x => x !== r) : [...compareSel, r].slice(-5);
      rerender();
    });
    $app.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { compareSel = compareSel.filter(x => x !== b.dataset.remove); rerender(); });
    const clear = $app.querySelector('[data-clear]');
    if (clear) clear.onclick = () => { compareSel = []; rerender(); };
    const od = $app.querySelector('[data-onlydiff]');
    if (od) od.onchange = e => { store.set('onlyDiff', e.target.checked); $app.querySelector('.cmp-wrap').classList.toggle('onlydiff', e.target.checked); };
    const cl = $app.querySelector('[data-cmp-learn]');
    if (cl) cl.onclick = () => dropPaused() || startLearn(interleave(uniq(sel.flatMap(d => d.cards))), 'Compare set');
  }

  // ====================================================================== Progress view
  function viewProgress() {
    setNav('progress');
    const t = today();
    const all = summarize(ALL, t);
    const studied = all.total - all.new;
    const last7 = Array.from({ length: 7 }, (_, i) => PROGRESS.days[addDays(t, -i)] || { n: 0, c: 0 });
    const w7 = last7.reduce((a, d) => ({ n: a.n + d.n, c: a.c + d.c }), { n: 0, c: 0 });
    let streak = 0;
    for (let i = PROGRESS.days[t] ? 0 : 1; PROGRESS.days[addDays(t, -i)]; i++) streak++;
    const cur = currentQuiz();
    const plan = todaysPlan();
    const studiedCards = ALL.filter(c => cs(c));
    const avgRecall = studiedCards.length ? Math.round(studiedCards.reduce((a, c) => a + recallOn(c, t), 0) / studiedCards.length * 100) : 0;

    // by question type: accuracy and current predicted recall
    const kinds = {};
    for (const c of ALL) {
      const s = cs(c);
      if (!s) continue;
      const k = kinds[c.k] = kinds[c.k] || { r: 0, n: 0, cards: [], rsum: 0 };
      k.r += s.r;
      k.n += s.r + s.w;
      k.cards.push(c);
      k.rsum += recallOn(c, t);
    }
    const kindRows = Object.entries(kinds).filter(([, v]) => v.n).sort((a, b) => a[1].r / a[1].n - b[1].r / b[1].n);
    const weakKind = kindRows.find(([, v]) => v.n >= 8 && v.r / v.n < 0.8);

    // trouble cards ("leeches"): missed LEECH+ times, or missed more often than answered right
    const trouble = ALL.map(c => ({ c, s: cs(c) })).filter(x => x.s && x.s.w >= 2 && (x.s.w >= LEECH || x.s.w > x.s.r))
      .sort((a, b) => b.s.w - a.s.w || (b.s.w - b.s.r) - (a.s.w - a.s.r)).slice(0, 12);
    const confusions = Object.entries(PROGRESS.confusions).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([k, n]) => ({ refs: k.split('|'), n })).filter(x => x.refs.every(drugByRef));

    const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
    const maxN = Math.max(1, ...days.map(d => (PROGRESS.days[d] || { n: 0 }).n));

    const tips = [];
    if (plan.cards.length) tips.push({ text: `Today's plan: ${plan.due.length} review${plan.due.length === 1 ? '' : 's'} due${plan.fresh.length ? ` and ${plan.fresh.length} new cards for ${cur.q.label}` : ''}. Recalling a card again on a later day, after some forgetting, builds longer-lasting memory than repeating it in one sitting.`, act: 'plan', label: 'Start today\'s plan' });
    if (cur) {
      const qs = summarize(quizCards(cur.q), t >= myDate(cur.q) ? t : myDate(cur.q));
      if (qs.new) tips.push({ text: `${qs.new} of ${qs.total} cards for the ${cur.q.label} quiz (${fmtDay(myDate(cur.q))}) are not studied yet. Predicted recall on quiz day for all ${qs.total}: ${qs.predicted}%.`, act: 'quiz', label: `Learn ${cur.q.label} cards` });
    }
    if (confusions.length) tips.push({ text: `You have mixed up ${confusions.length} pair${confusions.length === 1 ? '' : 's'} of drugs. Comparing them side by side, then practicing their cards mixed together, trains you to tell them apart.`, act: 'confuse', label: 'Practice mixed-up drugs' });
    if (weakKind) tips.push({ text: `Lowest accuracy: ${KIND_LABEL[weakKind[0]]} (${pct(weakKind[1].r, weakKind[1].n)}% of ${weakKind[1].n} answers).`, act: 'kind:' + weakKind[0], label: `Practice ${KIND_LABEL[weakKind[0]]}` });
    if (trouble.length) tips.push({ text: `${trouble.length} trouble card${trouble.length === 1 ? '' : 's'}: missed again and again. Open the drug in Compare to see what sets it apart, then relearn it.`, act: 'trouble', label: 'Learn trouble cards' });
    if (!studied) tips.push({ text: 'No answers recorded on this device yet. Start with today\'s plan on the Study page.' });

    $app.innerHTML = `
      <h1>Progress</h1>
      <p class="sub">Saved in this browser. Use Export / Import below to move it to another device.</p>
      <div class="tiles">
        <div class="tile"><span class="tv">${cur ? summarize(quizCards(cur.q), t >= myDate(cur.q) ? t : myDate(cur.q)).predicted + '%' : '—'}</span><span class="tl">predicted recall on ${cur ? esc(cur.q.label) + ' quiz day' : 'quiz day'}<br><small>all cards on its pages</small></span></div>
        <div class="tile"><span class="tv">${all.mastered + all.familiar}</span><span class="tl">familiar or mastered<br><small>of ${all.total} cards · ${studied} studied</small></span></div>
        <div class="tile"><span class="tv">${w7.n ? pct(w7.c, w7.n) + '%' : '—'}</span><span class="tl">accuracy, last 7 days<br><small>${w7.n} answers</small></span></div>
        <div class="tile"><span class="tv">${plan.due.length}</span><span class="tl">due today<br><small>${streak ? `${streak}-day streak` : 'no streak yet'} · avg recall now ${studied ? avgRecall + '%' : '—'}</small></span></div>
      </div>

      ${tips.length ? `<div class="card"><h2>What to do next</h2><ul class="tips">${tips.map((tp, i) => `<li><p>${esc(tp.text)}</p>${tp.act ? `<button class="secondary" data-tip-act="${i}">${esc(tp.label)}</button>` : ''}</li>`).join('')}</ul></div>` : ''}

      ${cur ? `<div class="card"><h2>${esc(cur.q.label)} quiz readiness · ${isLabWeek(cur.q) && !settings.labDay ? `${fmtDay(cur.q.start)}–${fmtDay(cur.q.until)}` : fmtDay(myDate(cur.q))}</h2>${legend()}
        ${cur.q.pages.map(n => pageRow(byPage[n], t >= myDate(cur.q) ? t : myDate(cur.q))).join('')}</div>` : ''}

      ${confusions.length ? `<div class="card"><h2>Mixed-up drugs</h2><p class="note">From wrong multiple-choice answers and wrong Match pairs.</p><ul class="missed">${confusions.map(x => {
        const [a, b] = x.refs.map(drugByRef);
        return `<li><div class="q">${dot(a.page)}${esc(a.label)} ↔ ${dot(b.page)}${esc(b.label)} <small>· ${x.n}×</small></div>
          <button class="linkbtn" data-compare="${a.ref},${b.ref}">Compare</button> <button class="linkbtn" data-pair-learn="${a.ref},${b.ref}">Practice together</button></li>`;
      }).join('')}</ul></div>` : ''}

      <div class="card">
        <h2>By question type</h2>
        <p class="note">Accuracy on every recorded answer, weakest first.</p>
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

      ${trouble.length ? `<div class="card"><h2>Trouble cards</h2><p class="note">Missed again and again.</p><ul class="missed">${trouble.map(({ c, s }) => `
        <li><div class="q">${dot(c.page)}${esc(c.q)}</div><div class="right">${answerHtml(c.a)}</div>
        <div class="note">${s.r} right · ${s.w} missed ${c.d.length <= 5 ? `· <button class="linkbtn" data-compare="${uniq([...c.d.map(i => c.page.drugs[i].ref), ...confusedRefs(c)]).slice(0, 5).join(',')}">Compare</button>` : ''}</div></li>`).join('')}</ul></div>` : ''}

      <div class="card"><h2>All pages</h2>${legend()}${PAGES.map(p => pageRow(p, t)).join('')}</div>

      <div class="card">
        <h2>How this site schedules reviews</h2>
        <p class="note">Each card has a memory strength, estimated with the FSRS-4.5 model (default parameters): how many days until your chance of recalling it drops to 90%.
          A right answer raises it (more after a longer gap); a miss lowers it and brings the card back today. Only your first answer to a card each day changes its strength.
          Reviews are moved up to the day before the quiz that covers the card's page. Familiar = strength of 2+ days; mastered = 7+ days.</p>
        <div class="actions">
          <button class="secondary" data-export>Export progress</button>
          <label class="secondary filebtn">Import progress<input type="file" accept="application/json,.json" data-import hidden></label>
          <button class="secondary danger" data-reset>Reset progress</button>
        </div>
        <p class="note" data-io-msg></p>
      </div>`;

    const learnPair = refs => startLearn(interleave(uniq(refs.map(drugByRef).flatMap(d => d.cards))), 'Mixed-up drugs');
    $app.querySelectorAll('[data-tip-act]').forEach(b => b.onclick = () => {
      const act = tips[+b.dataset.tipAct].act;
      if (act === 'plan') startLearn(plan.cards, 'Today\'s plan');
      else if (act === 'quiz') startLearn(learnOrder(quizCards(cur.q).filter(c => settings.topics.includes(c.topic))).slice(0, 25));
      else if (act === 'trouble') startLearn(trouble.map(x => x.c), 'Trouble cards');
      else if (act === 'confuse') learnPair(uniq(confusions.flatMap(x => x.refs)).slice(0, 6));
      else if (act.startsWith('kind:')) startLearn(learnOrder(kinds[act.slice(5)].cards).slice(0, 25));
    });
    $app.querySelectorAll('[data-pair-learn]').forEach(b => b.onclick = () => learnPair(b.dataset.pairLearn.split(',')));
    $app.querySelectorAll('[data-kind-learn]').forEach(b => b.onclick = () =>
      startLearn(learnOrder(kinds[b.dataset.kindLearn].cards).slice(0, 25)));
    $app.querySelectorAll('[data-page-learn]').forEach(b => b.onclick = () =>
      startLearn(learnOrder(byPage[b.dataset.pageLearn].cards.filter(c => settings.topics.includes(c.topic))).slice(0, 25)));
    $app.querySelector('[data-export]').onclick = () => {
      const blob = new Blob([JSON.stringify({ app: 'bdk-quiz', exported: new Date().toISOString(), progress: PROGRESS }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `bdk-progress-${t}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $app.querySelector('[data-import]').onchange = async e => {
      const msg = $app.querySelector('[data-io-msg]');
      try {
        const json = JSON.parse(await e.target.files[0].text());
        const p = json.progress || json;
        if (!p.cards || !p.days) throw new Error('this is not a BDK progress file');
        // Keep whichever record has more answers for each card; keep the higher daily counts.
        for (const [k, v] of Object.entries(p.cards)) if (!PROGRESS.cards[k] || v.n > PROGRESS.cards[k].n) PROGRESS.cards[k] = v;
        for (const [d, v] of Object.entries(p.days)) if (!PROGRESS.days[d] || v.n > PROGRESS.days[d].n) PROGRESS.days[d] = v;
        for (const [k, v] of Object.entries(p.confusions || {})) PROGRESS.confusions[k] = Math.max(PROGRESS.confusions[k] || 0, v);
        for (const [k, v] of Object.entries(p.match || {})) if (!PROGRESS.match[k] || v < PROGRESS.match[k]) PROGRESS.match[k] = v;
        if (p.v !== 4) { delete PROGRESS.v; Object.assign(PROGRESS, loadProgressFrom(PROGRESS)); }
        saveProgress();
        viewProgress();
        $app.querySelector('[data-io-msg]').textContent = `Imported ${Object.keys(p.cards).length} cards.`;
      } catch (err) {
        msg.textContent = `Import failed: ${err.message}`;
      }
    };
    $app.querySelector('[data-reset]').onclick = () => {
      if (!confirm('Delete all progress saved in this browser?')) return;
      PROGRESS.cards = {};
      PROGRESS.days = {};
      PROGRESS.confusions = {};
      PROGRESS.match = {};
      saveProgress();
      viewProgress();
    };
  }
  function loadProgressFrom(p) {   // upgrade an imported older file in place
    store.set('progress', p);
    return loadProgress();
  }
  function pageRow(p, onDate) {
    const s = summarize(p.cards, onDate);
    return `<div class="pagerow">
      <span class="pl">${dot(p)}<span>${esc(pageName(p))}</span></span>
      ${stackBar(s, pageName(p) + ': ')}
      <span class="bv" data-tip="Predicted recall on ${fmtDay(onDate)}, all ${s.total} cards">${s.predicted}% <small>${s.due ? `${s.due} due` : 'recall'}</small></span>
      <button class="linkbtn" data-page-learn="${p.page}">Learn</button></div>`;
  }

  // ====================================================================== Drug list (page by page, PDF colors)
  // Images of the PDF pages (pages/p<n>.webp), margins trimmed; width and height in pixels.
  const PAGE_IMG = {"2":[1636,1201],"3":[1640,1201],"4":[1640,1201],"5":[1640,1201],"6":[1636,1188],"7":[1636,1201],"8":[1636,1201],"9":[1636,1201],"10":[1640,1201],"11":[1641,1201],"12":[1636,1201],"13":[1640,1201],"14":[1633,1202],"15":[1639,1201],"16":[1639,1176],"17":[1642,1176],"18":[1640,1176],"19":[1636,1176],"20":[1636,1201],"21":[1638,1201],"22":[1635,1201],"23":[1627,1201],"24":[1630,1201],"25":[1630,1201],"26":[1630,1201],"27":[1635,1201]};
  // arg: { quiz: index into QUIZZES or -1 for all pages, view: 'table' | 'pdf' }
  function viewBrowse(arg = {}) {
    setNav('browse');
    if (arg.quiz !== undefined) store.set('listQuiz', arg.quiz);
    if (arg.view) store.set('listView', arg.view);
    const cur = currentQuiz();
    let qi = store.get('listQuiz', cur ? QUIZZES.indexOf(cur.q) : -1);
    if (!QUIZZES[qi]) qi = -1;
    const view = store.get('listView', 'table');
    const shown = qi < 0 ? PAGES : [...QUIZZES[qi].pages].sort((a, b) => a - b).map(n => byPage[n]).filter(Boolean);
    const quizChip = (i, label, pages) => `<button class="chip" data-listquiz="${i}" aria-pressed="${qi === i}">${esc(label)}${pages ? ` <span class="count">p${pages}</span>` : ''}</button>`;
    $app.innerHTML = `<h1>Drug list</h1>
      <p class="sub">${esc(DATA.edition)}, page by page. Pick a quiz to see only its pages.</p>
      <div class="row listquiz">${quizChip(-1, 'All pages')}${QUIZZES.map((q, i) => quizChip(i, q.label + (q === (cur && cur.q) ? ' · next' : ''), q.pages.length > 6 ? '' : [...q.pages].sort((a, b) => a - b).join(', '))).join('')}</div>
      <div class="seg listview" data-listview><button data-val="table" aria-pressed="${view === 'table'}">Table</button><button data-val="pdf" aria-pressed="${view === 'pdf'}">PDF pages</button></div>
      <div class="jump">${shown.map(p => `<a href="#pg${p.page}" class="pchip" style="--pc:${p.color}">${p.page}</a>`).join('')}</div>
      ${view === 'table' ? '<input class="search" data-q type="search" placeholder="Search generic, brand, category, indication…" aria-label="Search"><p class="note">Tap a row for essential knowledge.</p>' : '<p class="note">The pages as they appear in the PDF. Pinch to zoom, or tap a page to open it full size.</p>'}
      <div data-body></div>
      <div class="card" style="margin-top:20px">
        <h2>Quizlet import files</h2>
        <p class="note">One set of files per page (Cards, Select ALL, Essential Knowledge, and Organisms for ID pages),
          tab-separated, one card per line. Import in Quizlet with <b>Tab</b> between term and definition and <b>New line</b> between cards.</p>
        <p><a class="secondary" href="downloads/BDK_2026-2027_Quizlet_Decks.zip" download>Download all decks (.zip)</a></p>
      </div>`;
    $app.querySelectorAll('[data-listquiz]').forEach(b => b.onclick = () => viewBrowse({ quiz: +b.dataset.listquiz }));
    $app.querySelectorAll('[data-listview] button').forEach(b => b.onclick = () => viewBrowse({ view: b.dataset.val }));
    if (view === 'pdf') {
      $app.querySelector('[data-body]').innerHTML = shown.map(p => {
        const [w, h] = PAGE_IMG[p.page] || [1636, 1200];
        return `<section class="pagetable" id="pg${p.page}"><h2 class="pagehead" style="--pc:${p.color}">${esc(p.title)} <span class="ed">p${p.page}</span></h2>
          <a class="pdfpage" href="pages/p${p.page}.webp" target="_blank" rel="noopener"><img src="pages/p${p.page}.webp" width="${w}" height="${h}" loading="lazy" alt="PDF page ${p.page}: ${esc(p.title)}"></a></section>`;
      }).join('');
      return;
    }
    const body = $app.querySelector('[data-body]');
    const render = term => {
      const tq = term.trim().toLowerCase();
      let html = '';
      for (const p of tq ? PAGES : shown) {   // a search looks at every page, not only the chosen quiz's
        const rows = p.drugs.filter(d => !tq || [d.generic, d.brand, d.category, d.classification,
          d.indication, d.activity, d.essential].some(v => (v || '').toLowerCase().includes(tq)));
        if (!rows.length) continue;
        html += `<section class="pagetable" id="pg${p.page}"><h2 class="pagehead" style="--pc:${p.color}">${esc(p.title)} <span class="ed">p${p.page}</span></h2>
          <div class="table-wrap"><table><thead><tr><th class="k-cat">Pharmacologic category</th><th>Generic</th><th>Brand</th><th>Class.</th><th class="k-ind">Common indications</th></tr></thead><tbody>
          ${rows.map(d => `<tr data-ref="${d.ref}" tabindex="0"><td>${esc(d.category)}</td><td>${esc(d.generic)}</td>
            <td>${esc(d.brand)}</td><td>${esc(d.classification || '')}</td><td>${gloss(d.indication)}${d.activity ? `<div class="act">Activity against: ${esc(d.activity)}</div>` : ''}</td></tr>`).join('')}
          </tbody></table></div>${p.legend ? `<p class="legend">${esc(p.legend)}</p>` : ''}</section>`;
      }
      body.innerHTML = (tq && qi >= 0 ? '<p class="note">Showing matches from all pages.</p>' : '') + (html || '<p class="note">No matches</p>');
    };
    const toggleRow = tr => {
      const nxt = tr.nextElementSibling;
      if (nxt && nxt.classList.contains('detail')) return nxt.remove();
      const d = drugByRef(tr.dataset.ref);
      const mates = classmates(d);
      tr.insertAdjacentHTML('afterend', `<tr class="detail"><td colspan="5"><div class="detailin">${ekHtml(d) || '<p class="note">No essential knowledge listed.</p>'}
        ${mates.length > 1 ? `<button class="linkbtn" data-compare="${mates.slice(0, 5).map(x => x.ref).join(',')}">Compare the ${mates.length} drugs in this class</button>` : ''}</div></td></tr>`);
    };
    body.onclick = e => { const tr = e.target.closest('tr[data-ref]'); if (tr && !e.target.closest('button')) toggleRow(tr); };
    body.onkeydown = e => { const tr = e.target.closest('tr[data-ref]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleRow(tr); } };
    const input = $app.querySelector('[data-q]');
    input.oninput = () => render(input.value);
    render('');
  }

  // ====================================================================== tooltips (bars, segments, columns)
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.hidden = true;
  document.body.appendChild(tip);
  document.addEventListener('pointermove', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, e.clientX - r.width / 2)) + 'px';
    tip.style.top = Math.max(8, e.clientY - r.height - 12) + 'px';
  });
  document.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

  // ====================================================================== keyboard
  document.addEventListener('keydown', e => {
    if (!active || e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = e.target.tagName === 'INPUT' && e.target.type !== 'checkbox';
    if (active.flash) {
      if (typing) return;
      if (e.key === ' ') { e.preventDefault(); active.flip(); }
      else if (e.key === '1') active.answer(false);
      else if (e.key === '2') active.answer(true);
      return;
    }
    if (active.answered || (!active.fmt && active.next)) {
      if (e.key === 'Enter' && active.next && !e.target.closest('button, a, label')) { e.preventDefault(); active.next(); }
      return;
    }
    if (typing) return;
    if (active.fmt === 'mc' && /^[1-9]$/.test(e.key) && +e.key <= active.options.length) active.choose(+e.key - 1);
    else if (active.fmt === 'multi') {
      if (/^[1-9]$/.test(e.key)) active.toggle(+e.key - 1);
      else if (e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); active.submit(); }
    } else if (active.fmt === 'self') {
      if (e.key === ' ' || (e.key === 'Enter' && !e.target.closest('button'))) { e.preventDefault(); active.reveal(); }
      else if (e.key === '1') active.el.querySelector('[data-self="0"]')?.click();
      else if (e.key === '2') active.el.querySelector('[data-self="1"]')?.click();
    }
  });

  // ====================================================================== boot
  const boot = json => {
    loadData(json);
    settings.pages = settings.pages.filter(n => byPage[n]);
    settings.topics = settings.topics.filter(id => TOPICS.some(t => t.id === id));
    if (!settings.pages.length) {
      const cur = currentQuiz();
      settings.pages = (cur ? cur.q.pages : PAGES.map(p => p.page)).slice();
    }
    saveProgress();
    viewSetup();
  };
  // Read-only hook for automated tests (only with ?debug in the URL).
  if (/[?&]debug\b/.test(location.search)) window.__bdk = { card: id => byId[id], session: () => session, all: () => ALL };
  // The glossary is optional: the app still runs if it fails to load.
  const glossary = fetch('data/glossary.json').then(r => r.json()).then(loadGlossary).catch(() => {});
  if (window.BDK_DATA) glossary.then(() => boot(window.BDK_DATA));
  else Promise.all([fetch('data/decks.json').then(r => r.json()), glossary]).then(([json]) => boot(json)).catch(() => {
    $app.innerHTML = '<div class="warnbox">The decks could not be loaded. Check your connection and reload.</div>';
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
