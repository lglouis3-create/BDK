// The answer history: one entry per answer, carried by Export and Import, cleared by Reset, and never in the
// way of saving progress.
const fs = require('fs');
const { QUIZ_DAY, check, open, run, answerRight } = require('./lib');
const fnv = id => { let h = 0x811c9dc5; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
const readLog = p => p.evaluate(() => JSON.parse(localStorage.getItem('bdk2:log') || '[]'));
async function answerSome(p, n) {
  await p.click('.topbar nav [data-go="setup"]');
  await p.click('[data-seg="mode"] [data-val="mc"]');
  await p.click('[data-start]');
  for (let i = 0; i < n; i++) {
    await answerRight(p);
    if (i < n - 1) await p.click('[data-next]');
  }
}

run('history', async browser => {
  const { ctx, page: p, errors } = await open(browser, { clock: QUIZ_DAY });
  await answerSome(p, 3);
  const log = await readLog(p);
  const codes = new Set(await p.evaluate(() => window.__bdk.all().map(c => c.id)).then(ids => ids.map(fnv)));
  check('three answers make three history entries', log.length === 3, log);
  check('each entry is [seconds, card code, right, mode]', log.every(e => Number.isInteger(e[0]) && /^[0-9a-f]{8}$/.test(e[1]) && e[2] === 1 && e[3] === 'mc'), log);
  check('each card code belongs to a card on the site', log.every(e => codes.has(e[1])));

  await p.click('.topbar nav [data-go="progress"]');
  await p.waitForSelector('[data-export]');
  check('the Progress page says answers are kept in a history', /answer history/.test(await p.textContent('#app')));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-export]')]);
  const file = await dl.path();
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  check('Export includes the history', Array.isArray(exported.log) && exported.log.length === 3, exported.log && exported.log.length);

  // Import into a fresh browser
  const fresh = await open(browser, { clock: QUIZ_DAY });
  await fresh.page.click('.topbar nav [data-go="progress"]');
  await fresh.page.waitForSelector('[data-export]');   // the file input itself is hidden inside its label
  await fresh.page.setInputFiles('[data-import]', file);
  await fresh.page.waitForFunction(() => /Imported/.test(document.querySelector('[data-io-msg]').textContent));
  check('Import brings the history across', (await readLog(fresh.page)).length === 3);
  await fresh.page.setInputFiles('[data-import]', file);
  await fresh.page.waitForTimeout(200);
  check('importing the same file twice adds nothing', (await readLog(fresh.page)).length === 3);
  await fresh.ctx.close();

  await p.click('[data-reset]');
  await p.waitForTimeout(200);
  check('Reset progress clears the history', (await readLog(p)).length === 0);
  check('no page errors', errors.length === 0, errors);
  await ctx.close();

  // The browser refuses to save the history: progress still saves, and no warning is shown.
  const full = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Chicago' });
  await full.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (k === 'bdk2:log') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); return set.call(this, k, v); };
  });
  const q = await full.newPage();
  const qErrors = []; q.on('pageerror', e => qErrors.push(e.message));
  await q.clock.setFixedTime(QUIZ_DAY);
  await q.goto(require('./lib').BASE + '?debug');
  await q.waitForSelector('[data-start]');
  await answerSome(q, 1);
  const saved = await q.evaluate(() => Object.keys((JSON.parse(localStorage.getItem('bdk2:progress') || '{}').cards) || {}).length);
  check('with the history refused, progress still saves', saved === 1, saved);
  check('with the history refused, no save warning', !(await q.$('.savewarn')));
  check('with the history refused, no page errors', qErrors.length === 0, qErrors);
  await full.close();
});
