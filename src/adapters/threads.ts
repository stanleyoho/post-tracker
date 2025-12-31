import { BaseAdapter, LoginWallError } from './base';
import { Post } from '../services/database';
import * as cheerio from 'cheerio';

export class ThreadsAdapter extends BaseAdapter {
    constructor() {
        super('threads');
    }

    async check(targetUrl: string): Promise<Array<Post>> {
        if (!this.page) throw new Error('Adapter not initialized');

        console.log(`[Threads] Navigating to ${targetUrl}...`);

        try {
            // 1. Go to the profile page
            const response = await this.page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            if (!response) throw new Error('No response');

            // 2. Wait for content to load (ensure scripts are hydrated)
            try {
                await this.page.waitForSelector('[data-pressable-container=true]', { timeout: 10000 });
            } catch (e) {
                console.warn('[Threads] Timeout waiting for content selector, trying to parse anyway...');
            }

            // 3. Get HTML and parse with Cheerio
            const html = await this.page.content();
            const $ = cheerio.load(html);

            // 4. Find all hidden JSON datasets
            const scripts = $('script[type="application/json"][data-sjs]');
            console.log(`[Threads] Found ${scripts.length} hidden JSON scripts.`);

            const posts: Post[] = [];

            scripts.each((_, el) => {
                const content = $(el).html();
                if (!content) return;

                // Look for 'thread_items' which contains the post data
                if (content.includes('"thread_items"')) {
                    try {
                        const data = JSON.parse(content);
                        const threadItems = this.findKey(data, 'thread_items');

                        if (threadItems && Array.isArray(threadItems)) {
                            console.log(`[Threads] Found thread_items array with ${threadItems.length} items.`);

                            for (const thread of threadItems) {
                                // 'thread' might be an array (post + replies) or a direct object depending on the structure
                                let mainPostItem;
                                if (Array.isArray(thread)) {
                                    mainPostItem = thread[0];
                                } else {
                                    mainPostItem = thread;
                                }

                                if (mainPostItem && mainPostItem.post) {
                                    const post = mainPostItem.post;
                                    const user = post.user;

                                    // Extract fields
                                    const id = post.id;
                                    const code = post.code;
                                    const text = post.caption?.text || '';
                                    const authorHandle = user?.username || 'unknown';
                                    const publishedAt = post.taken_at; // Timestamp in seconds

                                    // Construct URL
                                    const postUrl = `https://www.threads.net/@${authorHandle}/post/${code}`;

                                    posts.push({
                                        id: id || code,
                                        platform: 'threads',
                                        author: authorHandle,
                                        title: text ? text.slice(0, 50) + '...' : 'No Text',
                                        content: text,
                                        url: postUrl,
                                        publishedAt: publishedAt ? new Date(publishedAt * 1000).toISOString() : new Date().toISOString()
                                    });
                                }
                            }
                        }
                    } catch (err) {
                        console.warn('[Threads] Parse error on script chunk:', err);
                    }
                }
            });

            console.log(`[Threads] Found ${posts.length} posts.`);
            return posts;

        } catch (err: any) {
            console.error(`[Threads] Error: ${err.message}`);
            return [];
        }
    }

    // Helper to recursively find a key in a nested object
    private findKey(obj: any, keyToFind: string): any {
        if (obj === null || typeof obj !== 'object') return undefined;

        if (keyToFind in obj) return obj[keyToFind];

        for (const key of Object.keys(obj)) {
            const result = this.findKey(obj[key], keyToFind);
            if (result) return result;
        }
        return undefined;
    }
}
