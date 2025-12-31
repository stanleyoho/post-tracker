import fs from 'fs';

const LOCAL_STATE_PATH = '/Users/stanley.ch.lin/Library/Application Support/Google/Chrome/Local State';

if (fs.existsSync(LOCAL_STATE_PATH)) {
    const data = JSON.parse(fs.readFileSync(LOCAL_STATE_PATH, 'utf8'));
    const info_cache = data.profile.info_cache;

    console.log('--- Found Profiles ---');
    for (const key in info_cache) {
        console.log(`Directory: ${key}, Name: ${info_cache[key].name}`);
    }
} else {
    console.log('Local State file not found.');
}
