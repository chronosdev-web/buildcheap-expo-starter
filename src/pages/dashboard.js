// Dashboard overview page
import { createDashboardLayout } from '../components/layout.js';

export function renderDashboard(container) {
    const content = `
    <div class="page-title-bar">
      <h2>Welcome back, Guy 👋</h2>
      <a href="#/builds" class="btn btn-primary">+ New Build</a>
    </div>
    
    <!-- Stats -->
    <div class="stats-grid">
      <div class="card stat-card animate-in stagger-1">
        <div class="stat-label">Total Builds</div>
        <div class="stat-value">247</div>
        <div class="stat-change positive">↑ 12% from last month</div>
      </div>
      <div class="card stat-card animate-in stagger-2">
        <div class="stat-label">Build Cost (MTD)</div>
        <div class="stat-value">$18.25</div>
        <div class="stat-change positive">↓ 73% vs Expo EAS</div>
      </div>
      <div class="card stat-card animate-in stagger-3">
        <div class="stat-label">Success Rate</div>
        <div class="stat-value">96.4%</div>
        <div class="stat-change positive">↑ 2.1% from last month</div>
      </div>
      <div class="card stat-card animate-in stagger-4">
        <div class="stat-label">Avg Build Time</div>
        <div class="stat-value">7m 42s</div>
        <div class="stat-change positive">↓ 18% faster</div>
      </div>
    </div>
    
    <!-- Content Grid -->
    <div class="content-grid">
      <!-- Recent Builds -->
      <div>
        <div class="section-header">
          <h3>Recent Builds</h3>
          <a href="#/builds" class="btn btn-ghost btn-sm">View all →</a>
        </div>
        <div class="build-list">
          <div class="build-item">
            <div class="build-status-icon success">✓</div>
            <div class="build-info">
              <div class="build-number">Build #247 — CalSnap</div>
              <div class="build-commit">abc1234 · fix camera permission</div>
            </div>
            <div class="build-platform"><span class="badge badge-info">iOS</span></div>
            <div class="build-duration">6m 18s</div>
            <div class="build-time">2 min ago</div>
          </div>
          <div class="build-item">
            <div class="build-status-icon success">✓</div>
            <div class="build-info">
              <div class="build-number">Build #246 — CalSnap</div>
              <div class="build-commit">def5678 · update splash screen</div>
            </div>
            <div class="build-platform"><span class="badge badge-success">Android</span></div>
            <div class="build-duration">4m 52s</div>
            <div class="build-time">15 min ago</div>
          </div>
          <div class="build-item">
            <div class="build-status-icon building">
              <div class="spinner"></div>
            </div>
            <div class="build-info">
              <div class="build-number">Build #245 — Crossroads</div>
              <div class="build-commit">fed9876 · add dark mode</div>
            </div>
            <div class="build-platform"><span class="badge badge-info">iOS</span></div>
            <div class="build-duration">3m 12s</div>
            <div class="build-time">Building...</div>
          </div>
          <div class="build-item">
            <div class="build-status-icon error">✕</div>
            <div class="build-info">
              <div class="build-number">Build #244 — Crossroads</div>
              <div class="build-commit">789abcd · broken import</div>
            </div>
            <div class="build-platform"><span class="badge badge-success">Android</span></div>
            <div class="build-duration">1m 04s</div>
            <div class="build-time">1 hour ago</div>
          </div>
          <div class="build-item">
            <div class="build-status-icon success">✓</div>
            <div class="build-info">
              <div class="build-number">Build #243 — MusicApp</div>
              <div class="build-commit">bcd3456 · v1.2 release</div>
            </div>
            <div class="build-platform"><span class="badge badge-info">iOS</span></div>
            <div class="build-duration">8m 31s</div>
            <div class="build-time">3 hours ago</div>
          </div>
        </div>
      </div>
      
      <!-- Right sidebar -->
      <div>
        <!-- Projects -->
        <div class="section-header">
          <h3>Your Projects</h3>
          <a href="#/projects" class="btn btn-ghost btn-sm">All →</a>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-sm);margin-bottom:var(--space-xl);">
          <div class="card" style="padding:var(--space-md);cursor:pointer;" onclick="location.hash='#/projects'">
            <div style="display:flex;align-items:center;gap:var(--space-sm);">
              <div class="project-icon both" style="width:32px;height:32px;font-size:0.9rem;">📱</div>
              <div>
                <div style="font-weight:600;font-size:0.875rem;">CalSnap</div>
                <div style="font-size:0.75rem;color:var(--text-tertiary);">Last build: 2 min ago</div>
              </div>
              <span class="badge badge-success" style="margin-left:auto;">Active</span>
            </div>
          </div>
          <div class="card" style="padding:var(--space-md);cursor:pointer;" onclick="location.hash='#/projects'">
            <div style="display:flex;align-items:center;gap:var(--space-sm);">
              <div class="project-icon ios" style="width:32px;height:32px;font-size:0.9rem;">🎵</div>
              <div>
                <div style="font-weight:600;font-size:0.875rem;">Down to the Crossroads</div>
                <div style="font-size:0.75rem;color:var(--text-tertiary);">Last build: 1 hr ago</div>
              </div>
              <span class="badge badge-warning" style="margin-left:auto;">Building</span>
            </div>
          </div>
          <div class="card" style="padding:var(--space-md);cursor:pointer;" onclick="location.hash='#/projects'">
            <div style="display:flex;align-items:center;gap:var(--space-sm);">
              <div class="project-icon android" style="width:32px;height:32px;font-size:0.9rem;">🎶</div>
              <div>
                <div style="font-weight:600;font-size:0.875rem;">MusicApp</div>
                <div style="font-size:0.75rem;color:var(--text-tertiary);">Last build: 3 hrs ago</div>
              </div>
              <span class="badge badge-success" style="margin-left:auto;">Active</span>
            </div>
          </div>
        </div>
        
        <!-- Savings Tracker -->
        <div class="section-header">
          <h3>💰 Savings Tracker</h3>
        </div>
        <div class="card" style="padding:var(--space-lg);">
          <div style="text-align:center;margin-bottom:var(--space-md);">
            <div style="font-size:0.8125rem;color:var(--text-tertiary);margin-bottom:4px;">You've saved vs Expo EAS</div>
            <div style="font-size:2rem;font-weight:900;color:var(--success);">$432.75</div>
            <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px;">Across 247 builds</div>
          </div>
          <div class="progress-bar" style="margin-bottom:var(--space-sm);">
            <div class="progress-bar-fill" style="width:73%;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-tertiary);">
            <span>BuildCheap: $61.75</span>
            <span>Expo: $494.50</span>
          </div>
        </div>
      </div>
    </div>
  `;

    const layout = createDashboardLayout('dashboard', content);
    container.appendChild(layout);
}
