// Login/Signup page — using store for state management
import { auth } from '../api.js';
import { store } from '../store.js';

export function renderLogin(container) {
  // If already authenticated, redirect to dashboard
  if (store.get('isAuthenticated')) {
    window.location.hash = '#/dashboard';
    return;
  }

  container.innerHTML = `
    <div class="landing">
      <div class="bg-grid"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>

      <nav class="landing-nav">
        <a href="#/" class="landing-nav-logo">
          <span class="logo-icon">⚡</span>
          BuildCheap
        </a>
        <div class="landing-nav-actions">
          <a href="#/" class="btn btn-ghost">← Back</a>
        </div>
      </nav>

      <section class="hero" style="min-height:100vh;padding-top:120px;">
        <div class="card" style="width:100%;max-width:420px;padding:var(--space-2xl);border-color:var(--border-accent);" id="authCard">
          <div style="text-align:center;margin-bottom:var(--space-xl);">
            <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:var(--space-sm);" id="authTitle">Sign In</h2>
            <p style="color:var(--text-tertiary);font-size:0.875rem;" id="authSubtitle">Welcome back! Enter your credentials.</p>
          </div>

          <div id="authError" style="display:none;padding:0.75rem;background:var(--error-bg);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-md);color:var(--error);font-size:0.8125rem;margin-bottom:var(--space-md);"></div>

          <form id="authForm" style="display:flex;flex-direction:column;gap:var(--space-md);">
            <div class="input-group" id="nameGroup" style="display:none;">
              <label for="displayName">Display Name</label>
              <input class="input" id="displayName" type="text" placeholder="Your name or team name" />
            </div>
            <div class="input-group">
              <label for="email">Email</label>
              <input class="input" id="email" type="email" placeholder="you@example.com" required />
            </div>
            <div class="input-group">
              <label for="password">Password</label>
              <input class="input" id="password" type="password" placeholder="Min 8 characters" required />
            </div>
            <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;" id="authSubmit">
              Sign In
            </button>
          </form>

          <div style="text-align:center;margin-top:var(--space-lg);font-size:0.8125rem;color:var(--text-tertiary);">
            <span id="authToggleText">Don't have an account?</span>
            <button class="btn btn-ghost" style="color:var(--text-accent);font-size:0.8125rem;" id="authToggle">Sign Up</button>
          </div>
        </div>
      </section>
    </div>
  `;

  let isSignup = false;
  const form = container.querySelector('#authForm');
  const nameGroup = container.querySelector('#nameGroup');
  const title = container.querySelector('#authTitle');
  const subtitle = container.querySelector('#authSubtitle');
  const submitBtn = container.querySelector('#authSubmit');
  const toggleBtn = container.querySelector('#authToggle');
  const toggleText = container.querySelector('#authToggleText');
  const errorDiv = container.querySelector('#authError');

  toggleBtn.addEventListener('click', () => {
    isSignup = !isSignup;
    nameGroup.style.display = isSignup ? 'flex' : 'none';
    title.textContent = isSignup ? 'Create Account' : 'Sign In';
    subtitle.textContent = isSignup ? 'Start building for $0.50/build.' : 'Welcome back! Enter your credentials.';
    submitBtn.textContent = isSignup ? 'Create Account' : 'Sign In';
    toggleText.textContent = isSignup ? 'Already have an account?' : "Don't have an account?";
    toggleBtn.textContent = isSignup ? 'Sign In' : 'Sign Up';
    errorDiv.style.display = 'none';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = isSignup ? 'Creating...' : 'Signing in...';

    try {
      const email = container.querySelector('#email').value;
      const password = container.querySelector('#password').value;

      if (isSignup) {
        const name = container.querySelector('#displayName').value;
        if (!name) throw new Error('Display name is required');
        await auth.signup(email, password, name);
      } else {
        await auth.login(email, password);
      }

      // Auth state is automatically updated in the store by api.js
      window.location.hash = '#/dashboard';
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = isSignup ? 'Create Account' : 'Sign In';
    }
  });
}
