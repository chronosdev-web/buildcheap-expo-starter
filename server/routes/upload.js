// BuildCheap — Project Upload Routes
import { Router } from 'express';
import { queries } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

const UPLOAD_DIR = process.env.ARTIFACTS_DIR || './artifacts';
const MAX_SIZE = 500 * 1024 * 1024; // 500MB

// POST /api/projects/:id/upload — upload project source as zip/tar.gz
router.post('/:id/upload', async (req, res) => {
    try {
        const project = queries.getProjectById.get(req.params.id);
        if (!project || project.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const contentType = req.headers['content-type'] || '';
        const contentLength = parseInt(req.headers['content-length'] || '0');

        if (contentLength > MAX_SIZE) {
            return res.status(413).json({ error: `Upload too large. Max ${MAX_SIZE / 1024 / 1024}MB` });
        }

        // Determine file type
        let ext = '.tar.gz';
        if (contentType.includes('zip') || req.query.format === 'zip') {
            ext = '.zip';
        }

        const projectDir = path.join(UPLOAD_DIR, 'projects', project.id);
        const sourceDir = path.join(projectDir, 'source');
        const archivePath = path.join(projectDir, `upload${ext}`);

        // Clean previous upload
        if (fs.existsSync(sourceDir)) {
            fs.rmSync(sourceDir, { recursive: true, force: true });
        }
        fs.mkdirSync(projectDir, { recursive: true });

        // Stream body to file
        const writeStream = fs.createWriteStream(archivePath);
        await new Promise((resolve, reject) => {
            req.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Extract archive
        fs.mkdirSync(sourceDir, { recursive: true });

        if (ext === '.zip') {
            await runCmd('unzip', ['-o', archivePath, '-d', sourceDir]);
        } else {
            await runCmd('tar', ['-xzf', archivePath, '-C', sourceDir, '--strip-components=1']);
        }

        // Initialize as git repo (worker uses git clone)
        await runCmd('git', ['init'], sourceDir);
        await runCmd('git', ['config', 'user.email', 'build@buildcheap.com'], sourceDir);
        await runCmd('git', ['config', 'user.name', 'BuildCheap'], sourceDir);
        await runCmd('git', ['add', '.'], sourceDir);
        await runCmd('git', ['commit', '-m', 'Upload'], sourceDir);

        // Update project repo_url to point to local source
        const repoUrl = `file://${path.resolve(sourceDir)}`;
        queries.updateProject.run(
            project.name,
            repoUrl,
            project.bundle_id,
            project.platform,
            project.description,
            project.id, project.user_id
        );

        // Clean up archive
        fs.unlinkSync(archivePath);

        const stats = fs.readdirSync(sourceDir);
        res.json({
            message: 'Project uploaded successfully',
            files: stats.length,
            repo_url: repoUrl,
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Helper to run shell commands
function runCmd(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { cwd: cwd || process.cwd(), stdio: 'pipe' });
        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });
        proc.on('close', code => {
            code === 0 ? resolve() : reject(new Error(`${cmd} failed: ${stderr}`));
        });
        proc.on('error', err => reject(err));
    });
}

export default router;
