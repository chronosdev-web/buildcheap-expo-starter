import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:4141/#/billing', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
