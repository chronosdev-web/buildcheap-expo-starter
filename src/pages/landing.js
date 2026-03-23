// Landing page — $0.50/build, no tiers

export function renderLanding(container) {
  container.innerHTML = `
    <div class="landing">
      <div class="bg-grid"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
      <div class="glow-orb glow-orb-3"></div>
      
      <nav class="landing-nav">
        <a href="#/" class="landing-nav-logo">
          <span class="logo-icon">⚡</span>
          BuildCheap
        </a>
        <div class="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#comparison">Compare</a>
        </div>
        <div class="landing-nav-actions">
          <a href="#/login" class="btn btn-ghost">Sign In</a>
          <a href="#/login" class="btn btn-primary">Get Started</a>
        </div>
      </nav>
      
      <section class="hero">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          iOS & Android cloud builds — now available
        </div>
        
        <h1>Cloud Builds.<br><span class="text-gradient">Stupidly Cheap.</span></h1>
        
        <p class="hero-subtitle">
          Build your React Native & Expo apps in the cloud for a fraction of what you're paying now. 
          Same power as EAS Build, up to 87% cheaper.
        </p>
        
        <div class="hero-price-tag">
          <span class="price text-gradient">$0.50</span>
          <span class="per-build">/ build</span>
          <span class="compare">$1–4 on Expo</span>
        </div>
        
        <div class="hero-cta">
          <a href="#/login" class="btn btn-primary btn-lg">Start Building →</a>
          <a href="#pricing" class="btn btn-secondary btn-lg">See Pricing</a>
        </div>
        
        <div class="hero-stats">
          <div class="stat">
            <div class="stat-number">$0.50</div>
            <div class="stat-label">Per build, flat</div>
          </div>
          <div class="stat">
            <div class="stat-number">iOS + Android</div>
            <div class="stat-label">Both platforms</div>
          </div>
          <div class="stat">
            <div class="stat-number">~8 min</div>
            <div class="stat-label">Avg build time</div>
          </div>
          <div class="stat">
            <div class="stat-number">No tiers</div>
            <div class="stat-label">One simple price</div>
          </div>
        </div>
        
        <div class="terminal-preview">
          <div class="terminal-window">
            <div class="terminal-header">
              <span class="terminal-dot red"></span>
              <span class="terminal-dot yellow"></span>
              <span class="terminal-dot green"></span>
            </div>
            <div class="terminal-body">
              <div class="log-line"><span class="cmd">$</span> <span>buildcheap build</span> <span class="flag">--platform ios</span></div>
              <div class="log-line"><span class="output">✓ Authenticated as you@example.com</span></div>
              <div class="log-line"><span class="output">✓ Project: my-awesome-app (v2.1.0)</span></div>
              <div class="log-line"><span class="output">⠋ Uploading project files...</span></div>
              <div class="log-line"><span class="highlight">📦 Build queued — estimated time: 8 minutes</span></div>
              <div class="log-line"><span class="output">⠋ Installing dependencies...</span></div>
              <div class="log-line"><span class="output">⠋ Running pod install...</span></div>
              <div class="log-line"><span class="output">⠋ Building iOS archive...</span></div>
              <div class="log-line"><span class="cmd">✅ Build complete!</span> <span class="highlight">Cost: $0.50</span></div>
              <div class="log-line"><span class="output">📱 Download: https://builds.buildcheap.dev/abc123</span></div>
            </div>
          </div>
        </div>
      </section>
      
      <section class="features-section" id="features">
        <h2>Everything you need. <span class="text-gradient">Nothing you don't.</span></h2>
        <p class="section-subtitle">All the cloud build features you love, without the premium price tag.</p>
        
        <div class="features-grid">
          <div class="card card-glow feature-card animate-in stagger-1">
            <div class="feature-card-icon">🏗️</div>
            <h3>Cloud Builds</h3>
            <p>Build iOS and Android binaries in the cloud. No Mac required for iOS builds. Just push and build.</p>
          </div>
          <div class="card card-glow feature-card animate-in stagger-2">
            <div class="feature-card-icon">📡</div>
            <h3>OTA Updates</h3>
            <p>Push over-the-air updates instantly. Skip the app store review process for JavaScript changes.</p>
          </div>
          <div class="card card-glow feature-card animate-in stagger-3">
            <div class="feature-card-icon">🔑</div>
            <h3>Credential Management</h3>
            <p>Auto-managed signing credentials for iOS and Android. Or bring your own — we support both.</p>
          </div>
          <div class="card card-glow feature-card animate-in stagger-4">
            <div class="feature-card-icon">🚀</div>
            <h3>App Store Submit</h3>
            <p>Submit builds directly to the App Store and Play Store. Automatic version incrementing included.</p>
          </div>
          <div class="card card-glow feature-card animate-in stagger-5">
            <div class="feature-card-icon">🔄</div>
            <h3>CI/CD Ready</h3>
            <p>Trigger builds from GitHub, GitLab, or Bitbucket. Full webhook and API support for automation.</p>
          </div>
          <div class="card card-glow feature-card animate-in stagger-6">
            <div class="feature-card-icon">👥</div>
            <h3>Team Collaboration</h3>
            <p>Invite your team with role-based access. Share internal builds with a single URL link.</p>
          </div>
        </div>
      </section>
      
      <section class="pricing-section" id="pricing">
        <h2>Dead simple <span class="text-gradient">pricing.</span></h2>
        <p class="section-subtitle">No tiers. No surprises. One price for everything.</p>
        
        <div style="max-width:480px;margin:0 auto;">
          <div class="card" style="padding:var(--space-2xl);border-color:var(--border-accent);box-shadow:var(--shadow-glow);position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent-gradient);"></div>
            <div style="text-align:center;">
              <div style="font-size:0.875rem;font-weight:600;color:var(--text-accent);margin-bottom:var(--space-md);text-transform:uppercase;letter-spacing:0.05em;">Every build, every time</div>
              <div style="font-size:4rem;font-weight:900;letter-spacing:-0.03em;margin-bottom:var(--space-xs);">
                <span class="text-gradient">$0.50</span>
              </div>
              <div style="color:var(--text-tertiary);margin-bottom:var(--space-xl);">per build · iOS or Android</div>
              
              <div style="display:flex;flex-direction:column;gap:var(--space-sm);text-align:left;margin-bottom:var(--space-xl);">
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> iOS & Android cloud builds</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> OTA updates</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> Auto credential management</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> App Store & Play Store submit</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> Build caching for faster builds</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> 2 hour build timeout</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> API & webhook access</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> Failed builds are free</div>
              </div>
              
              <a href="#/login" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;">Get Started →</a>
              
              <div style="margin-top:var(--space-lg);font-size:0.8125rem;color:var(--text-tertiary);">
                Buy credits starting at $5 minimum. Use them whenever you want.<br>
                No expiration. No monthly fees.
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section class="comparison-section" id="comparison">
        <h2>How we <span class="text-gradient">compare.</span></h2>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>BuildCheap</th>
                <th>Expo EAS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Price per build</td>
                <td style="color:var(--success);font-weight:700;">$0.50</td>
                <td style="color:var(--text-tertiary);">$1 – $4</td>
              </tr>
              <tr>
                <td>Pricing model</td>
                <td style="color:var(--success);font-weight:700;">Flat rate, no tiers</td>
                <td>Tiered plans</td>
              </tr>
              <tr>
                <td>iOS + Android</td>
                <td>✅</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>OTA Updates</td>
                <td>✅</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Auto Credentials</td>
                <td>✅</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>App Store Submit</td>
                <td>✅</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Build Caching</td>
                <td style="color:var(--success);font-weight:700;">Always included</td>
                <td>Paid plans only</td>
              </tr>
              <tr>
                <td>Failed builds charged?</td>
                <td style="color:var(--success);font-weight:700;">No — free</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Monthly fees</td>
                <td style="color:var(--success);font-weight:700;">$0</td>
                <td>$0 – $99/mo</td>
              </tr>
              <tr>
                <td>Cost for 100 builds</td>
                <td style="color:var(--success);font-weight:700;">$50</td>
                <td>$100 – $400</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      
      <section class="cta-section">
        <div class="cta-card">
          <h2>Stop overpaying for builds.</h2>
          <p>Every build is $0.50. No tiers, no monthly fees, no surprises. Buy credits and start building.</p>
          <a href="#/login" class="btn btn-primary btn-lg" style="position:relative;">
            Start Building Now →
          </a>
        </div>
      </section>
      
      <footer class="landing-footer">
        <div class="footer-brand">⚡ BuildCheap</div>
        <div class="footer-links">
          <a href="#">Docs</a>
          <a href="#">Blog</a>
          <a href="#">Status</a>
          <a href="#">GitHub</a>
          <a href="#">Twitter</a>
        </div>
      </footer>
    </div>
  `;
}
