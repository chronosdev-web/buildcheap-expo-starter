// Settings page
import { createDashboardLayout } from '../components/layout.js';

export function renderSettings(container) {
    const content = `
    <div class="page-title-bar">
      <h2>Settings</h2>
      <button class="btn btn-primary">Save Changes</button>
    </div>
    
    <!-- Tabs -->
    <div class="tabs" style="margin-bottom:var(--space-xl);">
      <div class="tab active">General</div>
      <div class="tab">Team</div>
      <div class="tab">API Keys</div>
      <div class="tab">Webhooks</div>
      <div class="tab">Danger Zone</div>
    </div>
    
    <!-- General -->
    <div class="settings-section">
      <h3>Account</h3>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Display Name</div>
          <div class="settings-row-desc">The name shown in the dashboard and build logs.</div>
        </div>
        <input class="input" value="Guy's Team" style="width:250px;" />
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Email</div>
          <div class="settings-row-desc">Primary email for notifications and invoices.</div>
        </div>
        <input class="input" value="guy@buildcheap.dev" style="width:250px;" />
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Avatar</div>
          <div class="settings-row-desc">Your profile picture shown across the platform.</div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-md);">
          <div class="avatar avatar-lg">G</div>
          <button class="btn btn-secondary btn-sm">Upload</button>
        </div>
      </div>
    </div>
    
    <!-- Build Defaults -->
    <div class="settings-section">
      <h3>Build Defaults</h3>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Auto-increment version</div>
          <div class="settings-row-desc">Automatically bump build number on each build to prevent submission conflicts.</div>
        </div>
        <div class="toggle active" onclick="this.classList.toggle('active')"></div>
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Build caching</div>
          <div class="settings-row-desc">Cache node_modules and CocoaPods between builds for faster build times.</div>
        </div>
        <div class="toggle active" onclick="this.classList.toggle('active')"></div>
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Auto-submit to app stores</div>
          <div class="settings-row-desc">Automatically submit successful production builds to App Store Connect and Google Play.</div>
        </div>
        <div class="toggle" onclick="this.classList.toggle('active')"></div>
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Build timeout</div>
          <div class="settings-row-desc">Maximum time allowed for a single build before it's automatically cancelled.</div>
        </div>
        <select class="input" style="width:150px;">
          <option>30 minutes</option>
          <option>1 hour</option>
          <option selected>2 hours</option>
        </select>
      </div>
    </div>
    
    <!-- Notifications -->
    <div class="settings-section">
      <h3>Notifications</h3>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Email on build complete</div>
          <div class="settings-row-desc">Get an email when your build finishes (success or failure).</div>
        </div>
        <div class="toggle active" onclick="this.classList.toggle('active')"></div>
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Email on build failure</div>
          <div class="settings-row-desc">Only receive emails when builds fail.</div>
        </div>
        <div class="toggle" onclick="this.classList.toggle('active')"></div>
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Slack integration</div>
          <div class="settings-row-desc">Post build status updates to a Slack channel.</div>
        </div>
        <button class="btn btn-secondary btn-sm">Connect Slack</button>
      </div>
    </div>
    
    <!-- API Keys -->
    <div class="settings-section">
      <h3>API Keys</h3>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Personal Access Token</div>
          <div class="settings-row-desc">Use this token to trigger builds from CI/CD pipelines or the CLI.</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-sm);">
          <div class="api-key-display">
            <span class="key-mask">bc_live_••••••••••••••••••••k4m2</span>
            <button class="btn btn-ghost btn-sm" onclick="this.previousElementSibling.textContent='bc_live_a8f2c9d1e4b7f3a6c2d8e1f4b7a3c9d2';setTimeout(()=>this.previousElementSibling.textContent='bc_live_••••••••••••••••••••k4m2',3000)">👁️</button>
          </div>
          <button class="btn btn-ghost btn-sm" style="color:var(--warning);">Regenerate Token</button>
        </div>
      </div>
    </div>
  `;

    const layout = createDashboardLayout('settings', content);
    container.appendChild(layout);

    // Make toggles interactive
    container.querySelectorAll('.toggle').forEach(toggle => {
        toggle.addEventListener('click', () => toggle.classList.toggle('active'));
    });
}
