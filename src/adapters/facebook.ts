import { BaseAdapter, LoginWallError } from './base';
import { Post } from '../services/database';

export class FacebookAdapter extends BaseAdapter {
    constructor() {
        super('facebook');
    }

    async check(targetUrl: string): Promise<Array<Post>> {
        if (!this.page) throw new Error('Adapter not initialized');

        console.log(`[Facebook] Navigating to ${targetUrl}...`);
        try {
            await this.page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });

            const content = await this.page.evaluate(() => document.body.innerText.slice(0, 200));
            if (content.includes('Log In') || content.includes('Log in')) {
                console.warn('[Facebook] Hit Login Wall.');
                return [];
            }

            // Extract Author from URL or Page Title
            const author = await this.page.evaluate(() => document.title.split('|')[0].trim()) || 'Unknown';

            const posts = await this.page.evaluate((authorName) => {
                const results: Array<any> = [];
                // Simple link extraction logic (same as before, but mapped to Post)
                const links = Array.from(document.querySelectorAll('a'));

                links.forEach(a => {
                    const href = a.href;
                    if (href.includes('/posts/') || href.includes('/permalink.php')) {
                        // Attempt to grab surrounding text (very brittle)
                        let text = a.innerText;
                        if (text.length < 10) text = "Facebook Post";

                        results.push({
                            id: href, // Use URL as ID for FB
                            platform: 'facebook',
                            author: authorName,
                            title: text.slice(0, 50),
                            content: text,
                            url: href,
                            publishedAt: new Date().toISOString() // Fallback time
                        });
                    }
                });

                // Deduplicate by URL
                const unique = new Map();
                results.forEach(p => unique.set(p.url, p));
                return Array.from(unique.values());
            }, author);

            console.log(`[Facebook] Found ${posts.length} potential posts.`);
            return posts;

        } catch (err: any) {
            console.error(`[Facebook] Error: ${err.message}`);
            return [];
        }
    }
}
