// BuildCheap — Database Schema
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '..', 'buildcheap.db'));

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    stripe_customer_id TEXT,
    api_key TEXT UNIQUE,
    credit_balance REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    repo_url TEXT,
    platform TEXT DEFAULT 'both',
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, slug)
  );

  CREATE TABLE IF NOT EXISTS builds (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    build_number INTEGER NOT NULL,
    platform TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    commit_hash TEXT,
    commit_message TEXT,
    duration_seconds INTEGER,
    artifact_url TEXT,
    artifact_size INTEGER,
    cost REAL DEFAULT 0.50,
    log TEXT,
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    stripe_payment_id TEXT,
    build_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
  CREATE INDEX IF NOT EXISTS idx_builds_project ON builds(project_id);
  CREATE INDEX IF NOT EXISTS idx_builds_user ON builds(user_id);
  CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
  CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
`);

// Prepared statements for common operations
export const queries = {
    // Users
    createUser: db.prepare(`
    INSERT INTO users (id, email, password_hash, display_name, api_key)
    VALUES (?, ?, ?, ?, ?)
  `),
    getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
    getUserByApiKey: db.prepare('SELECT * FROM users WHERE api_key = ?'),
    updateUserCredits: db.prepare('UPDATE users SET credit_balance = ? WHERE id = ?'),
    setStripeCustomerId: db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?'),
    updateUser: db.prepare('UPDATE users SET display_name = ?, updated_at = datetime(\'now\') WHERE id = ?'),

    // Projects
    createProject: db.prepare(`
    INSERT INTO projects (id, user_id, name, slug, repo_url, platform, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
    getProjectsByUser: db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC'),
    getProjectById: db.prepare('SELECT * FROM projects WHERE id = ?'),
    deleteProject: db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?'),
    updateProject: db.prepare(`
    UPDATE projects SET name = ?, repo_url = ?, platform = ?, description = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `),

    // Builds
    createBuild: db.prepare(`
    INSERT INTO builds (id, project_id, user_id, build_number, platform, commit_hash, commit_message)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
    getBuildsByUser: db.prepare(`
    SELECT b.*, p.name as project_name, p.slug as project_slug
    FROM builds b JOIN projects p ON b.project_id = p.id
    WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT ? OFFSET ?
  `),
    getBuildsByProject: db.prepare(`
    SELECT * FROM builds WHERE project_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
  `),
    getBuildById: db.prepare('SELECT * FROM builds WHERE id = ?'),
    getNextBuildNumber: db.prepare('SELECT COALESCE(MAX(build_number), 0) + 1 as next FROM builds WHERE project_id = ?'),
    updateBuildStatus: db.prepare(`
    UPDATE builds SET status = ?, started_at = ?, completed_at = ?, duration_seconds = ?,
    artifact_url = ?, artifact_size = ?, log = ?, error_message = ?
    WHERE id = ?
  `),
    getActiveBuildCount: db.prepare(`
    SELECT COUNT(*) as count FROM builds WHERE status IN ('queued', 'building')
  `),
    getUserBuildStats: db.prepare(`
    SELECT
      COUNT(*) as total_builds,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_builds,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_builds,
      AVG(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds END) as avg_duration,
      SUM(cost) as total_cost
    FROM builds WHERE user_id = ?
  `),

    // Credits
    createCreditTransaction: db.prepare(`
    INSERT INTO credit_transactions (id, user_id, amount, type, description, stripe_payment_id, build_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
    getCreditHistory: db.prepare(`
    SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
  `),
};

// Transaction helper for atomic credit deduction + build creation
export const deductCreditAndCreateBuild = db.transaction((userId, buildId, projectId, buildNumber, platform, commitHash, commitMessage, cost) => {
    const user = queries.getUserById.get(userId);
    if (user.credit_balance < cost) {
        throw new Error('Insufficient credits');
    }

    queries.updateUserCredits.run(user.credit_balance - cost, userId);
    queries.createBuild.run(buildId, projectId, userId, buildNumber, platform, commitHash, commitMessage);
    queries.createCreditTransaction.run(
        crypto.randomUUID(), userId, -cost, 'build',
        `Build #${buildNumber} (${platform})`, null, buildId
    );
});

// Refund credit for failed build
export const refundBuildCredit = db.transaction((userId, buildId, cost) => {
    const user = queries.getUserById.get(userId);
    queries.updateUserCredits.run(user.credit_balance + cost, userId);
    queries.createCreditTransaction.run(
        crypto.randomUUID(), userId, cost, 'refund',
        'Build failed — credit refunded', null, buildId
    );
});

export default db;
