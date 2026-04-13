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

      <!-- Access Tokens Section (Expo Parity) -->
      <div style="margin-top:var(--space-2xl);">
        <div class="flex-between-wrap" style="margin-bottom:var(--space-md);">
          <div>
            <h3 style="margin:0;">Personal access tokens</h3>
            <p style="color:var(--text-tertiary);font-size:0.875rem;margin-top:4px;">Generate tokens for the BuildCheap CLI or API integrations.</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="createTokenBtn" style="display:flex;align-items:center;gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Create token
          </button>
        </div>

        <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-md);display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">Active CLI Session</div>
            <div class="api-key-display" style="display:inline-flex;align-items:center;background:var(--bg-secondary);padding:var(--space-xs) var(--space-sm);border-radius:4px;border:1px solid var(--border-medium);gap:var(--space-sm);">
              <span class="key-mask" id="apiKeyMask" style="font-family:monospace;letter-spacing:1px;">bc_live_••••••••••••••••••••••••</span>
              <button class="btn btn-ghost btn-sm" id="revealKeyBtn" style="padding:4px 8px;">👁️ Show</button>
            </div>
            ${user.api_key_expires_at
      ? `<div style="font-size:0.75rem;margin-top:8px;color:${new Date(user.api_key_expires_at) < new Date() ? 'var(--error)' : 'var(--text-tertiary)'};">
                  ${new Date(user.api_key_expires_at) < new Date() ? '⚠️ Expired' : '⏳ Expires'}: ${new Date(user.api_key_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>`
      : `<div style="font-size:0.75rem;margin-top:8px;color:var(--text-tertiary);">No expiration set</div>`
    }
          </div>
        </div>

        <div class="card" id="tokenDisplayCard" style="display:none;padding:var(--space-xl);border-color:var(--primary);background:rgba(99,102,241,0.05);margin-bottom:var(--space-md);">
          <h4 style="margin-bottom:var(--space-sm);color:var(--text-primary);">New Personal Access Token</h4>
          <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:var(--space-lg);">Copy this token now. For your security, you will safely not be able to see it again after closing this panel.</p>
          <div style="display:flex;gap:var(--space-sm);">
            <input type="text" id="newTokenInput" class="input" readonly style="flex:1;font-family:monospace;background:var(--surface-background);border-color:var(--border-medium);color:var(--text-primary);" />
            <button class="btn btn-primary" id="copyTokenBtn">Copy</button>
            <button class="btn btn-ghost" id="hideTokenBtn">Done</button>
          </div>
        </div>

        <div class="card" style="padding:var(--space-xl);display:flex;flex-direction:column;align-items:center;">
          <div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">Token Expiration</div>
          <div style="font-size:0.875rem;color:var(--text-tertiary);margin-bottom:var(--space-md);text-align:center;">Choose how long your new token will be valid before it automatically expires. Generating a new token will revoke your existing CLI token.</div>
          
          <div style="display:flex;gap:var(--space-xs);align-items:center;flex-wrap:wrap;justify-content:center;">
            <select id="credExpirationSelect" class="input" style="width:auto;padding:6px 12px;">
              <option value="0">No expiration</option>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30" selected>30 days</option>
              <option value="180">6 months</option>
              <option value="365">1 year</option>
              <option value="custom">Custom...</option>
            </select>
            <input type="number" id="credCustomExpInput" class="input" placeholder="Days" min="1" max="3650" style="width:80px;padding:6px 12px;display:none;" />
          </div>
        </div>
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
    const createTokenBtn = pageContent.querySelector('#createTokenBtn');
    const tokenDisplayCard = pageContent.querySelector('#tokenDisplayCard');
    const newTokenInput = pageContent.querySelector('#newTokenInput');
    const copyTokenBtn = pageContent.querySelector('#copyTokenBtn');
    const hideTokenBtn = pageContent.querySelector('#hideTokenBtn');

    const apiKeyMask = pageContent.querySelector('#apiKeyMask');
    const revealKeyBtn = pageContent.querySelector('#revealKeyBtn');

    if (revealKeyBtn && apiKeyMask) {
      let revealed = false;
      revealKeyBtn.addEventListener('click', () => {
        const currentUser = store.get('user');
        if (!revealed) {
          apiKeyMask.textContent = currentUser.api_key;
          revealKeyBtn.textContent = 'Hide';
          revealed = true;
          setTimeout(() => {
            apiKeyMask.textContent = 'bc_live_••••••••••••••••••••••••';
            revealKeyBtn.textContent = '👁️ Show';
            revealed = false;
          }, 5000);
        } else {
          apiKeyMask.textContent = 'bc_live_••••••••••••••••••••••••';
          revealKeyBtn.textContent = '👁️ Show';
          revealed = false;
        }
      });
    }

    const expSelect = pageContent.querySelector('#credExpirationSelect');
    const customExp = pageContent.querySelector('#credCustomExpInput');

    if (expSelect && customExp) {
      expSelect.addEventListener('change', () => {
        customExp.style.display = expSelect.value === 'custom' ? 'block' : 'none';
        if (expSelect.value === 'custom') customExp.focus();
      });
    }

    if (createTokenBtn) {
      createTokenBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure? Creating a new token will automatically revoke your current CLI token.')) return;

        let expDays = expSelect ? expSelect.value : 30;
        if (expDays === 'custom') {
          expDays = parseInt(customExp.value);
          if (isNaN(expDays) || expDays < 1) {
            alert('Please enter a valid number of days for custom expiration');
            return;
          }
        }

        createTokenBtn.disabled = true;
        createTokenBtn.innerText = 'Generating...';
        try {
          const res = await auth.rotateKey(expDays);

          const currentUser = store.get('user');
          currentUser.api_key = res.api_key;
          currentUser.api_key_expires_at = res.expires_at;
          store.set('user', currentUser);

          if (apiKeyMask) apiKeyMask.textContent = res.api_key;

          newTokenInput.value = res.api_key;
          tokenDisplayCard.style.display = 'block';
        } catch (err) {
          alert('Failed to generate token: ' + err.message);
        } finally {
          createTokenBtn.disabled = false;
          createTokenBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Create token`;
        }
      });

      copyTokenBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(newTokenInput.value);
        copyTokenBtn.innerText = 'Copied!';
        setTimeout(() => copyTokenBtn.innerText = 'Copy', 2000);
      });

      hideTokenBtn.addEventListener('click', () => {
        tokenDisplayCard.style.display = 'none';
        newTokenInput.value = '';
      });
    }
  }

  loadCredentials();
}
