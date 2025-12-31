import { BaseAdapter, LoginWallError } from './base';
import { Post } from '../services/database';

export class TwitterAdapter extends BaseAdapter {
    constructor() {
        super('twitter');
    }

    async check(targetUrl: string): Promise<Array<Post>> {
        if (!this.page) throw new Error('Adapter not initialized');

        console.log(`[Twitter] Navigating to ${targetUrl}...`);

        try {
            await this.page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });

            const title = await this.page.title();
            if (title.includes('Log in')) {
                console.warn('[Twitter] Hit Login Wall.');
                throw new LoginWallError('twitter');
            }

            // Extract User ID from URL for Author (e.g. twitter.com/elonmusk -> elonmusk)
            const authorHandle = targetUrl.split('/').pop() || 'Unknown';

            const posts = await this.page.evaluate((handle) => {
                const results: Array<any> = [];
                const items = document.querySelectorAll('article[data-testid="tweet"]');

                items.forEach((item) => {
                    const text = (item as HTMLElement).innerText.replace(/\n/g, ' ').slice(0, 200);
                    const timeEl = item.querySelector('time');
                    const linkEl = item.querySelector('a[href*="/status/"]');

                    if (timeEl && linkEl) {
                        const time = timeEl.getAttribute('datetime');
                        const url = (linkEl as HTMLAnchorElement).href;
                        const id = url.split('/').pop();

                        if (id) {
                            results.push({
                                id,
                                platform: 'twitter',
                                author: handle,
                                title: text.slice(0, 50) + '...', // Use truncated text as title
                                content: text,
                                url,
                                publishedAt: time
                            });
                        }
                    }
                });
                return results;
            }, authorHandle);

            console.log(`[Twitter] Found ${posts.length} tweets.`);
            return posts;

        } catch (err: any) {
            console.error(`[Twitter] Error: ${err.message}`);
            return [];
        }
    }
}
