import { refreshCookies } from './refresh_cookies';

(async () => {
    const success = await refreshCookies();
    if (!success) {
        console.error('Failed to refresh cookies. Please close Chrome and try again.');
        process.exit(1);
    } else {
        console.log('Done.');
        process.exit(0);
    }
})();
