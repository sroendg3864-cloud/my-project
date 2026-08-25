const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE ERROR: ' + msg.text()); });

  const fileUrl = 'file://' + path.resolve(__dirname, 'app_final.html');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const pinCount = await page.locator('#pins .pin').count();
  const cardCount = await page.locator('.card-incident').count();
  const totalStat = await page.locator('#statTotal').innerText();
  const matchedStat = await page.locator('#statMatched').innerText();
  console.log('pins:', pinCount, 'cards:', cardCount, 'statTotal:', totalStat, 'statMatched:', matchedStat);

  // open first incident detail
  await page.locator('.card-incident').first().click();
  await page.waitForTimeout(300);
  const drawerVisible = await page.locator('#detailDrawer.show').count();
  console.log('drawer visible after click:', drawerVisible);
  const contractCards = await page.locator('.contract-card').count();
  console.log('contract cards in first detail:', contractCards);

  // toggle reviewed checkbox
  const chk = page.locator('#chkReviewed');
  if (await chk.count()) {
    await chk.check();
    await page.waitForTimeout(200);
  }

  // close detail
  await page.locator('#btnCloseDetail').click();
  await page.waitForTimeout(200);

  // test filters
  await page.selectOption('#filterType', '화재');
  await page.waitForTimeout(200);
  const fireCards = await page.locator('.card-incident').count();
  console.log('fire-filtered cards:', fireCards);
  await page.selectOption('#filterType', 'all');

  // matched-only toggle
  await page.locator('#chkMatchedOnly').check();
  await page.waitForTimeout(200);
  const matchedCards = await page.locator('.card-incident').count();
  console.log('matched-only cards:', matchedCards);
  await page.locator('#chkMatchedOnly').uncheck();

  // search
  await page.fill('#filterSearch', '인천');
  await page.waitForTimeout(200);
  const searchCards = await page.locator('.card-incident').count();
  console.log('search "인천" cards:', searchCards);
  await page.fill('#filterSearch', '');

  // simulate new incident
  const beforeCount = await page.locator('.card-incident').count();
  await page.locator('#btnSimulate').click();
  await page.waitForTimeout(300);
  const afterCount = await page.locator('.card-incident').count();
  console.log('cards before/after simulate:', beforeCount, afterCount);

  // pause toggle
  await page.locator('#btnToggleLive').click();
  const liveText = await page.locator('#liveText').innerText();
  console.log('live text after pause:', liveText);

  // readonly banner should show since window.claude is absent
  const bannerShown = await page.locator('#readonlyBanner.show').count();
  console.log('readonly banner shown (no claude runtime):', bannerShown);

  console.log('ERRORS:', JSON.stringify(errors, null, 2));

  await page.screenshot({ path: 'screenshot_full.png', fullPage: true });

  await browser.close();
})();
