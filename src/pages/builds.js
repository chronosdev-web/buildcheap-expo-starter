// Builds page
import { createDashboardLayout } from '../components/layout.js';

export function renderBuilds(container) {
    const content = `
    <div class="page-title-bar">
      <h2>Builds</h2>
      <div style="display:flex;gap:var(--space-sm);">
        <select class="input" style="min-width:150px;">
          <option>All Projects</option>
          <option>CalSnap</option>
          <option>Crossroads</option>
          <option>MusicApp</option>
        </select>
        <select class="input" style="min-width:130px;">
          <option>All Statuses</option>
          <option>Success</option>
          <option>Failed</option>
          <option>Building</option>
          <option>Queued</option>
        </select>
        <button class="btn btn-primary">+ Trigger Build</button>
      </div>
    </div>
    
    <!-- Active Builds -->
    <div class="section-header">
      <h3>🔴 Active Builds</h3>
      <span class="badge badge-info">2 running</span>
    </div>
    <div class="build-list" style="margin-bottom:var(--space-xl);">
      <div class="build-item">
        <div class="build-status-icon building">
          <div class="spinner"></div>
        </div>
        <div class="build-info">
          <div class="build-number">Build #248 — CalSnap</div>
          <div class="build-commit">e4f5678 · add onboarding flow</div>
        </div>
        <div class="build-platform"><span class="badge badge-success">Android</span></div>
        <div class="build-duration">2m 14s</div>
        <div class="build-time">
          <div class="progress-bar" style="width:80px;">
            <div class="progress-bar-fill" style="width:45%;"></div>
          </div>
        </div>
      </div>
      <div class="build-item">
        <div class="build-status-icon building">
          <div class="spinner"></div>
        </div>
        <div class="build-info">
          <div class="build-number">Build #245 — Crossroads</div>
          <div class="build-commit">fed9876 · add dark mode</div>
        </div>
        <div class="build-platform"><span class="badge badge-info">iOS</span></div>
        <div class="build-duration">5m 47s</div>
        <div class="build-time">
          <div class="progress-bar" style="width:80px;">
            <div class="progress-bar-fill" style="width:72%;"></div>
          </div>
        </div>
      </div>
      <div class="build-item">
        <div class="build-status-icon queued">⏳</div>
        <div class="build-info">
          <div class="build-number">Build #249 — MusicApp</div>
          <div class="build-commit">ccc1111 · update player UI</div>
        </div>
        <div class="build-platform"><span class="badge badge-info">iOS</span></div>
        <div class="build-duration">—</div>
        <div class="build-time" style="color:var(--warning);">Queued (#3)</div>
      </div>
    </div>
    
    <!-- Build History -->
    <div class="section-header">
      <h3>Build History</h3>
      <span class="badge badge-neutral">247 total</span>
    </div>
    <div class="build-list" style="margin-bottom:var(--space-xl);">
      <div class="build-item">
        <div class="build-status-icon success">✓</div>
        <div class="build-info">
          <div class="build-number">Build #247 — CalSnap</div>
          <div class="build-commit">abc1234 · fix camera permission</div>
        </div>
        <div class="build-platform"><span class="badge badge-info">iOS</span></div>
        <div class="build-duration">6m 18s</div>
        <div class="build-time">2 min ago · $0.25</div>
      </div>
      <div class="build-item">
        <div class="build-status-icon success">✓</div>
        <div class="build-info">
          <div class="build-number">Build #246 — CalSnap</div>
          <div class="build-commit">def5678 · update splash screen</div>
        </div>
        <div class="build-platform"><span class="badge badge-success">Android</span></div>
        <div class="build-duration">4m 52s</div>
        <div class="build-time">15 min ago · $0.25</div>
      </div>
      <div class="build-item">
        <div class="build-status-icon error">✕</div>
        <div class="build-info">
          <div class="build-number">Build #244 — Crossroads</div>
          <div class="build-commit">789abcd · broken import</div>
        </div>
        <div class="build-platform"><span class="badge badge-success">Android</span></div>
        <div class="build-duration">1m 04s</div>
        <div class="build-time">1 hr ago · $0.00</div>
      </div>
      <div class="build-item">
        <div class="build-status-icon success">✓</div>
        <div class="build-info">
          <div class="build-number">Build #243 — MusicApp</div>
          <div class="build-commit">bcd3456 · v1.2 release</div>
        </div>
        <div class="build-platform"><span class="badge badge-info">iOS</span></div>
        <div class="build-duration">8m 31s</div>
        <div class="build-time">3 hrs ago · $0.25</div>
      </div>
      <div class="build-item">
        <div class="build-status-icon success">✓</div>
        <div class="build-info">
          <div class="build-number">Build #242 — CalSnap</div>
          <div class="build-commit">efg7890 · new app icon</div>
        </div>
        <div class="build-platform"><span class="badge badge-info">iOS</span></div>
        <div class="build-duration">7m 02s</div>
        <div class="build-time">5 hrs ago · $0.25</div>
      </div>
      <div class="build-item">
        <div class="build-status-icon success">✓</div>
        <div class="build-info">
          <div class="build-number">Build #241 — MusicApp</div>
          <div class="build-commit">hij1234 · fix audio player bug</div>
        </div>
        <div class="build-platform"><span class="badge badge-success">Android</span></div>
        <div class="build-duration">3m 44s</div>
        <div class="build-time">8 hrs ago · $0.25</div>
      </div>
    </div>
    
    <!-- Build Log Preview -->
    <div class="section-header">
      <h3>Build Log — #247</h3>
      <button class="btn btn-ghost btn-sm">Full Log ↗</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="build-log">
        <div class="log-line"><span class="log-time">[00:00]</span> <span class="log-info">Starting build for CalSnap (iOS)</span></div>
        <div class="log-line"><span class="log-time">[00:02]</span> <span>Cloning repository...</span></div>
        <div class="log-line"><span class="log-time">[00:05]</span> <span class="log-success">✓ Repository cloned</span></div>
        <div class="log-line"><span class="log-time">[00:06]</span> <span>Installing Node.js dependencies...</span></div>
        <div class="log-line"><span class="log-time">[00:42]</span> <span class="log-success">✓ 1,247 packages installed</span></div>
        <div class="log-line"><span class="log-time">[00:43]</span> <span>Running expo prebuild...</span></div>
        <div class="log-line"><span class="log-time">[01:15]</span> <span class="log-success">✓ Native project generated</span></div>
        <div class="log-line"><span class="log-time">[01:16]</span> <span>Running pod install...</span></div>
        <div class="log-line"><span class="log-time">[02:30]</span> <span class="log-success">✓ CocoaPods installed (84 pods)</span></div>
        <div class="log-line"><span class="log-time">[02:31]</span> <span>Building iOS archive...</span></div>
        <div class="log-line"><span class="log-time">[05:48]</span> <span class="log-success">✓ Archive built successfully</span></div>
        <div class="log-line"><span class="log-time">[05:49]</span> <span>Signing with distribution certificate...</span></div>
        <div class="log-line"><span class="log-time">[05:52]</span> <span class="log-success">✓ IPA signed and exported</span></div>
        <div class="log-line"><span class="log-time">[06:18]</span> <span class="log-success">✅ Build #247 complete! Cost: $0.25</span></div>
        <div class="log-line"><span class="log-time">[06:18]</span> <span class="log-info">📱 Artifact: CalSnap-v2.1.0-ios.ipa (48.2 MB)</span></div>
      </div>
    </div>
  `;

    const layout = createDashboardLayout('builds', content);
    container.appendChild(layout);
}
