// Credentials page
import { createDashboardLayout } from '../components/layout.js';

export function renderCredentials(container) {
    const content = `
    <div class="page-title-bar">
      <h2>Credentials</h2>
      <button class="btn btn-primary">+ Add Credential</button>
    </div>
    
    <p style="color:var(--text-tertiary);margin-bottom:var(--space-xl);font-size:0.875rem;">
      Manage your app signing credentials. BuildCheap can auto-manage credentials for you, or you can upload your own.
    </p>
    
    <!-- Tabs -->
    <div class="tabs" style="margin-bottom:var(--space-xl);">
      <div class="tab active">iOS</div>
      <div class="tab">Android</div>
    </div>
    
    <!-- iOS Credentials -->
    <div class="section-header">
      <h3>Distribution Certificates</h3>
      <button class="btn btn-ghost btn-sm">+ New Certificate</button>
    </div>
    <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-xl);">
      <div class="credentials-list">
        <div class="credential-item">
          <div class="credential-icon">🔐</div>
          <div class="credential-info">
            <div class="credential-name">Apple Distribution: Guy B (TEAM123)</div>
            <div class="credential-detail">Serial: 38:A4:B2:... · Expires: Dec 14, 2026 · <span style="color:var(--success);">Valid</span></div>
          </div>
          <div class="credential-actions">
            <button class="btn btn-ghost btn-sm">Download</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--error);">Revoke</button>
          </div>
        </div>
        <div style="border-top:1px solid var(--border-subtle);margin:var(--space-sm) 0;"></div>
        <div class="credential-item">
          <div class="credential-icon">🔐</div>
          <div class="credential-info">
            <div class="credential-name">Apple Distribution: Guy B (TEAM123) — OLD</div>
            <div class="credential-detail">Serial: 12:F3:C1:... · Expired: Mar 2, 2025 · <span style="color:var(--error);">Expired</span></div>
          </div>
          <div class="credential-actions">
            <button class="btn btn-ghost btn-sm" style="color:var(--error);">Delete</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section-header">
      <h3>Provisioning Profiles</h3>
      <button class="btn btn-ghost btn-sm">+ New Profile</button>
    </div>
    <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-xl);">
      <div class="credentials-list">
        <div class="credential-item">
          <div class="credential-icon">📄</div>
          <div class="credential-info">
            <div class="credential-name">CalSnap AppStore Profile</div>
            <div class="credential-detail">com.guy.calsnap · App Store · Expires: Dec 14, 2026</div>
          </div>
          <div class="credential-actions">
            <span class="badge badge-success">Auto-managed</span>
          </div>
        </div>
        <div style="border-top:1px solid var(--border-subtle);margin:var(--space-sm) 0;"></div>
        <div class="credential-item">
          <div class="credential-icon">📄</div>
          <div class="credential-info">
            <div class="credential-name">Crossroads AppStore Profile</div>
            <div class="credential-detail">com.guy.crossroads · App Store · Expires: Dec 14, 2026</div>
          </div>
          <div class="credential-actions">
            <span class="badge badge-success">Auto-managed</span>
          </div>
        </div>
        <div style="border-top:1px solid var(--border-subtle);margin:var(--space-sm) 0;"></div>
        <div class="credential-item">
          <div class="credential-icon">📄</div>
          <div class="credential-info">
            <div class="credential-name">MusicApp AdHoc Profile</div>
            <div class="credential-detail">com.guy.musicapp · Ad Hoc · Expires: Dec 14, 2026</div>
          </div>
          <div class="credential-actions">
            <span class="badge badge-info">Manual</span>
            <button class="btn btn-ghost btn-sm">Update</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section-header">
      <h3>Push Notification Keys</h3>
    </div>
    <div class="card" style="padding:var(--space-lg);">
      <div class="credentials-list">
        <div class="credential-item">
          <div class="credential-icon">🔔</div>
          <div class="credential-info">
            <div class="credential-name">APNs Key</div>
            <div class="credential-detail">Key ID: ABC123DEF4 · Team: TEAM123</div>
          </div>
          <div class="credential-actions">
            <span class="badge badge-success">Active</span>
          </div>
        </div>
      </div>
    </div>
  `;

    const layout = createDashboardLayout('credentials', content);
    container.appendChild(layout);
}
