const puppeteer = require('puppeteer');

(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('Navigating to login...');
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  
  await delay(5000); // Wait for model to load
  await page.screenshot({ path: 'login_debug.png' });

  console.log('Screenshot saved.');
  await browser.close();
})();
