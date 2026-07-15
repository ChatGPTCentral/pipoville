const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

  const template = fs.readFileSync('build/template.html', 'utf8');
  let saveBody = null;

  // Intercept the GitHub-raw template fetch -> serve local file
  await page.route('**/build/template.html', route =>
    route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8',
      headers: { 'access-control-allow-origin': '*' }, body: template }));
  // Intercept Supabase overrides GET
  await page.route('**/rest/v1/gta_whitepaper?*', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify([{ content: { }, updated_at: '2026-07-15T14:00:00Z' }]) }));
  // Intercept Supabase save RPC -> validate password server-side style
  await page.route('**/rpc/gta_whitepaper_save', route => {
    const post = route.request().postDataJSON();
    saveBody = post;
    if (post.p_password === 'alex-gta')
      route.fulfill({ status: 200, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ id: 'whitepaper-g' }) });
    else
      route.fulfill({ status: 400, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ message: 'invalid password' }) });
  });

  const url = 'file://' + path.resolve('index.html');
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  const pageCount = await page.$$eval('section.page', els => els.length);
  const eidCount = await page.$$eval('[data-eid]', els => els.length);
  const status = await page.textContent('#wp-status');
  const loadingGone = await page.$('#wp-loading') === null;
  console.log('injected pages:', pageCount, '| editable blocks:', eidCount);
  console.log('status:', JSON.stringify(status), '| loading removed:', loadingGone);

  // wrong password
  await page.click('#wp-edit');
  await page.fill('#wp-pw-input', 'nope');
  await page.click('#wp-pw-go');
  await page.waitForTimeout(400);
  const wrongStatus = await page.textContent('#wp-status');
  const editingAfterWrong = await page.evaluate(() => document.body.classList.contains('wp-editing'));
  console.log('wrong pw -> status:', JSON.stringify(wrongStatus), '| editing:', editingAfterWrong);

  // correct password
  await page.fill('#wp-pw-input', 'alex-gta');
  await page.click('#wp-pw-go');
  await page.waitForTimeout(400);
  const editingAfterRight = await page.evaluate(() => document.body.classList.contains('wp-editing'));
  console.log('correct pw -> editing:', editingAfterRight);

  // edit + autosave
  const eid = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-eid]')].find(e => e.textContent.trim() === 'Executive summary');
    if (!el) return null;
    el.innerHTML = 'Executive summary EDITED';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return el.getAttribute('data-eid');
  });
  await page.waitForTimeout(1800);
  console.log('edited eid:', eid);
  console.log('save payload has edit:', saveBody && saveBody.p_content && saveBody.p_content[eid] === 'Executive summary EDITED');
  console.log('save payload keys:', saveBody ? Object.keys(saveBody.p_content || {}).length : 'none');

  await page.screenshot({ path: 'build/shot-loader.png' });
  console.log('CONSOLE ERRORS:', errs.length ? JSON.stringify(errs.slice(0, 6)) : 'none');
  await browser.close();
})();
