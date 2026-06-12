const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'pipe' });
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Testing home page...");
  await page.goto('http://localhost:4173/folded-app/', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Nav Error:', e.message));
  
  console.log("Testing User Guide page...");
  await page.goto('http://localhost:4173/folded-app/#/guide', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Nav Error:', e.message));

  const content = await page.evaluate(() => document.body.innerHTML);
  if(content.length < 500) {
      console.log("BODY IS TOO SMALL (White screen):", content);
  } else {
      console.log("BODY HAS CONTENT. Length:", content.length);
  }

  await browser.close();
  server.kill();
  process.exit(0);
})();
