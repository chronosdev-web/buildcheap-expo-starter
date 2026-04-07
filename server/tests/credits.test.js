import { describe, it } from 'node:test';
import assert from 'node:assert';
import db, { queries, deductCreditAndCreateBuild, refundBuildCredit } from '../db.js';

describe('Credit Transactions (Billing Architecture)', () => {
    // We run tests against the same SQLite store.
    // For safety, we will create a mock user and clean them up.

    it('should successfully deduct credits and create a build for sufficient balance', (t) => {
        // Mock User
        const mockUserId = 'test-user-' + Date.now();
        const mockProjectId = 'test-project-' + Date.now();
        const mockBuildId = 'test-build-' + Date.now();

        db.prepare('INSERT INTO users (id, email, password_hash, display_name, credit_balance) VALUES (?, ?, ?, ?, ?)').run(
            mockUserId, `test-${Date.now()}@buildcheap.com`, 'hash', 'Test User', 10.0
        );

        db.prepare('INSERT INTO projects (id, user_id, name, slug) VALUES (?, ?, ?, ?)').run(
            mockProjectId, mockUserId, 'Test Project', 'test-project'
        );

        // Act: Atomic transaction
        const COST_PER_BUILD = 0.50;
        deductCreditAndCreateBuild(
            mockUserId, mockBuildId, mockProjectId, 1,
            'ios', 'HEAD', 'Test commit', COST_PER_BUILD
        );

        // Assert
        const updatedUser = queries.getUserById.get(mockUserId);
        assert.strictEqual(updatedUser.credit_balance, 9.50, 'Credit balance should be accurately deducted (-0.50)');

        const build = queries.getBuildById.get(mockBuildId);
        assert.ok(build, 'Build record is successfully initialized in SQLite');

        // Clean up
        db.prepare('DELETE FROM builds WHERE id = ?').run(mockBuildId);
        db.prepare('DELETE FROM projects WHERE id = ?').run(mockProjectId);
        db.prepare('DELETE FROM credit_transactions WHERE user_id = ?').run(mockUserId);
        db.prepare('DELETE FROM users WHERE id = ?').run(mockUserId);
    });

    it('should throw an Insufficient Credits error and abort the build creation if balance is too low', (t) => {
        const mockUserId = 'test-user-poor-' + Date.now();
        const mockProjectId = 'test-project-poor-' + Date.now();
        const mockBuildId = 'test-build-poor-' + Date.now();

        db.prepare('INSERT INTO users (id, email, password_hash, display_name, credit_balance) VALUES (?, ?, ?, ?, ?)').run(
            mockUserId, `poor-${Date.now()}@buildcheap.com`, 'hash', 'Poor User', 0.20
        );

        db.prepare('INSERT INTO projects (id, user_id, name, slug) VALUES (?, ?, ?, ?)').run(
            mockProjectId, mockUserId, 'Poor Project', 'poor-project'
        );

        let caughtError = null;
        try {
            deductCreditAndCreateBuild(
                mockUserId, mockBuildId, mockProjectId, 1,
                'ios', 'HEAD', 'Test failing commit', 0.50
            );
        } catch (err) {
            caughtError = err;
        }

        assert.ok(caughtError, 'Should throw an exception during transaction');
        assert.strictEqual(caughtError.message, 'Insufficient credits', 'Exception must be of Insufficient credits protocol');

        // Confirm rollback occurred
        const builds = db.prepare('SELECT * FROM builds WHERE id = ?').get(mockBuildId);
        assert.strictEqual(builds, undefined, 'Build must safely rollback and not exist');

        const unalteredUser = queries.getUserById.get(mockUserId);
        assert.strictEqual(unalteredUser.credit_balance, 0.20, 'Credits must remain completely untouched on transaction failure');

        // Clean up
        db.prepare('DELETE FROM projects WHERE id = ?').run(mockProjectId);
        db.prepare('DELETE FROM users WHERE id = ?').run(mockUserId);
    });
});
