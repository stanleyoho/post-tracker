import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(__dirname, '../../data/state.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize Tables
// Added new columns for richer data storage
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    author TEXT,
    title TEXT,
    content TEXT,
    url TEXT NOT NULL,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface Post {
  id: string;
  platform: string;
  author: string;
  title: string;
  content?: string;
  url: string;
  publishedAt?: string;
}

/**
 * Check if a post has been seen.
 */
export function isPostSeen(platform: string, postId: string): boolean {
  const row = db.prepare('SELECT id FROM posts WHERE id = ? AND platform = ?').get(postId, platform);
  return !!row;
}

/**
 * Save a post to the database.
 */
export function savePost(post: Post) {
  const stmt = db.prepare(`
        INSERT OR REPLACE INTO posts (id, platform, author, title, content, url, published_at)
        VALUES (@id, @platform, @author, @title, @content, @url, @publishedAt)
    `);

  stmt.run({
    id: post.id,
    platform: post.platform,
    author: post.author || 'Unknown',
    title: post.title,
    content: post.content || '',
    url: post.url,
    publishedAt: post.publishedAt || new Date().toISOString()
  });
}

export default db;
