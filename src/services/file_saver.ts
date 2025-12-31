import fs from 'fs';
import path from 'path';
import { Post } from './database';

export class FileSaver {
    private baseDir: string;

    constructor() {
        this.baseDir = path.resolve(__dirname, '../../downloads');
    }

    private sanitize(str: string): string {
        // Remove invalid filename characters
        return str.replace(/[^a-z0-9\u4e00-\u9fa5_-]/gi, '_').replace(/_+/g, '_');
    }

    async save(post: Post) {
        const platform = this.sanitize(post.platform);
        const author = this.sanitize(post.author || 'unknown');

        // Ensure directory exists: downloads/{platform}/{author}/
        const dir = path.join(this.baseDir, platform, author);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Filename: DATE_Title.md
        const date = new Date().toISOString().split('T')[0];
        const safeTitle = this.sanitize(post.title).slice(0, 50); // Limit length
        const filename = `${date}_${safeTitle}_${post.id.slice(-6)}.md`;
        const filePath = path.join(dir, filename);

        // Content Template
        const content = `---
id: ${post.id}
platform: ${post.platform}
author: ${post.author}
date: ${post.publishedAt || new Date().toISOString()}
url: ${post.url}
---

# ${post.title}

${post.content || '(No Content)'}

---
[Original Link](${post.url})
`;

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[File] Saved to ${filePath}`);
    }
}
