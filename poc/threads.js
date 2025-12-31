const puppeteer = require('puppeteer');

(async () => {
    console.log('--- Testing Threads (Puppeteer) ---');
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const target = 'https://www.threads.net/@zuck';
    console.log(`Navigating to ${target}...`);

    try {
        await page.goto(target, { waitUntil: 'networkidle2', timeout: 30000 });

        const title = await page.title();
        console.log(`Page Title: ${title}`);

        // Threads often loads content dynamically. Wait a bit.
        // Try to find any text verifying content is visible
        const content = await page.evaluate(() => document.body.innerText.slice(0, 200));
        console.log(`Page Content Preview: ${content.replace(/\n/g, ' ')}...`);

        if (content.includes('Log in') || content.includes('Sign up')) {
            console.log('[WARNING] Likely hit login wall.');
        } else {
            console.log('[SUCCESS] Metadata/Content seems accessible.');
        }

    } catch (err) {
        console.error('[FAILED] Threads Puppeteer:', err.message);
    } finally {
        await browser.close();
    }
})();
