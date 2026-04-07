import { createDashboardLayout } from '../components/layout.js';
import { support } from '../api.js';
import { store } from '../store.js';

function renderSupportPage() {
    const $page = document.createElement('div');
    $page.className = 'support-page max-w-4xl mx-auto space-y-6';

    const user = store.get('user');
    const isAdmin = user.email === 'myonlyfriendischatgpt@gmail.com' || user.email === 'guy@chronos.dev';

    let html = `
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
    `;

    if (isAdmin) {
        html += `
            <div class="card p-6 mt-8">
                <div class="flex-between mb-4">
                    <h2 class="text-xl font-bold">[Admin] Global Support Tickets</h2>
                    <button class="btn btn-ghost btn-sm" id="refresh-admin-btn">Refresh</button>
                </div>
                <div id="admin-tickets-container">Loading tickets...</div>
            </div>
        `;
    }

    $page.innerHTML = html;

    // Handle Form Submit
    const form = $page.querySelector('#bug-form');
    const submitBtn = $page.querySelector('#submit-btn');
    const statusDiv = $page.querySelector('#bug-status');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = $page.querySelector('#bug-title').value.trim();
        const desc = $page.querySelector('#bug-desc').value.trim();

        if (!title || !desc) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        statusDiv.style.display = 'none';

        try {
            await support.submit(title, desc);
            statusDiv.textContent = '✅ Bug report submitted successfully! Thank you.';
            statusDiv.className = 'text-green-500 text-sm mt-3 font-medium';
            statusDiv.style.display = 'block';
            form.reset();
        } catch (err) {
            statusDiv.textContent = '❌ Failed to submit: ' + err.message;
            statusDiv.className = 'text-red-500 text-sm mt-3';
            statusDiv.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
        }
    });

    // Load Admin Tickets
    if (isAdmin) {
        loadAdminTickets($page);
        $page.querySelector('#refresh-admin-btn').addEventListener('click', () => loadAdminTickets($page));
    }

    return $page;
}

async function loadAdminTickets($page) {
    const container = $page.querySelector('#admin-tickets-container');
    container.innerHTML = '<div class="text-gray-400">Fetching active tickets...</div>';

    try {
        const bugs = await support.listAll();

        if (bugs.length === 0) {
            container.innerHTML = '<div class="text-green-500 border border-green-500/20 bg-green-500/10 p-4 rounded text-center">Inbox Zero! No bugs reported.</div>';
            return;
        }

        let html = '<div class="space-y-4">';
        bugs.forEach(bug => {
            const isResolved = bug.status === 'resolved';
            html += `
                <div class="border border-[var(--border-color)] rounded p-4 ${isResolved ? 'opacity-50' : 'bg-[var(--bg-layer-2)]'}">
                    <div class="flex-between mb-2">
                        <div class="font-semibold text-lg">${bug.title}</div>
                        <span class="badge ${isResolved ? 'badge-success' : 'badge-warning'}">${bug.status.toUpperCase()}</span>
                    </div>
                    <div class="text-sm text-gray-400 mb-2">Reporter: ${bug.email} (${bug.display_name})</div>
                    <div class="bg-[var(--bg-card)] p-3 rounded text-sm text-[var(--text-secondary)] whitespace-pre-wrap">${bug.description}</div>
                    
                    ${!isResolved ? `
                        <div class="flex justify-end mt-3">
                            <button class="btn btn-outline btn-sm resolve-btn" data-id="${bug.id}">Mark Resolved</button>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;

        // Bind resolve buttons
        container.querySelectorAll('.resolve-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                e.target.disabled = true;
                e.target.textContent = 'Resolving...';
                try {
                    await support.resolve(id);
                    loadAdminTickets($page); // Reload list
                } catch (err) {
                    e.target.textContent = 'Error';
                    console.error(err);
                }
            });
        });

    } catch (err) {
        container.innerHTML = `<div class="text-red-500">Failed to load admin tickets: ${err.message}</div>`;
    }
}

export function renderSupport(container) {
    container.appendChild(createDashboardLayout('support', renderSupportPage()));
}
