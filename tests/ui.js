// Smaller features: glossary pop-up, colors, List quiz filter and PDF pages, Compare's Back button, touch hover.
const { pw, QUIZ_DAY, check, open, run, overflow, cardOf, answerRight } = require('./lib');

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

  // ---- Learn: list answers are checkboxes (never one bundled choice); later steps hide the count;
  // leaving a correct item unchecked names it under "What you missed"
  await p.click('.topbar nav [data-go="setup"]');
  await p.click('[data-none]'); await p.click('[data-page="2"]');
  await p.click('[data-preset="1"]');
  await p.click('[data-seg="mode"] [data-val="learn"]');
  await p.click('[data-start]');
  let lists = 0, bundled = 0, countShownOnRecall = 0, missedBox = 0, missedTried = false;
  for (let i = 0; i < 80; i++) {
    if (await p.$('[data-cont]')) { await p.click('[data-cont]'); continue; }
    if (!(await p.$('.prompt'))) break;
    const c = await cardOf(p);
    const tag = (await p.textContent('.tag')).trim();
    if (c.items && c.items.length > 1) {
      lists++;
      if (await p.$('[data-opt]')) bundled++;
      const note = await p.textContent('[data-q] .note');
      if (tag.startsWith('Recall') && /correct\)/.test(note)) countShownOnRecall++;
      if (!missedTried && await p.$('[data-copt]')) {   // check all but one correct item
        missedTried = true;
        const items = new Set(c.items); let skipped = false;
        for (const l of await p.$$('[data-copt]')) {
          const t = await (await l.$('span:last-child')).textContent();
          if (items.has(t)) { if (!skipped) { skipped = true; continue; } await (await l.$('input')).check(); }
        }
        await p.click('[data-submit]');
        if (await p.$('.missbox li')) missedBox++;
        await p.click('[data-next]');
        continue;
      }
    }
    await answerRight(p);
    await p.click('[data-next]');
  }
  check('Learn: list answers asked with one checkbox per item', lists > 0 && bundled === 0, { lists, bundled });
  check('Learn: recall steps hide the number correct', countShownOnRecall === 0);
  check('Learn: a missed item is named under "What you missed"', missedBox === 1);

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
