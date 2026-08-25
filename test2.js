const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const fileUrl = 'file://' + path.resolve(__dirname, 'app_final.html');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // zoom on map
  await page.locator('.map-frame').screenshot({ path: 'shot_map.png' });

  // open a matched incident detail (여수 폭발 - has coinsurance table)
  await page.getByText('여수국가산단 화학물질 저장탱크 폭발').click();
  await page.waitForTimeout(300);
  await page.locator('#detailDrawer').screenshot({ path: 'shot_detail.png' });

  await browser.close();

  // dark mode pass
  const browser2 = await chromium.launch();
  const page2 = await browser2.newPage({ viewport: { width: 1400, height: 1000 }, colorScheme: 'dark' });
  await page2.goto(fileUrl, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(500);
  await page2.screenshot({ path: 'shot_dark_full.png', fullPage: false });
  await page2.getByText('여수국가산단 화학물질 저장탱크 폭발').click();
  await page2.waitForTimeout(300);
  await page2.locator('#detailDrawer').screenshot({ path: 'shot_dark_detail.png' });
  await browser2.close();
})();
