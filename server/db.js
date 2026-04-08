// BuildCheap — Database Schema
import Database from 'better-sqlite3';
import crypto from 'crypto';
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
    github_token TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    repo_url TEXT,
    bundle_id TEXT,
    platform TEXT DEFAULT 'both',
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, slug)
  );

  CREATE TABLE IF NOT EXISTS apple_credentials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    issuer_id TEXT NOT NULL,
    key_id TEXT NOT NULL,
    private_key_encrypted TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    team_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

  CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_secrets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    key_name TEXT NOT NULL,
    value_encrypted TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, key_name)
  );

  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS organization_members (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'developer',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(org_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

  CREATE TABLE IF NOT EXISTS bug_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);
`);

// Simple auto-migrations for existing databases
const migrations = [
  "ALTER TABLE projects ADD COLUMN repo_url TEXT",
  "ALTER TABLE projects ADD COLUMN bundle_id TEXT",
  "ALTER TABLE projects ADD COLUMN platform TEXT DEFAULT 'both'",
  "ALTER TABLE projects ADD COLUMN description TEXT",
  "ALTER TABLE users ADD COLUMN github_token TEXT",
  "ALTER TABLE users ADD COLUMN avatar_url TEXT",
  "ALTER TABLE projects ADD COLUMN org_id TEXT"
];

for (const query of migrations) {
  try {
    db.exec(query);
  } catch (err) {
    // Ignore if column already exists
    if (!err.message.includes('duplicate column name')) {
      console.warn('Migration warning:', err.message);
    }
  }
}

// Backfill: create "Personal" org for users without one
function backfillOrganizations() {
  const users = db.prepare('SELECT id, display_name, email FROM users').all();
  for (const user of users) {
    const existing = db.prepare('SELECT id FROM organization_members WHERE user_id = ?').get(user.id);
    if (!existing) {
      const orgId = crypto.randomUUID();
      const slug = (user.display_name || user.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) + '-personal';
      try {
        db.prepare('INSERT INTO organizations (id, name, slug, owner_id) VALUES (?, ?, ?, ?)').run(orgId, `${user.display_name || 'My'}'s Team`, slug, user.id);
        db.prepare('INSERT INTO organization_members (id, org_id, user_id, role) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), orgId, user.id, 'owner');
        // Migrate existing projects to this org
        db.prepare('UPDATE projects SET org_id = ? WHERE user_id = ? AND org_id IS NULL').run(orgId, user.id);
      } catch (e) {
        // slug conflict — skip
      }
    }
  }
}
backfillOrganizations();

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
  getUserByStripeCustomerId: db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?'),
  updateUserGithubToken: db.prepare('UPDATE users SET github_token = ? WHERE id = ?'),
  updateUser: db.prepare('UPDATE users SET display_name = ?, updated_at = datetime(\'now\') WHERE id = ?'),
  updateUserAvatar: db.prepare('UPDATE users SET avatar_url = ?, updated_at = datetime(\'now\') WHERE id = ?'),

  // Projects
  createProject: db.prepare(`
    INSERT INTO projects (id, user_id, name, slug, repo_url, bundle_id, platform, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getProjectsByUser: db.prepare(`
    SELECT p.*,
      (SELECT status FROM builds WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as last_build_status,
      (SELECT created_at FROM builds WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as last_build_time
    FROM projects p
    WHERE p.user_id = ?
    ORDER BY p.updated_at DESC
  `),
  getProjectById: db.prepare('SELECT * FROM projects WHERE id = ?'),
  deleteProject: db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?'),
  updateProject: db.prepare(`
    UPDATE projects SET name = ?, repo_url = ?, bundle_id = ?, platform = ?, description = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `),

  // Apple Credentials
  saveAppleCredentials: db.prepare(`
    INSERT OR REPLACE INTO apple_credentials (id, user_id, issuer_id, key_id, private_key_encrypted, iv, auth_tag, team_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getAppleCredentials: db.prepare('SELECT * FROM apple_credentials WHERE user_id = ?'),
  deleteAppleCredentials: db.prepare('DELETE FROM apple_credentials WHERE user_id = ?'),

  // Builds
  createBuild: db.prepare(`
    INSERT INTO builds (id, project_id, user_id, build_number, platform, commit_hash, commit_message)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  getBuildsByUser: db.prepare(`
    SELECT b.id, b.project_id, b.user_id, b.build_number, b.platform, b.status, b.commit_hash, b.commit_message, b.duration_seconds, b.artifact_url, b.artifact_size, b.cost, b.error_message, b.started_at, b.completed_at, b.created_at, p.name as project_name, p.slug as project_slug
    FROM builds b JOIN projects p ON b.project_id = p.id
    WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT ? OFFSET ?
  `),
  getBuildsByProject: db.prepare(`
    SELECT id, project_id, user_id, build_number, platform, status, commit_hash, commit_message, duration_seconds, artifact_url, artifact_size, cost, error_message, started_at, completed_at, created_at
    FROM builds WHERE project_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
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

  // Webhooks
  createWebhook: db.prepare('INSERT INTO webhooks (id, user_id, url) VALUES (?, ?, ?)'),
  getWebhooksByUser: db.prepare('SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC'),
  deleteWebhook: db.prepare('DELETE FROM webhooks WHERE id = ? AND user_id = ?'),
  getWebhooksByProjectOwner: db.prepare(`
    SELECT w.* FROM webhooks w
    JOIN projects p ON p.user_id = w.user_id
    WHERE p.id = ?
  `),

  // Project Secrets
  createProjectSecret: db.prepare(`
    INSERT INTO project_secrets (id, project_id, key_name, value_encrypted, iv, auth_tag) 
    VALUES (?, ?, ?, ?, ?, ?) 
    ON CONFLICT(project_id, key_name) DO UPDATE SET 
      value_encrypted=excluded.value_encrypted, 
      iv=excluded.iv, 
      auth_tag=excluded.auth_tag
  `),
  getProjectSecrets: db.prepare('SELECT id, key_name, created_at FROM project_secrets WHERE project_id = ? ORDER BY key_name ASC'),
  getDecryptedSecrets: db.prepare('SELECT key_name, value_encrypted, iv, auth_tag FROM project_secrets WHERE project_id = ?'),
  deleteProjectSecret: db.prepare('DELETE FROM project_secrets WHERE id = ? AND project_id = ?'),

  // Organizations
  createOrganization: db.prepare('INSERT INTO organizations (id, name, slug, owner_id) VALUES (?, ?, ?, ?)'),
  getOrgsByUser: db.prepare(`
    SELECT o.*, om.role FROM organizations o
    JOIN organization_members om ON om.org_id = o.id
    WHERE om.user_id = ? ORDER BY o.created_at ASC
  `),
  getOrgById: db.prepare('SELECT * FROM organizations WHERE id = ?'),
  updateOrg: db.prepare('UPDATE organizations SET name = ?, updated_at = datetime(\'now\') WHERE id = ?'),
  deleteOrg: db.prepare('DELETE FROM organizations WHERE id = ?'),
  getOrgMembers: db.prepare(`
    SELECT om.id, om.role, om.created_at, u.id as user_id, u.display_name, u.email, u.avatar_url
    FROM organization_members om JOIN users u ON u.id = om.user_id
    WHERE om.org_id = ? ORDER BY om.created_at ASC
  `),
  addOrgMember: db.prepare('INSERT INTO organization_members (id, org_id, user_id, role) VALUES (?, ?, ?, ?)'),
  removeOrgMember: db.prepare('DELETE FROM organization_members WHERE org_id = ? AND user_id = ?'),
  getOrgMembership: db.prepare('SELECT * FROM organization_members WHERE org_id = ? AND user_id = ?'),
  updateOrgMemberRole: db.prepare('UPDATE organization_members SET role = ? WHERE org_id = ? AND user_id = ?'),

  // Bug Reports
  createBugReport: db.prepare('INSERT INTO bug_reports (id, user_id, title, description) VALUES (?, ?, ?, ?)'),
  getUserBugs: db.prepare('SELECT * FROM bug_reports WHERE user_id = ? ORDER BY created_at DESC'),
  getAllBugs: db.prepare('SELECT b.*, u.display_name, u.email FROM bug_reports b JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC'),
  resolveBug: db.prepare('UPDATE bug_reports SET status = ? WHERE id = ?'),
  deleteBug: db.prepare('DELETE FROM bug_reports WHERE id = ?'),
};

// Transaction helper for atomic credit deduction + build creation
export const deductCreditAndCreateBuild = db.transaction((userId, buildId, projectId, buildNumber, platform, commitHash, commitMessage, cost) => {
  const user = queries.getUserById.get(userId);

  const firstUser = db.prepare('SELECT id FROM users ORDER BY created_at ASC LIMIT 1').get();
  const isInfiniteUser = (firstUser && user.id === firstUser.id);

  if (!isInfiniteUser && user.credit_balance < cost) {
    throw new Error('Insufficient credits');
  }

  const project = queries.getProjectById.get(projectId);
  const projectName = project ? project.name : 'Project';

  if (!isInfiniteUser) {
    queries.updateUserCredits.run(user.credit_balance - cost, userId);
    queries.createCreditTransaction.run(
      crypto.randomUUID(), userId, -cost, 'build',
      `${projectName} Build #${buildNumber} (${platform})`, null, buildId
    );
  }

  queries.createBuild.run(buildId, projectId, userId, buildNumber, platform, commitHash, commitMessage);
});

// Refund credit for failed build
export const refundBuildCredit = db.transaction((userId, buildId, cost) => {
  const user = queries.getUserById.get(userId);

  const firstUser = db.prepare('SELECT id FROM users ORDER BY created_at ASC LIMIT 1').get();
  const isInfiniteUser = (firstUser && user.id === firstUser.id);
  if (isInfiniteUser) return;

  let projectName = 'Project';
  const build = queries.getBuildById.get(buildId);
  if (build) {
    const project = queries.getProjectById.get(build.project_id);
    if (project) projectName = project.name;
  }

  queries.updateUserCredits.run(user.credit_balance + cost, userId);
  queries.createCreditTransaction.run(
    crypto.randomUUID(), userId, cost, 'refund',
    `${projectName} Build failed — credit refunded`, null, buildId
  );
});

export default db;
