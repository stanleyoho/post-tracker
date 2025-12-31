import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const USER_DATA_DIR = '/Users/stanley.ch.lin/Library/Application Support/Google/Chrome';
const OUTPUT_DIR = path.resolve(__dirname, '../../config/cookies');

const TARGETS = [
    { name: 'facebook', url: 'https://www.facebook.com' },
    { name: 'twitter', url: 'https://twitter.com' },
    { name: 'threads', url: 'https://www.threads.net' },
    { name: 'substack', url: 'https://lennysnewsletter.substack.com' }
];

export async function refreshCookies(): Promise<boolean> {
    console.log('[CookieTool] Attempting to refresh cookies (Robust Mode)...');

    // Create temp directory for profile copy
    const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cookie-refresh-'));
    console.log(`[CookieTool] Created temporary profile at: ${tempProfileDir}`);

    try {
        // 1. Copy essential profile data to temp directory
        // We only need 'Local State' for key decryption and 'Default/Cookies' for the data.

        // Copy 'Local State'
        const srcLocalState = path.join(USER_DATA_DIR, 'Local State');
        if (fs.existsSync(srcLocalState)) {
            fs.copyFileSync(srcLocalState, path.join(tempProfileDir, 'Local State'));
        }

        // Create 'Default' directory structure
        const destDefaultDir = path.join(tempProfileDir, 'Default');
        fs.mkdirSync(destDefaultDir, { recursive: true });

        // Copy 'Default/Cookies'
        // Note: Check for both Cookies and Network/Cookies just in case (though Mac usually uses Default/Cookies)
        const srcCookies = path.join(USER_DATA_DIR, 'Default', 'Cookies');
        if (fs.existsSync(srcCookies)) {
            fs.copyFileSync(srcCookies, path.join(destDefaultDir, 'Cookies'));
            console.log('[CookieTool] Copied Cookies database.');
        } else {
            console.warn('[CookieTool] WARNING: Could not find Cookies file at ' + srcCookies);
        }

        // Ensure output dir exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // 2. Launch Puppeteer checking the TEMP profile
        // This avoids lock contention with the main running Chrome instance.
        const browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            userDataDir: tempProfileDir, // Point to our temp copy
            headless: false, // Visible for debugging/verification, optional
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-extensions',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-session-crashed-bubble',
                '--disable-infobars',
                '--about:blank',
                // Important: We still target 'Default' profile directory within our userDataDir
                '--profile-directory=Default'
            ],
            defaultViewport: null,
            dumpio: true // Helpful for debugging
        });

        const page = await browser.newPage();

        for (const target of TARGETS) {
            console.log(`[CookieTool] Checking ${target.name}...`);
            try {
                // Navigate to domain to ensure we can read cookies for it
                await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 30000 });

                const client = await page.target().createCDPSession();
                const { cookies } = await client.send('Network.getAllCookies');

                const domainKeywords = target.name === 'twitter' ? ['twitter.com', 'x.com'] : [target.name];
                const relevantCookies = cookies.filter(c => {
                    return domainKeywords.some(k => c.domain.includes(k));
                });

                if (relevantCookies.length > 0) {
                    // Puppeteer's page.cookies() gives a nice high-level format too
                    const pageCookies = await page.cookies();
                    const filePath = path.join(OUTPUT_DIR, `${target.name}.json`);
                    fs.writeFileSync(filePath, JSON.stringify(pageCookies, null, 2));
                    console.log(`[CookieTool] Updated ${target.name}.json (${relevantCookies.length} cookies)`);
                } else {
                    console.log(`[CookieTool] No cookies found for ${target.name}`);
                }
            } catch (err: any) {
                console.warn(`[CookieTool] Failed to fetch ${target.name}: ${err.message}`);
            }
        }

        await browser.close();
        console.log('[CookieTool] Refresh Success.');
        return true;

    } catch (err: any) {
        console.error('[CookieTool] Critical Error:', err);
        return false;
    } finally {
        // 3. Cleanup: Remove the temporary profile directory
        try {
            console.log(`[CookieTool] Cleaning up temp profile: ${tempProfileDir}`);
            fs.rmSync(tempProfileDir, { recursive: true, force: true });
        } catch (cleanupErr: any) {
            console.error(`[CookieTool] Failed to cleanup temp dir: ${cleanupErr.message}`);
        }
    }
}
