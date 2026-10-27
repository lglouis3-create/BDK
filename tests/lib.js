// Shared helpers for the browser tests. Run everything with tests/run-all.sh.
// Each test prints PASS/FAIL lines and exits non-zero when any check fails.
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const BASE = process.env.BDK_URL || 'http://localhost:8765/';
const SHOTS = path.join(__dirname, 'shots');
require('fs').mkdirSync(SHOTS, { recursive: true });
// A day the next-quiz banner offers Cram (Week 10 quiz, Thursday lab day), so date-dependent tests do not drift.
const QUIZ_DAY = new Date('2026-10-22T15:00:00-05:00');

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === '' ? '' : ' | ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))}`);
  if (!ok) failures++;
  return ok;
}
// Opens the site at phone width; collects page errors. Options: clock (Date), theme, debug (default true).
async function open(browser, { clock, theme, debug = true, viewport = { width: 390, height: 844 }, context = {} } = {}) {
  const ctx = await browser.newContext({ viewport, timezoneId: 'America/Chicago', ...context });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  if (clock) await page.clock.setFixedTime(clock);
  if (theme) await page.addInitScript(t => localStorage.setItem('bdk2:theme', JSON.stringify(t)), theme);
  await page.goto(BASE + (debug ? '?debug' : ''));
  await page.waitForSelector('[data-start]');
  return { ctx, page, errors };
}
async function run(name, fn) {
  const browser = await pw.chromium.launch();
  try { await fn(browser); }
  catch (e) { check(`${name} ran to the end`, false, e.stack.split('\n').slice(0, 3).join(' ')); }
  finally { await browser.close(); }
  console.log(`${name}: ${failures ? failures + ' failed' : 'all passed'}`);
  process.exit(failures ? 1 : 0);
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

// Finds the card on screen (by page + question text; "pick the item" questions share text, so the
// answer among the choices decides) and answers it correctly.
async function cardOf(page, root) {
  return page.evaluate(r => {
    const el = r ? document.querySelector(r) : document;
    const chip = el.querySelector('.pchip').textContent.trim();
    const pg = chip.match(/^p(\d+)/)[1];
    const q = el.querySelector('.prompt').textContent.trim();
    let c = window.__bdk.card(pg + '|' + q);
    if (!c) {   // "pick the item" questions share their text: pick the card whose answer is one of the choices
      const opts = [...el.querySelectorAll('[data-opt] span:last-child')].map(o => o.textContent.replace(/\s+/g, ' ').trim());
      c = window.__bdk.all().find(x => x.page.page === +pg && x.q === q && opts.includes(x.a.replace(/\s+/g, ' ').trim()));
    }
    return c ? { a: c.a, items: c.items, k: c.k, q } : null;
  }, root || null);
}
async function answerRight(page, root) {
  const r = root ? await page.$(root) : await page.$('body');
  const c = await cardOf(page, root);
  if (!c) throw new Error('card not found');
  if (await r.$('[data-opt]:not([disabled])')) {
    const k = await r.$$eval('[data-opt]', (bs, a) => bs.findIndex(b => b.dataset.val === a), c.a);
    const idx = await page.evaluate(([root, a]) => {
      const el = root ? document.querySelector(root) : document;
      const opts = [...el.querySelectorAll('[data-opt]')];
      // compare against the rendered answer text
      const norm = s => s.replace(/\s+/g, ' ').trim();
      const want = /^\(#1\) /.test(a) ? norm(a.split(/;\s*(?=\(#\d+\))/).map(x => x.replace(/^\(#\d+\)\s*/, '')).join('')) : null;
      return opts.findIndex(o => {
        const t = norm(o.querySelector('span:last-child').textContent);
        return want ? t.replace(/\s/g, '') === want.replace(/\s/g, '') : t === norm(a) || t.replace(/\s/g, '') === a.split(/;\s+/).join('').replace(/\s/g, '');
      });
    }, [root || null, c.a]);
    if (idx < 0) throw new Error('mc answer not found: ' + c.q);
    await (await r.$(`[data-opt="${idx}"]`)).click();
    return 'mc';
  }
  if (await r.$('[data-copt]')) {
    const items = new Set(c.items);
    for (const l of await r.$$('[data-copt]')) {
      const t = await (await l.$('span:last-child')).textContent();
      if (items.has(t)) await (await l.$('input')).check();
    }
    await (await r.$('[data-submit]')).click();
    return 'multi';
  }
  if (await r.$('[data-input]')) {
    let a = c.a;
    if (c.k === 'brand') a = a.split(/[,;]/)[0].replace(/^[^:]*:\s*/, '');
    if (c.k === 'ek-which') a = a.replace(/ \(.*$/, '');
    await (await r.$('[data-input]')).fill(a);
    await (await r.$('[data-input]')).press('Enter');
    return 'written';
  }
  if (await r.$('[data-reveal]')) {
    await (await r.$('[data-reveal]')).click();
    await (await r.$('[data-self="1"]')).click();
    return 'self';
  }
  throw new Error('no widget');
}

module.exports = { pw, BASE, SHOTS, QUIZ_DAY, check, open, run, overflow, cardOf, answerRight };
