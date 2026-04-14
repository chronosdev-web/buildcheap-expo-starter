// Credentials page — dynamic
import { createDashboardLayout } from '../components/layout.js';
import { credentials, auth } from '../api.js';
import { store } from '../store.js';

function renderLoading() {
  return `
    <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
      <div class="spinner" style="width:32px;height:32px;"></div>
    </div>`;
}

function renderCredentialsList(data, user) {
  if (!data.connected) {
    return `
        <div class="page-title-bar">
          <h2>Apple Credentials</h2>
        </div>
        <p style="color:var(--text-tertiary);margin-bottom:var(--space-md);font-size:0.875rem;">
          Connect your App Store Connect API keys to allow BuildCheap to auto-manage code signing and distribute your apps.
        </p>
        <div style="background:var(--bg-secondary);border-left:4px solid var(--primary);padding:var(--space-md);margin-bottom:var(--space-xl);border-radius:0 8px 8px 0;font-size:0.875rem;color:var(--text-secondary);line-height:1.5;">
          <strong>⚠️ Crucial Requirement for TestFlight</strong><br>
          If you do not provide active Apple API Credentials below, the BuildCheap worker will simply compile an <em>unsigned</em> Xcode archive and will <strong>skip the App Store Connect .ipa upload completely</strong>. You MUST connect these keys if you want your builds to actually appear in TestFlight.
        </div>
        
        <div class="card" style="padding:var(--space-xl);max-width:600px;margin:0 auto;">
          <h3 style="margin-bottom:var(--space-md);">Connect App Store Connect</h3>
          <div style="background:var(--bg-tertiary);padding:var(--space-md);border-radius:6px;margin-bottom:var(--space-lg);font-size:0.875rem;color:var(--text-secondary);line-height:1.6;">
            <strong>Where do I find these keys?</strong>
            <ol style="margin-top:var(--space-sm);margin-left:var(--space-lg);padding:0;">
              <li>Log into <a href="https://appstoreconnect.apple.com" target="_blank" style="color:var(--primary);">App Store Connect</a> and navigate to <strong>Users and Access</strong> &rarr; <strong>Integrations</strong> &rarr; <strong>App Store Connect API</strong>.</li>
              <li>Click the <strong>+</strong> button to generate a new key. Give it a name (e.g. "BuildCheap") and assign it the <strong>App Manager</strong> or <strong>Admin</strong> role.</li>
              <li>Once created, you will find your <strong>Issuer ID</strong> near the top of the page, and the <strong>Key ID</strong> directly inside the table row.</li>
              <li>Finally, click <strong>Download API Key</strong> to save the <code>.p8</code> file. Open it in any text editor and paste the entire contents into the Private Key box below.</li>
            </ol>
          </div>
          
          <form id="appleCredsForm" style="display:flex;flex-direction:column;gap:var(--space-md);">
            <div class="input-group">
              <label>Issuer ID</label>
              <input type="text" id="issuerId" class="input" placeholder="e.g. 57246542-96fe-1a63-e053-0824d011072a" required/>
            </div>
            <div class="input-group">
              <label>Key ID</label>
              <input type="text" id="keyId" class="input" placeholder="e.g. ABC123DEF4" required/>
            </div>
            <div class="input-group">
              <label>Team ID (Optional)</label>
              <input type="text" id="teamId" class="input" placeholder="e.g. TEAM123"/>
            </div>
            <div class="input-group">
              <label>.p8 Private Key</label>
              <textarea id="p8Key" class="input" rows="5" placeholder="-----BEGIN PRIVATE KEY-----\n..." required style="font-family:monospace;font-size:12px;"></textarea>
            </div>
            <div id="credsError" style="color:var(--error);font-size:0.875rem;display:none;"></div>
            <button type="submit" class="btn btn-primary" id="saveCredsBtn">Save Credentials</button>
          </form>
        </div>
        `;
  }

  return `
    <div class="page-title-bar">
      <h2>Apple Credentials</h2>
      <button class="btn btn-ghost" style="color:var(--error);" id="deleteCredsBtn">Disconnect</button>
    </div>
    <p style="color:var(--text-tertiary);margin-bottom:var(--space-xl);font-size:0.875rem;">
      Your App Store Connect API keys are stored securely. BuildCheap uses them exclusively to sign and distribute your applications.
    </p>
    
    <div class="card" style="padding:var(--space-lg);">
      <div class="credentials-list">
        <div class="credential-item">
          <div class="credential-icon">🔑</div>
          <div class="credential-info">
            <div class="credential-name">App Store Connect API Key</div>
            <div class="credential-detail">Key ID: ${data.key_id} · Issuer: ${data.issuer_id.slice(0, 8)}...${data.team_id ? ` · Team: ${data.team_id}` : ''}</div>
          </div>
          <div class="credential-actions">
            <span class="badge badge-success" id="testBadge">Connected</span>
            <button class="btn btn-ghost btn-sm" id="testCredsBtn">Test Connection</button>
          </div>
        </div>
      </div>
        </div>
        <div id="githubTestResult" style="margin-top:var(--space-md);font-size:0.875rem;"></div>
      </div>
    `;
}

export function renderCredentials(container) {
  const content = renderLoading();
  const layout = createDashboardLayout('credentials', content);
  container.appendChild(layout);

  const pageContent = layout.querySelector('#pageContent');

  function loadCredentials() {
    credentials.apple.get().then(data => {
      const user = store.get('user');
      pageContent.innerHTML = renderCredentialsList(data, user) + renderGithubSection();
      attachListeners(data.connected);
      attachGithubListeners();
    }).catch(err => {
      pageContent.innerHTML = `<div style="padding:var(--space-xl);text-align:center;color:var(--error);">Failed to load credentials: ${err.message}</div>`;
    });
  }

  function attachListeners(isConnected) {
    if (!isConnected) {
      const form = pageContent.querySelector('#appleCredsForm');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = pageContent.querySelector('#saveCredsBtn');
          const errDiv = pageContent.querySelector('#credsError');
          btn.disabled = true;
          btn.innerText = 'Saving...';
          errDiv.style.display = 'none';

          try {
            await credentials.apple.save({
              issuer_id: pageContent.querySelector('#issuerId').value,
              key_id: pageContent.querySelector('#keyId').value,
              team_id: pageContent.querySelector('#teamId').value,
              p8_key: pageContent.querySelector('#p8Key').value,
            });
            loadCredentials();
          } catch (err) {
            errDiv.innerText = err.message;
            errDiv.style.display = 'block';
            btn.disabled = false;
            btn.innerText = 'Save Credentials';
          }
        });
      }
    } else {
      const delBtn = pageContent.querySelector('#deleteCredsBtn');
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to disconnect your Apple API Key? Your builds will fail until you reconnect!')) {
            delBtn.disabled = true;
            try {
              await credentials.apple.delete();
              loadCredentials();
            } catch (err) {
              alert('Failed to delete credentials: ' + err.message);
              delBtn.disabled = false;
            }
          }
        });
      }

      const testBtn = pageContent.querySelector('#testCredsBtn');
      if (testBtn) {
        testBtn.addEventListener('click', async () => {
          testBtn.disabled = true;
          testBtn.innerText = 'Testing...';
          const resultDiv = pageContent.querySelector('#testResult');
          const badge = pageContent.querySelector('#testBadge');
          resultDiv.innerHTML = '';

          try {
            const res = await credentials.apple.test();
            badge.className = 'badge badge-success';
            badge.innerText = 'Valid';
            resultDiv.innerHTML = `<span style="color:var(--success);">✅ ${res.message}</span>`;
          } catch (err) {
            badge.className = 'badge badge-error';
            badge.innerText = 'Invalid';
            resultDiv.innerHTML = `<span style="color:var(--error);">❌ ${err.message}</span>`;
          }
          testBtn.disabled = false;
          testBtn.innerText = 'Test Connection';
        });
      }
    }
  }

  function renderGithubSection() {
    const user = store.get('user') || {};
    const hasToken = user.has_github_token;

    if (!hasToken) {
      return `
        <div style="margin-top:var(--space-2xl);">
          <div class="page-title-bar">
            <h2>GitHub Authentication</h2>
          </div>
          <p style="color:var(--text-tertiary);margin-bottom:var(--space-xl);font-size:0.875rem;line-height:1.5;">
            Configure a Personal Access Token (PAT) so BuildCheap can physically clone your private repositories during the build phase. Without this, your isolated Mac Mini build container will crash with a "Repository not found" error when you click Build.<br><br>
            <b style="color:var(--text-primary);">How to get a token:</b><br>
            1. Log into GitHub and go to <b>Settings &gt; Developer Settings &gt; Personal Access Tokens &gt; Tokens (classic)</b>.<br>
            2. Click "Generate new token (classic)".<br>
            3. Give it a name like "BuildCheap", check the <b>"repo"</b> scope box (Full control of private repositories), and click Generate.<br>
            4. Paste the resulting <code>ghp_...</code> string here.
          </p>
          <div class="card" style="padding:var(--space-xl);max-width:600px;margin:0 auto;">
            <h3 style="margin-bottom:var(--space-md);">Connect Private Repositories</h3>
            
            <form id="githubCredsForm" style="display:flex;flex-direction:column;gap:var(--space-md);">
              <div class="input-group">
                <label>GitHub Personal Access Token</label>
                <input type="password" id="githubToken" class="input" placeholder="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" required/>
              </div>
              <div id="githubCredsError" style="color:var(--error);font-size:0.875rem;display:none;"></div>
              <button type="submit" class="btn btn-primary" id="saveGithubBtn">Save Access Token</button>
            </form>
          </div>
        </div>
      `;
    }

    return `
      <div style="margin-top:var(--space-2xl);">
        <div class="page-title-bar">
          <h2>GitHub Authentication</h2>
          <button class="btn btn-ghost" style="color:var(--error);" id="deleteGithubBtn">Disconnect</button>
        </div>
        <p style="color:var(--text-tertiary);margin-bottom:var(--space-xl);font-size:0.875rem;">
          Your GitHub API connection is active. BuildCheap will securely inject this token behind the scenes whenever importing a private Native compilation target.
        </p>
        <div class="card" style="padding:var(--space-lg);">
          <div class="credentials-list">
            <div class="credential-item">
              <div class="credential-icon">🐙</div>
              <div class="credential-info">
                <div class="credential-name">GitHub Personal Access Token</div>
                <div class="credential-detail">Scoped for private repository clones</div>
              </div>
              <div class="credential-actions">
                <span class="badge badge-success">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function attachGithubListeners() {
    const user = store.get('user') || {};
    if (!user.has_github_token) {
      const form = pageContent.querySelector('#githubCredsForm');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = pageContent.querySelector('#saveGithubBtn');
          const errDiv = pageContent.querySelector('#githubCredsError');
          const input = pageContent.querySelector('#githubToken');

          btn.disabled = true;
          btn.innerText = 'Saving...';
          errDiv.style.display = 'none';

          try {
            await credentials.github.save(input.value.trim());
            store.set('user', { ...user, has_github_token: true });
            loadCredentials();
          } catch (err) {
            errDiv.innerText = err.message;
            errDiv.style.display = 'block';
            btn.disabled = false;
            btn.innerText = 'Save Access Token';
          }
        });
      }
    } else {
      const delBtn = pageContent.querySelector('#deleteGithubBtn');
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to disconnect your GitHub Token? Background clones of private repositories will immediately fail.')) {
            delBtn.disabled = true;
            try {
              await credentials.github.save(''); // Send empty string to clear
              store.set('user', { ...user, has_github_token: false });
              loadCredentials();
            } catch (err) {
              alert('Failed to delete GitHub token: ' + err.message);
              delBtn.disabled = false;
            }
          }
        });
      }
    }
  }

  loadCredentials();
}
