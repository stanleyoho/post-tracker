import puppeteer from 'puppeteer';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const USER_DATA_DIR = '/Users/stanley.ch.lin/Library/Application Support/Google/Chrome';

(async () => {
    console.log('--- DEBUG LAUNCH START ---');
    try {
        const browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            userDataDir: USER_DATA_DIR,
            headless: true, // Try strict headless
            dumpio: true, // DUMP STDIO FROM CHROME
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-extensions',
                '--no-first-run',
                '--no-default-browser-check'
            ]
        });
        console.log('Browser launched successfully!');
        console.log('User Agent:', await browser.userAgent());
        await browser.close();
        console.log('Browser closed.');
    } catch (err: any) {
        console.error('LAUNCH ERROR:', err);
    }
})();
