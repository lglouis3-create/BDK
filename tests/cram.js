// Cram on a quiz day: guess-first cards, deliberate misses, Last look, and the four answer settings.
const { QUIZ_DAY, check, open, run, overflow, answerRight } = require('./lib');

const kindOf = async p => (await p.$('[data-opt]')) ? 'mc' : (await p.$('[data-copt]')) ? 'multi' : (await p.$('[data-input]')) ? 'written' : 'self';

run('cram', async browser => {
  const { page: p, errors } = await open(browser, { clock: QUIZ_DAY });
  await p.click('[data-labday="thu"]');
  await p.waitForSelector('[data-bq="cram"]');
  check('Banner offers Cram on quiz day', true, (await p.textContent('.banner-title')).trim());

  // ---- full session with a miss every 7th test
  await p.click('[data-bq="cram"]');
  let guesses = 0, tests = 0, lastPct = 0, backward = false, guessGraded = false;
  for (let steps = 0; steps < 400; steps++) {
    if (await p.$('[data-last]')) break;
    const pct = parseFloat(await p.$eval('.progress > div', d => d.style.width));
    if (pct < lastPct) backward = true;
    lastPct = pct;
    const tag = (await p.textContent('.tag')).trim();
    if (tag === 'Guess first') {
      const before = await p.evaluate(() => localStorage.getItem('bdk2:progress'));
      if (await p.$('[data-opt]')) await p.click('[data-opt="0"]'); else { await p.click('[data-copt="0"] input'); await p.click('[data-submit]'); }
      if (before !== await p.evaluate(() => localStorage.getItem('bdk2:progress'))) guessGraded = true;
      guesses++;
    } else {
      tests++;
      if (tests % 7 === 0) {
        if (await p.$('[data-opt]')) await p.click('[data-opt="0"]');
        else if (await p.$('[data-copt]')) { await p.click('[data-copt="0"] input'); await p.click('[data-submit]'); }
        else if (await p.$('[data-input]')) await p.click('[data-dontknow]');
        else { await p.click('[data-reveal]'); await p.click('[data-self="0"]'); }
      } else await answerRight(p);
    }
    await p.keyboard.press('Enter');
  }
  check('Cram: session ends on the summary', !!(await p.$('[data-last]')), (await p.textContent('.score')).trim());
  check('Cram: new cards open as an ungraded guess', guesses > 0 && !guessGraded, { guesses });
  check('Cram: progress bar never moves backward', !backward);
  await p.click('[data-last]');
  check('Last look: lists cards', (await p.$$('.lastlook li')).length > 0);

  // ---- answer settings
  const expect = {
    choice: k => k === 'mc' || k === 'multi',
    selectall: k => k === 'multi',
    written: () => true,   // typed for short answers, checkboxes for lists, self-check for long ones; checked by `typed` below
  };
  for (const fmt of ['choice', 'selectall', 'written']) {
    await p.click('.topbar nav [data-go="setup"]');
    await p.click(`.banner [data-seg="cramFmt"] [data-val="${fmt}"]`);
    const pressed = await p.$$eval('[data-seg="cramFmt"] [aria-pressed="true"]', x => x.map(e => e.dataset.val));
    check(`Cram ${fmt}: both choosers agree`, pressed.every(v => v === fmt), pressed);
    await p.click('[data-bq="cram"]');
    const seen = new Set(); let ok = true, typed = 0;
    for (let i = 0; i < 30; i++) {
      if (await p.$('[data-last]')) break;
      const k = await kindOf(p);
      const tag = (await p.textContent('.tag')).trim();
      seen.add(k);
      if (!expect[fmt](k, tag)) ok = false;
      if (k === 'written') typed++;
      await answerRight(p);
      await p.click('[data-next]');
    }
    check(`Cram ${fmt}: only the chosen kinds of question`, ok && (fmt !== 'written' || typed > 0), [...seen]);
    if (await p.$('[data-quit]')) await p.click('[data-quit]');
  }
  check('Cram: no sideways scroll', !(await overflow(p)));
  check('No page errors', !errors.length, errors.slice(0, 5));
});
