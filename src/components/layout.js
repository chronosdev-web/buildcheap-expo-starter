import { store } from '../store.js';
import { auth } from '../api.js';

function getPageTitle(activePage) {
  const titles = {
    'dashboard': 'Dashboard',
    'projects': 'Projects',
    'builds': 'Builds',
    'credentials': 'Credentials',
    'billing': 'Billing',
    'settings': 'Settings',
    'docs': 'Documentation'
  };
  return titles[activePage] || 'BuildCheap';
}

export function createDashboardLayout(activePage, pageContent) {
  const user = store.get('user') || {};
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  layout.innerHTML = `
    <div class="bg-grid"></div>
    
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <a href="#/" class="sidebar-logo">
          <span class="logo-icon">⚡</span>
          BuildCheap
        </a>
      </div>
      
      <nav class="sidebar-nav">
        <div class="sidebar-section-label">Overview</div>
        <a href="#/dashboard" class="sidebar-link ${activePage === 'dashboard' ? 'active' : ''}">
          <span class="link-icon">📊</span>
          Dashboard
        </a>
        
        <div class="sidebar-section-label">Build</div>
        <a href="#/projects" class="sidebar-link ${activePage === 'projects' ? 'active' : ''}">
          <span class="link-icon">📁</span>
          Projects
        </a>
        <a href="#/builds" class="sidebar-link ${activePage === 'builds' ? 'active' : ''}">
          <span class="link-icon">🔨</span>
          Builds
        </a>
        <a href="#/cli" class="sidebar-link ${activePage === 'cli' ? 'active' : ''}">
          <span class="link-icon">⌨️</span>
          CLI
        </a>
        
        <div class="sidebar-section-label">Manage</div>
        <a href="#/credentials" class="sidebar-link ${activePage === 'credentials' ? 'active' : ''}">
          <span class="link-icon">🔑</span>
          Credentials
        </a>
        <a href="#/billing" class="sidebar-link ${activePage === 'billing' ? 'active' : ''}">
          <span class="link-icon">💳</span>
          Billing
        </a>
        <a href="#/settings" class="sidebar-link ${activePage === 'settings' ? 'active' : ''}">
          <span class="link-icon">⚙️</span>
          Settings
        </a>
        
        <div class="sidebar-section-label">Support</div>
        <a href="#/support" class="sidebar-link ${activePage === 'support' ? 'active' : ''}">
          <span class="link-icon">🐞</span>
          Report a Bug
        </a>
      </nav>
      
      <div class="sidebar-footer">
        <div class="sidebar-user" id="logoutBtn" style="cursor:pointer;" title="Click to Logout">
          ${user.avatar_url
      ? `<img src="${user.avatar_url}" class="avatar" style="object-fit:cover;border-radius:50;width:32px;height:32px;" />`
      : `<div class="avatar">${(user.display_name || 'U')[0].toUpperCase()}</div>`
    }
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${user.display_name || 'User'}</div>
            <div class="sidebar-user-email">Logout</div>
          </div>
        </div>
      </div>
    </aside>
    
    <!-- Main Content -->
    <main class="main-content">
      <header class="main-header">
        <div class="main-header-left">
          <button class="btn-icon btn-ghost mobile-menu-btn" id="menuToggle">☰</button>
          <h1>${getPageTitle(activePage)}</h1>
        </div>
        <div class="main-header-right">
        </div>
      </header>
      
      <div class="page-content" id="pageContent">
      </div>
    </main>
  `;

  // Insert page content
  const contentSlot = layout.querySelector('#pageContent');
  if (typeof pageContent === 'string') {
    contentSlot.innerHTML = pageContent;
  } else {
    contentSlot.appendChild(pageContent);
  }

  // Mobile menu toggle
  layout.querySelector('#menuToggle')?.addEventListener('click', () => {
    layout.querySelector('#sidebar').classList.toggle('open');
  });

  // Logout trigger
  let logoutTimeout;
  const logoutBtn = layout.querySelector('#logoutBtn');
  logoutBtn?.addEventListener('click', async () => {
    const emailDiv = logoutBtn.querySelector('.sidebar-user-email');
    if (emailDiv && emailDiv.innerText !== 'Are you sure?') {
      const originalText = emailDiv.innerText;
      emailDiv.innerText = 'Are you sure?';
      emailDiv.style.color = 'var(--error)';
      
      logoutTimeout = setTimeout(() => {
        if (emailDiv) {
          emailDiv.innerText = originalText;
          emailDiv.style.color = '';
        }
      }, 3000);
      return;
    }

    clearTimeout(logoutTimeout);
    if (emailDiv) emailDiv.innerText = 'Logging out...';
    try {
      await auth.logout();
    } catch (err) {
      console.error('Logout failed:', err);
      if (emailDiv) emailDiv.innerText = 'Logout';
    }
  });

  return layout;
}
