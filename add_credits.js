import Database from 'better-sqlite3';
const db = new Database('/home/guy/.gemini/antigravity/playground/rapid-universe/buildcheap.db');
db.exec("UPDATE users SET credit_balance = 50.0 WHERE email = 'guy@test.com'");
console.log('Credits Added');
