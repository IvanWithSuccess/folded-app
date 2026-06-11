const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
  const server = spawn('npm', ['run', 'dev'], { stdio: 'pipe' });
  
  await new Promise(resolve => setTimeout(resolve, 3000)); // wait for dev server

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Navigating to home...");
  await page.goto('http://localhost:5173/folded-app/', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Nav Error:', e.message));
  
  console.log("Navigating to how-it-works...");
  await page.goto('http://localhost:5173/folded-app/#/how-it-works', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Nav Error:', e.message));

  await browser.close();
  server.kill();
  process.exit(0);
})();
