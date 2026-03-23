// OTA Updates page
import { createDashboardLayout } from '../components/layout.js';

export function renderUpdates(container) {
    const content = `
    <div class="page-title-bar">
      <h2>OTA Updates</h2>
      <button class="btn btn-primary">+ Publish Update</button>
    </div>
    
    <p style="color:var(--text-tertiary);margin-bottom:var(--space-xl);font-size:0.875rem;">
      Push JavaScript bundle updates to your users instantly — no app store review required.
    </p>
    
    <!-- Channel selector -->
    <div class="tabs" style="margin-bottom:var(--space-xl);">
      <div class="tab active">Production</div>
      <div class="tab">Staging</div>
      <div class="tab">Preview</div>
    </div>
    
    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(3, 1fr);">
      <div class="card stat-card">
        <div class="stat-label">Total Updates</div>
        <div class="stat-value">34</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Active Users on Latest</div>
        <div class="stat-value">89%</div>
        <div class="stat-change positive">↑ 4% this week</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Rollback Count</div>
        <div class="stat-value">1</div>
      </div>
    </div>
    
    <!-- Update Timeline -->
    <div class="section-header">
      <h3>Update History</h3>
    </div>
    <div class="card" style="padding:var(--space-lg);">
      <div class="update-list">
        <div class="update-card">
          <div class="update-timeline">
            <div class="update-dot" style="background:var(--success);box-shadow:0 0 8px var(--success);"></div>
            <div class="update-line"></div>
          </div>
          <div class="update-content">
            <div class="update-title">Update #34 — CalSnap</div>
            <div class="update-meta">
              <span>📦 Bundle: 2.4 MB</span>
              <span>👥 892 devices received</span>
              <span>⏱️ 12 min ago</span>
            </div>
            <div style="margin-top:var(--space-sm);font-size:0.8125rem;color:var(--text-tertiary);">
              <code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;font-size:0.75rem;">abc1234</code>
              fix camera permission on iOS 18
            </div>
          </div>
          <div style="display:flex;gap:var(--space-sm);">
            <span class="badge badge-success">Live</span>
            <button class="btn btn-ghost btn-sm">Rollback</button>
          </div>
        </div>
        
        <div class="update-card">
          <div class="update-timeline">
            <div class="update-dot"></div>
            <div class="update-line"></div>
          </div>
          <div class="update-content">
            <div class="update-title">Update #33 — CalSnap</div>
            <div class="update-meta">
              <span>📦 Bundle: 2.3 MB</span>
              <span>👥 845 devices received</span>
              <span>⏱️ 2 days ago</span>
            </div>
            <div style="margin-top:var(--space-sm);font-size:0.8125rem;color:var(--text-tertiary);">
              <code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;font-size:0.75rem;">def5678</code>
              update meal history UI
            </div>
          </div>
          <span class="badge badge-neutral">Superseded</span>
        </div>
        
        <div class="update-card">
          <div class="update-timeline">
            <div class="update-dot"></div>
            <div class="update-line"></div>
          </div>
          <div class="update-content">
            <div class="update-title">Update #32 — Crossroads</div>
            <div class="update-meta">
              <span>📦 Bundle: 1.8 MB</span>
              <span>👥 312 devices received</span>
              <span>⏱️ 4 days ago</span>
            </div>
            <div style="margin-top:var(--space-sm);font-size:0.8125rem;color:var(--text-tertiary);">
              <code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;font-size:0.75rem;">ghi9012</code>
              add artist biography section
            </div>
          </div>
          <span class="badge badge-neutral">Superseded</span>
        </div>
        
        <div class="update-card">
          <div class="update-timeline">
            <div class="update-dot" style="background:var(--error);"></div>
            <div class="update-line"></div>
          </div>
          <div class="update-content">
            <div class="update-title">Update #31 — Crossroads <span class="badge badge-error" style="margin-left:var(--space-sm);">Rolled back</span></div>
            <div class="update-meta">
              <span>📦 Bundle: 1.9 MB</span>
              <span>👥 28 devices received</span>
              <span>⏱️ 5 days ago</span>
            </div>
            <div style="margin-top:var(--space-sm);font-size:0.8125rem;color:var(--text-tertiary);">
              <code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;font-size:0.75rem;">jkl3456</code>
              broken playlist rendering — rolled back after 15 min
            </div>
          </div>
          <span class="badge badge-error">Rolled back</span>
        </div>
        
        <div class="update-card">
          <div class="update-timeline">
            <div class="update-dot"></div>
          </div>
          <div class="update-content">
            <div class="update-title">Update #30 — MusicApp</div>
            <div class="update-meta">
              <span>📦 Bundle: 3.1 MB</span>
              <span>👥 1,204 devices received</span>
              <span>⏱️ 1 week ago</span>
            </div>
            <div style="margin-top:var(--space-sm);font-size:0.8125rem;color:var(--text-tertiary);">
              <code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;font-size:0.75rem;">mno7890</code>
              v1.2 hotfix: audio playback resume
            </div>
          </div>
          <span class="badge badge-neutral">Superseded</span>
        </div>
      </div>
    </div>
  `;

    const layout = createDashboardLayout('updates', content);
    container.appendChild(layout);
}
