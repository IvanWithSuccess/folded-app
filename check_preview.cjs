const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
  const server = spawn('npm', ['run', 'preview', '--', '--port', '4173'], { stdio: 'pipe' });
  
  await new Promise(resolve => setTimeout(resolve, 3000)); // wait for preview server

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log("Navigating to home...");
  await page.goto('http://localhost:4173/folded-app/', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Nav Error:', e.message));
  
  console.log("Navigating to how-it-works...");
  await page.goto('http://localhost:4173/folded-app/#/how-it-works', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Nav Error:', e.message));

  await browser.close();
  server.kill();
  process.exit(0);
})();
