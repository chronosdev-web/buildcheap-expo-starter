// CLI Documentation Page
import { createDashboardLayout } from '../components/layout.js';

export function renderCli(container) {
  const content = `
    <div class="page-title-bar">
      <h2>CLI Reference</h2>
      <a href="https://github.com" target="_blank" class="btn btn-ghost btn-sm">📦 View on GitHub</a>
    </div>

    <!-- Hero -->
    <div class="card card-glow" style="padding:var(--space-xl);margin-bottom:var(--space-xl);background:linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%);">
      <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-lg);">
        <div style="font-size:2.5rem;">🚀</div>
        <div>
          <div style="font-size:1.5rem;font-weight:800;">BuildCheap CLI</div>
          <div style="color:var(--text-tertiary);font-size:0.875rem;">Build native apps from your terminal — just like Expo EAS.</div>
        </div>
      </div>
      <div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:var(--space-md);font-family:var(--font-mono);font-size:0.85rem;line-height:1.8;overflow-x:auto;">
        <span style="color:var(--text-tertiary);"># Install (one command)</span><br>
        <span style="color:var(--success);">$</span> curl -o buildcheap.js https://buildcheap.dev/cli/buildcheap.js<br><br>
        <span style="color:var(--text-tertiary);"># Login</span><br>
        <span style="color:var(--success);">$</span> node buildcheap.js login<br><br>
        <span style="color:var(--text-tertiary);"># Build your app 🎉</span><br>
        <span style="color:var(--success);">$</span> node buildcheap.js build --platform ios
      </div>
    </div>

    <!-- Prerequisites -->
    <div class="card" style="padding:var(--space-xl);margin-bottom:var(--space-xl);">
      <h3 style="margin-bottom:var(--space-md);">📋 Prerequisites</h3>
      <div style="display:grid;gap:var(--space-md);">
        <div style="display:flex;gap:var(--space-sm);align-items:flex-start;">
          <span class="badge badge-success" style="margin-top:2px;">1</span>
          <div>
            <div style="font-weight:600;">Node.js 18+</div>
            <div style="color:var(--text-tertiary);font-size:0.85rem;">The CLI requires Node.js version 18 or higher. Check with <code>node --version</code>.</div>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-sm);align-items:flex-start;">
          <span class="badge badge-success" style="margin-top:2px;">2</span>
          <div>
            <div style="font-weight:600;">A BuildCheap Account</div>
            <div style="color:var(--text-tertiary);font-size:0.85rem;">Sign up at your BuildCheap server and grab your API key from the <a href="#/settings" style="color:var(--primary);">Settings</a> page.</div>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-sm);align-items:flex-start;">
          <span class="badge badge-success" style="margin-top:2px;">3</span>
          <div>
            <div style="font-weight:600;">Apple API Credentials (for iOS)</div>
            <div style="color:var(--text-tertiary);font-size:0.85rem;">Upload your App Store Connect API Key on the <a href="#/credentials" style="color:var(--primary);">Credentials</a> page before running iOS builds.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Installation -->
    <div class="card" style="padding:var(--space-xl);margin-bottom:var(--space-xl);">
      <h3 style="margin-bottom:var(--space-md);">⬇️ Installation</h3>
      <p style="color:var(--text-secondary);margin-bottom:var(--space-lg);font-size:0.875rem;">
        Install the CLI globally so you can use it from any directory:
      </p>
      <div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:var(--space-md);font-family:var(--font-mono);font-size:0.85rem;margin-bottom:var(--space-md);">
        <span style="color:var(--success);">$</span> curl -o buildcheap.js https://buildcheap.dev/cli/buildcheap.js
      </div>
      <p style="color:var(--text-tertiary);font-size:0.8rem;">
        That's it — one file, zero dependencies, no npm needed. Then just run: <code>node buildcheap.js &lt;command&gt;</code>
      </p>
    </div>

    <!-- Commands -->
    <div class="card" style="padding:var(--space-xl);margin-bottom:var(--space-xl);">
      <h3 style="margin-bottom:var(--space-lg);">💻 Commands</h3>

      <!-- Login -->
      <div style="margin-bottom:var(--space-xl);padding-bottom:var(--space-xl);border-bottom:1px solid var(--border-subtle);">
        <div style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-sm);">
          <code style="background:var(--primary);color:white;padding:3px 10px;border-radius:var(--radius-sm);font-weight:700;">buildcheap login</code>
        </div>
        <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:var(--space-md);">
          Connect the CLI to your BuildCheap server. You'll need your server URL and API key.
        </p>
        <div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:var(--space-md);font-family:var(--font-mono);font-size:0.82rem;line-height:1.9;">
          <span style="color:var(--success);">$</span> buildcheap login<br>
          <span style="color:var(--cyan,#67e8f9);">ℹ</span> Server URL: <span style="color:var(--text-tertiary);">http://207.254.22.67:3000</span><br>
          <span style="color:var(--cyan,#67e8f9);">ℹ</span> API Key: <span style="color:var(--text-tertiary);">bc_live_xxxx...</span><br>
          <span style="color:var(--success);">✔</span> Logged in as <span style="font-weight:700;">John Doe</span>
        </div>
        <div style="margin-top:var(--space-sm);font-size:0.8rem;color:var(--text-tertiary);">
          💡 <strong>Where is my API Key?</strong> Go to <a href="#/settings" style="color:var(--primary);">Settings</a> → API Keys section. Your key starts with <code>bc_live_</code> or <code>bc_test_</code>.
        </div>
      </div>

      <!-- Init -->
      <div style="margin-bottom:var(--space-xl);padding-bottom:var(--space-xl);border-bottom:1px solid var(--border-subtle);">
        <div style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-sm);">
          <code style="background:var(--primary);color:white;padding:3px 10px;border-radius:var(--radius-sm);font-weight:700;">buildcheap init</code>
        </div>
        <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:var(--space-md);">
          Initialize a new project from your current directory. Creates a <code>buildcheap.json</code> config file so future builds know which project to target.
        </p>
        <div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:var(--space-md);font-family:var(--font-mono);font-size:0.82rem;line-height:1.9;">
          <span style="color:var(--success);">$</span> cd ~/my-react-native-app<br>
          <span style="color:var(--success);">$</span> buildcheap init<br>
          <span style="color:var(--cyan,#67e8f9);">ℹ</span> Project name: <span style="color:var(--text-tertiary);">MyAwesomeApp</span><br>
          <span style="color:var(--success);">✔</span> Project "MyAwesomeApp" created!<br>
          <span style="color:var(--cyan,#67e8f9);">ℹ</span> Saved config to buildcheap.json
        </div>
      </div>

      <!-- Build -->
      <div style="margin-bottom:var(--space-xl);padding-bottom:var(--space-xl);border-bottom:1px solid var(--border-subtle);">
        <div style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-sm);">
          <code style="background:var(--primary);color:white;padding:3px 10px;border-radius:var(--radius-sm);font-weight:700;">buildcheap build</code>
          <span class="badge badge-info" style="font-size:0.7rem;">Main Command</span>
        </div>
        <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:var(--space-md);">
          The main command. Compresses your project, uploads it to BuildCheap, triggers a native build, and streams the build logs to your terminal in real time.
        </p>

        <div style="margin-bottom:var(--space-md);">
          <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs);">Options:</div>
          <table style="width:100%;font-size:0.85rem;">
            <tr style="border-bottom:1px solid var(--border-subtle);">
              <td style="padding:8px 0;font-family:var(--font-mono);color:var(--primary);font-weight:600;">--platform</td>
              <td style="padding:8px 0;">ios | android</td>
              <td style="padding:8px 0;color:var(--text-tertiary);">Target platform (default: ios)</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-family:var(--font-mono);color:var(--primary);font-weight:600;">--project</td>
              <td style="padding:8px 0;">&lt;uuid&gt;</td>
              <td style="padding:8px 0;color:var(--text-tertiary);">Project ID (reads from buildcheap.json if omitted)</td>
            </tr>
          </table>
        </div>

        <div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:var(--space-md);font-family:var(--font-mono);font-size:0.82rem;line-height:1.9;">
          <span style="color:var(--success);">$</span> buildcheap build --platform ios<br><br>
          <span style="color:var(--cyan,#67e8f9);">ℹ</span> <span style="color:var(--text-tertiary);">Compressing project...</span><br>
          <span style="color:var(--success);">✔</span> Compressed to 4.2MB<br>
          <span style="color:var(--cyan,#67e8f9);">ℹ</span> <span style="color:var(--text-tertiary);">Uploading to BuildCheap...</span><br>
          <span style="color:var(--success);">✔</span> Upload complete! 847 files extracted on server.<br>
          <span style="color:var(--cyan,#67e8f9);">ℹ</span> <span style="color:var(--text-tertiary);">Triggering build...</span><br>
          <span style="color:var(--success);">✔</span> Build queued!<br><br>
          <span style="color:var(--text-tertiary);">│ [BuildCheap] Starting build for MyApp (ios)</span><br>
          <span style="color:var(--text-tertiary);">│ [BuildCheap] Installing dependencies...</span><br>
          <span style="color:var(--text-tertiary);">│ [xcodebuild] Build Succeeded</span><br><br>
          <span style="color:var(--success);">✔</span> <span style="font-weight:700;">Build #14 completed successfully! ✨</span><br>
          <span style="color:var(--success);">📦</span> Download: <span style="color:var(--primary);">https://buildcheap.dev/artifacts/abc123.ipa</span>
        </div>
      </div>

      <!-- Projects -->
      <div>
        <div style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-sm);">
          <code style="background:var(--primary);color:white;padding:3px 10px;border-radius:var(--radius-sm);font-weight:700;">buildcheap projects</code>
        </div>
        <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:var(--space-md);">
          List all projects in your BuildCheap account.
        </p>
        <div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:var(--space-md);font-family:var(--font-mono);font-size:0.82rem;line-height:1.9;">
          <span style="color:var(--success);">$</span> buildcheap projects<br><br>
          <span style="font-weight:700;">Your Projects:</span><br><br>
          <span style="color:var(--primary);">MyAwesomeApp</span><br>
          &nbsp;&nbsp;ID: c760eaaf...<br>
          &nbsp;&nbsp;Platform: ios<br>
        </div>
      </div>

      <!-- Credentials -->
      <div style="margin-bottom:var(--space-xl);padding-bottom:var(--space-xl);border-bottom:1px solid var(--border-subtle);">
        <div style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-sm);">
          <code style="background:var(--primary);color:white;padding:3px 10px;border-radius:var(--radius-sm);font-weight:700;">buildcheap credentials</code>
        </div>
        <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:var(--space-md);">
          Connect your App Store Connect API Key from the terminal. The CLI reads your <code>.p8</code> file directly from disk — no copy-paste needed.<br><br>
          <strong>How to get your API Key:</strong><br>
          1. Log into App Store Connect → Users and Access → Integrations → App Store Connect API.<br>
          2. Click <strong>+</strong> to generate a new key (requires App Manager or Admin role).<br>
          3. Click <strong>Download API Key</strong> to save the <code>.p8</code> file to your computer.<br>
          4. Your Issuer ID is shown at the top of the page.
        </p>
        <div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:var(--space-md);font-family:var(--font-mono);font-size:0.82rem;line-height:1.9;">
          <span style="color:var(--success);">$</span> buildcheap credentials<br><br>
          <span style="color:var(--green,#4ade80);">Found 2 .p8 files on your machine:</span><br><br>
          &nbsp;&nbsp;<span style="color:var(--cyan,#67e8f9);">[1]</span> AuthKey_ABC123DEF4.p8 <span style="color:var(--text-tertiary);">(~/Downloads/)</span><br>
          &nbsp;&nbsp;<span style="color:var(--cyan,#67e8f9);">[2]</span> AuthKey_XYZ789GHI0.p8 <span style="color:var(--text-tertiary);">(~/Desktop/)</span><br>
          &nbsp;&nbsp;<span style="color:var(--cyan,#67e8f9);">[0]</span> Enter a path manually<br><br>
          <span style="color:var(--cyan,#67e8f9);">ℹ</span> Select a key: <span style="color:var(--text-tertiary);">1</span><br>
          <span style="color:var(--success);">✔</span> Selected: AuthKey_ABC123DEF4.p8<br>
          <span style="color:var(--cyan,#67e8f9);">ℹ</span> Key ID: ABC123DEF4 <span style="color:var(--text-tertiary);">(from filename)</span><br><br>
          <span style="color:var(--cyan,#67e8f9);">ℹ</span> Issuer ID: <span style="color:var(--text-tertiary);">57246542-96fe-...</span><br>
          <span style="color:var(--cyan,#67e8f9);">ℹ</span> Team ID: <span style="color:var(--text-tertiary);">(enter to skip)</span><br><br>
          <span style="color:var(--success);">✔</span> App Store Connect credentials saved!
        </div>
        <div style="margin-top:var(--space-sm);font-size:0.8rem;color:var(--text-tertiary);">
          💡 <strong>Tip:</strong> The CLI auto-searches your Downloads, Desktop, and home folder for <code>.p8</code> files. The Key ID is automatically extracted from the filename — you only need to enter your Issuer ID.
        </div>
      </div>

      <!-- Projects -->
      <div>
        <div style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-sm);">
          <code style="background:var(--primary);color:white;padding:3px 10px;border-radius:var(--radius-sm);font-weight:700;">buildcheap projects</code>
        </div>
        <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:var(--space-md);">
          List all projects in your BuildCheap account.
        </p>
        <div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:var(--space-md);font-family:var(--font-mono);font-size:0.82rem;line-height:1.9;">
          <span style="color:var(--success);">$</span> buildcheap projects<br><br>
          <span style="font-weight:700;">Your Projects:</span><br><br>
          <span style="color:var(--primary);">MyAwesomeApp</span><br>
          &nbsp;&nbsp;ID: c760eaaf...<br>
          &nbsp;&nbsp;Platform: ios<br>
        </div>
      </div>

    <!-- How It Works -->
    <div class="card" style="padding:var(--space-xl);margin-bottom:var(--space-xl);">
      <h3 style="margin-bottom:var(--space-lg);">⚙️ How It Works</h3>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:var(--space-lg);">
        When you run <code>buildcheap build</code>, this is exactly what happens under the hood:
      </p>
      <div style="display:grid;gap:var(--space-md);">
        <div style="display:flex;gap:var(--space-md);align-items:flex-start;">
          <div style="min-width:40px;height:40px;border-radius:50%;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--primary);">1</div>
          <div>
            <div style="font-weight:700;">Compress</div>
            <div style="color:var(--text-tertiary);font-size:0.85rem;">The CLI reads your <code>.gitignore</code>, <code>.easignore</code>, or <code>.buildcheapignore</code> and creates a <code>.tar.gz</code> archive of your project, excluding <code>node_modules</code>, <code>.git</code>, and other ignored files.</div>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-md);align-items:flex-start;">
          <div style="min-width:40px;height:40px;border-radius:50%;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--primary);">2</div>
          <div>
            <div style="font-weight:700;">Upload</div>
            <div style="color:var(--text-tertiary);font-size:0.85rem;">The archive is streamed directly to your BuildCheap server. No GitHub required — just like <code>eas build</code>.</div>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-md);align-items:flex-start;">
          <div style="min-width:40px;height:40px;border-radius:50%;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--primary);">3</div>
          <div>
            <div style="font-weight:700;">Extract & Prepare</div>
            <div style="color:var(--text-tertiary);font-size:0.85rem;">The server extracts your source code, installs dependencies, and prepares the Xcode workspace.</div>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-md);align-items:flex-start;">
          <div style="min-width:40px;height:40px;border-radius:50%;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--primary);">4</div>
          <div>
            <div style="font-weight:700;">Build</div>
            <div style="color:var(--text-tertiary);font-size:0.85rem;">A Mac Mini worker runs <code>xcodebuild</code> and signs the app with your Apple credentials.</div>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-md);align-items:flex-start;">
          <div style="min-width:40px;height:40px;border-radius:50%;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--primary);">5</div>
          <div>
            <div style="font-weight:700;">Stream & Deliver</div>
            <div style="color:var(--text-tertiary);font-size:0.85rem;">Build logs stream to your terminal in real time. When done, you get a download link for the <code>.ipa</code> artifact.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ignore Files -->
    <div class="card" style="padding:var(--space-xl);margin-bottom:var(--space-xl);">
      <h3 style="margin-bottom:var(--space-md);">📄 Ignore Files</h3>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:var(--space-md);">
        The CLI automatically excludes files you don't want uploaded. It checks for these files (in order of priority):
      </p>
      <table style="width:100%;font-size:0.85rem;margin-bottom:var(--space-md);">
        <tr style="border-bottom:1px solid var(--border-subtle);">
          <td style="padding:8px 0;font-family:var(--font-mono);font-weight:600;color:var(--primary);">.buildcheapignore</td>
          <td style="padding:8px 0;color:var(--text-tertiary);">BuildCheap-specific ignore (highest priority)</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border-subtle);">
          <td style="padding:8px 0;font-family:var(--font-mono);font-weight:600;color:var(--primary);">.easignore</td>
          <td style="padding:8px 0;color:var(--text-tertiary);">Compatible with Expo EAS ignore files</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-family:var(--font-mono);font-weight:600;color:var(--primary);">.gitignore</td>
          <td style="padding:8px 0;color:var(--text-tertiary);">Falls back to standard gitignore</td>
        </tr>
      </table>
      <p style="color:var(--text-tertiary);font-size:0.8rem;">
        <strong>Default exclusions:</strong> <code>node_modules</code>, <code>.git</code>, <code>.expo</code>, <code>dist</code>, <code>build</code>, <code>ios/Pods</code>, <code>android/.gradle</code>, <code>.env</code>
      </p>
    </div>

    <!-- buildcheap.json -->
    <div class="card" style="padding:var(--space-xl);margin-bottom:var(--space-xl);">
      <h3 style="margin-bottom:var(--space-md);">📁 buildcheap.json</h3>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:var(--space-md);">
        When you run <code>buildcheap init</code>, a <code>buildcheap.json</code> file is created in your project root. This file tells the CLI which remote project to build against.
      </p>
      <div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:var(--space-md);font-family:var(--font-mono);font-size:0.85rem;line-height:1.8;">
        {<br>
        &nbsp;&nbsp;"project_id": "c760eaaf-32c1-4437-aba1-7e0744f108a8",<br>
        &nbsp;&nbsp;"name": "MyAwesomeApp"<br>
        }
      </div>
      <p style="color:var(--text-tertiary);font-size:0.8rem;margin-top:var(--space-sm);">
        💡 Commit this file to your repo so your whole team can build against the same project.
      </p>
    </div>

    <!-- Troubleshooting -->
    <div class="card" style="padding:var(--space-xl);margin-bottom:var(--space-xl);">
      <h3 style="margin-bottom:var(--space-lg);">🛠 Troubleshooting</h3>
      <div style="display:grid;gap:var(--space-lg);">
        <div>
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:var(--space-xs);color:var(--error);">❌ "Not logged in"</div>
          <div style="color:var(--text-tertiary);font-size:0.85rem;">Run <code>buildcheap login</code> and enter your server URL + API key.</div>
        </div>
        <div>
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:var(--space-xs);color:var(--error);">❌ "Upload failed: 413"</div>
          <div style="color:var(--text-tertiary);font-size:0.85rem;">Your project is too large (max 500MB). Add large files/directories to your <code>.buildcheapignore</code>.</div>
        </div>
        <div>
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:var(--space-xs);color:var(--error);">❌ "Build failed: no Apple credentials"</div>
          <div style="color:var(--text-tertiary);font-size:0.85rem;">Go to <a href="#/credentials" style="color:var(--primary);">Credentials</a> and upload your App Store Connect API Key (.p8 file).</div>
        </div>
        <div>
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:var(--space-xs);color:var(--error);">❌ "Insufficient credits"</div>
          <div style="color:var(--text-tertiary);font-size:0.85rem;">Go to <a href="#/billing" style="color:var(--primary);">Billing</a> and purchase more build credits.</div>
        </div>
        <div>
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:var(--space-xs);color:var(--error);">❌ "ENOENT: tar: not found"</div>
          <div style="color:var(--text-tertiary);font-size:0.85rem;">The CLI uses your system's <code>tar</code> command to compress files. Make sure it is installed (comes pre-installed on macOS and most Linux distros).</div>
        </div>
      </div>
    </div>
  `;

  const layout = createDashboardLayout('cli', content);
  container.appendChild(layout);
}
