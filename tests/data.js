// Question and answer content: checks run on the cards the site builds, without clicking through them.
const { check, open, run } = require('./lib');

run('data', async browser => {
  const { page, errors } = await open(browser);
  const r = await page.evaluate(() => {
    const all = window.__bdk.all();
    const out = { total: all.length, problems: {} };
    const add = (k, v) => { (out.problems[k] = out.problems[k] || []).push(v); };
    const ids = new Set();
    for (const c of all) {
      if (ids.has(c.id)) add('duplicate id', c.id);
      ids.add(c.id);
      if (!c.q || !c.q.trim()) add('empty question', c.id);
      if (!c.a || !c.a.trim()) add('empty answer', c.id);
      if (/undefined|null|NaN|\[object/.test(c.q + c.a)) add('code text in card', c.id);
      if (/\(cid:\d+\)/.test(c.q + c.a)) add('PDF extraction artifact', c.id);
    }
    // "which drug?": the question must not name its own answer drug
    for (const c of all.filter(c => c.k === 'ek-which')) {
      const body = c.q.replace(/^On p\d+, (which drug has|select ALL drugs with) the [^:]+: /, '').toLowerCase();
      for (const i of c.d) {
        const d = c.page.drugs[i];
        const names = [d.generic.replace(/\s*\(.*$/, ''), ...(d.brandNames || '').split(',')].map(s => s.trim().toLowerCase()).filter(s => s.length > 3);
        const hit = names.find(n => body.includes(n));
        if (hit) { add('which-drug question names its answer', c.q.slice(0, 100)); break; }
      }
      if (c.exclude && c.d.some(i => c.exclude.has(c.page.drugs[i].label))) add('answer drug excluded from choices', c.q.slice(0, 100));
    }
    // "pick the item": wrong choices never belong to the drug being asked about
    for (const c of all.filter(c => c.k === 'ek-one')) {
      const key = c.noun === 'key side effect' ? 'ek-kse' : 'ek-bw';
      const own = new Set(all.filter(x => x.k === key && x.page === c.page && x.d.some(i => c.d.includes(i)))
        .flatMap(x => x.resolved || x.a.split('; ')).map(t => t.toLowerCase().replace(/^\([^)]*\) /, '')));
      const hit = c.pool.flat().find(t => own.has(t.toLowerCase().replace(/^\([^)]*\) /, '')));
      if (hit) add('pick-the-item choice belongs to the drug', `${c.q.slice(0, 70)} | ${hit.slice(0, 50)}`);
      if (c.pool.flat().length < 2) add('pick-the-item has under 2 wrong choices', c.q.slice(0, 80));
    }
    out.which = all.filter(c => c.k === 'ek-which').length;
    out.one = all.filter(c => c.k === 'ek-one').length;
    return out;
  });
  check('Cards built', r.total > 3000, { total: r.total, whichDrug: r.which, pickItem: r.one });
  for (const k of ['duplicate id', 'empty question', 'empty answer', 'code text in card', 'PDF extraction artifact',
    'which-drug question names its answer', 'answer drug excluded from choices', 'pick-the-item choice belongs to the drug', 'pick-the-item has under 2 wrong choices']) {
    const list = r.problems[k] || [];
    check(`No ${k}`, !list.length, list.length ? { count: list.length, first: list.slice(0, 3) } : '');
  }
  // glossary: every entry is used somewhere in the list text
  const g = await page.evaluate(async () => {
    const list = await (await fetch('data/glossary.json')).json();
    const text = window.__bdk.all().map(c => c.a + ' ' + c.q).join(' ').toLowerCase();
    return { n: list.length, unused: list.filter(e => ![e.t, ...(e.a || [])].some(t => text.includes(t.toLowerCase().replace(/’/g, "'")))).map(e => e.t),
      noDef: list.filter(e => !e.d || e.d.trim().length < 5).map(e => e.t),
      // a figure (a count, dose, percent or time), not a digit inside a name such as CYP3A4, alpha-1 or B12
      withDigits: list.filter(e => /(?<![\w-])\d+(?:[.,]\d+)?(?![\w-])/.test(e.d)).map(e => e.t) };
  });
  check('Glossary: every term appears in the list', !g.unused.length, g.unused);
  check('Glossary: every term has a definition', !g.noDef.length, g.noDef);
  check('Glossary: definitions have no numbers (unsourced figures)', !g.withDigits.length, g.withDigits);
  check('No page errors', !errors.length, errors.slice(0, 5));
});
