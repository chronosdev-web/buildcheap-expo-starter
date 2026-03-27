// BuildCheap — Project Routes
import { Router } from 'express';
import { queries } from '../db.js';
import crypto from 'crypto';

const router = Router();

// GET /api/projects — list user's projects
router.get('/', (req, res) => {
    const projects = queries.getProjectsByUser.all(req.user.id);
    res.json({ projects });
});

// POST /api/projects — create project
router.post('/', (req, res) => {
    try {
        const { name, slug, repo_url, bundle_id, platform, description } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and slug are required' });
        }

        // Validate slug format
        const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        const id = crypto.randomUUID();
        queries.createProject.run(id, req.user.id, name, cleanSlug, repo_url || null, bundle_id || null, platform || 'both', description || null);

        const project = queries.getProjectById.get(id);
        res.status(201).json({ project });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'A project with this slug already exists' });
        }
        res.status(400).json({ error: err.message });
    }
});

// GET /api/projects/:id — get project details
router.get('/:id', (req, res) => {
    const project = queries.getProjectById.get(req.params.id);
    if (!project || project.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ project });
});

// PUT /api/projects/:id — update project
router.put('/:id', (req, res) => {
    const { name, repo_url, bundle_id, platform, description } = req.body;
    const existing = queries.getProjectById.get(req.params.id);

    if (!existing || existing.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Project not found' });
    }

    queries.updateProject.run(
        name || existing.name,
        repo_url !== undefined ? repo_url : existing.repo_url,
        bundle_id !== undefined ? bundle_id : existing.bundle_id,
        platform || existing.platform,
        description !== undefined ? description : existing.description,
        req.params.id, req.user.id
    );

    const project = queries.getProjectById.get(req.params.id);
    res.json({ project });
});

// DELETE /api/projects/:id — delete project
router.delete('/:id', (req, res) => {
    const result = queries.deleteProject.run(req.params.id, req.user.id);
    if (result.changes === 0) {
        return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project deleted' });
});

export default router;
