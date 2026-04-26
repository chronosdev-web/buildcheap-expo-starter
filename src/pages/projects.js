import { createDashboardLayout } from '../components/layout.js';
import { dashboard, projects, secrets, builds, CONFIG } from '../api.js';

function renderLoading() {
  return `
    <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
      <div class="spinner" style="width:32px;height:32px;"></div>
    </div>`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
}
export function renderProjects(container) {
  const content = renderLoading();
  const layout = createDashboardLayout('projects', content);
  container.appendChild(layout);

  const pageContent = layout.querySelector('#pageContent');

  function renderProjectList(data) {
    if (!data || !data.projects || data.projects.length === 0) {
      return `
            <div class="page-title-bar">
                <h2>Projects</h2>
                <button class="btn btn-primary" id="newProjectBtn">+ New Project</button>
            </div>
            <div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">
                <div style="font-size:2rem;margin-bottom:var(--space-sm);">📦</div>
                <div>No projects yet. Create one to get started!</div>
            </div>`;
    }

    const styles = `
      <style>
        .dropdown-item:hover { background: var(--surface-overlay); }
      </style>
    `;

    const projectsHtml = data.projects.map((p, i) => `
            <div class="card card-glow project-card animate-in" style="animation-delay: ${i * 0.1}s; position:relative; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <div class="project-card-header" style="align-items:flex-start;">
                        <div style="display:flex;gap:var(--space-md);align-items:center;">
                            <div class="project-icon ${p.platform || 'both'}">${p.platform === 'ios' ? '🍎' : (p.platform === 'android' ? '🤖' : '📱')}</div>
                            <div>
                                <div class="project-card-title">${p.name}</div>
                                <div class="project-card-slug">${p.slug}</div>
                                <div style="font-size:0.7rem; color:var(--text-tertiary); font-family:monospace; margin-top:4px;" title="Project ID: ${p.id}">ID: ${p.id}</div>
                            </div>
                        </div>
                        
                        <div class="dropdown" style="position:relative;">
                            <button class="btn btn-ghost btn-sm dropdown-trigger" data-dropdown="dp-${p.id}" style="padding:4px 8px;font-size:1.25rem;color:var(--text-secondary);">⋮</button>
                            <div id="dp-${p.id}" class="dropdown-content animate-in" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;background:var(--surface-card);border:1px solid var(--border-medium);border-radius:var(--radius-md);padding:var(--space-xs);min-width:180px;z-index:20;box-shadow:0 10px 15px -3px rgba(0,0,0,0.5);">
                                <div class="dropdown-item manage-secrets-btn" data-id="${p.id}" data-name="${p.name}" style="cursor:pointer;padding:8px 12px;font-size:0.875rem;border-radius:var(--radius-sm);transition:background 0.2s;">🔑 Settings & Secrets</div>
                                <div class="dropdown-item edit-project-btn" data-id="${p.id}" data-name="${p.name}" data-bundle="${p.bundle_id}" data-repo="${p.repo_url}" style="cursor:pointer;padding:8px 12px;font-size:0.875rem;border-radius:var(--radius-sm);transition:background 0.2s;">⚙️ Edit metadata</div>
                                <div class="dropdown-item delete-project-btn" data-id="${p.id}" style="cursor:pointer;padding:8px 12px;font-size:0.875rem;color:var(--error);border-radius:var(--radius-sm);transition:background 0.2s;">🗑️ Delete project</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="project-card-meta" style="margin-top:var(--space-md);">
                        <div class="meta-item">⏱️ <span>Created ${timeAgo(p.created_at)}</span></div>
                    </div>
                    
                    <div style="margin-top:var(--space-md);display:flex;gap:var(--space-sm);flex-wrap:wrap;margin-bottom:var(--space-xl);">
                        <button class="btn btn-primary btn-sm trigger-build-btn" data-id="${p.id}" data-platform="ios" style="flex:1;">Build Native (iOS)</button>
                    </div>
                </div>

                ${p.last_build_status ? `
                <div style="padding:var(--space-sm) var(--space-md); margin:0 -var(--space-lg) -var(--space-xl) -var(--space-lg); background:${p.last_build_status === 'success' ? 'rgba(34,197,94,0.1)' : p.last_build_status === 'failed' || p.last_build_status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)'}; color:${p.last_build_status === 'success' ? 'var(--success)' : p.last_build_status === 'failed' || p.last_build_status === 'error' ? 'var(--error)' : 'var(--primary)'}; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:var(--space-xs); border-top:1px solid var(--border-light); border-bottom-left-radius:var(--radius-lg); border-bottom-right-radius:var(--radius-lg);">
                  <span>${p.last_build_status === 'success' ? '✅' : p.last_build_status === 'failed' || p.last_build_status === 'error' ? '❌' : '⏳'}</span> 
                  <span>iOS build ${p.last_build_status === 'success' ? 'completed' : p.last_build_status === 'failed' || p.last_build_status === 'error' ? 'failed' : 'is currently running'} ${timeAgo(p.last_build_time)}</span>
                </div>
                ` : `
                <div style="padding:var(--space-sm) var(--space-md); margin:0 -var(--space-lg) -var(--space-xl) -var(--space-lg); background:var(--surface-overlay); color:var(--text-tertiary); font-size:0.75rem; font-weight:600; display:flex; align-items:center; border-top:1px solid var(--border-light); border-bottom-left-radius:var(--radius-lg); border-bottom-right-radius:var(--radius-lg);">
                  ◦ No builds yet
                </div>
                `}
            </div>
        `).join('');

    return `
        ${styles}
        <div class="page-title-bar">
            <h2>Projects</h2>
            <button class="btn btn-primary" id="newProjectBtn">+ New Project</button>
        </div>
        
        <div class="card" style="padding:var(--space-md) var(--space-lg);margin-bottom:var(--space-lg);display:flex;align-items:center;justify-content:space-between;border-color:transparent;background:var(--surface-card);border:1px solid var(--border-medium);">
          <div style="font-size:0.875rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:4px;">
            <strong style="color:var(--text-primary);">You have <span>${Math.floor((data.user?.credit_balance || 0) / CONFIG.COST_PER_BUILD)}</span> prepaid build credits remaining.</strong>
            <span style="color:var(--text-tertiary);font-size:0.8rem;">Additional usage requires a <a href="#/billing" style="color:var(--primary);text-decoration:none;">balance topping</a>. See <a href="#/billing" style="color:var(--text-secondary);">billing</a>.</span>
          </div>
          <div style="width:250px;display:flex;align-items:center;gap:var(--space-sm);font-size:0.75rem;color:var(--text-tertiary);font-weight:600;">
            <span>0%</span>
            <div style="flex:1;height:6px;background:var(--border-medium);border-radius:3px;overflow:hidden;">
              <div style="height:100%;background:var(--primary);width:${Math.min(100, Math.max(0, (Math.floor((data.user?.credit_balance || 0) / CONFIG.COST_PER_BUILD) / 100) * 100))}%;border-radius:3px;"></div>
            </div>
            <span>100+ builds</span>
          </div>
        </div>

        <div style="background:rgba(99, 102, 241, 0.1); border: 1px solid var(--primary); border-radius:var(--radius-md); padding:var(--space-md); margin-bottom:var(--space-xl); font-size:0.875rem; color: var(--text-secondary); line-height: 1.6;">
          <strong>💡 Four ways to build:</strong><br>
          <strong>1. Git Clone</strong> — Link a GitHub repo. (For private repos, add your Personal Access Token on the <b>Credentials</b> page).<br>
          <strong>2. Manual Upload</strong> — No GitHub? Click <b>"📤 Upload Source"</b> below to upload a <code>.zip</code> or <code>.tar.gz</code> directly.<br>
          <strong>3. BuildCheap CLI</strong> — Run <code>buildcheap init</code> and <code>buildcheap build --platform ios</code> inside your local codebase terminal for a seamless <code>eas build</code>-like experience.<br>
          <strong>4. REST API (CI/CD)</strong> — Automate your builds using any CI provider by sending a <code>POST /api/builds</code> request with your API Key.
        </div>
        <div class="projects-grid">
            ${projectsHtml}
            <div class="card project-card animate-in" id="newProjectCard" style="animation-delay: ${data.projects.length * 0.1}s; border:2px dashed var(--border-medium);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;cursor:pointer;">
                <div style="font-size:2rem;margin-bottom:var(--space-sm);opacity:0.4;">+</div>
                <div style="font-size:0.875rem;color:var(--text-tertiary);font-weight:600;">Create New Project</div>
                <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px;">Connect a repo or start fresh</div>
            </div>
        </div>
        `;
  }

  function loadProjects() {
    dashboard.get().then(data => {
      pageContent.innerHTML = renderProjectList(data);
      attachListeners();
    }).catch(err => {
      pageContent.innerHTML = `<div style="padding:var(--space-xl);text-align:center;color:var(--text-tertiary);">⚠️ Failed to load dashboard: ${err.message}</div>`;
    });
  }

  function attachListeners() {
    // Dropdown Toggles
    document.body.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-content').forEach(el => el.style.display = 'none');
      }
    });

    pageContent.querySelectorAll('.dropdown-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dpId = e.target.getAttribute('data-dropdown');
        document.querySelectorAll('.dropdown-content').forEach(el => {
          if (el.id !== dpId) el.style.display = 'none';
        });
        const content = document.getElementById(dpId);
        if (content) {
          content.style.display = content.style.display === 'none' ? 'block' : 'none';
        }
      });
    });

    // Delete Project
    const deleteBtns = pageContent.querySelectorAll('.delete-project-btn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const projectId = e.target.getAttribute('data-id');
        if (!confirm('Are you absolutely sure you want to delete this project? This will permanently wipe all builds and secrets. This action cannot be undone.')) return;

        btn.disabled = true;
        try {
          await projects.delete(projectId);
          loadProjects();
        } catch (err) {
          alert('Failed to delete project: ' + err.message);
          btn.disabled = false;
        }
      });
    });

    // Edit Project
    const editBtns = pageContent.querySelectorAll('.edit-project-btn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.currentTarget;
        const projectId = btnEl.getAttribute('data-id');
        const projName = btnEl.getAttribute('data-name');
        const projBundle = btnEl.getAttribute('data-bundle') || '';
        const projRepo = btnEl.getAttribute('data-repo') || '';
        const isUploadedSource = projRepo.startsWith('file://');
        const displayRepo = isUploadedSource ? '' : projRepo;

        const modalHtml = `
          <div id="editModalOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;">
            <div class="card animate-in" style="width:100%;max-width:550px;padding:var(--space-xl);position:relative;">
              <h3 style="margin-bottom:var(--space-lg);">Edit Project Settings</h3>
              
              <div class="input-group" style="margin-bottom:var(--space-md);">
                <label>Project Name</label>
                <input type="text" id="editProjName" class="input" value="${projName}" />
              </div>
              <div class="input-group" style="margin-bottom:var(--space-md);">
                <label>Bundle ID / App Store ID</label>
                <input type="text" id="editProjBundle" class="input" value="${projBundle}" placeholder="com.company.app" />
              </div>
              <div class="input-group" style="margin-bottom:var(--space-md);">
                <label>Source Code</label>
                ${isUploadedSource ? `
                  <div style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-sm);">
                    <span style="background:rgba(34,197,94,0.15);color:var(--success);padding:4px 10px;border-radius:var(--radius-sm);font-size:0.78rem;font-weight:600;">📤 Uploaded via file</span>
                    <span style="font-size:0.78rem;color:var(--text-tertiary);">Source is stored on the build server</span>
                  </div>
                  <input type="text" id="editProjRepo" class="input" value="" placeholder="https://github.com/your-org/your-app (optional — replaces uploaded source)" />
                  <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px;">Leave blank to keep using the uploaded source. Enter a GitHub URL to switch to Git-based builds.</div>
                ` : `
                  <input type="text" id="editProjRepo" class="input" value="${displayRepo}" placeholder="https://github.com/your-org/your-app" />
                `}
              </div>
              
              <div id="editModalError" style="color:var(--error);font-size:0.875rem;display:none;margin-bottom:var(--space-sm);"></div>
              <div style="display:flex;justify-content:flex-end;gap:var(--space-sm);margin-top:var(--space-xl);">
                <button class="btn btn-ghost" id="cancelEditModalBtn">Cancel</button>
                <button class="btn btn-primary" id="saveEditModalBtn">Save Changes</button>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const overlay = document.getElementById('editModalOverlay');
        const cancelBtn = document.getElementById('cancelEditModalBtn');
        const saveBtn = document.getElementById('saveEditModalBtn');
        const errDiv = document.getElementById('editModalError');

        const closeModal = () => overlay.remove();
        cancelBtn.addEventListener('click', closeModal);

        saveBtn.addEventListener('click', async () => {
          saveBtn.disabled = true;
          errDiv.style.display = 'none';

          const newRepo = document.getElementById('editProjRepo').value.trim();

          try {
            await projects.update(projectId, {
              name: document.getElementById('editProjName').value.trim(),
              bundle_id: document.getElementById('editProjBundle').value.trim(),
              repo_url: newRepo || projRepo,  // Keep original source if blank
              platform: 'ios'
            });
            closeModal();
            loadProjects();
          } catch (err) {
            errDiv.innerText = err.message;
            errDiv.style.display = 'block';
            saveBtn.disabled = false;
          }
        });
      });
    });

    // Create new project
    const createBtns = pageContent.querySelectorAll('#newProjectBtn, #newProjectCard');
    createBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const modalHtml = `
          <div id="customModalOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;">
            <div class="card animate-in" style="width:100%;max-width:550px;padding:var(--space-xl);position:relative;">
              <h3 style="margin-bottom:var(--space-sm);">Create New Project</h3>
              <p style="color:var(--text-tertiary);font-size:0.875rem;margin-bottom:var(--space-lg);">
                Choose how you want to connect your source code.
              </p>
              
              <div style="display:flex;gap:var(--space-md);margin-bottom:var(--space-xl);">
                <button class="btn btn-primary" id="tabGitBtn" style="flex:1;opacity:1;">🔗 Git Repository</button>
                <button class="btn btn-ghost" id="tabUploadBtn" style="flex:1;">📤 Upload Source</button>
              </div>
              
              <!-- Git Path -->
              <div id="gitPathSection">
                <div class="input-group" style="margin-bottom:var(--space-lg);">
                  <label>Repository URL</label>
                  <input type="url" id="repoUrlInput" class="input" placeholder="https://github.com/your-org/your-app" autofocus/>
                </div>
              </div>
              
              <!-- Upload Path -->
              <div id="uploadPathSection" style="display:none;">
                <div class="input-group" style="margin-bottom:var(--space-sm);">
                  <label>Project Name</label>
                  <input type="text" id="uploadProjectName" class="input" placeholder="my-awesome-app" />
                </div>
                <!-- File Drop Zone -->
                <div id="newProjectDropZone" style="border:2px dashed var(--border-medium);border-radius:var(--radius-lg);padding:var(--space-md);cursor:pointer;transition:all 0.2s ease;margin-bottom:var(--space-sm);text-align:center;">
                  <div style="font-size:1.5rem;margin-bottom:4px;">📁</div>
                  <div style="font-weight:600;color:var(--text-primary);font-size:0.875rem;" id="newProjectFileName">Click or drag to select source file</div>
                  <div style="font-size:0.7rem;color:var(--text-tertiary);margin-top:2px;">.zip or .tar.gz — max 500MB</div>
                  <input type="file" id="newProjectFileInput" accept=".zip,.tar.gz,.tgz,application/zip,application/gzip" style="display:none;" />
                </div>
              </div>

              <!-- Shared Bundle ID Field -->
              <div class="input-group" style="margin-bottom:var(--space-xl);">
                <label>Bundle ID (App Store Connect)</label>
                <input type="text" id="createProjBundle" class="input" placeholder="com.company.app" />
                <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px;">Must exactly match the App entry in your Apple Developer portal.</div>
              </div>
              
              <div id="createModalError" style="color:var(--error);font-size:0.875rem;display:none;margin-bottom:var(--space-sm);"></div>
              <div style="display:flex;justify-content:flex-end;gap:var(--space-sm);">
                <button class="btn btn-ghost" id="cancelModalBtn">Cancel</button>
                <button class="btn btn-primary" id="confirmModalBtn">Import Project</button>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const overlay = document.getElementById('customModalOverlay');
        const repoInput = document.getElementById('repoUrlInput');
        const uploadNameInput = document.getElementById('uploadProjectName');
        const cancelBtn = document.getElementById('cancelModalBtn');
        const confirmBtn = document.getElementById('confirmModalBtn');
        const errDiv = document.getElementById('createModalError');
        const gitSection = document.getElementById('gitPathSection');
        const uploadSection = document.getElementById('uploadPathSection');
        const tabGit = document.getElementById('tabGitBtn');
        const tabUpload = document.getElementById('tabUploadBtn');

        const fileInput = document.getElementById('newProjectFileInput');
        const dropZone = document.getElementById('newProjectDropZone');
        const fileNameDisp = document.getElementById('newProjectFileName');

        let selectedFile = null;
        let mode = 'git';

        repoInput.focus();

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
          if (fileInput.files.length > 0) {
            selectedFile = fileInput.files[0];
            fileNameDisp.innerText = selectedFile.name;
            dropZone.style.borderColor = 'var(--primary)';
          }
        });
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = 'rgba(99,102,241,0.05)'; });
        dropZone.addEventListener('dragleave', () => { dropZone.style.background = 'transparent'; });
        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropZone.style.background = 'transparent';
          if (e.dataTransfer.files.length > 0) {
            selectedFile = e.dataTransfer.files[0];
            fileNameDisp.innerText = selectedFile.name;
            dropZone.style.borderColor = 'var(--primary)';
          }
        });

        tabGit.addEventListener('click', () => {
          mode = 'git';
          tabGit.className = 'btn btn-primary'; tabGit.style.flex = '1';
          tabUpload.className = 'btn btn-ghost'; tabUpload.style.flex = '1';
          gitSection.style.display = 'block';
          uploadSection.style.display = 'none';
          confirmBtn.innerText = 'Import Project';
        });
        tabUpload.addEventListener('click', () => {
          mode = 'upload';
          tabUpload.className = 'btn btn-primary'; tabUpload.style.flex = '1';
          tabGit.className = 'btn btn-ghost'; tabGit.style.flex = '1';
          gitSection.style.display = 'none';
          uploadSection.style.display = 'block';
          confirmBtn.innerText = 'Create Project';
        });

        const closeModal = () => overlay.remove();
        cancelBtn.addEventListener('click', closeModal);

        confirmBtn.addEventListener('click', async () => {
          confirmBtn.disabled = true;
          errDiv.style.display = 'none';

          const bundleId = document.getElementById('createProjBundle').value.trim();

          try {
            if (mode === 'git') {
              const url = repoInput.value.trim();
              if (!url) { errDiv.innerText = 'Repository URL is required'; errDiv.style.display = 'block'; confirmBtn.disabled = false; return; }
              confirmBtn.innerText = 'Importing...';

              const parts = url.replace(/\/$/, '').split('/');
              const repo = parts[parts.length - 1];
              const user = parts[parts.length - 2];

              await projects.create({
                name: repo,
                slug: `${user || 'user'}/${repo}`,
                repo_url: url,
                bundle_id: bundleId,
                platform: 'ios'
              });
            } else {
              const name = uploadNameInput.value.trim();
              if (!name) { errDiv.innerText = 'Project name is required'; errDiv.style.display = 'block'; confirmBtn.disabled = false; return; }
              if (!selectedFile) { errDiv.innerText = 'Please select a .zip or .tar.gz source file'; errDiv.style.display = 'block'; confirmBtn.disabled = false; return; }

              confirmBtn.innerText = 'Creating Project...';

              const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
              const res = await projects.create({
                name: name,
                slug: slug,
                bundle_id: bundleId,
                platform: 'ios'
              });

              confirmBtn.innerText = 'Uploading Archive...';
              await projects.upload(res.project.id, selectedFile);
            }
            closeModal();
            loadProjects();
          } catch (err) {
            errDiv.innerText = err.message;
            errDiv.style.display = 'block';
            confirmBtn.disabled = false;
            confirmBtn.innerText = mode === 'git' ? 'Import Project' : 'Create Project';
          }
        });
      });
    });

    // Manage Secrets
    const secretBtns = pageContent.querySelectorAll('.manage-secrets-btn');
    secretBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const projectId = e.target.getAttribute('data-id');
        const projectName = e.target.getAttribute('data-name');

        const modalHtml = `
          <div id="secretsModalOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:var(--space-xl);">
            <div class="card animate-in" style="width:100%;max-width:700px;max-height:85vh;display:flex;flex-direction:column;padding:var(--space-xl);position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">
                <h3 style="margin:0;">🔑 Environment Secrets</h3>
                <button class="btn btn-ghost btn-sm" id="closeSecretsBtn">✕ Close</button>
              </div>
              <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:var(--space-sm);line-height:1.5;">
                Secrets are private values your app needs at build time — like API keys, app names, or version numbers. They're <strong style="color:var(--success);">encrypted</strong> and injected into your build automatically.
              </p>
              
              <details style="margin-bottom:var(--space-md);">
                <summary style="cursor:pointer;color:var(--primary);font-weight:600;font-size:0.8rem;user-select:none;padding:var(--space-xs) 0;">📖 How to use this (click to expand)</summary>
                <div style="margin-top:var(--space-sm);padding:var(--space-md);background:var(--bg-tertiary);border-radius:var(--radius-md);font-size:0.8rem;line-height:1.8;color:var(--text-tertiary);">
                  <p style="margin:0 0 var(--space-sm);"><strong style="color:var(--text-secondary);">Step 1:</strong> In the form below, type the variable name on the left (e.g. <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;color:var(--text-primary);">APP_NAME</code>)</p>
                  <p style="margin:0 0 var(--space-sm);"><strong style="color:var(--text-secondary);">Step 2:</strong> Type its value on the right (e.g. <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;color:var(--text-primary);">MyApp</code>)</p>
                  <p style="margin:0 0 var(--space-md);"><strong style="color:var(--text-secondary);">Step 3:</strong> Click <strong>Add</strong>. It will appear in the table above the form. Repeat for each variable you need.</p>
                  
                  <div style="border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.05);padding:var(--space-md);border-radius:var(--radius-md);margin-bottom:var(--space-md);">
                    <p style="margin:0 0 var(--space-xs);color:var(--error);font-weight:700;font-size:0.85rem;">🚨 CRITICAL CODE UPDATE REQUIRED 🚨</p>
                    <p style="margin:0 0 var(--space-sm);color:var(--text-secondary);">For these secrets to work, you <strong>must</strong> update your Expo configuration file. If your project uses a static <code>app.json</code>, these variables will be ignored!</p>
                    
                    <p style="margin:0 0 4px;"><strong style="color:var(--text-primary);">1. Rename:</strong> Change <code>app.json</code> to <code>app.config.js</code></p>
                    <p style="margin:0 0 4px;"><strong style="color:var(--text-primary);">2. Modify:</strong> Wrap your JSON config to pull from the environment:</p>
                    
                    <pre style="background:var(--bg-primary);border:1px solid var(--border-medium);padding:var(--space-sm);border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:0.75rem;overflow-x:auto;margin:var(--space-xs) 0 var(--space-sm);color:var(--text-primary);">
export default {
  "name": process.env.APP_NAME || "My Default Name",
  "version": process.env.APP_VERSION || "1.0.0",
  // ... the rest of your app config
}</pre>
                    <p style="margin:0;font-size:0.75rem;color:var(--text-tertiary);">When you build, BuildCheap replaces <code>process.env.APP_VERSION</code> with the value you set here.</p>
                  </div>

                  <div style="border-top:1px solid var(--border-light);padding-top:var(--space-sm);margin-top:var(--space-xs);">
                    <p style="margin:0 0 var(--space-xs);"><strong style="color:var(--text-secondary);">Common variables you might need:</strong></p>
                    <table style="width:100%;font-size:0.78rem;border-collapse:collapse;">
                      <tr><td style="padding:3px 0;"><code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;color:var(--text-primary);">APP_NAME</code></td><td style="padding:3px 8px;color:var(--text-tertiary);">→</td><td style="padding:3px 0;">Your app's display name (e.g. CalSnap, Florist Pro)</td></tr>
                      <tr><td style="padding:3px 0;"><code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;color:var(--text-primary);">APP_VERSION</code></td><td style="padding:3px 8px;color:var(--text-tertiary);">→</td><td style="padding:3px 0;">Version shown in App Store (e.g. 1.0.1, 2.3.0)</td></tr>
                      <tr><td style="padding:3px 0;"><code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;color:var(--text-primary);">APP_SLUG</code></td><td style="padding:3px 8px;color:var(--text-tertiary);">→</td><td style="padding:3px 0;">URL-safe app identifier (e.g. calsnap, florist-pro)</td></tr>
                      <tr><td style="padding:3px 0;"><code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;color:var(--text-primary);">REVENUECAT_API_KEY</code></td><td style="padding:3px 8px;color:var(--text-tertiary);">→</td><td style="padding:3px 0;">In-app purchase / subscription service key</td></tr>
                      <tr><td style="padding:3px 0;"><code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;color:var(--text-primary);">GOOGLE_MAPS_KEY</code></td><td style="padding:3px 8px;color:var(--text-tertiary);">→</td><td style="padding:3px 0;">Google Maps, Firebase, or other third-party keys</td></tr>
                      <tr><td style="padding:3px 0;"><code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;color:var(--text-primary);">SENTRY_DSN</code></td><td style="padding:3px 8px;color:var(--text-tertiary);">→</td><td style="padding:3px 0;">Crash reporting / error tracking endpoint</td></tr>
                    </table>
                  </div>
                  <p style="margin:var(--space-sm) 0 0;color:var(--warning);font-size:0.75rem;">⚠ Names must be UPPER_CASE with underscores only. Values are encrypted and hidden after saving — you won't be able to see them again, but you can always delete and re-add.</p>
                </div>
              </details>
              
              <div style="overflow-y:auto;flex:1;margin-bottom:var(--space-md);">
                <table class="table" style="width:100%;font-size:0.875rem;">
                  <thead>
                    <tr><th style="padding-bottom:8px;text-align:left;">Key</th><th style="padding-bottom:8px;text-align:left;">Value</th><th style="padding-bottom:8px;text-align:right;">Action</th></tr>
                  </thead>
                  <tbody id="secretsTableBody">
                    <tr><td colspan="3" style="text-align:center;padding:var(--space-md);color:var(--text-tertiary);">Loading...</td></tr>
                  </tbody>
                </table>
              </div>
              
              <div style="margin-top:auto;padding-top:var(--space-md);border-top:1px solid var(--border-medium);">
                <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-xs);font-size:0.7rem;color:var(--text-tertiary);font-weight:600;">
                  <span style="flex:1;">VARIABLE NAME</span>
                  <span style="flex:1;">SECRET VALUE</span>
                  <span style="width:55px;"></span>
                </div>
                <form id="addSecretForm" style="display:flex;gap:var(--space-sm);align-items:center;">
                  <input type="text" id="secretKeyInput" class="input flex-auto" placeholder="e.g. APP_NAME" required pattern="^[a-zA-Z_][a-zA-Z0-9_]*$" title="Letters, numbers, and underscores only (e.g. APP_NAME)" />
                  <div style="flex:1;position:relative;display:flex;">
                    <input type="password" id="secretValueInput" class="input" style="width:100%;padding-right:36px;" placeholder="e.g. MyApp" required />
                    <button type="button" id="toggleSecretVisibility" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:1rem;color:var(--text-tertiary);padding:2px;" title="Show/hide value">👁️</button>
                  </div>
                  <button type="submit" class="btn btn-primary" id="addSecretSubmitBtn">Add</button>
                </form>
              </div>
              <div id="secretErrorMsg" style="color:var(--error);font-size:0.875rem;display:none;margin-top:var(--space-xs);"></div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const overlay = document.getElementById('secretsModalOverlay');
        const closeBtn = document.getElementById('closeSecretsBtn');
        const tbody = document.getElementById('secretsTableBody');
        const form = document.getElementById('addSecretForm');
        const keyInput = document.getElementById('secretKeyInput');
        const valInput = document.getElementById('secretValueInput');
        const submitBtn = document.getElementById('addSecretSubmitBtn');
        const errorMsg = document.getElementById('secretErrorMsg');
        const toggleVisBtn = document.getElementById('toggleSecretVisibility');

        const close = () => overlay.remove();
        closeBtn.addEventListener('click', close);

        // Toggle password visibility
        toggleVisBtn.addEventListener('click', () => {
          if (valInput.type === 'password') {
            valInput.type = 'text';
            toggleVisBtn.textContent = '🙈';
            toggleVisBtn.title = 'Hide value';
          } else {
            valInput.type = 'password';
            toggleVisBtn.textContent = '👁️';
            toggleVisBtn.title = 'Show value';
          }
        });

        async function reloadSecrets() {
          try {
            const data = await secrets.list(projectId);
            if (!data.secrets || data.secrets.length === 0) {
              tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:var(--space-md);color:var(--text-tertiary);">No secrets configured for this project.</td></tr>';
              return;
            }
            tbody.innerHTML = data.secrets.map(s => `
              <tr style="border-bottom:1px solid var(--border-light);">
                <td style="padding:var(--space-sm) 0;font-family:monospace;font-weight:600;">${s.key_name}</td>
                <td style="padding:var(--space-sm) 0;color:var(--success);">Encrypted</td>
                <td style="padding:var(--space-sm) 0;text-align:right;">
                  <button class="btn btn-ghost btn-sm delete-secret-btn" style="color:var(--error);" data-id="${s.id}">Remove</button>
                </td>
              </tr>
            `).join('');

            document.querySelectorAll('.delete-secret-btn').forEach(delBtn => {
              delBtn.addEventListener('click', async (btnEvent) => {
                if (!confirm('Delete this secret? Builds may fail if it is required.')) return;
                const secretId = btnEvent.target.getAttribute('data-id');
                delBtn.disabled = true;
                try {
                  await secrets.delete(projectId, secretId);
                  reloadSecrets();
                } catch (err) {
                  alert(err.message);
                  delBtn.disabled = false;
                }
              });
            });
          } catch (err) {
            tbody.innerHTML = `<tr><td colspan="3" style="color:var(--error);padding:var(--space-md);">${err.message}</td></tr>`;
          }
        }

        form.addEventListener('submit', async (formEvent) => {
          formEvent.preventDefault();
          submitBtn.disabled = true;
          errorMsg.style.display = 'none';
          try {
            await secrets.add(projectId, keyInput.value.trim(), valInput.value.trim());
            keyInput.value = '';
            valInput.value = '';
            keyInput.focus();
            reloadSecrets();
          } catch (err) {
            errorMsg.innerText = err.message;
            errorMsg.style.display = 'block';
          } finally {
            submitBtn.disabled = false;
          }
        });

        reloadSecrets();
      });
    });

    // Trigger Build
    const triggerBtns = pageContent.querySelectorAll('.trigger-build-btn');
    triggerBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const projectId = e.target.getAttribute('data-id');
        const platform = e.target.getAttribute('data-platform');

        btn.disabled = true;
        btn.innerText = 'Queueing...';

        try {
          await builds.trigger(projectId, platform, 'HEAD', 'Manual build from dashboard');

          // Wait briefly for the worker process to insert the build into SQLite
          setTimeout(() => {
            window.location.hash = '#/builds';
          }, 500);
        } catch (err) {
          btn.disabled = false;
          btn.innerText = `Error: ${err.message.length > 30 ? err.message.substring(0, 30) + '...' : err.message} `;
          btn.title = err.message;
          setTimeout(() => {
            btn.innerText = 'Build Native (iOS)';
            btn.title = '';
          }, 4000);
        }
      });
    });
  }

  loadProjects();
}
