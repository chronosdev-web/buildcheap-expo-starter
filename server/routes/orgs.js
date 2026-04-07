// BuildCheap — Organization Routes (Team Collaboration)
import { Router } from 'express';
import { queries } from '../db.js';
import crypto from 'crypto';

const router = Router();

const ROLE_HIERARCHY = ['viewer', 'developer', 'admin', 'owner'];

function hasPermission(userRole, requiredRole) {
    return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

// GET /api/orgs — list user's organizations
router.get('/', (req, res) => {
    try {
        const orgs = queries.getOrgsByUser.all(req.user.id);
        res.json({ organizations: orgs });
    } catch (err) {
        res.status(500).json({ error: 'Failed to list organizations' });
    }
});

// POST /api/orgs — create a new organization
router.post('/', (req, res) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ error: 'Organization name must be at least 2 characters' });
        }

        const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
        const orgId = crypto.randomUUID();

        queries.createOrganization.run(orgId, name.trim(), slug + '-' + Date.now().toString(36), req.user.id);
        queries.addOrgMember.run(crypto.randomUUID(), orgId, req.user.id, 'owner');

        const org = queries.getOrgById.get(orgId);
        res.status(201).json({ organization: org });
    } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to create organization' });
    }
});

// GET /api/orgs/:id — get organization details
router.get('/:id', (req, res) => {
    try {
        const membership = queries.getOrgMembership.get(req.params.id, req.user.id);
        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this organization' });
        }

        const org = queries.getOrgById.get(req.params.id);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        res.json({ organization: org, role: membership.role });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get organization' });
    }
});

// PUT /api/orgs/:id — rename organization (admin+)
router.put('/:id', (req, res) => {
    try {
        const membership = queries.getOrgMembership.get(req.params.id, req.user.id);
        if (!membership || !hasPermission(membership.role, 'admin')) {
            return res.status(403).json({ error: 'Insufficient permissions. Requires admin role.' });
        }

        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ error: 'Name must be at least 2 characters' });
        }

        queries.updateOrg.run(name.trim(), req.params.id);
        const org = queries.getOrgById.get(req.params.id);
        res.json({ organization: org });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update organization' });
    }
});

// DELETE /api/orgs/:id — delete organization (owner only)
router.delete('/:id', (req, res) => {
    try {
        const membership = queries.getOrgMembership.get(req.params.id, req.user.id);
        if (!membership || membership.role !== 'owner') {
            return res.status(403).json({ error: 'Only the owner can delete an organization' });
        }

        queries.deleteOrg.run(req.params.id);
        res.json({ message: 'Organization deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete organization' });
    }
});

// GET /api/orgs/:id/members — list members
router.get('/:id/members', (req, res) => {
    try {
        const membership = queries.getOrgMembership.get(req.params.id, req.user.id);
        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this organization' });
        }

        const members = queries.getOrgMembers.all(req.params.id);
        res.json({ members });
    } catch (err) {
        res.status(500).json({ error: 'Failed to list members' });
    }
});

// POST /api/orgs/:id/members — invite a member by email (admin+)
router.post('/:id/members', (req, res) => {
    try {
        const membership = queries.getOrgMembership.get(req.params.id, req.user.id);
        if (!membership || !hasPermission(membership.role, 'admin')) {
            return res.status(403).json({ error: 'Insufficient permissions. Requires admin role.' });
        }

        const { email, role } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const validRoles = ['viewer', 'developer', 'admin'];
        const assignRole = validRoles.includes(role) ? role : 'developer';

        // Find user by email
        const targetUser = queries.getUserByEmail.get(email.trim().toLowerCase());
        if (!targetUser) {
            return res.status(404).json({ error: `No BuildCheap account found for ${email}. They need to sign up first.` });
        }

        // Check if already a member
        const existing = queries.getOrgMembership.get(req.params.id, targetUser.id);
        if (existing) {
            return res.status(409).json({ error: 'User is already a member of this organization' });
        }

        queries.addOrgMember.run(crypto.randomUUID(), req.params.id, targetUser.id, assignRole);

        const members = queries.getOrgMembers.all(req.params.id);
        res.status(201).json({ message: `${email} added as ${assignRole}`, members });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to add member' });
    }
});

// PUT /api/orgs/:id/members/:userId — update member role (admin+)
router.put('/:id/members/:userId', (req, res) => {
    try {
        const membership = queries.getOrgMembership.get(req.params.id, req.user.id);
        if (!membership || !hasPermission(membership.role, 'admin')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const { role } = req.body;
        const validRoles = ['viewer', 'developer', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Role must be viewer, developer, or admin' });
        }

        // Cannot change the owner's role
        const targetMembership = queries.getOrgMembership.get(req.params.id, req.params.userId);
        if (!targetMembership) return res.status(404).json({ error: 'Member not found' });
        if (targetMembership.role === 'owner') {
            return res.status(403).json({ error: 'Cannot change the owner\'s role' });
        }

        queries.updateOrgMemberRole.run(role, req.params.id, req.params.userId);
        res.json({ message: 'Role updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// DELETE /api/orgs/:id/members/:userId — remove member (admin+)
router.delete('/:id/members/:userId', (req, res) => {
    try {
        const membership = queries.getOrgMembership.get(req.params.id, req.user.id);
        if (!membership || !hasPermission(membership.role, 'admin')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Cannot remove the owner
        const targetMembership = queries.getOrgMembership.get(req.params.id, req.params.userId);
        if (!targetMembership) return res.status(404).json({ error: 'Member not found' });
        if (targetMembership.role === 'owner') {
            return res.status(403).json({ error: 'Cannot remove the organization owner' });
        }

        // Cannot remove yourself if you're the last admin
        if (req.params.userId === req.user.id) {
            return res.status(400).json({ error: 'You cannot remove yourself. Transfer ownership first.' });
        }

        queries.removeOrgMember.run(req.params.id, req.params.userId);
        res.json({ message: 'Member removed' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

export default router;
