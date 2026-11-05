// My drug lists: paste a slide's list, check the matches, study only those drugs, and see them as a BDK page.
const { SHOTS, check, open, run, overflow, cardOf, answerRight } = require('./lib');

// "Possible medications" slide sent by Louis on 2026-11-05
const SLIDE = `Hydralazine
Fluoxetine (Prozac)
Methylphenidate (Focalin XR, Focalin)
Metoprolol succinate or metoprolol tartrate
Sulfamethoxazole/trimethoprim (Bactrim)
Gabapentin (Neurontin)
Clonazepam (Klonopin)
Ibuprofen
Levothyroxine (Synthroid)
Cefdinir
Carbamazepine (Tegretol)
Rivaroxaban (Xarelto)
Acetaminophen (Tylenol)
Escitalopram (Lexapro)
Atorvastatin (Lipitor)
Lisinopril (Prinivil, Zestril)
Acetaminophen/codeine
Metformin
Amlodipine (Norvasc)`;

run('lists', async browser => {
  const { page: p, errors } = await open(browser);
  await p.click('[data-seg-source] [data-val="list"]');
  // the course list from data/course-lists.json is added once
  const osce = await p.evaluate(() => (JSON.parse(localStorage.getItem('bdk2:lists')) || []).find(l => l.id === 'osce-fall-2026'));
  check('Course list "OSCE Fall 2026" is added with its 21 drugs and its source', !!osce && osce.name === 'OSCE Fall 2026' && osce.refs.length === 21 && /Possible Medications/.test(osce.source), osce && osce.refs.length);
  check('Study: the course list is offered', (await p.textContent('[data-src-list]')).includes('OSCE Fall 2026'));
  await p.click('[data-newlist]');
  await p.fill('[data-listname]', 'Case meds'); await p.dispatchEvent('[data-listname]', 'change');
  await p.fill('[data-paste]', SLIDE);
  await p.click('[data-match]');
  const rows = await p.$$eval('.matchlist li', li => li.map(l => ({
    text: l.querySelector('b').textContent, status: l.className.replace('match-', ''),
    picks: [...l.querySelectorAll('[data-pick]')].map(i => ({ label: i.parentElement.textContent.trim().replace(/\s+/g, ' '), checked: i.checked })),
    note: [...l.querySelectorAll('.note')].map(n => n.textContent).join(' '),
  })));
  const row = t => rows.find(r => r.text.startsWith(t));
  check('Paste: one result per line', rows.length === 19, rows.length);
  check('Paste: 18 lines found exactly', rows.filter(r => r.status === 'ok').length === 18, rows.filter(r => r.status !== 'ok').map(r => r.text));
  const mph = row('Methylphenidate');
  check('Paste: "Methylphenidate (Focalin…)" is flagged, nothing pre-checked, both drugs offered',
    mph.status === 'check' && mph.picks.length === 2 && mph.picks.every(x => !x.checked) && /dexmethylphenidate/.test(mph.note), mph);
  const meto = row('Metoprolol');
  check('Paste: "succinate or tartrate" gives both metoprolols', meto.picks.length === 2 && meto.picks.every(x => x.checked), meto.picks.map(x => x.label));
  check('Paste: "Acetaminophen/codeine" finds codeine and acetaminophen', /codeine and acetaminophen/.test(row('Acetaminophen/codeine').picks[0].label));
  check('Paste: "Amlodipine (Norvasc)" is amlodipine alone', row('Amlodipine').picks.length === 1 && /^.?amlodipine \(Norvasc\)/.test(row('Amlodipine').picks[0].label.replace(/^\W+/, '')), row('Amlodipine').picks);
  // Louis's choice for the flagged line would be his; the test takes methylphenidate
  await p.click('.match-check [data-pick^="19:"] >> nth=0');
  await p.click('[data-add-picked]');
  const n = +(await p.textContent('[data-n]'));
  check('List holds 20 drugs (18 lines, 2 metoprolols, 1 picked)', n === 20, n);

  // ---- BDK page
  await p.click('[data-see-page]');
  const sections = await p.$$eval('.bdksec', x => x.map(e => e.textContent.trim()));
  const pagesInList = await p.evaluate(() => [...new Set(JSON.parse(localStorage.getItem('bdk2:lists')).find(l => l.name === 'Case meds').refs.map(r => +r.split(':')[0]))]);
  check('BDK page: one header bar per source page', sections.length === pagesInList.length, sections);
  const generics = await p.$$eval('.bdktable td.c-generic', x => x.map(e => e.textContent));
  check('BDK page: one row per drug', generics.length === 20, generics.length);
  check('BDK page: essential knowledge labels bold as in the PDF', (await p.$$('.c-essential b')).length >= 20);
  check('BDK page: legend and source line', !!(await p.$('.bdklegend')) && /BDK List Revised May 2026/.test(await p.textContent('.bdkfoot')));
  check('BDK page: only the table scrolls sideways', !(await overflow(p)));
  await p.screenshot({ path: SHOTS + '/listpage.png', fullPage: true });
  await p.emulateMedia({ media: 'print' });
  check('Print: app controls hidden', !(await p.isVisible('.topbar')) && !(await p.isVisible('[data-print]')));
  await p.pdf({ path: SHOTS + '/listpage.pdf', landscape: true, format: 'Letter', printBackground: true });
  await p.emulateMedia({ media: 'screen' });

  // ---- study only these drugs
  await p.click('[data-study-this]');
  check('Study: list selected', (await p.textContent('[data-src-list] [aria-pressed="true"]')).includes('Case meds'));
  const counts = await p.$$eval('[data-tcount]', x => x.map(e => +e.textContent));
  const scoped = await p.evaluate(() => {
    const refs = new Set(JSON.parse(localStorage.getItem('bdk2:lists')).find(l => l.name === 'Case meds').refs);
    return window.__bdk.all().filter(c => c.topic === 'ind' && c.d.some(i => refs.has(c.page.drugs[i].ref))).length;
  });
  const indCount = +(await p.textContent('[data-tcount="ind"]'));
  check('Study: topic counts count the list, not the pages', indCount <= scoped && indCount > 0, { indCount, onListDrugs: scoped, counts });
  await p.click('[data-seg="mode"] [data-val="mc"]');
  await p.click('[data-seg="count"] [data-val="0"]');
  const avail = await p.textContent('[data-avail]');
  await p.click('[data-start]');
  const refs = new Set(await p.evaluate(() => JSON.parse(localStorage.getItem('bdk2:lists')).find(l => l.name === 'Case meds').refs));
  let asked = 0, outside = 0;
  while (await p.$('.prompt') && asked < 400) {
    const ds = await p.evaluate(() => {
      const chip = document.querySelector('.pchip').textContent.match(/^p(\d+)/)[1];
      const q = document.querySelector('.prompt').textContent.trim();
      const c = window.__bdk.card(chip + '|' + q) || window.__bdk.all().find(x => x.page.page === +chip && x.q === q);
      return c ? { k: c.k, refs: c.d.map(i => c.page.drugs[i].ref) } : null;
    });
    if (!ds || !ds.refs.some(r => refs.has(r))) outside++;
    await answerRight(p);
    await p.keyboard.press('Enter');
    asked++;
  }
  check('Study: every question is about a drug on the list', asked > 50 && outside === 0, { avail, asked, outside });
  // a deleted course list does not come back
  await p.click('.topbar nav [data-go="setup"]');
  await p.click('[data-seg-source] [data-val="list"]');
  await p.click('[data-mylist="osce-fall-2026"]');
  await p.click('[data-editlist]');
  check('Course list editor shows its source', /Source: APC III Week 11/.test(await p.textContent('#app')));
  await p.click('[data-delete-list]');
  await p.reload(); await p.waitForSelector('[data-start]');
  const again = await p.evaluate(() => (JSON.parse(localStorage.getItem('bdk2:lists')) || []).some(l => l.id === 'osce-fall-2026'));
  check('A deleted course list is not added again', !again);
  check('No page errors', !errors.length, errors.slice(0, 5));
});
