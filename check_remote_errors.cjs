const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('https://ivanwithsuccess.github.io/folded-app/', { waitUntil: 'networkidle2', timeout: 15000 }).catch(e => console.log('Navigation Error:', e.message));
  
  await browser.close();
})();
