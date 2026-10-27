// The "new version" card and Refresh: every screen comes back where it was, nothing recorded twice.
const { BASE, QUIZ_DAY, check, run, answerRight } = require('./lib');
const state = p => p.evaluate(() => ({
  here: window.__bdk.here().v, prompt: (document.querySelector('.prompt') || {}).textContent || '',
  head: ((document.querySelector('.qmeta') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
  answered: !!document.querySelector('[data-feedback] .verdict'), results: (window.__bdk.session() || {}).results?.length,
}));
async function refresh(p) {
  await p.evaluate(() => window.__bdk.checkForUpdate());
  await p.waitForSelector('.updatecard:not([hidden])', { timeout: 5000 });
  await Promise.all([p.waitForNavigation(), p.click('[data-update-now]')]);
  await p.waitForSelector('#app > *:not(.loading)');
  await p.waitForTimeout(300);
}
run('refresh', async browser => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Chicago' });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await p.clock.setFixedTime(QUIZ_DAY);
  // pretend a newer version is published
  await p.route('**/version.json*', rt => rt.fulfill({ contentType: 'application/json', body: '{"v":"v99999"}' }));
  await p.goto(BASE + '?debug'); await p.waitForSelector('[data-start]');
  const res = { push: line => console.log(line) };
  const t = async (name, before, after, ok) => check(name, ok, { before, after });
  // 1. Test mode, unanswered question
  await p.click('[data-seg="mode"] [data-val="mc"]'); await p.click('[data-start]');
  await answerRight(p); await p.click('[data-next]'); await answerRight(p); await p.click('[data-next]');
  let a = await state(p); await refresh(p); let bb = await state(p);
  await t('test unanswered', a, bb, a.prompt === bb.prompt && a.head === bb.head && !bb.answered);
  // 2. Test mode, answered (on feedback): next question, nothing recorded twice
  await answerRight(p); a = await state(p); await refresh(p); bb = await state(p);
  await t('test answered', a, bb, bb.prompt !== a.prompt && bb.results === a.results && /^4 of/.test(bb.head));
  // 3. Learn, unanswered
  await p.click('.topbar nav [data-go="setup"]'); await p.click('[data-seg="mode"] [data-val="learn"]'); await p.click('[data-start]');
  for (let i = 0; i < 3; i++) { await answerRight(p); await p.click('[data-next]'); }
  a = await state(p); await refresh(p); bb = await state(p);
  await t('learn unanswered', a, bb, a.prompt === bb.prompt && bb.here === 'learn' && a.head === bb.head);
  // 4. Cram mid-guess and mid-test
  await p.click('.topbar nav [data-go="setup"]'); await p.click('[data-bq="cram"]');
  for (let i = 0; i < 6; i++) { await answerRight(p); await p.click('[data-next]'); }
  a = await state(p); await refresh(p); bb = await state(p);
  await t('cram unanswered', a, bb, a.prompt === bb.prompt && bb.here === 'cram');
  const credit = await p.$eval('.progress > div', d => d.style.width);
  await answerRight(p); a = await state(p); await refresh(p); bb = await state(p);
  await t('cram answered', { ...a, credit }, bb, bb.here === 'cram' && bb.results === a.results);
  // 5. Compare opened from a question, then refresh, then Back
  // answer until a card offers a Compare link, open it, refresh, then go back to the cram
  let linked = false;
  for (let i = 0; i < 40 && !linked; i++) {
    if (!(await p.$('.prompt'))) break;
    await answerRight(p);
    if (await p.$('[data-feedback] [data-compare]')) linked = true; else await p.click('[data-next]');
  }
  check('Found a card with a Compare link', linked);
  if (linked) {
    const results = (await state(p)).results;
    await p.click('[data-feedback] [data-compare]'); await refresh(p);
    const back = await p.$('[data-trail-session]');
    if (back) await p.click('[data-trail-session]');
    bb = await state(p);
    await t('compare paused, refresh, back to the cram', { results, back: !!back }, bb, !!back && bb.here === 'cram' && bb.results === results);
  }
  // 6. List with search and scroll
  await p.click('.topbar nav [data-go="browse"]'); await p.fill('[data-q]', 'statin'); await p.evaluate(() => window.scrollTo(0, 600));
  a = { y: await p.evaluate(() => scrollY), rows: await p.$$eval('tr[data-ref]', x => x.length) };
  await refresh(p);
  bb = { y: await p.evaluate(() => scrollY), rows: await p.$$eval('tr[data-ref]', x => x.length), search: await p.inputValue('[data-q].search') };
  await t('list search+scroll', a, bb, bb.search === 'statin' && bb.rows === a.rows && Math.abs(bb.y - a.y) < 5);
  // 7. Later hides the card
  await p.evaluate(() => window.__bdk.checkForUpdate()); await p.waitForSelector('.updatecard:not([hidden])');
  await p.click('[data-update-later]'); await p.evaluate(() => window.__bdk.checkForUpdate()); await p.waitForTimeout(300);
  check('Later hides the card', await p.$eval('.updatecard', e => e.hidden));
  // the real version.json matches the app
  await p.unroute('**/version.json*');
  const v = await p.evaluate(async () => (await (await fetch('version.json?t=' + Date.now())).json()).v);
  check('version.json matches APP_VERSION', v === await p.evaluate(() => window.__bdk.version), v);
  check('No page errors', !errors.length, errors.slice(0, 5));
});
