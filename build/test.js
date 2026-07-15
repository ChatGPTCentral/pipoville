const { chromium } = require('playwright-core');
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

  const url = 'file://' + path.resolve('public/index.html');
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const eidCount = await page.$$eval('[data-eid]', els => els.length);
  const pageCount = await page.$$eval('section.page', els => els.length);
  const status0 = await page.textContent('#wp-status');
  console.log('pages:', pageCount, '| editable blocks:', eidCount, '| status:', JSON.stringify(status0));

  // screenshot cover + one content page
  await page.screenshot({ path: 'build/shot-top.png' });

  // --- test edit + save round trip ---
  const stamp = 'TEST-' + Date.now();
  await page.click('#wp-edit');
  await page.fill('#wp-pw-input', 'alex-gta');
  await page.click('#wp-pw-go');
  await page.waitForTimeout(1500);
  const afterUnlock = await page.textContent('#wp-status');
  console.log('after unlock status:', JSON.stringify(afterUnlock));
  const editingClass = await page.evaluate(() => document.body.classList.contains('wp-editing'));
  console.log('editing mode active:', editingClass);

  // edit the executive-summary headline (first big editable on page 2 area) - pick a known element
  const targetEid = await page.evaluate((stamp) => {
    // find an element containing "Executive summary"
    const els = [...document.querySelectorAll('[data-eid]')];
    const t = els.find(e => e.textContent.trim() === 'Executive summary');
    if (!t) return null;
    t.focus();
    t.innerHTML = 'Executive summary ' + stamp;
    t.dispatchEvent(new Event('input', { bubbles: true }));
    return t.getAttribute('data-eid');
  }, stamp);
  console.log('edited eid:', targetEid);
  await page.waitForTimeout(2200); // wait for autosave debounce + network
  const afterSave = await page.textContent('#wp-status');
  console.log('after autosave status:', JSON.stringify(afterSave));

  // reload as a fresh viewer - should see persisted edit
  const page2 = await browser.newPage();
  await page2.goto(url, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1800);
  const persisted = await page2.evaluate((eid) => {
    const el = document.querySelector('[data-eid="' + eid + '"]');
    return el ? el.textContent : '(missing)';
  }, targetEid);
  console.log('persisted on reload:', JSON.stringify(persisted));
  console.log('PERSIST_OK:', persisted.includes(stamp));

  // wrong password test
  const page3 = await browser.newPage();
  await page3.goto(url, { waitUntil: 'networkidle' });
  await page3.waitForTimeout(800);
  await page3.click('#wp-edit');
  await page3.fill('#wp-pw-input', 'wrong-pass');
  await page3.click('#wp-pw-go');
  await page3.waitForTimeout(1500);
  const wrongStatus = await page3.textContent('#wp-status');
  const wrongEditing = await page3.evaluate(() => document.body.classList.contains('wp-editing'));
  console.log('wrong-pass status:', JSON.stringify(wrongStatus), '| editing:', wrongEditing);

  console.log('CONSOLE ERRORS:', errs.length ? JSON.stringify(errs.slice(0,8)) : 'none');
  await browser.close();

  // cleanup: restore the edited value to keep the live doc clean
})();
