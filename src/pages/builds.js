// Builds page — fully dynamic, live WebSocket logs
import { createDashboardLayout } from '../components/layout.js';
import { builds, connectBuildLogs } from '../api.js';

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
  if (status === 'failed' || status === 'error') return '<div class="build-status-icon error">✕</div>';
  if (status === 'building') return '<div class="build-status-icon building"><div class="spinner"></div></div>';
  if (status === 'queued') return '<div class="build-status-icon queued">⏳</div>';
  return '<div class="build-status-icon">—</div>';
}

function platformBadge(platform) {
  if (platform === 'ios') return '<span class="badge badge-info">iOS</span>';
  if (platform === 'android') return '<span class="badge badge-success">Android</span>';
  return `<span class="badge">${platform || '—'}</span>`;
}

function renderLoading() {
  return `<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner" style="width:32px;height:32px;"></div></div>`;
}

export function renderBuilds(container) {
  const content = renderLoading();
  const layout = createDashboardLayout('builds', content);
  container.appendChild(layout);

  const pageContent = layout.querySelector('#pageContent');
  let activeWs = null;
  let selectedBuildId = null;

  // Render stable two-column layout once to prevent flickering when DOM updates
  pageContent.innerHTML = `
    <div class="page-title-bar">
      <h2>Builds</h2>
      <button class="btn btn-primary" onclick="location.hash='#/projects'">+ New Build</button>
    </div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-xl);min-width:0;">
      <div id="buildsListCol" style="min-width:0;">
        <div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner" style="width:32px;height:32px;"></div></div>
      </div>
      
      <div style="min-width:0;">
        <div class="section-header" id="buildLogHeader" style="display:flex; justify-content:space-between; align-items:center;">
          <h3>Build Log</h3>
          <button class="btn btn-ghost btn-sm" onclick="window.copyBuildLog()">Copy All 📋</button>
        </div>
        <div class="card" style="padding:0;overflow:hidden;background:#0d0d0d;display:flex;flex-direction:column;">
          <div class="build-log" id="buildLogOutput" style="height:600px;overflow-y:auto;overflow-x:hidden;padding:var(--space-md);font-family:monospace;font-size:0.8rem;color:#ccc;white-space:pre-wrap;word-wrap:break-word;word-break:break-all;">
            Select a build to view logs.
          </div>
        </div>
      </div>
    </div>
  `;

  function renderBuildsListContent(data) {
    if (!data || !data.builds || data.builds.length === 0) {
      return `
            <div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">
                <div style="font-size:2rem;margin-bottom:var(--space-sm);">🔨</div>
                <div>No builds found. Go to Projects to trigger one!</div>
            </div>`;
    }

    const activeBuilds = data.builds.filter(b => b.status === 'building' || b.status === 'queued');
    const pastBuilds = data.builds.filter(b => b.status === 'success' || b.status === 'failed' || b.status === 'error');

    let activeHtml = '';
    if (activeBuilds.length > 0) {
      activeHtml = `
            <div class="section-header">
              <h3>🔴 Active Builds</h3>
              <span class="badge badge-info">${activeBuilds.length} running</span>
            </div>
            <div class="build-list" style="margin-bottom:var(--space-xl);">
              ${activeBuilds.map(b => `
                <div class="build-item ${b.id === selectedBuildId ? 'selected' : ''}" style="cursor:pointer;" onclick="window.selectBuild('${b.id}')">
                  ${statusIcon(b.status)}
                  <div class="build-info">
                    <div class="build-number">Build #${b.build_number} — ${b.project_name}</div>
                    <div class="build-commit">${b.commit_hash ? b.commit_hash.slice(0, 7) : '—'} · ${b.commit_message || 'manual'}</div>
                  </div>
                  <div class="build-platform">${platformBadge(b.platform)}</div>
                  <div class="build-duration">${formatDuration(b.duration)}</div>
                  <div class="build-time" style="color:var(--warning);">${b.status === 'queued' ? 'Queued' : 'Building...'}</div>
                </div>
              `).join('')}
            </div>`;
    }

    let historyHtml = '';
    if (pastBuilds.length > 0) {
      historyHtml = `
            <div class="section-header">
              <h3>Build History</h3>
              <span class="badge badge-neutral">${pastBuilds.length} total</span>
            </div>
            <div class="build-list" style="margin-bottom:var(--space-xl);">
              ${pastBuilds.map(b => `
                <div class="build-item ${b.id === selectedBuildId ? 'selected' : ''}" style="cursor:pointer;" onclick="window.selectBuild('${b.id}')">
                  ${statusIcon(b.status)}
                  <div class="build-info">
                    <div class="build-number">Build #${b.build_number} — ${b.project_name}</div>
                    <div class="build-commit">${b.commit_hash ? b.commit_hash.slice(0, 7) : '—'} · ${b.commit_message || 'manual'}</div>
                  </div>
                  <div class="build-platform">${platformBadge(b.platform)}</div>
                  <div class="build-duration">${formatDuration(b.duration)}</div>
                  <div class="build-time">${timeAgo(b.created_at)} · $0.50</div>
                </div>
              `).join('')}
            </div>`;
    }

    return activeHtml + historyHtml;
  }

  function loadBuilds(isPolling = false) {
    builds.list().then(data => {
      const pastBuilds = data.builds.filter(b => b.status === 'success' || b.status === 'failed' || b.status === 'error');
      const activeBuilds = data.builds.filter(b => b.status === 'building' || b.status === 'queued');

      // Auto select on initial load
      if (!selectedBuildId && data.builds.length > 0) {
        selectedBuildId = activeBuilds[0] ? activeBuilds[0].id : pastBuilds[0].id;
      }

      // Update just the sidebar
      const col = document.getElementById('buildsListCol');
      if (col) {
        col.innerHTML = renderBuildsListContent(data);
      }

      // Update header download link dynamically
      const header = document.getElementById('buildLogHeader');
      if (header && selectedBuildId) {
        const build = data.builds.find(b => b.id === selectedBuildId);
        header.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; width: 100%;">
            <h3>Build Log</h3>
            <div style="display:flex; gap: 8px;">
              <button class="btn btn-ghost btn-sm" onclick="window.copyBuildLog()">Copy All 📋</button>
              ${build && build.status === 'success' ? `<a href="${build.artifact_url || '#'}" target="_blank" class="btn btn-ghost btn-sm" download>Download Artifact ↗</a>` : ''}
            </div>
          </div>
        `;
      }

      // Only start the log stream if we aren't passively polling to avoid flicker
      if (!isPolling && selectedBuildId) {
        switchLogStream(selectedBuildId);
      }
    }).catch(err => {
      const col = document.getElementById('buildsListCol');
      if (col) col.innerHTML = `<div style="padding:var(--space-xl);text-align:center;color:var(--error);">Failed to load builds: ${err.message}</div>`;
    });
  }

  function switchLogStream(buildId) {
    if (activeWs) {
      activeWs.close();
      activeWs = null;
    }

    const logOutput = document.getElementById('buildLogOutput');
    if (!logOutput) return;
    logOutput.innerHTML = 'Fetching logs...<br/>';

    builds.log(buildId).then(data => {
      if (data.log) {
        logOutput.textContent = data.log + '\n';
      } else {
        logOutput.textContent = '';
      }
      logOutput.scrollTop = logOutput.scrollHeight;
    }).catch(() => {
      logOutput.textContent = 'Failed to load historical logs.\n';
    });

    activeWs = connectBuildLogs(buildId, (line) => {
      const div = document.createElement('div');
      if (line.includes('✓')) div.style.color = 'var(--success)';
      if (line.includes('Error:') || line.includes('FAILED')) div.style.color = 'var(--error)';
      div.textContent = line;
      logOutput.appendChild(div);
      logOutput.scrollTop = logOutput.scrollHeight;
    });

    activeWs.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'build_complete') {
        setTimeout(() => loadBuilds(true), 1000); // refresh list silently
      }
    });
  }

  window.copyBuildLog = () => {
    const logOutput = document.getElementById('buildLogOutput');
    if (!logOutput) return;
    const txt = logOutput.textContent || logOutput.innerText;
    navigator.clipboard.writeText(txt)
      .then(() => alert('Logs successfully copied to clipboard!'))
      .catch((err) => alert('Browser copy failed: ' + err));
  };

  window.selectBuild = (id) => {
    if (selectedBuildId === id) return; // Ignore clicking already selected build
    selectedBuildId = id;

    const items = document.querySelectorAll('.build-item');
    items.forEach(item => item.classList.remove('selected'));
    const clicked = Array.from(items).find(item => item.getAttribute('onclick')?.includes(id));
    if (clicked) clicked.classList.add('selected');

    const logOutput = document.getElementById('buildLogOutput');
    if (logOutput) logOutput.innerHTML = 'Fetching logs...<br/>';

    setTimeout(() => loadBuilds(false), 50); // Yield to render thread, then fetch
  };

  const pollInterval = setInterval(() => {
    if (!document.body.contains(layout)) {
      clearInterval(pollInterval);
      if (activeWs) activeWs.close();
      return;
    }
    loadBuilds(true); // Pass true to silently poll sidebar only
  }, 5000);

  loadBuilds();
}
