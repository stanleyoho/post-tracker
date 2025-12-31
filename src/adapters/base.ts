import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { Post } from '../services/database';

export class LoginWallError extends Error {
    constructor(platform: string) {
        super(`Login Wall detected on ${platform}`);
        this.name = 'LoginWallError';
    }
}

export abstract class BaseAdapter {
    protected browser: Browser | null = null;
    protected page: Page | null = null;
    protected platformName: string;

    constructor(platformName: string) {
        this.platformName = platformName;
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await this.loadCookies();
    }

    private async loadCookies() {
        const cookiePath = path.resolve(__dirname, `../../config/cookies/${this.platformName}.json`);
        if (fs.existsSync(cookiePath)) {
            try {
                const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
                if (this.page) {
                    await this.page.setCookie(...cookies);
                    console.log(`[${this.platformName}] Cookies loaded.`);
                }
            } catch (err) {
                console.error(`[${this.platformName}] Failed to load cookies:`, err);
            }
        } else {
            console.warn(`[${this.platformName}] No cookies found at ${cookiePath}. You may hit login walls.`);
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    abstract check(targetUrl: string): Promise<Array<Post>>;
}
