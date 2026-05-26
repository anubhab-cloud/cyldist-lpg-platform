const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });

  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });

    console.log('Logging in as customer...');
    await page.type('input[type="email"]', 'john@example.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Logged in.');

    console.log('Navigating to products...');
    await page.goto('http://localhost:5174/customer/products', { waitUntil: 'networkidle2' });
    await delay(2000);

    console.log('Adding to cart...');
    // Find "Add to Cart" buttons
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtns = buttons.filter(b => b.innerText.includes('Add to Cart'));
      if (addBtns.length > 0) addBtns[0].click();
      if (addBtns.length > 1) addBtns[1].click(); // Add a second product
    });
    
    await delay(1000);

    console.log('Opening cart sidebar...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      // Find button with shopping cart SVG
      const cartBtn = buttons.find(b => b.innerHTML.includes('lucide-shopping-cart') || b.querySelector('svg.lucide-shopping-cart'));
      if (cartBtn) cartBtn.click();
    });

    await delay(1000);
    
    console.log('Taking screenshot of cart...');
    await page.screenshot({ path: 'cart_sidebar.png' });

    console.log('Proceeding to checkout...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const checkoutBtn = buttons.find(b => b.innerText.includes('Proceed to Checkout'));
      if (checkoutBtn) checkoutBtn.click();
    });

    await delay(2000);

    console.log('Taking screenshot of checkout...');
    await page.screenshot({ path: 'checkout_prefilled.png' });

    console.log('Test successfully completed. Screenshots saved.');
  } catch (e) {
    console.error('Test failed:', e);
  } finally {
    await browser.close();
  }
})();
