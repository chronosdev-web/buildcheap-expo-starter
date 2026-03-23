// Projects page
import { createDashboardLayout } from '../components/layout.js';

export function renderProjects(container) {
    const content = `
    <div class="page-title-bar">
      <h2>Projects</h2>
      <button class="btn btn-primary" id="newProjectBtn">+ New Project</button>
    </div>
    
    <div class="projects-grid">
      <div class="card card-glow project-card animate-in stagger-1">
        <div class="project-card-header">
          <div class="project-icon both">📱</div>
          <div>
            <div class="project-card-title">CalSnap</div>
            <div class="project-card-slug">@guy/calsnap</div>
          </div>
          <span class="badge badge-success" style="margin-left:auto;">Active</span>
        </div>
        <p style="font-size:0.8125rem;color:var(--text-tertiary);margin-bottom:var(--space-md);line-height:1.6;">
          AI-powered calorie tracker using phone camera. Snap a photo of your meal and get instant nutritional info.
        </p>
        <div class="project-card-meta">
          <div class="meta-item">🔨 <span>73 builds</span></div>
          <div class="meta-item">📱 <span>iOS + Android</span></div>
          <div class="meta-item">⏱️ <span>2 min ago</span></div>
        </div>
      </div>
      
      <div class="card card-glow project-card animate-in stagger-2">
        <div class="project-card-header">
          <div class="project-icon ios">🎵</div>
          <div>
            <div class="project-card-title">Down to the Crossroads</div>
            <div class="project-card-slug">@guy/crossroads</div>
          </div>
          <span class="badge badge-warning" style="margin-left:auto;">Building</span>
        </div>
        <p style="font-size:0.8125rem;color:var(--text-tertiary);margin-bottom:var(--space-md);line-height:1.6;">
          Blues music discovery app with curated playlists and artist histories from the Mississippi Delta.
        </p>
        <div class="project-card-meta">
          <div class="meta-item">🔨 <span>45 builds</span></div>
          <div class="meta-item">📱 <span>iOS</span></div>
          <div class="meta-item">⏱️ <span>Building now</span></div>
        </div>
      </div>
      
      <div class="card card-glow project-card animate-in stagger-3">
        <div class="project-card-header">
          <div class="project-icon android">🎶</div>
          <div>
            <div class="project-card-title">MusicApp</div>
            <div class="project-card-slug">@guy/musicapp</div>
          </div>
          <span class="badge badge-success" style="margin-left:auto;">Active</span>
        </div>
        <p style="font-size:0.8125rem;color:var(--text-tertiary);margin-bottom:var(--space-md);line-height:1.6;">
          Full-featured music streaming app with offline mode and personalized recommendations.
        </p>
        <div class="project-card-meta">
          <div class="meta-item">🔨 <span>129 builds</span></div>
          <div class="meta-item">📱 <span>Android</span></div>
          <div class="meta-item">⏱️ <span>3 hrs ago</span></div>
        </div>
      </div>
      
      <div class="card project-card animate-in stagger-4" style="border:2px dashed var(--border-medium);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;cursor:pointer;">
        <div style="font-size:2rem;margin-bottom:var(--space-sm);opacity:0.4;">+</div>
        <div style="font-size:0.875rem;color:var(--text-tertiary);font-weight:600;">Create New Project</div>
        <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px;">Connect a repo or start fresh</div>
      </div>
    </div>
  `;

    const layout = createDashboardLayout('projects', content);
    container.appendChild(layout);
}
