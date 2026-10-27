// Smaller features: glossary pop-up, colors, List quiz filter and PDF pages, Compare's Back button, touch hover.
const { pw, QUIZ_DAY, check, open, run, overflow, answerRight } = require('./lib');

run('ui', async browser => {
  const { page: p, errors } = await open(browser, { clock: QUIZ_DAY, theme: 'blue' });

  // ---- List: quiz filter, PDF pages, glossary
  await p.click('.topbar nav [data-go="browse"]');
  const quizPages = await p.$$eval('.pagetable', x => x.map(e => e.id));
  check('List: opens on the next quiz\'s pages', quizPages.length > 0 && quizPages.length < 10, quizPages);
  await p.fill('[data-q]', 'methadone');
  check('List: search covers every page', (await p.$$('tr[data-ref]')).length > 0);
  await p.fill('[data-q]', '');
  const term = await p.$('td .term');
  check('Glossary: terms underlined in the table', !!term);
  await term.click();
  check('Glossary: tap opens the definition, not the row', !(await p.$eval('.termpop', e => e.hidden)) && !(await p.$('tr.detail')));
  await p.keyboard.press('Escape');
  await p.click('[data-listview] [data-val="pdf"]');
  const imgs = await p.$$eval('.pdfpage img', x => x.map(i => i.getAttribute('src')));
  check('List: PDF pages shown for the quiz', imgs.length === quizPages.length, imgs);
  const missing = [];
  for (const src of await p.$$eval('.pdfpage img', x => x.map(i => i.src))) if (!(await p.request.get(src)).ok()) missing.push(src);
  await p.click('[data-listquiz="-1"]');
  for (const src of await p.$$eval('.pdfpage img', x => x.map(i => i.src))) if (!(await p.request.get(src)).ok()) missing.push(src);
  check('List: every PDF page image exists', !missing.length, missing);
  check('List: no sideways scroll', !(await overflow(p)));
  await p.click('[data-listview] [data-val="table"]');

  // ---- Compare from a question, then Back
  await p.click('.topbar nav [data-go="setup"]');
  await p.click('[data-seg="mode"] [data-val="mc"]');
  await p.click('[data-start]');
  let found = false;
  for (let i = 0; i < 30 && !found; i++) {
    await answerRight(p);
    if (await p.$('[data-feedback] [data-compare]')) found = true;
    else await p.click('[data-next]');
  }
  const q = await p.textContent('.prompt');
  await p.click('[data-feedback] [data-compare]');
  check('Compare: Back button while a session is paused', !!(await p.$('[data-trail-session]')));
  await p.click('[data-trail-session]');
  check('Compare: Back returns to the same question', (await p.textContent('.prompt')) === q);
  check('Colors: Category and Indications rows marked', (await p.$$('[data-feedback] dt.k-cat')).length > 0 && (await p.$$('[data-feedback] dt.k-ind')).length > 0);

  // ---- Back: a session paused while visiting other screens comes back exactly
  await p.click('[data-next]');
  const q2 = await p.textContent('.prompt');
  await p.click('.topbar nav [data-go="browse"]');
  check('Back: bar offers the paused session on other screens', !(await p.$eval('[data-trailbar]', e => e.hidden)));
  check('Back: button replaces the logo', await p.isVisible('[data-back]') && !(await p.isVisible('.topbar .brand')));
  await p.click('.topbar nav [data-go="progress"]');
  await p.click('[data-back]');
  check('Back: returns to the previous screen', (await p.evaluate(() => window.__bdk.here().v)) === 'browse');
  await p.click('[data-back]');
  check('Back: then to the session, same question', (await p.textContent('.prompt')) === q2 && !(await p.isVisible('[data-back]')));
  // phone back gesture in the middle of a session pauses it
  await p.goBack();
  await p.waitForTimeout(300);
  check('Back gesture during a session pauses it', !(await p.$eval('[data-trailbar]', e => e.hidden)), await p.evaluate(() => window.__bdk.here().v));
  await p.click('[data-trail-session]');
  await p.waitForTimeout(300);
  check('Back to your questions after the gesture', (await p.textContent('.prompt')) === q2);

  // ---- touch screens: no hover outline left on an answer choice
  const t = await browser.newContext({ ...pw.devices['iPhone 13'], timezoneId: 'America/Chicago' });
  const tp = await t.newPage();
  await tp.goto(p.url()); await tp.waitForSelector('[data-start]');
  await tp.click('[data-seg="mode"] [data-val="mc"]'); await tp.tap('[data-start]');
  let same = true;
  for (let i = 0; i < 4 && await tp.$('[data-opt]'); i++) {
    const borders = await tp.$$eval('[data-opt]', bs => bs.map(b => getComputedStyle(b).borderColor));
    if (new Set(borders).size !== 1) same = false;
    await tp.tap('[data-opt="1"]'); await tp.tap('[data-next]');
  }
  check('Touch: every choice looks the same before answering', same);
  check('No page errors', !errors.length, errors.slice(0, 5));
});
