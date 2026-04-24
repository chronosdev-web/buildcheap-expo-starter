import db from './server/db.js';
import { generateToken } from './server/auth.js';
import 'dotenv/config'; // Make sure JWT_SECRET is loaded

async function main() {
    const user = db.prepare('SELECT * FROM users LIMIT 1').get();
    if (!user) {
        console.log('No user found');
        return;
    }

    const token = generateToken(user);

    db.prepare('UPDATE users SET github_token = ? WHERE id = ?').run('dummy_gh_token', user.id);
    console.log('Updated user with a fake GH token');

    const res = await fetch('http://localhost:3000/api/credentials/github', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Body:', text);

    const check = db.prepare('SELECT github_token FROM users WHERE id = ?').get(user.id);
    console.log('DB github_token:', check.github_token);
}

main().catch(console.error);
