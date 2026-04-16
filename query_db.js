import Database from 'better-sqlite3';
const db = new Database('./buildcheap.db');
const project = db.prepare("SELECT * FROM projects WHERE id = ?").get('d05f3b06-399a-4b48-833f-c5f08bc7d39e');
console.log("Project:", project);
