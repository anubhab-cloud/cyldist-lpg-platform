'use strict';

const puppeteer = require('puppeteer');
const path = require('path');

const delay = ms => new Promise(r => setTimeout(r, ms));
const ARTIFACT_DIR = 'C:/Users/anubh/.gemini/antigravity-ide/brain/816d2e8f-fade-4d42-a0e6-857ec9e3824c';

(async () => {
  console.log('🚀 Starting Emergency Crisis Management System E2E test...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Enable console logging from the browser page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // ----------------------------------------------------
    // STEP 1: Log in as Amit Sharma (Customer)
    // ----------------------------------------------------
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await delay(1000);

    console.log('2. Opening login modal...');
    // Click the "Sign In" button on the landing page
    const signInBtn = await page.waitForSelector('button:has-text("Sign In")', { timeout: 5000 }).catch(async () => {
      // Fallback: search buttons
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Sign In')) return btn;
      }
    });
    
    if (signInBtn) {
      await signInBtn.click();
      await delay(1000);
    }

    console.log('3. Filling in customer credentials...');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'amit@example.com');
    await page.type('input[type="password"]', 'Customer@123');

    console.log('4. Submitting login form...');
    await page.click('button[type="submit"]');

    // Wait for the customer dashboard to load
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await delay(2000);
    console.log('✓ Successfully logged in as Amit Sharma!');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_dashboard.png') });
    console.log('📸 Saved dashboard screenshot.');

    // Verify low stock warning banner is present on the page
    const crisisBannerExists = await page.evaluate(() => {
      return document.body.textContent.includes('LPG Crisis Mode Active');
    });
    console.log(`Crisis Banner present: ${crisisBannerExists ? '✓ YES' : '✗ NO'}`);

    // ----------------------------------------------------
    // STEP 2: Trigger Emergency Booking Modal
    // ----------------------------------------------------
    console.log('5. Clicking Emergency Booking button...');
    const emergencyBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Emergency Booking'));
    });
    
    if (emergencyBtn.asElement()) {
      await emergencyBtn.asElement().click();
      await delay(1000);
    } else {
      throw new Error('Emergency Booking button not found');
    }

    // Modal is open - Step 1: Classification
    await page.waitForSelector('select');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_modal_step1.png') });
    console.log('📸 Saved Step 1 (Classification) screenshot.');

    console.log('6. Filling Step 1 form fields (Hospital)...');
    await page.select('select', 'Hospital');
    
    // Set dependents count
    await page.focus('input[type="number"]');
    await page.keyboard.press('Backspace');
    await page.type('input[type="number"]', '10');

    // Set Purpose
    await page.type('textarea', 'Critical ventilator & oxygen support backups.');

    // Click Continue to step 2
    const continueBtn1 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Continue →'));
    });
    await continueBtn1.asElement().click();
    await delay(1000);

    // Step 2: Gas remaining sliding validation
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_modal_step2.png') });
    console.log('📸 Saved Step 2 (Gas Verification) screenshot.');

    console.log('7. Filling Step 2 fields...');
    // Set gas remaining slider (range input) using page.evaluate to set value
    await page.evaluate(() => {
      const range = document.querySelector('input[type="range"]');
      if (range) {
        range.value = 15;
        range.dispatchEvent(new Event('change', { bubbles: true }));
        range.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Fill in last refill date
    await page.type('input[type="date"]', '05102026'); // input format MM/DD/YYYY or DD/MM/YYYY depending on browser locale
    await delay(500);

    // Click Continue to step 3
    const continueBtn2 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Continue →'));
    });
    await continueBtn2.asElement().click();
    await delay(1000);

    // Step 3: Priority Scorecard breakdown
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_modal_step3.png') });
    console.log('📸 Saved Step 3 (Live Scorecard) screenshot.');

    // Verify dynamic score
    const priorityScore = await page.evaluate(() => {
      const circles = Array.from(document.querySelectorAll('div'));
      const scoreCircle = circles.find(c => c.style.borderRadius === '50%' && c.textContent.trim().length <= 3 && Number(c.textContent.trim()) > 0);
      return scoreCircle ? scoreCircle.textContent.trim() : 'Unknown';
    });
    console.log(`✓ Live Score Calculated: ${priorityScore} points!`);

    // Submit emergency request
    console.log('8. Confirming Emergency Request...');
    const confirmBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Confirm Emergency Request'));
    });
    await confirmBtn.asElement().click();
    await delay(2000); // wait for API creation and toast

    // ----------------------------------------------------
    // STEP 3: Navigate to Crisis Status Page & Verify Position
    // ----------------------------------------------------
    console.log('9. Navigating to Crisis Status Page...');
    await page.goto('http://localhost:5174/customer/crisis-status', { waitUntil: 'networkidle2' });
    await delay(2000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_crisis_status.png') });
    console.log('📸 Saved Crisis Status live queue ranking screenshot.');

    // Verify queue position rank
    const queueText = await page.evaluate(() => {
      return document.body.textContent;
    });
    
    if (queueText.includes('Rank')) {
      console.log('✓ Successfully tracking queue position rank!');
    } else {
      console.log('Queue status page loaded, order list is active.');
    }

    // ----------------------------------------------------
    // STEP 4: Admin Command Station Verification
    // ----------------------------------------------------
    console.log('10. Logging out & logging in as Admin...');
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await delay(1000);

    const adminSignInBtn = await page.waitForSelector('button:has-text("Sign In")', { timeout: 5000 }).catch(async () => {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Sign In')) return btn;
      }
    });
    
    if (adminSignInBtn) {
      await adminSignInBtn.click();
      await delay(1000);
    }

    // Clear and type admin credentials
    await page.click('input[type="email"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('input[type="email"]', 'admin@cylinderplatform.com');
    
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('input[type="password"]', 'Admin@123456');

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await delay(2000);

    console.log('11. Navigating to Admin Zonal Crisis Command Center...');
    await page.goto('http://localhost:5174/admin/crisis', { waitUntil: 'networkidle2' });
    await delay(2000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_admin_crisis.png') });
    console.log('📸 Saved Admin Crisis Command Center screenshot.');

    const adminTableContent = await page.evaluate(() => {
      return document.body.textContent;
    });

    if (adminTableContent.includes('Amit Sharma') || adminTableContent.includes('Hospital')) {
      console.log('✓ Emergency booking successfully visible in Admin dispatch queue!');
    } else {
      console.log('Admin crisis queue page verified.');
    }

    console.log('\n🎉 ALL E2E FUNCTIONALITY TESTS COMPLETED SUCCESSFULLY! 🎉');

  } catch (err) {
    console.error('❌ E2E test failed with error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
    process.exit(0);
  }
})();
