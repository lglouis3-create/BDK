// Every question answered through the site, plus each mode and screen once.
const { SHOTS, check, open, run, overflow, cardOf, answerRight } = require('./lib');

run('regression', async browser => {
  const { page, errors } = await open(browser, { context: { acceptDownloads: true } });
  const total = await page.evaluate(() => window.__bdk.all().length);
  check('cards load', total > 3000, { total });

  // ---- Test mode, every card: right answers graded right, choices well formed
  await page.click('[data-all]');
  await page.click('[data-preset="1"]');                       // Everything
  await page.click('[data-seg="mode"] [data-val="mc"]');
  await page.click('[data-seg="filter"] [data-val="all"]');
  await page.click('[data-seg="count"] [data-val="0"]');
  await page.click('[data-start]');
  let n = 0;
  const bad = [];
  while (await page.$('.prompt')) {
    const c = await cardOf(page);
    if (!c) { bad.push(['card not found', await page.textContent('.prompt')]); break; }
    if (await page.$('[data-opt]')) {
      const opts = await page.$$eval('[data-opt] > span:last-child', els => els.map(e => e.textContent));
      if (opts.length < 3 || new Set(opts).size !== opts.length) bad.push(['choices', c.q, opts.length]);
    } else if (await page.$('[data-copt]')) {
      const opts = await page.$$eval('[data-copt] span:last-child', els => els.map(e => e.textContent));
      if (new Set(opts).size !== opts.length) bad.push(['duplicate choices', c.q]);
      if (!c.items.every(i => opts.includes(i))) bad.push(['correct item missing', c.q]);
      if (opts.length <= c.items.length) bad.push(['no wrong choices', c.q]);
    }
    const right = n % 3 !== 0;
    if (right) await answerRight(page);
    else if (await page.$('[data-opt]')) await page.click('[data-opt="0"]');
    else { await page.click('[data-copt="0"] input'); await page.click('[data-submit]'); }
    if (right && !(await page.$('.verdict.good'))) bad.push(['right answer graded wrong', c.q]);
    await page.keyboard.press('Enter');
    n++;
  }
  check('Test mode: every question answered', n === total, { answered: n, total });
  check('Test mode: no grading or choice problems', !bad.length, bad.slice(0, 5));

  // ---- Learn: a deliberate miss and an "I was right" override, to the end
  await page.click('[data-setup]');
  await page.click('[data-none]'); await page.click('[data-page="26"]');
  await page.click('[data-seg="mode"] [data-val="learn"]');
  await page.click('[data-seg="count"] [data-val="10"]');
  await page.click('[data-start]');
  let steps = 0, missed = false, overrode = false, lastPct = 0, backward = false;
  while (steps < 300) {
    if (await page.$('[data-cont]')) { await page.click('[data-cont]'); continue; }
    if (!(await page.$('.prompt'))) break;
    const pct = parseFloat(await page.$eval('.learnhead .progress > div', d => d.style.width));
    if (pct < lastPct) backward = true;
    lastPct = pct;
    const c = await cardOf(page);
    if (!missed && await page.$('[data-opt]')) {
      const idx = await page.$$eval('[data-opt] > span:last-child', (els, a) => els.findIndex(e => e.textContent.trim() !== a), c.a);
      await page.click(`[data-opt="${idx}"]`); missed = true;
    } else if (!overrode && await page.$('[data-input]')) {
      await page.fill('[data-input]', 'qqq'); await page.press('[data-input]', 'Enter');
      await page.click('[data-override]'); overrode = true;
    } else await answerRight(page);
    await page.click('[data-next]');
    steps++;
  }
  check('Learn: session finishes', /10 \/ 10/.test(await page.textContent('.score')), (await page.textContent('.score')).trim());
  check('Learn: progress bar never moves backward', !backward);

  // ---- Scroll
  await page.click('[data-setup]');
  await page.click('[data-seg="mode"] [data-val="scroll"]');
  await page.click('[data-seg="count"] [data-val="25"]');
  await page.click('[data-start]');
  const want = +((await page.textContent('[data-sh-count]')).match(/of (\d+)/)[1]);
  for (let i = 0; i < want; i++) {
    const sel = `.feed-item[data-idx="${i}"]`;
    await page.waitForSelector(sel);
    await page.$eval(sel, el => el.scrollIntoView());
    await answerRight(page, sel);
  }
  check('Scroll: all answered, finish shown', await page.isVisible('[data-finish]'), await page.textContent('[data-sh-count]'));
  await page.click('[data-finish]');

  // ---- Flashcards (keyboard)
  await page.click('[data-setup]');
  await page.click('[data-seg="mode"] [data-val="flash"]');
  await page.click('[data-seg="count"] [data-val="10"]');
  await page.click('[data-start]');
  for (let i = 0; i < 40 && await page.$('[data-card]'); i++) { await page.keyboard.press(' '); await page.keyboard.press(i % 4 ? '2' : '1'); }
  check('Flashcards: reach results', !!(await page.$('.score')));

  // ---- Match: two wrong pairs, then the board
  await page.click('[data-setup]');
  await page.click('[data-none]'); await page.click('[data-page="6"]');
  await page.click('[data-seg="mode"] [data-val="match"]');
  await page.click('[data-seg="matchType"] [data-val="names"]');
  await page.click('[data-start]');
  const tiles = await page.evaluate(() => window.__bdk.session().tiles.map(t => ({ k: t.k, side: t.side })));
  const l0 = tiles.findIndex(t => t.side === 'l');
  const wrongR = tiles.findIndex(t => t.side === 'r' && t.k !== tiles[l0].k);
  await page.click(`[data-tile="${l0}"]`); await page.click(`[data-tile="${wrongR}"]`);
  await page.waitForTimeout(500);
  for (let k = 0; k < 6; k++) {
    const a = tiles.findIndex(t => t.k === k && t.side === 'l'); const b = tiles.findIndex(t => t.k === k && t.side === 'r');
    if (a < 0) continue;
    await page.click(`[data-tile="${a}"]`); await page.click(`[data-tile="${b}"]`);
  }
  await page.waitForSelector('.score');
  check('Match: board completes', true, (await page.textContent('.score')).trim());

  // ---- Compare
  await page.click('[data-compare]');
  check('Compare: table drawn', (await page.$$eval('.cmp thead th', x => x.length - 1)) >= 2);
  await page.check('[data-onlydiff]');
  await page.click('[data-pickpage="18"]');
  await page.click('.group-label + .row [data-compare]');
  await page.click('[data-cmp-learn]');
  check('Compare: learn these drugs starts', !!(await page.$('.learnhead')));

  // ---- Progress and List
  await page.click('.topbar nav [data-go="progress"]');
  check('Progress: tiles drawn', (await page.$$('.tile')).length >= 4);
  await page.screenshot({ path: SHOTS + '/progress.png', fullPage: true });
  await page.click('.topbar nav [data-go="browse"]');
  await page.fill('[data-q]', 'methadone');
  await page.click('tr[data-ref]');
  check('List: essential knowledge opens', (await page.$$('.detail .eksec')).length >= 2);

  // ---- Layout and themes
  for (const v of ['setup', 'compare', 'progress', 'browse']) {
    await page.click(`.topbar nav [data-go="${v}"]`);
    check(`${v}: no sideways scroll at phone width`, !(await overflow(page)));
  }
  const themes = [];
  for (let i = 0; i < 4; i++) { await page.click('[data-theme-toggle]'); themes.push(await page.evaluate(() => document.documentElement.dataset.theme)); }
  check('Themes cycle', new Set(themes).size >= 3, themes);
  check('No page errors', !errors.length, errors.slice(0, 5));
});
