const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
  const server = spawn('npm', ['run', 'dev'], { stdio: 'pipe' });
  
  await new Promise(resolve => setTimeout(resolve, 3000)); // wait for dev server

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Nav Error:', e.message));
  
  // Also check /how-it-works
  await page.goto('http://localhost:5173/#/how-it-works', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Nav Error:', e.message));

  await browser.close();
  server.kill();
  process.exit(0);
})();
