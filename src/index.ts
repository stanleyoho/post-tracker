import cron from 'node-cron';
import { SubstackAdapter } from './adapters/substack';
import { TwitterAdapter } from './adapters/twitter';
import { FacebookAdapter } from './adapters/facebook';
import { ThreadsAdapter } from './adapters/threads';
import { LoginWallError } from './adapters/base';
import { Notifier } from './services/notifier';
import { isPostSeen, savePost } from './services/database';
import { FileSaver } from './services/file_saver';
import { refreshCookies } from './tools/refresh_cookies';
import fs from 'fs';
import path from 'path';

// Load Config
const targetsPath = path.resolve(__dirname, '../config/targets.json');

const notifier = new Notifier();
const fileSaver = new FileSaver();

const adapters: Record<string, any> = {
    substack: new SubstackAdapter(),
    twitter: new TwitterAdapter(),
    facebook: new FacebookAdapter(),
    threads: new ThreadsAdapter()
};

let isRunning = false;

async function runCheck() {
    if (isRunning) {
        console.log('[Scheduler] Skip: Previous run still active.');
        return;
    }
    isRunning = true;
    console.log(`[Scheduler] Run Started at ${new Date().toISOString()}`);

    // Reload targets on every run
    let targets: any[] = [];
    if (fs.existsSync(targetsPath)) {
        try {
            targets = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
        } catch (e) {
            console.error('[Config] Failed to parse targets.json');
        }
    }

    try {
        // Init Adapters
        for (const key of Object.keys(adapters)) {
            await adapters[key].init();
        }

        for (const target of targets) {
            const { platform, url } = target;
            const adapter = adapters[platform];

            if (!adapter) {
                console.error(`Unknown platform: ${platform}`);
                continue;
            }

            console.log(`Checking ${platform}: ${url} ...`);

            try {
                const posts = await adapter.check(url);
                for (const post of posts) {
                    if (!isPostSeen(platform, post.id)) {
                        console.log(`[NEW] ${post.title}`);
                        savePost(post);
                        await fileSaver.save(post);
                        await notifier.send(platform, post.title, post.url);
                    }
                }
            } catch (err: any) {
                if (err instanceof LoginWallError) {
                    console.warn(`[LoginWall] Detected on ${platform}. Attempting automated refresh...`);

                    // Attempt Refresh
                    // Note: We should probably halt other checks or just try this one.
                    // IMPORTANT: We need to close browser instances before refreshing, or it might lock profiles (if passing user data dir to adapters too, which we aren't currently, but refresh tool does).
                    // However, refresh tool USES the user profile directory. Adapters use a temporary/default directory or none?
                    // Wait, adapters in base.ts use `puppeteer.launch` without userDataDir, so they don't lock the MAIN profile.
                    // The refresh tool attempts to lock the MAIN profile.

                    const refreshed = await refreshCookies();
                    if (refreshed) {
                        console.log(`[LoginWall] Refresh successful. Retrying ${platform}...`);
                        // Reload cookies into THIS adapter instance
                        await adapter.close(); // Close old instance
                        await adapter.init();  // Re-init (will load new cookies)

                        // Retry check once
                        try {
                            const posts = await adapter.check(url);
                            console.log(`[LoginWall] Retry Success! Found ${posts.length} posts.`);
                            // Process posts found after retry
                            for (const post of posts) {
                                if (!isPostSeen(platform, post.id)) {
                                    savePost(post);
                                    await fileSaver.save(post);
                                    await notifier.send(platform, post.title, post.url);
                                }
                            }
                        } catch (retryErr) {
                            console.error(`[LoginWall] Retry Failed: ${retryErr}`);
                        }
                    } else {
                        console.error(`[LoginWall] Automated refresh failed (Chrome is likely open).`);
                        await notifier.send('System Alert', `Login Wall on ${platform}`, 'Automated refresh failed. Please close Chrome on the server to allow cookie update.');
                    }
                } else {
                    console.error(`Failed to check ${url}:`, err.message);
                }
            }
        }
    } catch (err) {
        console.error('[Scheduler] Fatal Error:', err);
    } finally {
        for (const key of Object.keys(adapters)) {
            await adapters[key].close();
        }
        isRunning = false;
        console.log(`[Scheduler] Run Finished at ${new Date().toISOString()}`);
    }
}

// ---------------------------------------------------------
// Scheduling Logic
// ---------------------------------------------------------

(async () => {
    console.log('--- Post Tracker Service Started ---');
    console.log('--- Initial Cookie Refresh Check ---');
    // Try to refresh on startup, but don't block fatal if fails (just means Chrome might be open)
    await refreshCookies();

    console.log('Schedule: Every 30 minutes (*/30 * * * *)');

    // Run immediately
    runCheck();

    cron.schedule('*/30 * * * *', () => {
        runCheck();
    });
})();
