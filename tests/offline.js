// Offline copy and saved progress.
// 1. When the browser refuses to save, a setting chosen on screen still holds for the visit, and a notice
//    points to Export progress.
// 2. The service worker's cleanup deletes only this site's old caches: another drill site on
//    lglouis3-create.github.io keeps its offline copy.
// 3. The site opens from the saved copy when the server is down, and within NET_TIMEOUT per request when the
//    server is slow.
// Part 1 uses the server run-all.sh starts; parts 2 and 3 start their own server so the test can make it
// slow or stop it.
const fs = require('fs'), http = require('http'), path = require('path');
const { BASE, check, run } = require('./lib');
const ROOT = path.join(__dirname, '..');
const CURRENT = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').match(/const CACHE = '([^']+)'/)[1];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4' };

// mode: 'ok' answers at once, 'slow' answers after SLOW_MS, 'down' drops the connection.
let mode = 'ok';
const SLOW_MS = 20000;
function serve() {
  const server = http.createServer((req, res) => {
    if (mode === 'down') { req.socket.destroy(); return; }
    const send = () => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    };
    if (mode === 'slow') setTimeout(send, SLOW_MS); else send();
  });
  return new Promise(r => server.listen(0, 'localhost', () => r(server)));
}

run('offline', async browser => {
  // ---- 1. a refused save is kept for the visit, and the student is told
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      Storage.prototype.setItem = function () { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); };
    });
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(BASE + '?debug');
    await p.waitForSelector('[data-start]');
    await p.click('[data-go="compare"]');
    await p.waitForSelector('.pagepick');
    const want = await p.$$eval('.pagepick:not(.on)', bs => bs[bs.length - 1].dataset.pickpage);
    await p.click(`.pagepick[data-pickpage="${want}"]`);
    await p.waitForTimeout(200);
    const on = await p.$eval('.pagepick.on', b => b.dataset.pickpage);
    check('a page picked in Compare holds when the browser refuses to save', on === want, { picked: want, shown: on });
    const warn = await p.$('.savewarn');
    check('a notice says progress was not saved and points to Export progress',
      !!warn && /did not save your progress/.test(await warn.textContent()) && /Export progress/.test(await warn.textContent()));
    check('no page errors with saving refused', errors.length === 0, errors);
    await ctx.close();

    const ok = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const q = await ok.newPage();
    await q.goto(BASE + '?debug');
    await q.waitForSelector('[data-start]');
    await q.click('[data-go="compare"]');
    await q.waitForSelector('.pagepick');
    await q.click('.pagepick:not(.on)');
    check('no notice when saving works', !(await q.$('.savewarn')));
    await ok.close();
  }

  // ---- 2 and 3. the service worker
  const server = await serve();
  const base = `http://localhost:${server.address().port}/`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  try {
    await p.goto(base + '?debug');
    await p.waitForSelector('[data-start]');
    // Another drill site's offline copy, and an old copy of this site, on the same origin.
    await p.evaluate(async () => {
      await (await caches.open('phar4342-drill-v1')).put('/Medicinal-chemistry/index.html', new Response('other site'));
      await (await caches.open('bdk-v1')).put('/old', new Response('old'));
    });
    await p.evaluate(async () => {
      const reg = await navigator.serviceWorker.register('sw.js');
      const sw = reg.installing || reg.waiting || reg.active;
      if (sw.state !== 'activated') await new Promise(r => sw.addEventListener('statechange', () => sw.state === 'activated' && r()));
    });
    const keys = await p.evaluate(() => caches.keys());
    check("another site's cache is kept", keys.includes('phar4342-drill-v1'), keys);
    check("this site's old cache is deleted", !keys.includes('bdk-v1'), keys);
    check(`this site's current cache ${CURRENT} is there`, keys.includes(CURRENT), keys);

    await p.reload();
    await p.waitForSelector('[data-start]');
    check('the page is served by the service worker', await p.evaluate(() => !!navigator.serviceWorker.controller));

    mode = 'down';
    await p.reload();
    await p.waitForSelector('[data-start]', { timeout: 10000 });
    check('the site opens from the saved copy with the server down', !(await p.$('.warnbox:not(.savewarn)')));

    mode = 'slow';
    const t0 = Date.now();
    await p.reload({ waitUntil: 'commit', timeout: 30000 });
    await p.waitForSelector('[data-start]', { timeout: 30000 });
    const ms = Date.now() - t0;
    check('the site opens from the saved copy when the server is slow', ms < 15000, { ms, serverDelay: SLOW_MS });
    check('no page errors in the service worker checks', errors.length === 0, errors);
  } finally {
    mode = 'ok';
    await ctx.close();
    server.closeAllConnections();
    server.close();
  }
});
