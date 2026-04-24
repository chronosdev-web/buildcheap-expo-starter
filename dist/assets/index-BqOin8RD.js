(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const m of o.addedNodes)m.tagName==="LINK"&&m.rel==="modulepreload"&&a(m)}).observe(document,{childList:!0,subtree:!0});function s(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(i){if(i.ep)return;i.ep=!0;const o=s(i);fetch(i.href,o)}})();class he{constructor(t,s){this.routes=t,this.app=s,this.currentRoute=null,window.addEventListener("hashchange",()=>this.resolve()),this.resolve()}resolve(){const t=window.location.hash.slice(1)||"/",s=t.split("?")[0],a=this.routes[s]||this.routes["/"];this.currentRoute!==t&&(this.currentRoute=t,this.app.innerHTML="",this.app.style.opacity="0",this.app.style.transform="translateY(8px)",a(this.app),requestAnimationFrame(()=>{this.app.style.transition="opacity 0.3s ease, transform 0.3s ease",this.app.style.opacity="1",this.app.style.transform="translateY(0)"}))}navigate(t){window.location.hash=t}}class fe{constructor(t={}){this._state={...t},this._listeners=new Map,this._globalListeners=new Set}get(t){return this._state[t]}getState(){return{...this._state}}set(t,s){const a=this._state[t];if(a===s)return;this._state[t]=s;const i=this._listeners.get(t);i&&i.forEach(o=>o(s,a,t)),this._globalListeners.forEach(o=>o(t,s,a))}update(t){for(const[s,a]of Object.entries(t))this.set(s,a)}on(t,s){return this._listeners.has(t)||this._listeners.set(t,new Set),this._listeners.get(t).add(s),()=>{const a=this._listeners.get(t);a&&(a.delete(s),a.size===0&&this._listeners.delete(t))}}onAny(t){return this._globalListeners.add(t),()=>this._globalListeners.delete(t)}reset(t={}){const s=this._state;this._state={...t};const a=new Set([...Object.keys(s),...Object.keys(t)]);for(const i of a)if(s[i]!==t[i]){const o=this._listeners.get(i);o&&o.forEach(m=>m(t[i],s[i],i))}}}const B=new fe({user:null,token:null,isAuthenticated:!1,currentPage:"/",sidebarOpen:!1,loading:!1,projects:[],builds:[],creditBalance:0,creditHistory:[],dashboardStats:null});function oe(e,t){B.update({user:e,token:t,isAuthenticated:!0})}function ve(){B.update({user:null,token:null,isAuthenticated:!1,projects:[],builds:[],creditBalance:0,dashboardStats:null})}const ne="/api",se={COST_PER_BUILD:.5};function xe(){return B.get("isAuthenticated")}function we(){return B.get("token")}async function u(e,t={}){const s={...t.headers};t.body instanceof FormData||(s["Content-Type"]="application/json");const a=await fetch(`${ne}${e}`,{...t,headers:s,credentials:"include"}),i=await a.text();let o;try{o=JSON.parse(i)}catch{throw console.error(`[apiFetch ERROR] URL: ${ne}${e}`),console.error(`[apiFetch ERROR] Status: ${a.status}`),console.error("[apiFetch ERROR] Response text:",i.substring(0,200)),new Error(`Failed parsing JSON for ${e}. Server returned HTML. Check dev tools console.`)}if(!a.ok)throw a.status===401&&(ve(),window.location.hash="#/login"),new Error(o.error||"Request failed");return o}const F={signup:async(e,t,s)=>{const a=await u("/auth/signup",{method:"POST",body:JSON.stringify({email:e,password:t,display_name:s})});return oe(a.user,a.token),a},login:async(e,t)=>{const s=await u("/auth/login",{method:"POST",body:JSON.stringify({email:e,password:t})});return oe(s.user,s.token),s},logout:async()=>{await u("/auth/logout",{method:"POST"}),ve()},me:async()=>{const e=await u("/auth/me");return B.update({user:e.user,token:e.token,isAuthenticated:!0}),e},update:async e=>{const t=await u("/auth/me",{method:"PUT",body:JSON.stringify(e)});return B.update({user:t.user}),t},uploadAvatar:async e=>{const t=await u("/auth/avatar",{method:"POST",body:JSON.stringify({avatar:e})});return B.update({user:t.user}),t},keys:{list:()=>u("/auth/keys"),create:(e,t)=>u("/auth/keys",{method:"POST",body:JSON.stringify({name:e,expiration_days:t})}),toggle:(e,t)=>u(`/auth/keys/${e}/toggle`,{method:"PUT",body:JSON.stringify({is_active:t})}),delete:e=>u(`/auth/keys/${e}`,{method:"DELETE"})}},Y={list:async()=>{const e=await u("/projects");return B.set("projects",e.projects),e},create:e=>u("/projects",{method:"POST",body:JSON.stringify(e)}),get:e=>u(`/projects/${e}`),update:(e,t)=>u(`/projects/${e}`,{method:"PUT",body:JSON.stringify(t)}),delete:e=>u(`/projects/${e}`,{method:"DELETE"}),upload:async(e,t)=>{const s=t.name.endsWith(".zip"),a=await fetch(`/api/projects/${e}/upload${s?"?format=zip":""}`,{method:"POST",headers:{"Content-Type":s?"application/zip":"application/gzip"},credentials:"include",body:t});if(!a.ok){const i=await a.json().catch(()=>({error:a.statusText}));throw new Error(i.error||"Upload failed")}return a.json()}},V={trigger:(e,t,s,a)=>u("/builds",{method:"POST",body:JSON.stringify({project_id:e,platform:t,commit_hash:s,commit_message:a})}),cancel:e=>u(`/builds/${e}/cancel`,{method:"POST"}),list:async(e=20,t=0)=>{const s=await u(`/builds?limit=${e}&offset=${t}&t=${Date.now()}`);return B.set("builds",s.builds),s},get:e=>u(`/builds/${e}`),getLog:e=>u(`/builds/${e}/log?t=${Date.now()}`),log:e=>u(`/builds/${e}/log?t=${Date.now()}`),stats:()=>u("/builds/stats")},ee={balance:async()=>{const e=await u("/credits");return B.set("creditBalance",e.balance),e},purchase:e=>u("/credits/purchase",{method:"POST",body:JSON.stringify({amount:e,success_url:`${window.location.origin}/#/billing?success=true`,cancel_url:`${window.location.origin}/#/billing?canceled=true`})}),history:async(e=50,t=0)=>{const s=await u(`/credits/history?limit=${e}&offset=${t}`);return B.set("creditHistory",s.transactions),s}},me={get:async()=>{const e=await u(`/dashboard?t=${Date.now()}`);return B.update({dashboardStats:e.stats,projects:e.projects,builds:e.recent_builds,creditBalance:e.user.credit_balance}),e}},J={apple:{get:()=>u("/credentials/apple"),save:e=>u("/credentials/apple",{method:"POST",body:JSON.stringify(e)}),delete:()=>u("/credentials/apple",{method:"DELETE"}),test:()=>u("/credentials/apple/test",{method:"POST"})},github:{save:e=>u("/credentials/github",{method:"POST",body:JSON.stringify({token:e})}),delete:()=>u("/credentials/github",{method:"DELETE"})}},te={list:()=>u("/webhooks"),add:e=>u("/webhooks",{method:"POST",body:JSON.stringify({url:e})}),delete:e=>u(`/webhooks/${e}`,{method:"DELETE"})},ae={list:e=>u(`/projects/${e}/secrets`),add:(e,t,s)=>u(`/projects/${e}/secrets`,{method:"POST",body:JSON.stringify({key_name:t,value:s})}),delete:(e,t)=>u(`/projects/${e}/secrets/${t}`,{method:"DELETE"})},W={list:async()=>u("/orgs"),create:async e=>u("/orgs",{method:"POST",body:JSON.stringify({name:e})}),get:async e=>u(`/orgs/${e}`),update:async(e,t)=>u(`/orgs/${e}`,{method:"PUT",body:JSON.stringify({name:t})}),delete:async e=>u(`/orgs/${e}`,{method:"DELETE"}),members:async e=>u(`/orgs/${e}/members`),invite:async(e,t,s)=>u(`/orgs/${e}/members`,{method:"POST",body:JSON.stringify({email:t,role:s})}),updateRole:async(e,t,s)=>u(`/orgs/${e}/members/${t}`,{method:"PUT",body:JSON.stringify({role:s})}),removeMember:async(e,t)=>u(`/orgs/${e}/members/${t}`,{method:"DELETE"})},ie={submit:async(e,t)=>u("/support",{method:"POST",body:JSON.stringify({title:e,description:t})}),listAll:async()=>u("/support/all"),resolve:async e=>u(`/support/${e}/resolve`,{method:"PUT"})};function Se(e,t){const s=B.get("token"),a=`${window.location.protocol==="https:"?"wss":"ws"}://${window.location.host}/ws`,i=new WebSocket(a);return i.onopen=()=>{s&&i.send(JSON.stringify({type:"auth",token:s})),i.send(JSON.stringify({type:"subscribe",buildId:e}))},i.onmessage=o=>{const m=JSON.parse(o.data);m.type==="log"&&t(m.line)},i}async function ye(){try{return await F.me(),!0}catch{return!1}}function ke(e){e.innerHTML=`
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
          iOS cloud builds — now available
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
            <div class="stat-number">iOS</div>
            <div class="stat-label">Platform</div>
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
            <p>Build iOS binaries in the cloud. No Mac required. Just push and build.</p>
          </div>
          <div class="card card-glow feature-card animate-in stagger-2">
            <div class="feature-card-icon">🔐</div>
            <h3>Environment Secrets</h3>
            <p>Inject encrypted API keys dynamically at build time using our AES Node isolation. Never expose sensitive strings.</p>
          </div>
          <div class="card card-glow feature-card animate-in stagger-3">
            <div class="feature-card-icon">🔑</div>
            <h3>Credential Management</h3>
            <p>Auto-managed signing credentials for iOS. Or bring your own.</p>
          </div>
          <div class="card card-glow feature-card animate-in stagger-4">
            <div class="feature-card-icon">🚀</div>
            <h3>App Store Submit</h3>
            <p>Submit builds directly to the iOS App Store. Code signing fully managed by the cloud.</p>
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
              <div style="color:var(--text-tertiary);margin-bottom:var(--space-xl);">per build · iOS</div>
              
              <div style="display:flex;flex-direction:column;gap:var(--space-sm);text-align:left;margin-bottom:var(--space-xl);">
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> iOS cloud builds</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> Environment Secrets</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> Auto credential management</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> Direct App Store Connect Submit</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> Build caching for faster builds</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> 2 hour build timeout</div>
                <div class="plan-feature"><span class="check" style="color:var(--success);">✓</span> API & webhook access</div>
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
        <div style="text-align: center; margin-bottom: var(--space-xl);">
          <div class="badge-dot" style="display:inline-block; margin-bottom:var(--space-sm);">AI-Optimized Infrastructure</div>
          <h2>The Official <span class="text-gradient">EAS Alternative.</span></h2>
        </div>
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
                <td>iOS Builds</td>
                <td>✅</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Environment Secrets</td>
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
                <td style="color:var(--text-primary);font-weight:700;">Yes</td>
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
  `}function $e(e){if(B.get("isAuthenticated")){window.location.hash="#/dashboard";return}e.innerHTML=`
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
  `;let t=!1;const s=e.querySelector("#authForm"),a=e.querySelector("#nameGroup"),i=e.querySelector("#authTitle"),o=e.querySelector("#authSubtitle"),m=e.querySelector("#authSubmit"),v=e.querySelector("#authToggle"),g=e.querySelector("#authToggleText"),b=e.querySelector("#authError");v.addEventListener("click",()=>{t=!t,a.style.display=t?"flex":"none",i.textContent=t?"Create Account":"Sign In",o.textContent=t?"Start building for $0.50/build.":"Welcome back! Enter your credentials.",m.textContent=t?"Create Account":"Sign In",g.textContent=t?"Already have an account?":"Don't have an account?",v.textContent=t?"Sign In":"Sign Up",b.style.display="none"}),s.addEventListener("submit",async x=>{x.preventDefault(),b.style.display="none",m.disabled=!0,m.textContent=t?"Creating...":"Signing in...";try{const f=e.querySelector("#email").value,r=e.querySelector("#password").value;if(t){const p=e.querySelector("#displayName").value;if(!p)throw new Error("Display name is required");await F.signup(f,r,p)}else await F.login(f,r);window.location.hash="#/dashboard"}catch(f){b.textContent=f.message,b.style.display="block",m.disabled=!1,m.textContent=t?"Create Account":"Sign In"}})}function Ce(e){return{dashboard:"Dashboard",projects:"Projects",builds:"Builds",credentials:"Credentials",billing:"Billing",settings:"Settings",docs:"Documentation"}[e]||"BuildCheap"}function K(e,t){var o,m;const s=B.get("user")||{},a=document.createElement("div");a.className="app-layout",a.innerHTML=`
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
        <a href="#/dashboard" class="sidebar-link ${e==="dashboard"?"active":""}">
          <span class="link-icon">📊</span>
          Dashboard
        </a>
        
        <div class="sidebar-section-label">Build</div>
        <a href="#/projects" class="sidebar-link ${e==="projects"?"active":""}">
          <span class="link-icon">📁</span>
          Projects
        </a>
        <a href="#/builds" class="sidebar-link ${e==="builds"?"active":""}">
          <span class="link-icon">🔨</span>
          Builds
        </a>
        <a href="#/cli" class="sidebar-link ${e==="cli"?"active":""}">
          <span class="link-icon">⌨️</span>
          CLI
        </a>
        
        <div class="sidebar-section-label">Manage</div>
        <a href="#/credentials" class="sidebar-link ${e==="credentials"?"active":""}">
          <span class="link-icon">🔑</span>
          Credentials
        </a>
        <a href="#/billing" class="sidebar-link ${e==="billing"?"active":""}">
          <span class="link-icon">💳</span>
          Billing
        </a>
        <a href="#/settings" class="sidebar-link ${e==="settings"?"active":""}">
          <span class="link-icon">⚙️</span>
          Settings
        </a>
        
        <div class="sidebar-section-label">Support</div>
        <a href="#/support" class="sidebar-link ${e==="support"?"active":""}">
          <span class="link-icon">🐞</span>
          Report a Bug
        </a>
      </nav>
      
      <div class="sidebar-footer">
        <div class="sidebar-user" id="logoutBtn" style="cursor:pointer;" title="Click to Logout">
          ${s.avatar_url?`<img src="${s.avatar_url}" class="avatar" style="object-fit:cover;border-radius:50;width:32px;height:32px;" />`:`<div class="avatar">${(s.display_name||"U")[0].toUpperCase()}</div>`}
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${s.display_name||"User"}</div>
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
          <h1>${Ce(e)}</h1>
        </div>
        <div class="main-header-right">
        </div>
      </header>
      
      <div class="page-content" id="pageContent">
      </div>
    </main>
  `;const i=a.querySelector("#pageContent");return typeof t=="string"?i.innerHTML=t:i.appendChild(t),(o=a.querySelector("#menuToggle"))==null||o.addEventListener("click",()=>{a.querySelector("#sidebar").classList.toggle("open")}),(m=a.querySelector("#logoutBtn"))==null||m.addEventListener("click",async()=>{if(confirm("Are you sure you want to log out?"))try{await F.logout()}catch(v){console.error("Logout failed:",v)}}),a}window.cancelBuild=async e=>{if(confirm("Are you sure you want to cancel this build? Your $0.50 credit will be refunded seamlessly."))try{await V.cancel(e),alert("Build cancelled successfully! Credit has been safely refunded to your account."),location.reload()}catch(t){alert("Failed to cancel build: "+t.message)}};function de(e){if(!e)return"—";const t=Math.floor(e/60),s=Math.round(e%60);return`${t}m ${s}s`}function Ee(e){if(!e)return"—";const t=(Date.now()-new Date(e).getTime())/1e3;return t<60?"just now":t<3600?`${Math.floor(t/60)} min ago`:t<86400?`${Math.floor(t/3600)} hr${Math.floor(t/3600)>1?"s":""} ago`:`${Math.floor(t/86400)} day${Math.floor(t/86400)>1?"s":""} ago`}function Be(e){return e==="success"?'<div class="build-status-icon success">✓</div>':e==="failed"?'<div class="build-status-icon error">✕</div>':e==="building"||e==="queued"?'<div class="build-status-icon building"><div class="spinner"></div></div>':'<div class="build-status-icon">—</div>'}function Te(e){return e==="ios"?'<span class="badge badge-info">iOS</span>':e==="android"?'<span class="badge badge-success">Android</span>':`<span class="badge">${e||"—"}</span>`}function Ae(e,t){const a=t.filter(i=>i.project_id===e.id)[0];return a?a.status==="building"||a.status==="queued"?'<span class="badge badge-warning" style="margin-left:auto;">Building</span>':a.status==="success"?'<span class="badge badge-success" style="margin-left:auto;">Active</span>':'<span class="badge badge-error" style="margin-left:auto;">Failed</span>':'<span class="badge" style="margin-left:auto;">No builds</span>'}function Le(){return`
    <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
      <div class="spinner" style="width:32px;height:32px;"></div>
    </div>`}function je(e){return`
    <div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">
      <div style="font-size:2rem;margin-bottom:var(--space-sm);">🚀</div>
      <div>${e}</div>
    </div>`}function Ie(e){const{user:t,stats:s,projects:a,recent_builds:i}=e,o=.5,m=2,v=(s.total_builds*o).toFixed(2),g=(s.total_builds*m).toFixed(2),b=(g-v).toFixed(2),x=g>0?Math.round(v/g*100):0,f=`
    <div class="stats-grid">
      <div class="card stat-card animate-in stagger-1">
        <div class="stat-label">Total Builds</div>
        <div class="stat-value">${s.total_builds}</div>
        <div class="stat-change">${s.successful_builds} succeeded</div>
      </div>
      <div class="card stat-card animate-in stagger-2">
        <div class="stat-label">Build Cost (Total)</div>
        <div class="stat-value">$${v}</div>
        <div class="stat-change positive">↓ ${100-x}% vs Industry Average</div>
      </div>
      <div class="card stat-card animate-in stagger-3">
        <div class="stat-label">Success Rate</div>
        <div class="stat-value">${s.success_rate}%</div>
        <div class="stat-change">${s.failed_builds} failed</div>
      </div>
      <div class="card stat-card animate-in stagger-4">
        <div class="stat-label">Avg Build Time</div>
        <div class="stat-value">${de(s.avg_duration)}</div>
        <div class="stat-change positive">Per build average</div>
      </div>
    </div>`;let r;i.length===0?r=je("No builds yet. Create a project and trigger your first build!"):r=i.map(c=>`
          <div class="build-item">
            ${Be(c.status)}
            <div class="build-info">
              <div class="build-number">Build #${c.build_number||"—"} — ${c.project_name||"Unknown"}</div>
              <div class="build-commit">${c.commit_hash?c.commit_hash.slice(0,7):"—"} · ${c.commit_message||"manual build"}</div>
            </div>
            <div class="build-platform">${Te(c.platform)}</div>
            <div class="build-duration">${de(c.duration)}</div>
            <div class="build-time">${c.status==="building"||c.status==="queued"?`${c.status==="building"?"Building...":"Queued"} <a href="javascript:void(0)" onclick="window.cancelBuild('${c.id}')" style="color:#ef4444; margin-left:6px; font-weight:600; text-decoration:underline;">Cancel</a>`:Ee(c.created_at)}</div>
          </div>`).join("");let p;a.length===0?p=`< div class="card" style = "padding:var(--space-lg);text-align:center;color:var(--text-tertiary);" >
          <div style="font-size:1.5rem;margin-bottom:var(--space-xs);">📦</div>
          <div>No projects yet</div>
          <a href="#/projects" class="btn btn-primary btn-sm" style="margin-top:var(--space-sm);">Create Project</a>
        </div > `:p=a.map(c=>`
    < div class="card" style = "padding:var(--space-md);cursor:pointer;" onclick = "location.hash='#/projects'" >
      <div style="display:flex;align-items:center;gap:var(--space-sm);">
        <div class="project-icon both" style="width:32px;height:32px;font-size:0.9rem;">📱</div>
        <div>
          <div style="font-weight:600;font-size:0.875rem;">${c.name}</div>
          <div style="font-size:0.75rem;color:var(--text-tertiary);">${c.platform||"ios"} · ${c.slug}</div>
        </div>
        ${Ae(c,i)}
      </div>
          </div > `).join("");const d=s.total_builds>0?`
    < div class="section-header" >
      <h3>💰 Savings Tracker</h3>
        </div >
    <div class="card" style="padding:var(--space-lg);">
      <div style="text-align:center;margin-bottom:var(--space-md);">
        <div style="font-size:0.8125rem;color:var(--text-tertiary);margin-bottom:4px;">You've saved vs Industry Average</div>
        <div style="font-size:2rem;font-weight:900;color:var(--success);">$${b}</div>
        <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px;">Across ${s.total_builds} build${s.total_builds!==1?"s":""}</div>
      </div>
      <div class="progress-bar" style="margin-bottom:var(--space-sm);">
        <div class="progress-bar-fill" style="width:${x}%;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-tertiary);">
        <span>BuildCheap: $${v}</span>
        <span>Industry Avg: $${g}</span>
      </div>
    </div>`:"";return`
      < div class="page-title-bar" >
      <h2>Welcome back, ${t.display_name||"Builder"} 👋</h2>
      <a href="#/projects" class="btn btn-primary">+ New Build</a>
    </div >

    ${f}

  <div class="content-grid">
    <div>
      <div class="section-header">
        <h3>Recent Builds</h3>
        <a href="#/builds" class="btn btn-ghost btn-sm">View all →</a>
      </div>
      <div class="build-list">
        ${r}
      </div>
    </div>

    <div>
      <div class="section-header">
        <h3>Your Projects</h3>
        <a href="#/projects" class="btn btn-ghost btn-sm">All →</a>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--space-sm);margin-bottom:var(--space-xl);">
        ${p}
      </div>

      ${d}
    </div>
  </div>
  `}function _e(e){const t=Le(),s=K("dashboard",t);e.appendChild(s);const a=s.querySelector("#pageContent");me.get().then(i=>{a.innerHTML=Ie(i)}).catch(i=>{console.error("Dashboard load failed:",i),a.innerHTML=`< div style = "padding:var(--space-xl);text-align:center;color:var(--text-tertiary);" >
            <div style="font-size:2rem;margin-bottom:var(--space-sm);">⚠️</div>
            <div>Failed to load dashboard: ${i.message}</div>
        </div > `})}function ze(){return`
    <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
      <div class="spinner" style="width:32px;height:32px;"></div>
    </div>`}function le(e){if(!e)return"—";const t=(Date.now()-new Date(e).getTime())/1e3;return t<60?"just now":t<3600?`${Math.floor(t/60)} min ago`:t<86400?`${Math.floor(t/3600)} hr${Math.floor(t/3600)>1?"s":""} ago`:`${Math.floor(t/86400)} day${Math.floor(t/86400)>1?"s":""} ago`}function Pe(e){const t=ze(),s=K("projects",t);e.appendChild(s);const a=s.querySelector("#pageContent");function i(v){var x,f;if(!v||!v.projects||v.projects.length===0)return`
            <div class="page-title-bar">
                <h2>Projects</h2>
                <button class="btn btn-primary" id="newProjectBtn">+ New Project</button>
            </div>
            <div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">
                <div style="font-size:2rem;margin-bottom:var(--space-sm);">📦</div>
                <div>No projects yet. Create one to get started!</div>
            </div>`;const g=`
      <style>
        .dropdown-item:hover { background: var(--surface-overlay); }
      </style>
    `,b=v.projects.map((r,p)=>`
            <div class="card card-glow project-card animate-in" style="animation-delay: ${p*.1}s; position:relative; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <div class="project-card-header" style="align-items:flex-start;">
                        <div style="display:flex;gap:var(--space-md);align-items:center;">
                            <div class="project-icon ${r.platform||"both"}">${r.platform==="ios"?"🍎":r.platform==="android"?"🤖":"📱"}</div>
                            <div>
                                <div class="project-card-title">${r.name}</div>
                                <div class="project-card-slug">${r.slug}</div>
                                <div style="font-size:0.7rem; color:var(--text-tertiary); font-family:monospace; margin-top:4px;" title="Project ID: ${r.id}">ID: ${r.id}</div>
                            </div>
                        </div>
                        
                        <div class="dropdown" style="position:relative;">
                            <button class="btn btn-ghost btn-sm dropdown-trigger" data-dropdown="dp-${r.id}" style="padding:4px 8px;font-size:1.25rem;color:var(--text-secondary);">⋮</button>
                            <div id="dp-${r.id}" class="dropdown-content animate-in" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;background:var(--surface-card);border:1px solid var(--border-medium);border-radius:var(--radius-md);padding:var(--space-xs);min-width:180px;z-index:20;box-shadow:0 10px 15px -3px rgba(0,0,0,0.5);">
                                <div class="dropdown-item manage-secrets-btn" data-id="${r.id}" data-name="${r.name}" style="cursor:pointer;padding:8px 12px;font-size:0.875rem;border-radius:var(--radius-sm);transition:background 0.2s;">🔑 Settings & Secrets</div>
                                <div class="dropdown-item edit-project-btn" data-id="${r.id}" data-name="${r.name}" data-bundle="${r.bundle_id}" data-repo="${r.repo_url}" style="cursor:pointer;padding:8px 12px;font-size:0.875rem;border-radius:var(--radius-sm);transition:background 0.2s;">⚙️ Edit metadata</div>
                                <div class="dropdown-item delete-project-btn" data-id="${r.id}" style="cursor:pointer;padding:8px 12px;font-size:0.875rem;color:var(--error);border-radius:var(--radius-sm);transition:background 0.2s;">🗑️ Delete project</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="project-card-meta" style="margin-top:var(--space-md);">
                        <div class="meta-item">⏱️ <span>Created ${le(r.created_at)}</span></div>
                    </div>
                    
                    <div style="margin-top:var(--space-md);display:flex;gap:var(--space-sm);flex-wrap:wrap;margin-bottom:var(--space-xl);">
                        <button class="btn btn-primary btn-sm trigger-build-btn" data-id="${r.id}" data-platform="ios" style="flex:1;">Build Native (iOS)</button>
                    </div>
                </div>

                ${r.last_build_status?`
                <div style="padding:var(--space-sm) var(--space-md); margin:0 -var(--space-lg) -var(--space-xl) -var(--space-lg); background:${r.last_build_status==="success"?"rgba(34,197,94,0.1)":r.last_build_status==="failed"||r.last_build_status==="error"?"rgba(239,68,68,0.1)":"rgba(99,102,241,0.1)"}; color:${r.last_build_status==="success"?"var(--success)":r.last_build_status==="failed"||r.last_build_status==="error"?"var(--error)":"var(--primary)"}; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:var(--space-xs); border-top:1px solid var(--border-light); border-bottom-left-radius:var(--radius-lg); border-bottom-right-radius:var(--radius-lg);">
                  <span>${r.last_build_status==="success"?"✅":r.last_build_status==="failed"||r.last_build_status==="error"?"❌":"⏳"}</span> 
                  <span>iOS build ${r.last_build_status==="success"?"completed":r.last_build_status==="failed"||r.last_build_status==="error"?"failed":"is currently running"} ${le(r.last_build_time)}</span>
                </div>
                `:`
                <div style="padding:var(--space-sm) var(--space-md); margin:0 -var(--space-lg) -var(--space-xl) -var(--space-lg); background:var(--surface-overlay); color:var(--text-tertiary); font-size:0.75rem; font-weight:600; display:flex; align-items:center; border-top:1px solid var(--border-light); border-bottom-left-radius:var(--radius-lg); border-bottom-right-radius:var(--radius-lg);">
                  ◦ No builds yet
                </div>
                `}
            </div>
        `).join("");return`
        ${g}
        <div class="page-title-bar">
            <h2>Projects</h2>
            <button class="btn btn-primary" id="newProjectBtn">+ New Project</button>
        </div>
        
        <div class="card" style="padding:var(--space-md) var(--space-lg);margin-bottom:var(--space-lg);display:flex;align-items:center;justify-content:space-between;border-color:transparent;background:var(--surface-card);border:1px solid var(--border-medium);">
          <div style="font-size:0.875rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:4px;">
            <strong style="color:var(--text-primary);">You have <span>${Math.floor((((x=v.user)==null?void 0:x.credit_balance)||0)/se.COST_PER_BUILD)}</span> prepaid build credits remaining.</strong>
            <span style="color:var(--text-tertiary);font-size:0.8rem;">Additional usage requires a <a href="#/billing" style="color:var(--primary);text-decoration:none;">balance topping</a>. See <a href="#/billing" style="color:var(--text-secondary);">billing</a>.</span>
          </div>
          <div style="width:250px;display:flex;align-items:center;gap:var(--space-sm);font-size:0.75rem;color:var(--text-tertiary);font-weight:600;">
            <span>0%</span>
            <div style="flex:1;height:6px;background:var(--border-medium);border-radius:3px;overflow:hidden;">
              <div style="height:100%;background:var(--primary);width:${Math.min(100,Math.max(0,Math.floor((((f=v.user)==null?void 0:f.credit_balance)||0)/se.COST_PER_BUILD)/100*100))}%;border-radius:3px;"></div>
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
            ${b}
            <div class="card project-card animate-in" id="newProjectCard" style="animation-delay: ${v.projects.length*.1}s; border:2px dashed var(--border-medium);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;cursor:pointer;">
                <div style="font-size:2rem;margin-bottom:var(--space-sm);opacity:0.4;">+</div>
                <div style="font-size:0.875rem;color:var(--text-tertiary);font-weight:600;">Create New Project</div>
                <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px;">Connect a repo or start fresh</div>
            </div>
        </div>
        `}function o(){me.get().then(v=>{a.innerHTML=i(v),m()}).catch(v=>{a.innerHTML=`<div style="padding:var(--space-xl);text-align:center;color:var(--text-tertiary);">⚠️ Failed to load dashboard: ${v.message}</div>`})}function m(){document.body.addEventListener("click",r=>{r.target.closest(".dropdown")||document.querySelectorAll(".dropdown-content").forEach(p=>p.style.display="none")}),a.querySelectorAll(".dropdown-trigger").forEach(r=>{r.addEventListener("click",p=>{const d=p.target.getAttribute("data-dropdown");document.querySelectorAll(".dropdown-content").forEach(y=>{y.id!==d&&(y.style.display="none")});const c=document.getElementById(d);c&&(c.style.display=c.style.display==="none"?"block":"none")})}),a.querySelectorAll(".delete-project-btn").forEach(r=>{r.addEventListener("click",async p=>{const d=p.target.getAttribute("data-id");if(confirm("Are you absolutely sure you want to delete this project? This will permanently wipe all builds and secrets. This action cannot be undone.")){r.disabled=!0;try{await Y.delete(d),o()}catch(c){alert("Failed to delete project: "+c.message),r.disabled=!1}}})}),a.querySelectorAll(".edit-project-btn").forEach(r=>{r.addEventListener("click",p=>{const d=p.currentTarget,c=d.getAttribute("data-id"),y=d.getAttribute("data-name"),C=d.getAttribute("data-bundle")||"",S=d.getAttribute("data-repo")||"",l=`
          <div id="editModalOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;">
            <div class="card animate-in" style="width:100%;max-width:550px;padding:var(--space-xl);position:relative;">
              <h3 style="margin-bottom:var(--space-lg);">Edit Project Settings</h3>
              
              <div class="input-group" style="margin-bottom:var(--space-md);">
                <label>Project Name</label>
                <input type="text" id="editProjName" class="input" value="${y}" />
              </div>
              <div class="input-group" style="margin-bottom:var(--space-md);">
                <label>Bundle ID / App Store ID</label>
                <input type="text" id="editProjBundle" class="input" value="${C}" placeholder="com.company.app" />
              </div>
              <div class="input-group" style="margin-bottom:var(--space-md);">
                <label>Repository URL / Source</label>
                <input type="text" id="editProjRepo" class="input" value="${S}" />
              </div>
              
              <div id="editModalError" style="color:var(--error);font-size:0.875rem;display:none;margin-bottom:var(--space-sm);"></div>
              <div style="display:flex;justify-content:flex-end;gap:var(--space-sm);margin-top:var(--space-xl);">
                <button class="btn btn-ghost" id="cancelEditModalBtn">Cancel</button>
                <button class="btn btn-primary" id="saveEditModalBtn">Save Changes</button>
              </div>
            </div>
          </div>
        `;document.body.insertAdjacentHTML("beforeend",l);const k=document.getElementById("editModalOverlay"),j=document.getElementById("cancelEditModalBtn"),P=document.getElementById("saveEditModalBtn"),M=document.getElementById("editModalError"),D=()=>k.remove();j.addEventListener("click",D),P.addEventListener("click",async()=>{P.disabled=!0,M.style.display="none";try{await Y.update(c,{name:document.getElementById("editProjName").value.trim(),bundle_id:document.getElementById("editProjBundle").value.trim(),repo_url:document.getElementById("editProjRepo").value.trim(),platform:"ios"}),D(),o()}catch(L){M.innerText=L.message,M.style.display="block",P.disabled=!1}})})}),a.querySelectorAll("#newProjectBtn, #newProjectCard").forEach(r=>{r.addEventListener("click",()=>{document.body.insertAdjacentHTML("beforeend",`
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
        `);const d=document.getElementById("customModalOverlay"),c=document.getElementById("repoUrlInput"),y=document.getElementById("uploadProjectName"),C=document.getElementById("cancelModalBtn"),S=document.getElementById("confirmModalBtn"),l=document.getElementById("createModalError"),k=document.getElementById("gitPathSection"),j=document.getElementById("uploadPathSection"),P=document.getElementById("tabGitBtn"),M=document.getElementById("tabUploadBtn"),D=document.getElementById("newProjectFileInput"),L=document.getElementById("newProjectDropZone"),N=document.getElementById("newProjectFileName");let T=null,I="git";c.focus(),L.addEventListener("click",()=>D.click()),D.addEventListener("change",()=>{D.files.length>0&&(T=D.files[0],N.innerText=T.name,L.style.borderColor="var(--primary)")}),L.addEventListener("dragover",z=>{z.preventDefault(),L.style.background="rgba(99,102,241,0.05)"}),L.addEventListener("dragleave",()=>{L.style.background="transparent"}),L.addEventListener("drop",z=>{z.preventDefault(),L.style.background="transparent",z.dataTransfer.files.length>0&&(T=z.dataTransfer.files[0],N.innerText=T.name,L.style.borderColor="var(--primary)")}),P.addEventListener("click",()=>{I="git",P.className="btn btn-primary",P.style.flex="1",M.className="btn btn-ghost",M.style.flex="1",k.style.display="block",j.style.display="none",S.innerText="Import Project"}),M.addEventListener("click",()=>{I="upload",M.className="btn btn-primary",M.style.flex="1",P.className="btn btn-ghost",P.style.flex="1",k.style.display="none",j.style.display="block",S.innerText="Create Project"});const _=()=>d.remove();C.addEventListener("click",_),S.addEventListener("click",async()=>{S.disabled=!0,l.style.display="none";const z=document.getElementById("createProjBundle").value.trim();try{if(I==="git"){const O=c.value.trim();if(!O){l.innerText="Repository URL is required",l.style.display="block",S.disabled=!1;return}S.innerText="Importing...";const q=O.replace(/\/$/,"").split("/"),w=q[q.length-1],n=q[q.length-2];await Y.create({name:w,slug:`${n||"user"}/${w}`,repo_url:O,bundle_id:z,platform:"ios"})}else{const O=y.value.trim();if(!O){l.innerText="Project name is required",l.style.display="block",S.disabled=!1;return}if(!T){l.innerText="Please select a .zip or .tar.gz source file",l.style.display="block",S.disabled=!1;return}S.innerText="Creating Project...";const q=O.toLowerCase().replace(/[^a-z0-9]/g,"-"),w=await Y.create({name:O,slug:q,bundle_id:z,platform:"ios"});S.innerText="Uploading Archive...",await Y.upload(w.project.id,T)}_(),o()}catch(O){l.innerText=O.message,l.style.display="block",S.disabled=!1,S.innerText=I==="git"?"Import Project":"Create Project"}})})}),a.querySelectorAll(".manage-secrets-btn").forEach(r=>{r.addEventListener("click",async p=>{const d=p.target.getAttribute("data-id"),y=`
          <div id="secretsModalOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:var(--space-xl);">
            <div class="card animate-in" style="width:100%;max-width:600px;max-height:80vh;display:flex;flex-direction:column;padding:var(--space-xl);position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md);">
                <h3>Environment Secrets: ${p.target.getAttribute("data-name")}</h3>
                <button class="btn btn-ghost btn-sm" id="closeSecretsBtn">✕ Close</button>
              </div>
              <p style="color:var(--text-tertiary);font-size:0.875rem;margin-bottom:var(--space-lg);">
                These sensitive environment variables are securely injected into the iOS compilation sandbox and are never exposed in plaintext.
              </p>
              
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
              
              <form id="addSecretForm" style="display:flex;gap:var(--space-sm);margin-top:auto;padding-top:var(--space-md);border-top:1px solid var(--border-medium);">
                <input type="text" id="secretKeyInput" class="input flex-auto" placeholder="API_KEY" required pattern="^[a-zA-Z_][a-zA-Z0-9_]*$" title="Valid shell environment variable name" />
                <input type="password" id="secretValueInput" class="input flex-auto" placeholder="••••••••" required />
                <button type="submit" class="btn btn-primary" id="addSecretSubmitBtn">Add</button>
              </form>
              <div id="secretErrorMsg" style="color:var(--error);font-size:0.875rem;display:none;margin-top:var(--space-xs);"></div>
            </div>
          </div>
        `;document.body.insertAdjacentHTML("beforeend",y);const C=document.getElementById("secretsModalOverlay"),S=document.getElementById("closeSecretsBtn"),l=document.getElementById("secretsTableBody"),k=document.getElementById("addSecretForm"),j=document.getElementById("secretKeyInput"),P=document.getElementById("secretValueInput"),M=document.getElementById("addSecretSubmitBtn"),D=document.getElementById("secretErrorMsg"),L=()=>C.remove();S.addEventListener("click",L),C.addEventListener("click",T=>{T.target===C&&L()});async function N(){try{const T=await ae.list(d);if(!T.secrets||T.secrets.length===0){l.innerHTML='<tr><td colspan="3" style="text-align:center;padding:var(--space-md);color:var(--text-tertiary);">No secrets configured for this project.</td></tr>';return}l.innerHTML=T.secrets.map(I=>`
              <tr style="border-bottom:1px solid var(--border-light);">
                <td style="padding:var(--space-sm) 0;font-family:monospace;font-weight:600;">${I.key_name}</td>
                <td style="padding:var(--space-sm) 0;color:var(--success);">Encrypted</td>
                <td style="padding:var(--space-sm) 0;text-align:right;">
                  <button class="btn btn-ghost btn-sm delete-secret-btn" style="color:var(--error);" data-id="${I.id}">Remove</button>
                </td>
              </tr>
            `).join(""),document.querySelectorAll(".delete-secret-btn").forEach(I=>{I.addEventListener("click",async _=>{if(!confirm("Delete this secret? Builds may fail if it is required."))return;const z=_.target.getAttribute("data-id");I.disabled=!0;try{await ae.delete(d,z),N()}catch(O){alert(O.message),I.disabled=!1}})})}catch(T){l.innerHTML=`<tr><td colspan="3" style="color:var(--error);padding:var(--space-md);">${T.message}</td></tr>`}}k.addEventListener("submit",async T=>{T.preventDefault(),M.disabled=!0,D.style.display="none";try{await ae.add(d,j.value.trim(),P.value.trim()),j.value="",P.value="",j.focus(),N()}catch(I){D.innerText=I.message,D.style.display="block"}finally{M.disabled=!1}}),N()})}),a.querySelectorAll(".trigger-build-btn").forEach(r=>{r.addEventListener("click",async p=>{const d=p.target.getAttribute("data-id"),c=p.target.getAttribute("data-platform");r.disabled=!0,r.innerText="Queueing...";try{await V.trigger(d,c,"HEAD","Manual build from dashboard"),setTimeout(()=>{window.location.hash="#/builds"},500)}catch(y){r.disabled=!1,r.innerText=`Error: ${y.message.length>30?y.message.substring(0,30)+"...":y.message} `,r.title=y.message,setTimeout(()=>{r.innerText="Build Native (iOS)",r.title=""},4e3)}})})}o()}function ce(e){if(!e)return"—";const t=Math.floor(e/60),s=Math.round(e%60);return`${t}m ${s}s`}function Me(e){if(!e)return"—";const t=(Date.now()-new Date(e).getTime())/1e3;return t<60?"just now":t<3600?`${Math.floor(t/60)} min ago`:t<86400?`${Math.floor(t/3600)} hr${Math.floor(t/3600)>1?"s":""} ago`:`${Math.floor(t/86400)} day${Math.floor(t/86400)>1?"s":""} ago`}function pe(e){return e==="success"?'<div class="build-status-icon success">✓</div>':e==="failed"||e==="error"?'<div class="build-status-icon error">✕</div>':e==="building"?'<div class="build-status-icon building"><div class="spinner"></div></div>':e==="queued"?'<div class="build-status-icon queued">⏳</div>':'<div class="build-status-icon">—</div>'}function ue(e){return e==="ios"?'<span class="badge badge-info">iOS</span>':e==="android"?'<span class="badge badge-success">Android</span>':`<span class="badge">${e||"—"}</span>`}function qe(){return'<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner" style="width:32px;height:32px;"></div></div>'}function De(e){const t=qe(),s=K("builds",t);e.appendChild(s);const a=s.querySelector("#pageContent");let i=null,o=null;a.innerHTML=`
    <div class="page-title-bar">
      <h2>Builds</h2>
      <button class="btn btn-primary" onclick="location.hash='#/projects'">+ New Build</button>
    </div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-xl);min-width:0;">
      <div id="buildsListCol" style="min-width:0;">
        <div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner" style="width:32px;height:32px;"></div></div>
      </div>
      
      <div style="min-width:0;">
        <div class="section-header" id="buildLogHeader" style="display:flex; justify-content:space-between; align-items:center;">
          <h3>Build Log</h3>
          <button class="btn btn-ghost btn-sm" onclick="window.copyBuildLog()">Copy All 📋</button>
        </div>
        <div class="card" style="padding:0;overflow:hidden;background:#0d0d0d;display:flex;flex-direction:column;">
          <div class="build-log" id="buildLogOutput" style="height:600px;overflow-y:auto;overflow-x:hidden;padding:var(--space-md);font-family:monospace;font-size:0.8rem;color:#ccc;white-space:pre-wrap;word-wrap:break-word;word-break:break-all;">
            Select a build to view logs.
          </div>
        </div>
      </div>
    </div>
  `;function m(d){if(!d||!d.builds||d.builds.length===0)return`
            <div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">
                <div style="font-size:2rem;margin-bottom:var(--space-sm);">🔨</div>
                <div>No builds found. Go to Projects to trigger one!</div>
            </div>`;const c=d.builds.filter(l=>l.status==="building"||l.status==="queued"),y=d.builds.filter(l=>l.status==="success"||l.status==="failed"||l.status==="error");let C="";c.length>0&&(C=`
            <div class="section-header">
              <h3>🔴 Active Builds</h3>
              <span class="badge badge-info">${c.length} running</span>
            </div>
            <div class="build-list" style="margin-bottom:var(--space-xl);">
              ${c.map(l=>`
                <div class="build-item ${l.id===o?"selected":""}" style="cursor:pointer;" onclick="window.selectBuild('${l.id}')">
                  ${pe(l.status)}
                  <div class="build-info">
                    <div class="build-number">Build #${l.build_number} — ${l.project_name}</div>
                    <div class="build-commit">${l.commit_hash?l.commit_hash.slice(0,7):"—"} · ${l.commit_message||"manual"}</div>
                  </div>
                  <div class="build-platform">${ue(l.platform)}</div>
                  <div class="build-duration">${ce(l.duration)}</div>
                  <div class="build-time" style="color:var(--warning);">${l.status==="queued"?"Queued":"Building..."}</div>
                </div>
              `).join("")}
            </div>`);let S="";return y.length>0&&(S=`
            <div class="section-header">
              <h3>Build History</h3>
              <span class="badge badge-neutral">${y.length} total</span>
            </div>
            <div class="build-list" style="margin-bottom:var(--space-xl);">
              ${y.map(l=>`
                <div class="build-item ${l.id===o?"selected":""}" style="cursor:pointer;" onclick="window.selectBuild('${l.id}')">
                  ${pe(l.status)}
                  <div class="build-info">
                    <div class="build-number">Build #${l.build_number} — ${l.project_name}</div>
                    <div class="build-commit">${l.commit_hash?l.commit_hash.slice(0,7):"—"} · ${l.commit_message||"manual"}</div>
                  </div>
                  <div class="build-platform">${ue(l.platform)}</div>
                  <div class="build-duration">${ce(l.duration)}</div>
                  <div class="build-time">${Me(l.created_at)} · $0.50</div>
                </div>
              `).join("")}
            </div>`),C+S}function v(d=!1){V.list().then(c=>{const y=c.builds.filter(k=>k.status==="success"||k.status==="failed"||k.status==="error"),C=c.builds.filter(k=>k.status==="building"||k.status==="queued");!o&&c.builds.length>0&&(o=C[0]?C[0].id:y[0].id);const S=document.getElementById("buildsListCol");S&&(S.innerHTML=m(c));const l=document.getElementById("buildLogHeader");l&&o&&(l.innerHTML=`
          <div style="display:flex; justify-content:space-between; align-items:center; width: 100%;">
            <h3>Build Log</h3>
            <div style="display:flex; gap: 8px;">
              <button class="btn btn-ghost btn-sm" onclick="window.copyBuildLog()">Copy All 📋</button>
            </div>
          </div>
        `),!d&&o&&b(o)}).catch(c=>{const y=document.getElementById("buildsListCol");y&&(y.innerHTML=`<div style="padding:var(--space-xl);text-align:center;color:var(--error);">Failed to load builds: ${c.message}</div>`)})}let g=0;function b(d){g++;const c=g;i&&(i.close(),i=null);const y=document.getElementById("buildLogOutput");if(!y)return;y.innerHTML="Fetching logs...<br/>";let C=!1,S=[];V.log(d).then(l=>{c===g&&(l.log?y.textContent=l.log+`
`:y.textContent="",C=!0,S.forEach(k=>{const j=document.createElement("div");k.includes("✓")&&(j.style.color="var(--success)"),(k.includes("Error:")||k.includes("FAILED"))&&(j.style.color="var(--error)"),j.textContent=k,y.appendChild(j)}),S=[],y.scrollTop=y.scrollHeight)}).catch(()=>{c===g&&(y.textContent=`Failed to load historical logs.
`,C=!0)}),i=Se(d,l=>{if(c!==g)return;if(!C){S.push(l);return}const k=document.createElement("div");l.includes("✓")&&(k.style.color="var(--success)"),(l.includes("Error:")||l.includes("FAILED"))&&(k.style.color="var(--error)"),k.textContent=l,y.appendChild(k),y.scrollTop=y.scrollHeight}),i.addEventListener("message",l=>{JSON.parse(l.data).type==="build_complete"&&setTimeout(()=>v(!0),1e3)})}window.copyBuildLog=()=>{const d=document.getElementById("buildLogOutput");if(!d)return;const c=d.textContent||d.innerText;navigator.clipboard.writeText(c).then(()=>alert("Logs successfully copied to clipboard!")).catch(y=>alert("Browser copy failed: "+y))},window.selectBuild=d=>{o=d;const c=document.querySelectorAll(".build-item");c.forEach(C=>C.classList.remove("selected"));const y=Array.from(c).find(C=>{var S;return(S=C.getAttribute("onclick"))==null?void 0:S.includes(d)});y&&y.classList.add("selected"),b(d)};const x=`${window.location.protocol==="https:"?"wss":"ws"}://${window.location.host}/ws`;let f=null;function r(){f=new WebSocket(x),f.onopen=()=>{const d=we();d&&f.send(JSON.stringify({type:"auth",token:d}))},f.onmessage=d=>{try{const c=JSON.parse(d.data);(c.type==="build_complete"||c.type==="build_started")&&v(!0)}catch{}},f.onclose=()=>{document.body.contains(s)&&setTimeout(r,3e3)}}r();const p=setInterval(()=>{if(!document.body.contains(s)){clearInterval(p),i&&i.close(),f&&f.close();return}v(!0)},5e3);v()}function Oe(){return`
    <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
      <div class="spinner" style="width:32px;height:32px;"></div>
    </div>`}function Ne(e,t){return e.connected?`
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
            <div class="credential-detail">Key ID: ${e.key_id} · Issuer: ${e.issuer_id.slice(0,8)}...${e.team_id?` · Team: ${e.team_id}`:""}</div>
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
    `:`
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
              <textarea id="p8Key" class="input" rows="5" placeholder="-----BEGIN PRIVATE KEY-----
..." required style="font-family:monospace;font-size:12px;"></textarea>
            </div>
            <div id="credsError" style="color:var(--error);font-size:0.875rem;display:none;"></div>
            <button type="submit" class="btn btn-primary" id="saveCredsBtn">Save Credentials</button>
          </form>
        </div>
        `}function He(e){const t=Oe(),s=K("credentials",t);e.appendChild(s);const a=s.querySelector("#pageContent");function i(){J.apple.get().then(g=>{B.get("user"),a.innerHTML=Ne(g)+m(),o(g.connected),v()}).catch(g=>{a.innerHTML=`<div style="padding:var(--space-xl);text-align:center;color:var(--error);">Failed to load credentials: ${g.message}</div>`})}function o(g){if(g){const b=a.querySelector("#deleteCredsBtn");b&&b.addEventListener("click",async()=>{if(confirm("Are you sure you want to disconnect your Apple API Key? Your builds will fail until you reconnect!")){b.disabled=!0;try{await J.apple.delete(),i()}catch(f){alert("Failed to delete credentials: "+f.message),b.disabled=!1}}});const x=a.querySelector("#testCredsBtn");x&&x.addEventListener("click",async()=>{x.disabled=!0,x.innerText="Testing...";const f=a.querySelector("#testResult"),r=a.querySelector("#testBadge");f.innerHTML="";try{const p=await J.apple.test();r.className="badge badge-success",r.innerText="Valid",f.innerHTML=`<span style="color:var(--success);">✅ ${p.message}</span>`}catch(p){r.className="badge badge-error",r.innerText="Invalid",f.innerHTML=`<span style="color:var(--error);">❌ ${p.message}</span>`}x.disabled=!1,x.innerText="Test Connection"})}else{const b=a.querySelector("#appleCredsForm");b&&b.addEventListener("submit",async x=>{x.preventDefault();const f=a.querySelector("#saveCredsBtn"),r=a.querySelector("#credsError");f.disabled=!0,f.innerText="Saving...",r.style.display="none";try{await J.apple.save({issuer_id:a.querySelector("#issuerId").value,key_id:a.querySelector("#keyId").value,team_id:a.querySelector("#teamId").value,p8_key:a.querySelector("#p8Key").value}),i()}catch(p){r.innerText=p.message,r.style.display="block",f.disabled=!1,f.innerText="Save Credentials"}})}}function m(){return(B.get("user")||{}).has_github_token?`
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
    `:`
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
      `}function v(){const g=B.get("user")||{};if(g.has_github_token){const b=a.querySelector("#deleteGithubBtn");b&&b.addEventListener("click",async()=>{if(confirm("Are you sure you want to disconnect your GitHub Token? Background clones of private repositories will immediately fail.")){b.disabled=!0;try{await J.github.delete(),B.set("user",{...g,has_github_token:!1}),i()}catch(x){alert("Failed to delete GitHub token: "+x.message),b.disabled=!1}}})}else{const b=a.querySelector("#githubCredsForm");b&&b.addEventListener("submit",async x=>{x.preventDefault();const f=a.querySelector("#saveGithubBtn"),r=a.querySelector("#githubCredsError"),p=a.querySelector("#githubToken");f.disabled=!0,f.innerText="Saving...",r.style.display="none";try{await J.github.save(p.value.trim()),B.set("user",{...g,has_github_token:!0}),i()}catch(d){r.innerText=d.message,r.style.display="block",f.disabled=!1,f.innerText="Save Access Token"}})}}i()}function Fe(e){const t=`
    <div class="page-title-bar">
      <h2>Billing</h2>
    </div>
    
    <!-- Credit Balance -->
    <div class="card" style="padding:var(--space-xl);margin-bottom:var(--space-xl);border-color:var(--border-accent);">
      <div class="flex-between-wrap">
        <div>
          <div class="text-tertiary-sm">Credit Balance</div>
          <div style="font-size:2.5rem;font-weight:900;" id="creditBalance">
            <span class="text-gradient">$—</span>
          </div>
          <div style="font-size:0.875rem;color:var(--text-tertiary);margin-top:4px;" id="buildCount">— builds available</div>
        </div>
        <div class="text-right">
          <div class="text-tertiary-sm">Cost per build</div>
          <div class="text-primary-xl">$${se.COST_PER_BUILD.toFixed(2)}</div>
        </div>
      </div>
    </div>
    
    <!-- Buy Credits -->
    <div class="section-header">
      <h3>💳 Buy Credits</h3>
    </div>
    <div class="card" style="padding:var(--space-xl);margin-bottom:var(--space-xl);">
      <p style="font-size:0.875rem;color:var(--text-tertiary);margin-bottom:var(--space-lg);">
        Enter any amount ($5 minimum). Credits never expire.
      </p>
      
      <!-- Quick amounts -->
      <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-lg);flex-wrap:wrap;">
        <button class="btn btn-secondary quick-amount" data-amount="5">$5 <span style="color:var(--text-tertiary);font-weight:400;">(10 builds)</span></button>
        <button class="btn btn-secondary quick-amount" data-amount="10">$10 <span style="color:var(--text-tertiary);font-weight:400;">(20 builds)</span></button>
        <button class="btn btn-secondary quick-amount" data-amount="25">$25 <span style="color:var(--text-tertiary);font-weight:400;">(50 builds)</span></button>
        <button class="btn btn-secondary quick-amount" data-amount="50">$50 <span style="color:var(--text-tertiary);font-weight:400;">(100 builds)</span></button>
        <button class="btn btn-secondary quick-amount" data-amount="100">$100 <span style="color:var(--text-tertiary);font-weight:400;">(200 builds)</span></button>
        <button class="btn btn-secondary quick-amount" data-amount="250">$250 <span style="color:var(--text-tertiary);font-weight:400;">(500 builds)</span></button>
      </div>
      
      <!-- Custom amount -->
      <div style="display:flex;gap:var(--space-md);align-items:flex-end;">
        <div class="input-group" style="flex:1;max-width:300px;">
          <label for="customAmount">Custom Amount (USD)</label>
          <div style="position:relative;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);font-weight:600;">$</span>
            <input class="input" id="customAmount" type="number" min="5" step="0.50" placeholder="5.00" 
                   style="padding-left:28px;" value="10" />
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <span style="font-size:0.75rem;color:var(--text-tertiary);" id="buildEstimate">= 20 builds</span>
          <button class="btn btn-primary" id="purchaseBtn">Purchase Credits</button>
        </div>
      </div>
      
      <div id="purchaseError" style="display:none;margin-top:var(--space-md);padding:0.75rem;background:var(--error-bg);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-md);color:var(--error);font-size:0.8125rem;"></div>
      <div id="purchaseSuccess" style="display:none;margin-top:var(--space-md);padding:0.75rem;background:var(--success-bg);border:1px solid rgba(34,197,94,0.2);border-radius:var(--radius-md);color:var(--success);font-size:0.8125rem;"></div>
    </div>
    
    <!-- Transaction History -->
    <div class="section-header">
      <h3>Transaction History</h3>
    </div>
    <div id="transactionHistory">
      <div class="card" style="padding:var(--space-lg);">
        <div class="empty-state">
          <div class="spinner"></div>
          <div class="empty-state-desc">Loading transactions...</div>
        </div>
      </div>
    </div>
  `,s=K("billing",t);e.appendChild(s);const a=e.querySelector("#creditBalance"),i=e.querySelector("#buildCount"),o=e.querySelector("#customAmount"),m=e.querySelector("#buildEstimate"),v=e.querySelector("#purchaseBtn"),g=e.querySelector("#purchaseError"),b=e.querySelector("#purchaseSuccess"),x=e.querySelector("#transactionHistory");o.addEventListener("input",()=>{const p=parseFloat(o.value)||0,d=Math.floor(p/.5);m.textContent=`= ${d} build${d!==1?"s":""}`}),e.querySelectorAll(".quick-amount").forEach(p=>{p.addEventListener("click",()=>{o.value=p.dataset.amount,o.dispatchEvent(new Event("input"))})}),v.addEventListener("click",async()=>{const p=parseFloat(o.value);if(g.style.display="none",b.style.display="none",!p||p<5){g.textContent="Minimum purchase is $5",g.style.display="block";return}v.disabled=!0,v.textContent="Processing...";try{const d=await ee.purchase(p);d.checkout_url&&(window.open(d.checkout_url,"_blank"),b.textContent="Redirecting to Stripe checkout... Complete payment in the new tab.",b.style.display="block")}catch(d){g.textContent=d.message,g.style.display="block"}v.disabled=!1,v.textContent="Purchase Credits"}),f(),r();async function f(){try{const p=await ee.balance();a.innerHTML=`<span class="text-gradient">$${p.balance.toFixed(2)}</span>`,i.textContent=`${p.available_builds} builds available`}catch{a.innerHTML='<span class="text-gradient">$0.00</span>',i.textContent="0 builds available"}}async function r(){try{const p=await ee.history();if(p.transactions.length===0){x.innerHTML=`
          <div class="card" style="padding:var(--space-lg);">
            <div class="empty-state">
              <div class="empty-state-icon">💳</div>
              <div class="empty-state-title">No transactions yet</div>
              <div class="empty-state-desc">Purchase credits above to get started.</div>
            </div>
          </div>
        `;return}x.innerHTML=`
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${p.transactions.map(d=>`
                <tr>
                  <td>${new Date(d.created_at).toLocaleDateString()}</td>
                  <td><span class="badge ${d.type==="purchase"?"badge-success":d.type==="refund"?"badge-info":"badge-neutral"}">${d.type}</span></td>
                  <td style="color:var(--text-primary);">${d.description}</td>
                  <td style="font-weight:600;color:${d.amount>0?"var(--success)":"var(--text-secondary)"};">
                    ${d.amount>0?"+":""}$${Math.abs(d.amount).toFixed(2)}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `}catch{x.innerHTML=`
        <div class="card" style="padding:var(--space-lg);">
          <div class="empty-state">
            <div class="empty-state-icon">💳</div>
            <div class="empty-state-title">No transactions yet</div>
            <div class="empty-state-desc">Purchase credits above to get started.</div>
          </div>
        </div>
      `}}}function ge(e){const t=B.get("user");if(!t){window.location.hash="#/dashboard";return}const s=`
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
        <input class="input w-250" id="displayNameInput" value="${t.display_name||""}" />
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Email</div>
          <div class="settings-row-desc">Primary email for notifications and invoices.</div>
        </div>
        <input class="input w-250" value="${t.email||""}" disabled />
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Avatar</div>
          <div class="settings-row-desc">Click to upload a profile picture (max 500KB).</div>
        </div>
        <div class="flex-center-md" style="position:relative;cursor:pointer;" id="avatarUploadTrigger" title="Click to change avatar">
          ${t.avatar_url?`<img src="${t.avatar_url}" class="avatar avatar-lg" style="object-fit:cover;border-radius:50%;" />`:`<div class="avatar avatar-lg">${(t.display_name||t.email||"?")[0].toUpperCase()}</div>`}
          <div style="position:absolute;bottom:-2px;right:-2px;background:var(--primary);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid var(--bg-primary);">📷</div>
          <input type="file" id="avatarFileInput" accept="image/*" style="display:none;" />
        </div>
      </div>
      <div id="avatarUploadMsg" style="font-size:0.8rem;margin-top:var(--space-xs);display:none;"></div>
    </div>
    
    <!-- API Keys -->
    <div class="settings-section" id="apiKeysSection">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3>API Keys</h3>
      </div>
      <p style="color:var(--text-tertiary);font-size:0.875rem;margin-bottom:var(--space-md);">
        These tokens allow you to automate your builds via CLI or CI/CD pipelines.
      </p>

      <div class="card" style="padding:var(--space-md);margin-bottom:var(--space-xl);">
        <form id="createKeyForm" style="display:flex;gap:var(--space-sm);flex-wrap:wrap;align-items:center;">
          <input type="text" id="newKeyName" class="input flex-auto" placeholder="E.g., GitHub Actions Token" required minlength="2" />
          <select id="keyExpirationSelect" class="input" style="width:auto;">
            <option value="0">No expiration</option>
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30" selected>30 days</option>
            <option value="180">6 months</option>
            <option value="365">1 year</option>
            <option value="custom">Custom...</option>
          </select>
          <input type="number" id="keyCustomExpirationInput" class="input" placeholder="Days" min="1" max="3650" style="width:80px;display:none;" />
          <button type="submit" class="btn btn-primary" id="createKeyBtn">Generate Key</button>
        </form>
        <div id="createKeyMsg" style="font-size:0.875rem;display:none;margin-top:var(--space-xs);"></div>
      </div>

      <div id="apiKeysListContainer">
        <div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">Loading keys...</div>
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
  `,a=K("settings",s);e.appendChild(a);const i=a.querySelector("#apiKeysListContainer"),o=a.querySelector("#createKeyForm"),m=a.querySelector("#createKeyMsg"),v=a.querySelector("#keyExpirationSelect"),g=a.querySelector("#keyCustomExpirationInput");v&&g&&v.addEventListener("change",()=>{g.style.display=v.value==="custom"?"block":"none",v.value==="custom"&&g.focus()});let b=[];async function x(){if(i)try{if(b=(await F.keys.list()).keys||[],b.length===0){i.innerHTML='<div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">No API keys are currently active.</div>';return}i.innerHTML=b.map(n=>{let h="No expiration",E=!1;if(n.expires_at){const H=new Date(n.expires_at);E=H<new Date,h=E?"Expired":"Expires "+H.toLocaleDateString()}const $=E?"var(--error)":n.is_active?"var(--success)":"var(--text-tertiary)",R=E?"Expired":n.is_active?"Active":"Disabled";return`
        <div class="card" style="padding:var(--space-md);margin-bottom:var(--space-sm);display:flex;justify-content:space-between;align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:600;font-size:1.05rem;display:flex;align-items:center;gap:8px;">
              ${n.name}
              <span class="badge" style="background:transparent;border:1px solid ${$};color:${$};">${R}</span>
            </div>
            <div style="font-family:monospace;font-size:0.9rem;background:var(--bg-secondary);padding:4px 8px;border-radius:4px;margin-top:8px;display:inline-block;color:var(--text-secondary);">
              <span id="mask-${n.id}">bc_live_••••••••••••••••••••••••</span>
              <button class="btn btn-ghost btn-sm btn-copy-key" data-value="${n.key_value}" data-id="${n.id}" style="margin-left:8px;padding:2px 8px;min-height:auto;">Copy</button>
            </div>
            <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:8px;display:flex;gap:12px;">
              <span>Created ${new Date(n.created_at).toLocaleDateString()}</span>
              <span>${h}</span>
              ${n.last_used_at?"<span>Last used "+new Date(n.last_used_at).toLocaleDateString()+"</span>":"<span>Never used</span>"}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--space-xs);align-items:flex-end;">
            ${E?"":'<button class="btn btn-secondary btn-sm toggle-key-btn" data-id="'+n.id+'" data-active="'+n.is_active+'">'+(n.is_active?"Disable":"Enable")+"</button>"}
            <button class="btn btn-ghost btn-sm delete-key-btn" data-id="${n.id}" style="color:var(--error);">Delete</button>
          </div>
        </div>
        `}).join(""),a.querySelectorAll(".btn-copy-key").forEach(n=>{n.addEventListener("click",async h=>{const E=h.target.getAttribute("data-value");await navigator.clipboard.writeText(E),h.target.textContent="Copied!",setTimeout(()=>{h.target.textContent="Copy"},2e3)})}),a.querySelectorAll(".toggle-key-btn").forEach(n=>{n.addEventListener("click",async h=>{const E=h.target.getAttribute("data-id"),$=parseInt(h.target.getAttribute("data-active"),10);try{await F.keys.toggle(E,!$),x()}catch(R){alert(R.message)}})}),a.querySelectorAll(".delete-key-btn").forEach(n=>{n.addEventListener("click",async h=>{if(!confirm("Permanently delete this key? This action cannot be undone."))return;const E=h.target.getAttribute("data-id");try{await F.keys.delete(E),x()}catch($){alert($.message)}})})}catch(w){i.innerHTML=`<div style="color:var(--error);padding:var(--space-md);">${w.message}</div>`}}o&&o.addEventListener("submit",async w=>{w.preventDefault();const n=o.querySelector("#createKeyBtn"),h=o.querySelector("#newKeyName");m.style.display="none",n.disabled=!0;let E=v?v.value:30;if(E==="custom"&&(E=parseInt(g.value),isNaN(E)||E<1)){alert("Please enter a valid number of days for custom expiration"),n.disabled=!1;return}try{const $=await F.keys.create(h.value.trim(),E);h.value="",m.innerHTML='<span style="color:var(--success);">Key successfully generated! <strong>'+$.key.key_value+"</strong> Make sure to copy it now.</span>",m.style.display="block",x()}catch($){m.innerHTML='<span style="color:var(--error);">'+$.message+"</span>",m.style.display="block"}finally{n.disabled=!1}}),x();const f=a.querySelectorAll(".tab"),r=a.querySelector("#generalSection"),p=a.querySelector("#apiKeysSection"),d=a.querySelector("#teamSection"),c=a.querySelector("#webhooksSection"),y=a.querySelector("#notificationsSection");f.forEach(w=>{w.addEventListener("click",()=>{f.forEach(h=>h.classList.remove("active")),w.classList.add("active");const n=w.getAttribute("data-tab");[r,p,d,c,y].forEach(h=>{h&&(h.style.display="none")}),n==="general"?(r&&(r.style.display="block"),p&&(p.style.display="block")):n==="team"?(d&&(d.style.display="block"),k()):n==="webhooks"?c&&(c.style.display="block"):n==="notifications"&&y&&(y.style.display="block")})});const C=a.querySelector("#orgListContainer"),S=a.querySelector("#createOrgForm"),l=a.querySelector("#createOrgError");async function k(){try{const w=await W.list();if(!w.organizations||w.organizations.length===0){C.innerHTML='<div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">No organizations yet. Create one above!</div>';return}C.innerHTML=w.organizations.map(n=>`
          < div class="card" style = "padding:var(--space-lg);margin-bottom:var(--space-md);" >
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md);">
            <div>
              <div style="font-weight:700;font-size:1.1rem;">${n.name}</div>
              <div style="font-size:0.75rem;color:var(--text-tertiary);">Your role: <span class="badge badge-${n.role==="owner"?"success":n.role==="admin"?"info":"neutral"}">${n.role}</span></div>
            </div>
            <div style="display:flex;gap:var(--space-xs);">
              <button class="btn btn-ghost btn-sm view-members-btn" data-id="${n.id}" data-role="${n.role}">👥 Members</button>
              ${n.role==="owner"?`<button class="btn btn-ghost btn-sm delete-org-btn" style="color:var(--error);" data-id="${n.id}">🗑️</button>`:""}
            </div>
          </div>
          <div id="members-${n.id}" style="display:none;"></div>
        </div >
          `).join(""),a.querySelectorAll(".view-members-btn").forEach(n=>{n.addEventListener("click",async()=>{const h=n.dataset.id,E=n.dataset.role,$=a.querySelector(`#members - ${h} `);if($.style.display==="block"){$.style.display="none";return}$.style.display="block",$.innerHTML='<div style="color:var(--text-tertiary);">Loading...</div>';try{const R=await W.members(h),H=["owner","admin"].includes(E);$.innerHTML=`
              ${H?`
                <div style="margin-bottom:var(--space-md);padding:var(--space-sm);background:var(--bg-secondary);border-radius:var(--radius-md);">
                  <form class="invite-form" data-org-id="${h}" style="display:flex;gap:var(--space-xs);align-items:center;flex-wrap:wrap;">
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
              `:""}
        <div class="members-list">
          ${R.members.map(A=>`
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-sm) 0;border-bottom:1px solid var(--border-subtle);">
                    <div style="display:flex;align-items:center;gap:var(--space-sm);">
                      ${A.avatar_url?`<img src="${A.avatar_url}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" />`:`<div class="avatar" style="width:28px;height:28px;font-size:12px;">${(A.display_name||A.email||"?")[0].toUpperCase()}</div>`}
                      <div>
                        <div style="font-weight:500;font-size:0.875rem;">${A.display_name||"Unnamed"}</div>
                        <div style="font-size:0.75rem;color:var(--text-tertiary);">${A.email}</div>
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:var(--space-xs);">
                      <span class="badge badge-${A.role==="owner"?"success":A.role==="admin"?"info":"neutral"}">${A.role}</span>
                      ${H&&A.role!=="owner"?`<button class="btn btn-ghost btn-sm remove-member-btn" data-org-id="${h}" data-user-id="${A.user_id}" style="color:var(--error);font-size:0.75rem;">✕</button>`:""}
                    </div>
                  </div>
                `).join("")}
        </div>
        `;const G=$.querySelector(".invite-form");G&&G.addEventListener("submit",async A=>{A.preventDefault();const X=G.querySelector('input[type="email"]'),Z=G.querySelector("select"),Q=$.querySelector(".invite-error");Q.style.display="none";try{await W.invite(h,X.value.trim(),Z.value),X.value="",n.click(),n.click()}catch(be){Q.innerText=be.message,Q.style.display="block"}}),$.querySelectorAll(".remove-member-btn").forEach(A=>{A.addEventListener("click",async()=>{if(confirm("Remove this member?"))try{await W.removeMember(A.dataset.orgId,A.dataset.userId),n.click(),n.click()}catch(X){alert(X.message)}})})}catch(R){$.innerHTML=`< div style = "color:var(--error);" > ${R.message}</div > `}})}),a.querySelectorAll(".delete-org-btn").forEach(n=>{n.addEventListener("click",async()=>{if(confirm("Delete this organization? All associated team access will be lost."))try{await W.delete(n.dataset.id),k()}catch(h){alert(h.message)}})})}catch(w){C.innerHTML=`< div style = "color:var(--error);padding:var(--space-md);" > ${w.message}</div > `}}S&&S.addEventListener("submit",async w=>{w.preventDefault();const n=a.querySelector("#newOrgName");l.style.display="none";try{await W.create(n.value.trim()),n.value="",k()}catch(h){l.innerText=h.message,l.style.display="block"}});const j=a.querySelector("#webhooksListContainer"),P=a.querySelector("#webhookForm"),M=a.querySelector("#webhookUrlInput"),D=a.querySelector("#addWebhookBtn"),L=a.querySelector("#webhookErrorMsg");async function N(){try{const w=await te.list();if(!w.webhooks||w.webhooks.length===0){j.innerHTML='<div style="text-align:center;padding:var(--space-xl);color:var(--text-tertiary);">No webhooks configured.</div>';return}j.innerHTML=w.webhooks.map(n=>`
          < div class="card" style = "padding:var(--space-md);display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);" >
          <div>
            <div style="font-weight:500;">${n.url}</div>
            <div style="font-size:0.75rem;color:var(--text-tertiary);">Added ${new Date(n.created_at).toLocaleDateString()}</div>
          </div>
          <button class="btn btn-ghost delete-webhook-btn" style="color:var(--error);" data-id="${n.id}">Remove</button>
        </div >
          `).join(""),a.querySelectorAll(".delete-webhook-btn").forEach(n=>{n.addEventListener("click",async h=>{if(!confirm("Remove this webhook?"))return;const E=h.target.getAttribute("data-id");n.disabled=!0;try{await te.delete(E),N()}catch($){alert("Failed to delete: "+$.message),n.disabled=!1}})})}catch(w){j.innerHTML=`< div style = "color:var(--error);padding:var(--space-md);" > ${w.message}</div > `}}P&&(P.addEventListener("submit",async w=>{w.preventDefault(),D.disabled=!0,L.style.display="none";try{await te.add(M.value),M.value="",N()}catch(n){L.innerText=n.message,L.style.display="block"}finally{D.disabled=!1}}),N());const T=a.querySelector("#avatarUploadTrigger"),I=a.querySelector("#avatarFileInput"),_=a.querySelector("#avatarUploadMsg");T&&I&&(T.addEventListener("click",()=>I.click()),I.addEventListener("change",async w=>{const n=w.target.files[0];if(n){if(!n.type.startsWith("image/")){_.innerText="Please select an image file.",_.style.color="var(--error)",_.style.display="block";return}_.innerText="Uploading...",_.style.color="var(--text-tertiary)",_.style.display="block";try{const h=new Image,E=new FileReader;E.onload=()=>{h.onload=async()=>{const $=document.createElement("canvas");$.width=128,$.height=128;const R=$.getContext("2d"),H=Math.min(h.width,h.height),G=(h.width-H)/2,A=(h.height-H)/2;R.drawImage(h,G,A,H,H,0,0,128,128);const X=$.toDataURL("image/jpeg",.85);try{await F.uploadAvatar(X),_.innerText="Avatar updated!",_.style.color="var(--success)",setTimeout(()=>{e.innerHTML="",ge(e)},800)}catch(Z){_.innerText=Z.message||"Upload failed",_.style.color="var(--error)"}},h.src=E.result},E.readAsDataURL(n)}catch{_.innerText="Failed to process image.",_.style.color="var(--error)"}}}));const z=a.querySelector("#saveSettingsBtn"),O=a.querySelector("#displayNameInput"),q=a.querySelector("#settingsResultMsg");z&&O&&q&&z.addEventListener("click",async()=>{z.disabled=!0,z.innerText="Saving...";try{await F.update({display_name:O.value}),q.style.display="block",q.innerText="Saved successfully!",q.style.color="var(--success)",setTimeout(()=>{q.style.display="none"},3e3)}catch(w){q.style.display="block",q.innerText=w.message||"Failed to update",q.style.color="var(--error)"}finally{z.disabled=!1,z.innerText="Save Changes"}})}function Re(e){const s=K("cli",`
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
  `);e.appendChild(s)}function Ue(){const e=document.createElement("div");e.className="support-page max-w-4xl mx-auto space-y-6";const t=B.get("user"),s=t.email==="myonlyfriendischatgpt@gmail.com"||t.email==="guy@chronos.dev";let a=`
        <div class="card p-6">
            <h2 class="text-2xl font-bold mb-2">Report a Bug</h2>
            <p class="text-gray-400 mb-6">Describe the issue you're facing. Our engineering team will review it shortly!</p>
            
            <form id="bug-form" class="space-y-4">
                <div class="form-group">
                    <label class="form-label">Issue Title</label>
                    <input type="text" id="bug-title" class="form-input" placeholder="e.g. Build silently failed" required />
                </div>
                
                <div class="form-group">
                    <label class="form-label">Detailed Description</label>
                    <textarea id="bug-desc" class="form-input" rows="6" placeholder="What were you doing when the bug occurred? Please include any error codes." required></textarea>
                </div>
                
                <div class="form-actions" style="margin-top: 1rem;">
                    <button type="submit" class="btn btn-primary" id="submit-btn">Submit Report</button>
                    <div id="bug-status" class="text-sm mt-3" style="display:none;"></div>
                </div>
            </form>
        </div>
    `;s&&(a+=`
            <div class="card p-6 mt-8">
                <div class="flex-between mb-4">
                    <h2 class="text-xl font-bold">[Admin] Global Support Tickets</h2>
                    <button class="btn btn-ghost btn-sm" id="refresh-admin-btn">Refresh</button>
                </div>
                <div id="admin-tickets-container">Loading tickets...</div>
            </div>
        `),e.innerHTML=a;const i=e.querySelector("#bug-form"),o=e.querySelector("#submit-btn"),m=e.querySelector("#bug-status");return i.addEventListener("submit",async v=>{v.preventDefault();const g=e.querySelector("#bug-title").value.trim(),b=e.querySelector("#bug-desc").value.trim();if(!(!g||!b)){o.disabled=!0,o.textContent="Submitting...",m.style.display="none";try{await ie.submit(g,b),m.textContent="✅ Bug report submitted successfully! Thank you.",m.className="text-green-500 text-sm mt-3 font-medium",m.style.display="block",i.reset()}catch(x){m.textContent="❌ Failed to submit: "+x.message,m.className="text-red-500 text-sm mt-3",m.style.display="block"}finally{o.disabled=!1,o.textContent="Submit Report"}}}),s&&(re(e),e.querySelector("#refresh-admin-btn").addEventListener("click",()=>re(e))),e}async function re(e){const t=e.querySelector("#admin-tickets-container");t.innerHTML='<div class="text-gray-400">Fetching active tickets...</div>';try{const s=await ie.listAll();if(s.length===0){t.innerHTML='<div class="text-green-500 border border-green-500/20 bg-green-500/10 p-4 rounded text-center">Inbox Zero! No bugs reported.</div>';return}let a='<div class="space-y-4">';s.forEach(i=>{const o=i.status==="resolved";a+=`
                <div class="border border-[var(--border-color)] rounded p-4 ${o?"opacity-50":"bg-[var(--bg-layer-2)]"}">
                    <div class="flex-between mb-2">
                        <div class="font-semibold text-lg">${i.title}</div>
                        <span class="badge ${o?"badge-success":"badge-warning"}">${i.status.toUpperCase()}</span>
                    </div>
                    <div class="text-sm text-gray-400 mb-2">Reporter: ${i.email} (${i.display_name})</div>
                    <div class="bg-[var(--bg-card)] p-3 rounded text-sm text-[var(--text-secondary)] whitespace-pre-wrap">${i.description}</div>
                    
                    ${o?"":`
                        <div class="flex justify-end mt-3">
                            <button class="btn btn-outline btn-sm resolve-btn" data-id="${i.id}">Mark Resolved</button>
                        </div>
                    `}
                </div>
            `}),a+="</div>",t.innerHTML=a,t.querySelectorAll(".resolve-btn").forEach(i=>{i.addEventListener("click",async o=>{const m=o.target.getAttribute("data-id");o.target.disabled=!0,o.target.textContent="Resolving...";try{await ie.resolve(m),re(e)}catch(v){o.target.textContent="Error",console.error(v)}})})}catch(s){t.innerHTML=`<div class="text-red-500">Failed to load admin tickets: ${s.message}</div>`}}function Ke(e){e.appendChild(K("support",Ue()))}const Ge=document.getElementById("app");function U(e){return async t=>{if(!xe()&&!await ye()){window.location.hash="#/login";return}e(t)}}const Xe={"/":e=>ke(e),"/login":e=>$e(e),"/dashboard":U(e=>_e(e)),"/projects":U(e=>Pe(e)),"/builds":U(e=>De(e)),"/credentials":U(e=>He(e)),"/billing":U(e=>Fe(e)),"/settings":U(e=>ge(e)),"/cli":U(e=>Re(e)),"/support":U(e=>Ke(e))};ye().then(()=>{new he(Xe,Ge)});
