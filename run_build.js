import { buildIOS } from './server/worker.js';
import { execSync } from 'child_process';

async function main() {
    console.log('Starting manual BuildCheap upload for CalSnap...');
    try {
        const ghToken = execSync('gh auth token', { cwd: '/home/guy/.gemini/antigravity/playground/prime-station/calsnap' }).toString().trim();
        const repoUrl = `https://${ghToken}@github.com/chronosdev-web/calsnap.git`;

        await buildIOS({
            userId: '1',
            projectId: 'calsnap',
            projectSlug: 'calsnap',
            repoUrl: repoUrl
        }, (msg) => { console.log(msg) });

        console.log('Manual upload finished successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Upload failed:', err);
        process.exit(1);
    }
}

main();
