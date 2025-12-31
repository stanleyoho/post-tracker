const puppeteer = require('puppeteer');

(async () => {
    console.log('--- Testing Twitter (Puppeteer) ---');
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Set User Agent to avoid immediate blocking
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const target = 'https://twitter.com/elonmusk';
    console.log(`Navigating to ${target}...`);

    try {
        await page.goto(target, { waitUntil: 'networkidle2', timeout: 30000 });

        // Check for login wall or content
        const title = await page.title();
        console.log(`Page Title: ${title}`);

        // Try to find a tweet text
        const tweet = await page.$('article[data-testid="tweet"]');
        if (tweet) {
            console.log('[SUCCESS] Found tweets on the page.');
        } else {
            console.log('[WARNING] No tweets found. Might be login-walled.');
        }
    } catch (err) {
        console.error('[FAILED] Twitter Puppeteer:', err.message);
    } finally {
        await browser.close();
    }
})();
