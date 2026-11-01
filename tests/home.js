// The Home Screen card: what each kind of browser is offered, and that its buttons work.
// - iPhone/iPad in Safari: steps to export, add to the Home Screen and import; "Not now" hides it on Study only.
// - Opened from the Home Screen with no progress yet: how to bring progress over from Safari.
// - A browser with an install prompt: an Install button that calls the prompt.
// - Any other browser: no card.
const { pw, BASE, check, run, overflow } = require('./lib');
const IPHONE = pw.devices['iPhone 13'];

async function openWith(browser, context, init) {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', ...context });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + '?debug');
  await page.waitForSelector('[data-start]');
  return { ctx, page, errors };
}
const text = (page, sel) => page.$eval(sel, el => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');

run('home', async browser => {
  // ---- iPhone in Safari
  {
    const { ctx, page, errors } = await openWith(browser, IPHONE);
    const study = await text(page, '[data-hs="study"]');
    check('iPhone Safari: Study shows the Home Screen card', /add BDK to your Home Screen/.test(study), study.slice(0, 80));
    check('iPhone Safari: the card names the 7-day rule with its source', /7 days/.test(study) && !!(await page.$('[data-hs="study"] a[href="https://webkit.org/tracking-prevention/"]')));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-hs="study"] [data-hs-export]')]);
    check('iPhone Safari: Export progress on the card saves a progress file', /^bdk-progress-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    check('iPhone Safari: no sideways scroll with the card', !(await overflow(page)));
    await page.click('[data-hs="study"] [data-hs-dismiss]');
    check('iPhone Safari: Not now hides the card', !(await page.$('[data-hs="study"]')));
    await page.reload();
    await page.waitForSelector('[data-start]');
    check('iPhone Safari: the card stays hidden on Study after a reload', !(await page.$('[data-hs="study"]')));
    await page.click('[data-go="progress"]');
    await page.waitForSelector('[data-export]');
    const prog = await text(page, '[data-hs="progress"]');
    check('iPhone Safari: Progress still shows the steps', /Add to Home Screen/.test(prog) && /Import progress/.test(prog));
    check('iPhone Safari: Progress card has no Not now button', !(await page.$('[data-hs="progress"] [data-hs-dismiss]')));
    check('iPhone Safari: no page errors', errors.length === 0, errors);
    await ctx.close();
  }

  // ---- iPhone, opened from the Home Screen, nothing answered yet
  {
    const { ctx, page, errors } = await openWith(browser, IPHONE,
      () => Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true }));
    const study = await text(page, '[data-hs="study"]');
    check('Home Screen copy with no progress: Study says how to bring progress from Safari', /Progress from Safari/.test(study) && /Import progress/.test(study), study.slice(0, 80));
    await page.click('[data-go="progress"]');
    await page.waitForSelector('[data-export]');
    check('Home Screen copy with no progress: Progress says the same', /Progress from Safari/.test(await text(page, '[data-hs="progress"]')));
    check('Home Screen copy: no page errors', errors.length === 0, errors);
    await ctx.close();
  }

  // ---- desktop, no install prompt
  {
    const { ctx, page, errors } = await openWith(browser, { viewport: { width: 1200, height: 900 } });
    check('desktop without an install prompt: no card on Study', !(await page.$('[data-hs]')));
    await page.click('[data-go="progress"]');
    await page.waitForSelector('[data-export]');
    check('desktop without an install prompt: no card on Progress', !(await page.$('[data-hs]')));
    check('desktop: no page errors', errors.length === 0, errors);
    await ctx.close();
  }

  // ---- a browser that offers an install prompt
  {
    const { ctx, page, errors } = await openWith(browser, { viewport: { width: 1200, height: 900 } });
    // The prompt arrives after the first render, as it does in Chrome; the card is drawn on the next view.
    await page.evaluate(() => {
      const e = new Event('beforeinstallprompt', { cancelable: true });
      e.prompt = () => { window.__prompted = true; return Promise.resolve(); };
      e.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(e);
    });
    await page.click('[data-go="progress"]');
    await page.waitForSelector('[data-export]');
    check('install prompt: Progress shows Install BDK', /Install BDK/.test(await text(page, '[data-hs="progress"]')));
    await page.click('[data-hs="progress"] [data-install]');
    await page.waitForTimeout(200);
    check('install prompt: Install BDK calls the browser prompt', await page.evaluate(() => window.__prompted === true));
    check('install prompt: the card is gone after the prompt', !(await page.$('[data-hs]')));
    check('install prompt: no page errors', errors.length === 0, errors);
    await ctx.close();
  }
});
