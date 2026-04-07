// Billing page — custom credit amounts, $5 minimum
import { createDashboardLayout } from '../components/layout.js';
import { credits, CONFIG } from '../api.js';

export function renderBilling(container) {
  const content = `
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
          <div class="text-primary-xl">$${CONFIG.COST_PER_BUILD.toFixed(2)}</div>
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
  `;

  const layout = createDashboardLayout('billing', content);
  container.appendChild(layout);

  // Elements
  const balanceEl = container.querySelector('#creditBalance');
  const buildCountEl = container.querySelector('#buildCount');
  const amountInput = container.querySelector('#customAmount');
  const estimateEl = container.querySelector('#buildEstimate');
  const purchaseBtn = container.querySelector('#purchaseBtn');
  const errorDiv = container.querySelector('#purchaseError');
  const successDiv = container.querySelector('#purchaseSuccess');
  const historyEl = container.querySelector('#transactionHistory');

  // Update build estimate when amount changes
  amountInput.addEventListener('input', () => {
    const amount = parseFloat(amountInput.value) || 0;
    const builds = Math.floor(amount / 0.50);
    estimateEl.textContent = `= ${builds} build${builds !== 1 ? 's' : ''}`;
  });

  // Quick amount buttons
  container.querySelectorAll('.quick-amount').forEach(btn => {
    btn.addEventListener('click', () => {
      amountInput.value = btn.dataset.amount;
      amountInput.dispatchEvent(new Event('input'));
    });
  });

  // Purchase credits
  purchaseBtn.addEventListener('click', async () => {
    const amount = parseFloat(amountInput.value);
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    if (!amount || amount < 5) {
      errorDiv.textContent = 'Minimum purchase is $5';
      errorDiv.style.display = 'block';
      return;
    }

    purchaseBtn.disabled = true;
    purchaseBtn.textContent = 'Processing...';

    try {
      const result = await credits.purchase(amount);
      if (result.checkout_url) {
        window.open(result.checkout_url, '_blank');
        successDiv.textContent = 'Redirecting to Stripe checkout... Complete payment in the new tab.';
        successDiv.style.display = 'block';
      }
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    }

    purchaseBtn.disabled = false;
    purchaseBtn.textContent = 'Purchase Credits';
  });

  // Load balance
  loadBalance();
  loadHistory();

  async function loadBalance() {
    try {
      const info = await credits.balance();
      balanceEl.innerHTML = `<span class="text-gradient">$${info.balance.toFixed(2)}</span>`;
      buildCountEl.textContent = `${info.available_builds} builds available`;
    } catch {
      balanceEl.innerHTML = '<span class="text-gradient">$0.00</span>';
      buildCountEl.textContent = '0 builds available';
    }
  }

  async function loadHistory() {
    try {
      const data = await credits.history();
      if (data.transactions.length === 0) {
        historyEl.innerHTML = `
          <div class="card" style="padding:var(--space-lg);">
            <div class="empty-state">
              <div class="empty-state-icon">💳</div>
              <div class="empty-state-title">No transactions yet</div>
              <div class="empty-state-desc">Purchase credits above to get started.</div>
            </div>
          </div>
        `;
        return;
      }

      historyEl.innerHTML = `
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
              ${data.transactions.map(t => `
                <tr>
                  <td>${new Date(t.created_at).toLocaleDateString()}</td>
                  <td><span class="badge ${t.type === 'purchase' ? 'badge-success' : t.type === 'refund' ? 'badge-info' : 'badge-neutral'}">${t.type}</span></td>
                  <td style="color:var(--text-primary);">${t.description}</td>
                  <td style="font-weight:600;color:${t.amount > 0 ? 'var(--success)' : 'var(--text-secondary)'};">
                    ${t.amount > 0 ? '+' : ''}$${Math.abs(t.amount).toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch {
      historyEl.innerHTML = `
        <div class="card" style="padding:var(--space-lg);">
          <div class="empty-state">
            <div class="empty-state-icon">💳</div>
            <div class="empty-state-title">No transactions yet</div>
            <div class="empty-state-desc">Purchase credits above to get started.</div>
          </div>
        </div>
      `;
    }
  }

}
