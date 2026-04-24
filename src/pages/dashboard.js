// Dashboard overview page — fully dynamic, no placeholder data
import { createDashboardLayout } from '../components/layout.js';
import { dashboard, builds } from '../api.js';
import { store } from '../store.js';

window.cancelBuild = async (id) => {
  if (!confirm('Are you sure you want to cancel this build? Your $0.50 credit will be refunded seamlessly.')) return;
  try {
    await builds.cancel(id);
    alert('Build cancelled successfully! Credit has been safely refunded to your account.');
    location.reload();
  } catch (e) {
    alert('Failed to cancel build: ' + e.message);
  }
};

function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
}

function statusIcon(status) {
  if (status === 'success') return '<div class="build-status-icon success">✓</div>';
  if (status === 'failed') return '<div class="build-status-icon error">✕</div>';
  if (status === 'building' || status === 'queued') return '<div class="build-status-icon building"><div class="spinner"></div></div>';
  return '<div class="build-status-icon">—</div>';
}

function platformBadge(platform) {
  if (platform === 'ios') return '<span class="badge badge-info">iOS</span>';
  if (platform === 'android') return '<span class="badge badge-success">Android</span>';
  return `<span class="badge">${platform || '—'}</span>`;
}

function projectStatusBadge(project, recentBuilds) {
  const projectBuilds = recentBuilds.filter(b => b.project_id === project.id);
  const latest = projectBuilds[0];
  if (!latest) return '<span class="badge" style="margin-left:auto;">No builds</span>';
  if (latest.status === 'building' || latest.status === 'queued')
    return '<span class="badge badge-warning" style="margin-left:auto;">Building</span>';
  if (latest.status === 'success')
    return '<span class="badge badge-success" style="margin-left:auto;">Active</span>';
  return '<span class="badge badge-error" style="margin-left:auto;">Failed</span>';
}

function renderLoading() {
  return `
    <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
      <div class="spinner" style="width:32px;height:32px;"></div>
    </div>`;
}

function renderEmpty(message) {
  return `
    <div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">
      <div style="font-size:2rem;margin-bottom:var(--space-sm);">🚀</div>
      <div>${message}</div>
    </div>`;
}

function renderDashboardContent(data) {
  const { user, stats, projects, recent_builds } = data;

  const COST_PER_BUILD = 0.50;
  const EAS_COST_PER_BUILD = 2.00;
  const totalBuildCheapCost = (stats.total_builds * COST_PER_BUILD).toFixed(2);
  const totalEasCost = (stats.total_builds * EAS_COST_PER_BUILD).toFixed(2);
  const savings = (totalEasCost - totalBuildCheapCost).toFixed(2);
  const savingsPercent = totalEasCost > 0 ? Math.round((totalBuildCheapCost / totalEasCost) * 100) : 0;

  // Stats cards
  const statsHtml = `
    <div class="stats-grid">
      <div class="card stat-card animate-in stagger-1">
        <div class="stat-label">Total Builds</div>
        <div class="stat-value">${stats.total_builds}</div>
        <div class="stat-change">${stats.successful_builds} succeeded</div>
      </div>
      <div class="card stat-card animate-in stagger-2">
        <div class="stat-label">Build Cost (Total)</div>
        <div class="stat-value">$${totalBuildCheapCost}</div>
        <div class="stat-change positive">↓ ${100 - savingsPercent}% vs Industry Average</div>
      </div>
      <div class="card stat-card animate-in stagger-3">
        <div class="stat-label">Success Rate</div>
        <div class="stat-value">${stats.success_rate}%</div>
        <div class="stat-change">${stats.failed_builds} failed</div>
      </div>
      <div class="card stat-card animate-in stagger-4">
        <div class="stat-label">Avg Build Time</div>
        <div class="stat-value">${formatDuration(stats.avg_duration)}</div>
        <div class="stat-change positive">Per build average</div>
      </div>
    </div>`;

  // Recent builds
  let buildsHtml;
  if (recent_builds.length === 0) {
    buildsHtml = renderEmpty('No builds yet. Create a project and trigger your first build!');
  } else {
    buildsHtml = recent_builds.map(b => `
          <div class="build-item">
            ${statusIcon(b.status)}
            <div class="build-info">
              <div class="build-number">Build #${b.build_number || '—'} — ${b.project_name || 'Unknown'}</div>
              <div class="build-commit">${b.commit_hash ? b.commit_hash.slice(0, 7) : '—'} · ${b.commit_message || 'manual build'}</div>
            </div>
            <div class="build-platform">${platformBadge(b.platform)}</div>
            <div class="build-duration">${formatDuration(b.duration)}</div>
            <div class="build-time">${b.status === 'building' || b.status === 'queued' ?
        `${b.status === 'building' ? 'Building...' : 'Queued'} <a href="javascript:void(0)" onclick="window.cancelBuild('${b.id}')" style="color:#ef4444; margin-left:6px; font-weight:600; text-decoration:underline;">Cancel</a>`
        : timeAgo(b.created_at)}</div>
          </div>`).join('');
  }

  // Projects sidebar
  let projectsHtml;
  if (projects.length === 0) {
    projectsHtml = `<div class="card" style="padding:var(--space-lg);text-align:center;color:var(--text-tertiary);">
          <div style="font-size:1.5rem;margin-bottom:var(--space-xs);">📦</div>
          <div>No projects yet</div>
          <a href="#/projects" class="btn btn-primary btn-sm" style="margin-top:var(--space-sm);">Create Project</a>
        </div>`;
  } else {
    projectsHtml = projects.map(p => `
    <div class="card" style="padding:var(--space-md);cursor:pointer;" onclick="location.hash='#/projects'">
      <div style="display:flex;align-items:center;gap:var(--space-sm);">
        <div class="project-icon both" style="width:32px;height:32px;font-size:0.9rem;">📱</div>
        <div>
          <div style="font-weight:600;font-size:0.875rem;">${p.name}</div>
          <div style="font-size:0.75rem;color:var(--text-tertiary);">${p.platform || 'ios'} · ${p.slug}</div>
        </div>
        ${projectStatusBadge(p, recent_builds)}
      </div>
    </div>`).join('');
  }

  // Savings tracker
  const savingsHtml = stats.total_builds > 0 ? `
    <div class="section-header">
      <h3>💰 Savings Tracker</h3>
    </div>
    <div class="card" style="padding:var(--space-lg);">
      <div style="text-align:center;margin-bottom:var(--space-md);">
        <div style="font-size:0.8125rem;color:var(--text-tertiary);margin-bottom:4px;">You've saved vs Industry Average</div>
        <div style="font-size:2rem;font-weight:900;color:var(--success);">$${savings}</div>
        <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px;">Across ${stats.total_builds} build${stats.total_builds !== 1 ? 's' : ''}</div>
      </div>
      <div class="progress-bar" style="margin-bottom:var(--space-sm);">
        <div class="progress-bar-fill" style="width:${savingsPercent}%;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-tertiary);">
        <span>BuildCheap: $${totalBuildCheapCost}</span>
        <span>Industry Avg: $${totalEasCost}</span>
      </div>
    </div>` : '';

  return `
    <div class="page-title-bar">
      <h2>Welcome back, ${user.display_name || 'Builder'} 👋</h2>
      <a href="#/projects" class="btn btn-primary">+ New Build</a>
    </div>

    ${statsHtml}

  <div class="content-grid">
    <div>
      <div class="section-header">
        <h3>Recent Builds</h3>
        <a href="#/builds" class="btn btn-ghost btn-sm">View all →</a>
      </div>
      <div class="build-list">
        ${buildsHtml}
      </div>
    </div>

    <div>
      <div class="section-header">
        <h3>Your Projects</h3>
        <a href="#/projects" class="btn btn-ghost btn-sm">All →</a>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--space-sm);margin-bottom:var(--space-xl);">
        ${projectsHtml}
      </div>

      ${savingsHtml}
    </div>
  </div>
  `;
}

export function renderDashboard(container) {
  const content = renderLoading();
  const layout = createDashboardLayout('dashboard', content);
  container.appendChild(layout);

  const pageContent = layout.querySelector('#pageContent');

  // Fetch real data from API
  dashboard.get().then(data => {
    pageContent.innerHTML = renderDashboardContent(data);
  }).catch(err => {
    console.error('Dashboard load failed:', err);
    pageContent.innerHTML = `<div style="padding:var(--space-xl);text-align:center;color:var(--text-tertiary);">
            <div style="font-size:2rem;margin-bottom:var(--space-sm);">⚠️</div>
            <div>Failed to load dashboard: ${err.message}</div>
        </div>`;
  });
}
