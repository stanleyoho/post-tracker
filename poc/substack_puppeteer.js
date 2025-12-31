const puppeteer = require('puppeteer');
const Parser = require('rss-parser');
const parser = new Parser();

(async () => {
    console.log('--- Testing Substack (Puppeteer -> RSS) ---');
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        // Navigate to the RSS feed directly
        await page.goto('https://lennysnewsletter.substack.com/feed', { waitUntil: 'networkidle2' });

        // Get the content (Chrome renders XML in a tree, but raw source should be XML)
        // Actually, page.content() gives the serialized DOM. 
        // New trick: fetch via page context
        const xml = await page.evaluate(async () => {
            const response = await fetch('https://lennysnewsletter.substack.com/feed');
            return response.text();
        });

        if (xml.trim().startsWith('<rss') || xml.includes('<channel>')) {
            console.log('[SUCCESS] Retrieved XML via Puppeteer.');
            const feed = await parser.parseString(xml);
            console.log(`Title: ${feed.title}`);
            console.log(`Latest: ${feed.items[0].title}`);
        } else {
            console.log('[FAILED] Still got HTML or invalid XML.');
            console.log(xml.slice(0, 200));
        }

    } catch (err) {
        console.error('[FAILED] Substack Puppeteer:', err.message);
    } finally {
        await browser.close();
    }
})();
