// Settings page
import { createDashboardLayout } from '../components/layout.js';
import { store } from '../store.js';
import { auth, webhooks, orgs } from '../api.js';

export function renderSettings(container) {
  const user = store.get('user');
  if (!user) {
    window.location.hash = '#/dashboard';
    return;
  }

  const content = `
    <div class="page-title-bar">
      <div style="display:flex; align-items:center; gap:var(--space-md);">
        <h2>Settings</h2>
        <div class="success-msg" id="settingsResultMsg" style="display:none; font-size:0.875rem; font-weight:600;">Saved successfully!</div>
      </div>
      <button class="btn btn-primary" id="saveSettingsBtn">Save Changes</button>
    </div>
    
    <!-- Tabs -->
    <div class="tabs mb-xl">
      <div class="tab active" data-tab="general">General</div>
      <div class="tab" data-tab="team">Team</div>
      <div class="tab" data-tab="webhooks">Webhooks</div>
      <div class="tab" data-tab="notifications">Notifications</div>
    </div>
    
    <!-- General -->
    <div class="settings-section" id="generalSection">
      <h3>Account</h3>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Display Name</div>
          <div class="settings-row-desc">The name shown in the dashboard and build logs.</div>
        </div>
        <input class="input w-250" id="displayNameInput" value="${user.display_name || ''}" />
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Email</div>
          <div class="settings-row-desc">Primary email for notifications and invoices.</div>
        </div>
        <input class="input w-250" value="${user.email || ''}" disabled />
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Avatar</div>
          <div class="settings-row-desc">Click to upload a profile picture (max 500KB).</div>
        </div>
        <div class="flex-center-md" style="position:relative;cursor:pointer;" id="avatarUploadTrigger" title="Click to change avatar">
          ${user.avatar_url
      ? `<img src="${user.avatar_url}" class="avatar avatar-lg" style="object-fit:cover;border-radius:50%;" />`
      : `<div class="avatar avatar-lg">${(user.display_name || user.email || '?')[0].toUpperCase()}</div>`
    }
          <div style="position:absolute;bottom:-2px;right:-2px;background:var(--primary);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid var(--bg-primary);">📷</div>
          <input type="file" id="avatarFileInput" accept="image/*" style="display:none;" />
        </div>
      </div>
      <div id="avatarUploadMsg" style="font-size:0.8rem;margin-top:var(--space-xs);display:none;"></div>
    </div>
    
    <!-- API Keys -->
    <div class="settings-section" id="apiKeysSection">
      <h3>API Keys</h3>
      <div class="settings-row" style="align-items:flex-start;">
        <div class="settings-row-info">
          <div class="settings-row-label" style="font-size:1.1rem;margin-bottom:8px;">Personal Access Token</div>
          <div class="settings-row-desc" style="max-width:550px; line-height:1.6; color:var(--text-secondary);">
            This API key allows you to <strong>automate your builds</strong> via CLI, CI/CD pipelines, or direct API integrations.<br><br>
            <i style="color:var(--text-tertiary);">The Dashboard is for human clicking. The API is for machine automation.</i>
          </div>
        </div>
        <div class="flex-col-sm" style="margin-top:4px;min-width:340px;">
          <div class="api-key-display">
            <span class="key-mask" id="apiKeyMask">bc_live_••••••••••••••••••••••••</span>
            <button class="btn btn-ghost btn-sm" id="revealKeyBtn">👁️ Show</button>
          </div>
          ${user.api_key_expires_at
      ? `<div style="font-size:0.75rem;margin-top:4px;color:${new Date(user.api_key_expires_at) < new Date() ? 'var(--error)' : 'var(--text-tertiary)'};">
                ${new Date(user.api_key_expires_at) < new Date() ? '⚠️ Expired' : '⏳ Expires'}: ${new Date(user.api_key_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>`
      : `<div style="font-size:0.75rem;margin-top:4px;color:var(--text-tertiary);">No expiration set</div>`
    }
          <div style="margin-top:var(--space-sm);display:flex;gap:var(--space-xs);align-items:center;flex-wrap:wrap;">
            <select id="expirationSelect" class="input" style="width:auto;padding:4px 8px;font-size:0.8rem;">
              <option value="0">No expiration</option>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30" selected>30 days</option>
              <option value="180">6 months</option>
              <option value="365">1 year</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="number" id="customExpirationInput" class="input" placeholder="Days" min="1" max="3650" style="width:80px;padding:4px 8px;font-size:0.8rem;display:none;" />
            <button class="btn btn-ghost btn-sm" id="rotateKeyBtn" style="color:var(--error);">🔄 Rotate</button>
          </div>
          <div id="rotateKeyMsg" style="font-size:0.75rem;margin-top:4px;display:none;"></div>
        </div>
      </div>
    </div>

    
    <!-- Team / Organizations -->
    <div class="settings-section" id="teamSection" style="display:none;">
      <h3>Organizations</h3>
      <p style="color:var(--text-tertiary);font-size:0.875rem;margin-bottom:var(--space-md);">
        Manage your teams. Invite collaborators to share projects, builds, and credentials.
      </p>
      
      <div class="card" style="padding:var(--space-md);margin-bottom:var(--space-xl);">
        <form id="createOrgForm" style="display:flex;gap:var(--space-sm);">
          <input type="text" id="newOrgName" class="input flex-auto" placeholder="New organization name..." required minlength="2" />
          <button type="submit" class="btn btn-primary" id="createOrgBtn">Create Organization</button>
        </form>
        <div id="createOrgError" style="color:var(--error);font-size:0.875rem;display:none;margin-top:var(--space-xs);"></div>
      </div>
      
      <div id="orgListContainer">
        <div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">Loading organizations...</div>
      </div>
    </div>
    
    <!-- Webhooks -->
    <div class="settings-section" id="webhooksSection" style="display:none;">
      <h3>Build Webhooks</h3>
      <p style="color:var(--text-tertiary);font-size:0.875rem;margin-bottom:var(--space-md);">
        Configure HTTP POST endpoints to receive automated payloads when a build succeeds or fails.
      </p>
      
      <div class="card" style="padding:var(--space-md);margin-bottom:var(--space-xl);">
        <form id="webhookForm" style="display:flex;gap:var(--space-sm);">
          <input type="url" id="webhookUrlInput" class="input flex-auto" placeholder="https://your-server.com/webhook" required />
          <button type="submit" class="btn btn-primary" id="addWebhookBtn">Add Webhook</button>
        </form>
        <div id="webhookErrorMsg" style="color:var(--error);font-size:0.875rem;display:none;margin-top:var(--space-xs);"></div>
      </div>
      
      <div id="webhooksListContainer">
        <div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">Loading webhooks...</div>
      </div>
    </div>

    <!-- Notifications -->
    <div class="settings-section" id="notificationsSection" style="display:none;">
      <div style="margin-bottom:var(--space-xl);">
        <h3 style="margin-bottom:4px;font-size:1.5rem;">Email notifications</h3>
        <p style="color:var(--text-tertiary);font-size:0.875rem;">Manage preferences for email notifications triggered by events in your account.</p>
      </div>
      
      <div class="card" style="margin-bottom:var(--space-lg);border-color:var(--border-medium);overflow:hidden;background:var(--bg-primary);">
        <div style="padding:var(--space-md);background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border-medium);font-weight:600;font-size:0.875rem;display:flex;align-items:center;gap:8px;">
          📦 EAS Build notifications
        </div>
        <div style="padding:var(--space-lg);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-medium);">
          <div>
            <div style="font-weight:600;color:var(--text-primary);margin-bottom:2px;">Build completed</div>
            <div style="font-size:0.875rem;color:var(--text-tertiary);">You will receive notifications when a build is completed.</div>
          </div>
          <button class="btn btn-secondary btn-sm" style="width:100px;justify-content:space-between;display:flex;align-items:center;">Disabled <span style="font-size:0.6rem;">▼</span></button>
        </div>
        <div style="padding:var(--space-lg);display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:flex-start;gap:8px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-weight:600;color:var(--text-primary);">Plan credit usage notifications</span>
                <span style="background:rgba(34,197,94,0.1);color:var(--success);font-size:0.65rem;padding:2px 8px;border-radius:12px;font-weight:700;display:flex;align-items:center;gap:4px;text-transform:uppercase;">✓ Subscribed</span>
              </div>
              <div style="font-size:0.875rem;color:var(--text-tertiary);line-height:1.5;max-width:500px;">You will receive notifications when 80% and 100% of your plan credit has been used.</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" style="color:var(--error);border:1px solid rgba(239,68,68,0.2);padding:6px 12px;">Unsubscribe</button>
        </div>
      </div>

      <div class="card" style="border-color:var(--border-medium);overflow:hidden;background:var(--bg-primary);">
        <div style="padding:var(--space-md);background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border-medium);font-weight:600;font-size:0.875rem;display:flex;align-items:center;gap:8px;">
          📤 EAS Submit notifications  
        </div>
        <div style="padding:var(--space-lg);display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-weight:600;color:var(--text-primary);margin-bottom:2px;">Submission completed</div>
            <div style="font-size:0.875rem;color:var(--text-tertiary);">You will receive notifications when a submission is completed.</div>
          </div>
          <button class="btn btn-secondary btn-sm" style="width:100px;justify-content:space-between;display:flex;align-items:center;">Disabled <span style="font-size:0.6rem;">▼</span></button>
        </div>
      </div>
    </div>
  `;

  const layout = createDashboardLayout('settings', content);
  container.appendChild(layout);

  // Make API key interactive
  const mask = layout.querySelector('#apiKeyMask');
  const btn = layout.querySelector('#revealKeyBtn');
  if (btn && mask) {
    let revealed = false;
    btn.addEventListener('click', () => {
      if (!revealed) {
        mask.textContent = user.api_key;
        btn.textContent = 'Hide';
        revealed = true;
        setTimeout(() => {
          mask.textContent = 'bc_live_••••••••••••••••••••••••';
          btn.textContent = '👁️ Show';
          revealed = false;
        }, 5000);
      } else {
        mask.textContent = 'bc_live_••••••••••••••••••••••••';
        btn.textContent = '👁️ Show';
        revealed = false;
      }
    });
  }

  const rotateBtn = layout.querySelector('#rotateKeyBtn');
  const rotateMsg = layout.querySelector('#rotateKeyMsg');
  const expSelect = layout.querySelector('#expirationSelect');
  const customExp = layout.querySelector('#customExpirationInput');

  if (expSelect && customExp) {
    expSelect.addEventListener('change', () => {
      customExp.style.display = expSelect.value === 'custom' ? 'block' : 'none';
      if (expSelect.value === 'custom') customExp.focus();
    });
  }

  if (rotateBtn && mask) {
    rotateBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to rotate your API key? This will instantly invalidate your previous key and break any active CLI/CI configurations using it.')) return;

      let expDays = expSelect ? expSelect.value : 30;
      if (expDays === 'custom') {
        expDays = parseInt(customExp.value);
        if (isNaN(expDays) || expDays < 1) {
          alert('Please enter a valid number of days for custom expiration');
          return;
        }
      }

      rotateBtn.disabled = true;
      rotateBtn.innerText = 'Rotating...';
      rotateMsg.style.display = 'none';

      try {
        const result = await auth.rotateKey(expDays);
        user.api_key = result.api_key;
        user.api_key_expires_at = result.expires_at;
        store.set('user', user);

        mask.textContent = api_key;
        if (btn) btn.textContent = 'Hide';

        rotateMsg.innerText = 'Key revoked and newly rotated. Please update your environment variables.';
        rotateMsg.style.color = 'var(--success)';
        rotateMsg.style.display = 'block';

      } catch (err) {
        rotateMsg.innerText = err.message || 'Failed to rotate API Key.';
        rotateMsg.style.color = 'var(--error)';
        rotateMsg.style.display = 'block';
      } finally {
        rotateBtn.disabled = false;
        rotateBtn.innerText = '🔄 Rotate';
      }
    });
  }

  // Handle Tabs
  const tabs = layout.querySelectorAll('.tab');
  const generalSection = layout.querySelector('#generalSection');
  const apiKeysSection = layout.querySelector('#apiKeysSection');
  const teamSection = layout.querySelector('#teamSection');
  const webhooksSection = layout.querySelector('#webhooksSection');
  const notificationsSection = layout.querySelector('#notificationsSection');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');

      [generalSection, apiKeysSection, teamSection, webhooksSection, notificationsSection].forEach(s => {
        if (s) s.style.display = 'none';
      });

      if (target === 'general') {
        if (generalSection) generalSection.style.display = 'block';
        if (apiKeysSection) apiKeysSection.style.display = 'block';
      } else if (target === 'team') {
        if (teamSection) teamSection.style.display = 'block';
        loadOrgs();
      } else if (target === 'webhooks') {
        if (webhooksSection) webhooksSection.style.display = 'block';
      } else if (target === 'notifications') {
        if (notificationsSection) notificationsSection.style.display = 'block';
      }
    });
  });

  // Organization logic
  const orgListContainer = layout.querySelector('#orgListContainer');
  const createOrgForm = layout.querySelector('#createOrgForm');
  const createOrgError = layout.querySelector('#createOrgError');

  async function loadOrgs() {
    try {
      const data = await orgs.list();
      if (!data.organizations || data.organizations.length === 0) {
        orgListContainer.innerHTML = '<div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">No organizations yet. Create one above!</div>';
        return;
      }

      orgListContainer.innerHTML = data.organizations.map(org => `
        <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-md);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md);">
            <div>
              <div style="font-weight:700;font-size:1.1rem;">${org.name}</div>
              <div style="font-size:0.75rem;color:var(--text-tertiary);">Your role: <span class="badge badge-${org.role === 'owner' ? 'success' : org.role === 'admin' ? 'info' : 'neutral'}">${org.role}</span></div>
            </div>
            <div style="display:flex;gap:var(--space-xs);">
              <button class="btn btn-ghost btn-sm view-members-btn" data-id="${org.id}" data-role="${org.role}">👥 Members</button>
              ${org.role === 'owner' ? `<button class="btn btn-ghost btn-sm delete-org-btn" style="color:var(--error);" data-id="${org.id}">🗑️</button>` : ''}
            </div>
          </div>
          <div id="members-${org.id}" style="display:none;"></div>
        </div>
      `).join('');

      // View members
      layout.querySelectorAll('.view-members-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const orgId = btn.dataset.id;
          const myRole = btn.dataset.role;
          const container = layout.querySelector(`#members-${orgId}`);
          if (container.style.display === 'block') { container.style.display = 'none'; return; }
          container.style.display = 'block';
          container.innerHTML = '<div style="color:var(--text-tertiary);">Loading...</div>';

          try {
            const data = await orgs.members(orgId);
            const isAdmin = ['owner', 'admin'].includes(myRole);

            container.innerHTML = `
              ${isAdmin ? `
                <div style="margin-bottom:var(--space-md);padding:var(--space-sm);background:var(--bg-secondary);border-radius:var(--radius-md);">
                  <form class="invite-form" data-org-id="${orgId}" style="display:flex;gap:var(--space-xs);align-items:center;flex-wrap:wrap;">
                    <input type="email" class="input" placeholder="Email to invite..." style="flex:1;min-width:180px;" required />
                    <select class="input" style="width:auto;padding:6px 10px;">
                      <option value="developer">Developer</option>
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button type="submit" class="btn btn-primary btn-sm">Invite</button>
                  </form>
                  <div class="invite-error" style="color:var(--error);font-size:0.75rem;display:none;margin-top:4px;"></div>
                </div>
              ` : ''}
              <div class="members-list">
                ${data.members.map(m => `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-sm) 0;border-bottom:1px solid var(--border-subtle);">
                    <div style="display:flex;align-items:center;gap:var(--space-sm);">
                      ${m.avatar_url
                ? `<img src="${m.avatar_url}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" />`
                : `<div class="avatar" style="width:28px;height:28px;font-size:12px;">${(m.display_name || m.email || '?')[0].toUpperCase()}</div>`
              }
                      <div>
                        <div style="font-weight:500;font-size:0.875rem;">${m.display_name || 'Unnamed'}</div>
                        <div style="font-size:0.75rem;color:var(--text-tertiary);">${m.email}</div>
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:var(--space-xs);">
                      <span class="badge badge-${m.role === 'owner' ? 'success' : m.role === 'admin' ? 'info' : 'neutral'}">${m.role}</span>
                      ${isAdmin && m.role !== 'owner' ? `<button class="btn btn-ghost btn-sm remove-member-btn" data-org-id="${orgId}" data-user-id="${m.user_id}" style="color:var(--error);font-size:0.75rem;">✕</button>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            `;

            // Invite form handler
            const inviteForm = container.querySelector('.invite-form');
            if (inviteForm) {
              inviteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = inviteForm.querySelector('input[type="email"]');
                const roleSelect = inviteForm.querySelector('select');
                const errDiv = container.querySelector('.invite-error');
                errDiv.style.display = 'none';
                try {
                  await orgs.invite(orgId, emailInput.value.trim(), roleSelect.value);
                  emailInput.value = '';
                  btn.click(); btn.click(); // Re-expand to refresh
                } catch (err) {
                  errDiv.innerText = err.message;
                  errDiv.style.display = 'block';
                }
              });
            }

            // Remove member handlers
            container.querySelectorAll('.remove-member-btn').forEach(rmBtn => {
              rmBtn.addEventListener('click', async () => {
                if (!confirm('Remove this member?')) return;
                try {
                  await orgs.removeMember(rmBtn.dataset.orgId, rmBtn.dataset.userId);
                  btn.click(); btn.click();
                } catch (err) { alert(err.message); }
              });
            });
          } catch (err) {
            container.innerHTML = `<div style="color:var(--error);">${err.message}</div>`;
          }
        });
      });

      // Delete org
      layout.querySelectorAll('.delete-org-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this organization? All associated team access will be lost.')) return;
          try {
            await orgs.delete(btn.dataset.id);
            loadOrgs();
          } catch (err) { alert(err.message); }
        });
      });
    } catch (err) {
      orgListContainer.innerHTML = `<div style="color:var(--error);padding:var(--space-md);">${err.message}</div>`;
    }
  }

  if (createOrgForm) {
    createOrgForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = layout.querySelector('#newOrgName');
      createOrgError.style.display = 'none';
      try {
        await orgs.create(nameInput.value.trim());
        nameInput.value = '';
        loadOrgs();
      } catch (err) {
        createOrgError.innerText = err.message;
        createOrgError.style.display = 'block';
      }
    });
  }

  // Webhooks logic
  const webhooksListContainer = layout.querySelector('#webhooksListContainer');
  const webhookForm = layout.querySelector('#webhookForm');
  const webhookUrlInput = layout.querySelector('#webhookUrlInput');
  const addWebhookBtn = layout.querySelector('#addWebhookBtn');
  const webhookErrorMsg = layout.querySelector('#webhookErrorMsg');

  async function loadWebhooks() {
    try {
      const data = await webhooks.list();
      if (!data.webhooks || data.webhooks.length === 0) {
        webhooksListContainer.innerHTML = '<div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">No webhooks configured.</div>';
        return;
      }

      webhooksListContainer.innerHTML = data.webhooks.map(wh => `
        <div class="card" style="padding:var(--space-md);display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">
          <div>
            <div style="font-weight:500;">${wh.url}</div>
            <div style="font-size:0.75rem;color:var(--text-tertiary);">Added ${new Date(wh.created_at).toLocaleDateString()}</div>
          </div>
          <button class="btn btn-ghost delete-webhook-btn" style="color:var(--error);" data-id="${wh.id}">Remove</button>
        </div>
      `).join('');

      layout.querySelectorAll('.delete-webhook-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          if (!confirm('Remove this webhook?')) return;
          const id = e.target.getAttribute('data-id');
          btn.disabled = true;
          try {
            await webhooks.delete(id);
            loadWebhooks();
          } catch (err) {
            alert('Failed to delete: ' + err.message);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      webhooksListContainer.innerHTML = `<div style="color:var(--error);padding:var(--space-md);">${err.message}</div>`;
    }
  }

  if (webhookForm) {
    webhookForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      addWebhookBtn.disabled = true;
      webhookErrorMsg.style.display = 'none';
      try {
        await webhooks.add(webhookUrlInput.value);
        webhookUrlInput.value = '';
        loadWebhooks();
      } catch (err) {
        webhookErrorMsg.innerText = err.message;
        webhookErrorMsg.style.display = 'block';
      } finally {
        addWebhookBtn.disabled = false;
      }
    });

    // Initial load
    loadWebhooks();
  }

  // Avatar upload logic
  const avatarTrigger = layout.querySelector('#avatarUploadTrigger');
  const avatarFileInput = layout.querySelector('#avatarFileInput');
  const avatarMsg = layout.querySelector('#avatarUploadMsg');

  if (avatarTrigger && avatarFileInput) {
    avatarTrigger.addEventListener('click', () => avatarFileInput.click());

    avatarFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        avatarMsg.innerText = 'Please select an image file.';
        avatarMsg.style.color = 'var(--error)';
        avatarMsg.style.display = 'block';
        return;
      }

      avatarMsg.innerText = 'Uploading...';
      avatarMsg.style.color = 'var(--text-tertiary)';
      avatarMsg.style.display = 'block';

      try {
        // Resize to 128x128 via offscreen canvas
        const img = new Image();
        const reader = new FileReader();

        reader.onload = () => {
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // Crop to square center
            const size = Math.min(img.width, img.height);
            const sx = (img.width - size) / 2;
            const sy = (img.height - size) / 2;
            ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);

            const dataUri = canvas.toDataURL('image/jpeg', 0.85);

            try {
              await auth.uploadAvatar(dataUri);
              avatarMsg.innerText = 'Avatar updated!';
              avatarMsg.style.color = 'var(--success)';

              // Re-render the page to show the new avatar everywhere
              setTimeout(() => {
                container.innerHTML = '';
                renderSettings(container);
              }, 800);
            } catch (err) {
              avatarMsg.innerText = err.message || 'Upload failed';
              avatarMsg.style.color = 'var(--error)';
            }
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      } catch (err) {
        avatarMsg.innerText = 'Failed to process image.';
        avatarMsg.style.color = 'var(--error)';
      }
    });
  }

  // Save Settings handler
  const saveBtn = layout.querySelector('#saveSettingsBtn');
  const nameInput = layout.querySelector('#displayNameInput');
  const resultMsg = layout.querySelector('#settingsResultMsg');

  if (saveBtn && nameInput && resultMsg) {
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.innerText = 'Saving...';
      try {
        await auth.update({ display_name: nameInput.value });
        resultMsg.style.display = 'block';
        resultMsg.innerText = 'Saved successfully!';
        resultMsg.style.color = 'var(--success)';
        setTimeout(() => { resultMsg.style.display = 'none'; }, 3000);
      } catch (err) {
        resultMsg.style.display = 'block';
        resultMsg.innerText = err.message || 'Failed to update';
        resultMsg.style.color = 'var(--error)';
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Save Changes';
      }
    });
  }
}
