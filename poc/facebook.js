const puppeteer = require('puppeteer');

(async () => {
    console.log('--- Testing Facebook (Puppeteer) ---');
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const target = 'https://www.facebook.com/zuck';
    console.log(`Navigating to ${target}...`);

    try {
        await page.goto(target, { waitUntil: 'networkidle2', timeout: 30000 });

        const title = await page.title();
        console.log(`Page Title: ${title}`);

        const content = await page.evaluate(() => document.body.innerText.slice(0, 200));
        console.log(`Page Content Preview: ${content.replace(/\n/g, ' ')}...`);

        if (content.includes('Log In') || content.includes('Log in')) {
            console.log('[WARNING] Hit Facebook Login Wall as expected.');
        } else {
            console.log('[SUCCESS] Public page content might be visible.');
        }

    } catch (err) {
        console.error('[FAILED] Facebook Puppeteer:', err.message);
    } finally {
        await browser.close();
    }
})();
