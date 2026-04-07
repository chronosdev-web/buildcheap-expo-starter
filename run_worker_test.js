import Database from 'better-sqlite3';
import { fork } from 'child_process';
import path from 'path';

const db = new Database('/home/guy/.gemini/antigravity/playground/rapid-universe/buildcheap.db');

// Inject test build
const buildId = 'local-test-build-' + Date.now();
const userId = db.prepare("SELECT id FROM users LIMIT 1").get().id;
const projectId = db.prepare("SELECT id FROM projects LIMIT 1").get()?.id;

if (!projectId) {
    db.prepare("INSERT INTO projects (id, user_id, name, slug, repo_url, bundle_id, platform) VALUES (?, ?, 'calsnap', 'test/calsnap', 'https://github.com/chronosdev-web/calsnap', 'com.appfactory.plateiq', 'ios')").run('test-project-1', userId);
}
const proj = db.prepare("SELECT id FROM projects LIMIT 1").get();

db.prepare(`
    INSERT INTO builds (id, project_id, user_id, build_number, platform, commit_hash, commit_message, status)
    VALUES (?, ?, ?, 1, 'ios', 'HEAD', 'Local Test', 'queued')
`).run(buildId, proj.id, userId);

console.log('Injected build: ' + buildId);

// Start worker
const workerPath = path.resolve('/home/guy/.gemini/antigravity/playground/rapid-universe/server/worker.js');
const worker = fork(workerPath, [], {
    env: { ...process.env, COST_PER_BUILD: '0' }
});

worker.on('message', (msg) => {
    console.log('[Worker Msg]', msg);
    if (msg.type === 'queue_empty') {
        process.exit(0);
    }
});

worker.send({
    type: 'queue_build', data: {
        userId: userId, projectId: proj.id, platform: 'ios', commitHash: 'HEAD', commitMessage: 'test'
    }
});
