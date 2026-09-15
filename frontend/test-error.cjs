const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.error('Page Error:', err.toString());
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Console Error:', msg.text());
    }
  });

  try {
    await page.goto('http://localhost:8080/admin', { waitUntil: 'networkidle0' });
    console.log('Page loaded successfully');
  } catch (e) {
    console.error('Navigation error:', e);
  }

  await browser.close();
})();
