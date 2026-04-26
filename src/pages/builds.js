// Builds page — fully dynamic, live WebSocket logs
import { createDashboardLayout } from '../components/layout.js';
import { builds, connectBuildLogs, getToken } from '../api.js';

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
      <div id="buildsListCol" style="min-width:0; max-height: calc(100vh - 180px); overflow-y: auto; padding-right: var(--space-md);">
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
        header.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; width: 100%;">
            <h3>Build Log</h3>
            <div style="display:flex; gap: 8px;">
              <button class="btn btn-ghost btn-sm" onclick="window.copyBuildLog()">Copy All 📋</button>
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

  let currentStreamId = 0;

  function switchLogStream(buildId) {
    currentStreamId++;
    const myStreamId = currentStreamId;

    if (activeWs) {
      activeWs.close();
      activeWs = null;
    }

    const logOutput = document.getElementById('buildLogOutput');
    if (!logOutput) return;
    logOutput.innerHTML = 'Fetching logs...<br/>';

    let httpLoaded = false;
      let wsBuffer = [];
      let isAltoolRunning = false;

      builds.log(buildId).then(data => {
        if (myStreamId !== currentStreamId) return;

        if (data.log) {
          logOutput.textContent = data.log + '\n';
        } else {
          logOutput.textContent = '';
        }

        httpLoaded = true;

        // Flush any WS messages that arrived while HTTP was fetching
        wsBuffer.forEach(line => {
          const div = document.createElement('div');
          if (line.includes('✓')) div.style.color = 'var(--success)';
          if (line.includes('Error:') || line.includes('FAILED')) div.style.color = 'var(--error)';
          div.textContent = line;
          logOutput.appendChild(div);
        });
        wsBuffer = [];

        // Check if the very last line is altool, and we are still building
        const fullLog = logOutput.textContent;
        if (fullLog.includes('altool') && !fullLog.includes('successful') && !fullLog.includes('failed')) {
          isAltoolRunning = true;
          const indicator = document.createElement('div');
          indicator.id = 'altoolIndicator';
          indicator.style.color = 'var(--warning)';
          indicator.style.marginTop = 'var(--space-md)';
          indicator.style.animation = 'pulse 2s infinite';
          indicator.textContent = '⏳ Uploading to Apple App Store Connect... Please wait, this process takes 5-15 minutes and produces no logs until finished.';
          logOutput.appendChild(indicator);
        }

        logOutput.scrollTop = logOutput.scrollHeight;

      }).catch(() => {
        if (myStreamId !== currentStreamId) return;
        logOutput.textContent = 'Failed to load historical logs.\n';
        httpLoaded = true;
      });

      activeWs = connectBuildLogs(buildId, (line) => {
        if (myStreamId !== currentStreamId) return;

        if (!httpLoaded) {
          wsBuffer.push(line);
          return;
        }

        // Remove existing indicator to re-append at the very bottom
        const existingIndicator = logOutput.querySelector('#altoolIndicator');
        if (existingIndicator) existingIndicator.remove();

        const div = document.createElement('div');
        if (line.includes('✓')) div.style.color = 'var(--success)';
        if (line.includes('Error:') || line.includes('FAILED')) div.style.color = 'var(--error)';
        div.textContent = line;
        logOutput.appendChild(div);

        // Update state
        if (line.includes('altool')) isAltoolRunning = true;
        if (line.includes('successful') || line.includes('error') || line.includes('failed')) isAltoolRunning = false;

        // Re-append indicator if it's still running
        if (isAltoolRunning) {
          const indicator = document.createElement('div');
          indicator.id = 'altoolIndicator';
          indicator.style.color = 'var(--warning)';
          indicator.style.marginTop = 'var(--space-md)';
          indicator.style.animation = 'pulse 2s infinite';
          indicator.textContent = '⏳ Uploading to Apple App Store Connect... Please wait, this process takes 5-15 minutes and produces no logs until finished.';
          logOutput.appendChild(indicator);
        }

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
    selectedBuildId = id;

    const items = document.querySelectorAll('.build-item');
    items.forEach(item => item.classList.remove('selected'));
    const clicked = Array.from(items).find(item => item.getAttribute('onclick')?.includes(id));
    if (clicked) clicked.classList.add('selected');

    switchLogStream(id);
  };

  // Global WebSocket for build status events (independent of log stream)
  const globalWsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
  let globalWs = null;

  function connectGlobalWs() {
    globalWs = new WebSocket(globalWsUrl);
    globalWs.onopen = () => {
      const token = getToken();
      if (token) globalWs.send(JSON.stringify({ type: 'auth', token }));
    };
    globalWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'build_complete' || msg.type === 'build_started') {
          loadBuilds(true);
        }
      } catch { }
    };
    globalWs.onclose = () => {
      // Reconnect after 3s if page is still mounted
      if (document.body.contains(layout)) {
        setTimeout(connectGlobalWs, 3000);
      }
    };
  }
  connectGlobalWs();

  const pollInterval = setInterval(() => {
    if (!document.body.contains(layout)) {
      clearInterval(pollInterval);
      if (activeWs) activeWs.close();
      if (globalWs) globalWs.close();
      return;
    }
    loadBuilds(true); // Pass true to silently poll sidebar only
  }, 5000);

  loadBuilds();
}
