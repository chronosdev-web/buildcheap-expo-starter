import Database from 'better-sqlite3';
import { execSync } from 'child_process';
import crypto from 'crypto';
import pm2 from 'pm2';

const db = new Database('/home/guy/.gemini/antigravity/playground/rapid-universe/buildcheap.db');

try {
    // 1. Get or Create User
    let user = db.prepare('SELECT id FROM users LIMIT 1').get();
    if (!user) {
        const id = crypto.randomUUID();
        db.prepare(`
            INSERT INTO users (id, email, password_hash, display_name, credit_balance) 
            VALUES (?, ?, ?, ?, ?)
        `).run(id, 'tester@example.com', 'dummyhash', 'Guy', 100);
        user = { id };
        console.log('User created:', user.id);
    }

    // 2. Get GitHub Token
    const ghToken = execSync('gh auth token', { cwd: '/home/guy/.gemini/antigravity/playground/prime-station/calsnap' }).toString().trim();
    if (!ghToken) throw new Error('No GitHub token found');

    const repoUrl = `https://${ghToken}@github.com/chronosdev-web/calsnap.git`;

    // 3. Create or Get Project
    let project = db.prepare('SELECT id FROM projects WHERE slug = ?').get('calsnap');
    if (!project) {
        const id = crypto.randomUUID();
        db.prepare(`
            INSERT INTO projects (id, user_id, name, slug, repo_url, platform) 
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, user.id, 'CalSnap', 'calsnap', repoUrl, 'ios');
        project = { id };
        console.log('Project created:', project.id);
    } else {
        // Update URL just in case
        db.prepare('UPDATE projects SET repo_url = ? WHERE id = ?').run(repoUrl, project.id);
        console.log('Project updated:', project.id);
    }

    // 4. Send to Worker
    pm2.connect((err) => {
        if (err) {
            console.error(err);
            process.exit(2);
        }

        pm2.list((err, list) => {
            const worker = list.find(p => p.name === 'buildcheap-worker');
            if (worker) {
                pm2.sendDataToProcessId(worker.pm_id, {
                    type: 'process:msg',
                    data: {
                        type: 'queue_build',
                        payload: {
                            userId: user.id,
                            projectId: project.id,
                            platform: 'ios'
                        }
                    },
                    topic: 'queue_build'
                }, (err, res) => {
                    if (err) console.error('Error sending msg:', err);
                    else console.log('Successfully triggered build to worker!');
                    pm2.disconnect();
                });
            } else {
                console.error('Worker process not found in PM2');
                pm2.disconnect();
            }
        });
    });

} catch (err) {
    console.error('Script failed:', err);
}
