const Parser = require('rss-parser');
const axios = require('axios');
const parser = new Parser();

(async () => {
    console.log('--- Testing Substack (RSS + Axios) ---');
    try {
        // Fake User Agent to avoid strict bot blocking
        const response = await axios.get('https://lennysnewsletter.substack.com/feed', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        console.log(`Response Status: ${response.status}`);
        const body = response.data;
        if (body.trim().startsWith('<!DOCTYPE html>')) {
            console.error('[FAILED] Substack returned HTML instead of XML. Likely Cloudflare blocked.');
            console.log(body.slice(0, 500));
            return;
        }

        const feed = await parser.parseString(body);
        console.log(`[SUCCESS] Fetched: ${feed.title}`);
        console.log(`Latest Post: ${feed.items[0].title}`);
    } catch (err) {
        console.error('[FAILED] Substack RSS:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
        }
    }
})();
