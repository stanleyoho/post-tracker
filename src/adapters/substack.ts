import { BaseAdapter } from './base';
import Parser from 'rss-parser';
import { Post } from '../services/database';

export class SubstackAdapter extends BaseAdapter {
    private parser: Parser;

    constructor() {
        super('substack');
        this.parser = new Parser();
    }

    async check(targetUrl: string): Promise<Array<Post>> {
        if (!this.page) throw new Error('Adapter not initialized');

        const feedUrl = targetUrl.endsWith('/feed') ? targetUrl : `${targetUrl}/feed`;
        console.log(`[Substack] Fetching ${feedUrl}...`);

        try {
            const response = await this.page.goto(feedUrl, { waitUntil: 'networkidle2' });
            if (!response) {
                console.error('[Substack] No response.');
                return [];
            }

            const xml = await response.text();
            if (!xml || xml.trim().startsWith('<!DOCTYPE html>')) {
                console.error('[Substack] Failed to fetch valid RSS XML (Got HTML).');
                return [];
            }

            const feed = await this.parser.parseString(xml);
            const author = feed.title?.replace("'s Newsletter", "").trim() || 'Unknown';

            return feed.items.map(item => ({
                id: item.guid || item.link || item.title || 'unknown',
                platform: 'substack',
                author: item.creator || author,
                title: item.title || 'No Title',
                content: item.contentSnippet || item.content || '',
                url: item.link || '',
                publishedAt: item.pubDate
            }));

        } catch (err: any) {
            console.error(`[Substack] Error: ${err.message}`);
            return [];
        }
    }
}
