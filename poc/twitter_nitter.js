const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
    console.log('--- Testing Twitter (Nitter) ---');
    // List of public Nitter instances
    const instances = [
        'https://nitter.net',
        'https://nitter.cz',
        'https://nitter.privacydev.net'
    ];

    for (const instance of instances) {
        const target = `${instance}/elonmusk`;
        console.log(`Trying ${target}...`);
        try {
            const response = await axios.get(target, { timeout: 5000 });
            if (response.status === 200) {
                const $ = cheerio.load(response.data);
                const firstTweet = $('.timeline-item .tweet-content').first().text();
                if (firstTweet) {
                    console.log(`[SUCCESS] Found tweet on ${instance}:`);
                    console.log(firstTweet.slice(0, 100).replace(/\n/g, ' '));
                    return; // Exit on first success
                }
            }
        } catch (err) {
            console.log(`[FAILED] ${instance}: ${err.message}`);
        }
    }
    console.log('[ALL FAILED] Could not fetch from known Nitter instances.');
})();
