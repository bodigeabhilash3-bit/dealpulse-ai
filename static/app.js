// DealPulse AI Frontend Application

let currentDeals = [];

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadDashboard();
    loadMemoryStats();
});

// Navigation Handling
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.getAttribute('data-view');
            switchView(viewId);
        });
    });
}

function switchView(viewId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));

    const navBtn = document.getElementById(`nav-${viewId}`);
    const viewEl = document.getElementById(`view-${viewId}`);

    if (navBtn) navBtn.classList.add('active');
    if (viewEl) viewEl.classList.add('active');

    if (viewId === 'deals') loadPipelineBoard();
    if (viewId === 'coach') populateCoachDeals();
    if (viewId === 'memory') {
        populateTimelineDeals();
        loadMemoryStats();
    }
    if (viewId === 'ingest') populateIngestDeals();
}

// Load Dashboard Data
async function loadDashboard() {
    try {
        const res = await fetch('/api/deals');
        const data = await res.json();
        currentDeals = data.deals || [];

        renderStats();
        renderDashboardDeals();
    } catch (err) {
        console.error('Failed to load deals:', err);
    }
}

async function loadMemoryStats() {
    try {
        const res = await fetch('/api/memory/stats');
        const stats = await res.json();

        const countEl = document.getElementById('memory-count');
        if (countEl) countEl.innerText = `${stats.total_memories || 0} facts active`;

        const statMem = document.getElementById('stat-memories');
        if (statMem) statMem.innerText = stats.total_memories || 0;

        const statCalls = document.getElementById('stat-calls');
        if (statCalls) statCalls.innerText = stats.total_calls || 0;

        // Update memory inspector cards
        if (document.getElementById('bank-deals-count')) {
            document.getElementById('bank-deals-count').innerText = stats.banks['dealpulse-deals'] || 0;
            document.getElementById('bank-playbook-count').innerText = stats.banks['dealpulse-playbook'] || 0;
            document.getElementById('bank-competitors-count').innerText = stats.banks['dealpulse-competitors'] || 0;
        }
    } catch (err) {
        console.error('Failed to load memory stats:', err);
    }
}

function renderStats() {
    const totalVal = currentDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);
    const pipeEl = document.getElementById('stat-pipeline');
    const dealsEl = document.getElementById('stat-deals');

    if (pipeEl) pipeEl.innerText = `$${(totalVal / 1000).toFixed(0)}k`;
    if (dealsEl) dealsEl.innerText = currentDeals.length;
}

function renderDashboardDeals() {
    const container = document.getElementById('dashboard-deals');
    if (!container) return;

    container.innerHTML = currentDeals.map(deal => `
        <div class="deal-card" onclick="openDealDetail('${deal.id}')">
            <div class="deal-card-header">
                <div>
                    <h4 class="deal-card-title">${deal.deal_name}</h4>
                    <span class="deal-card-company">${deal.company}</span>
                </div>
                <span class="deal-badge stage-${deal.stage.replace(/\s+/g, '')}">${deal.stage}</span>
            </div>
            <div class="deal-tags">
                <span class="deal-tag">${deal.stakeholders ? deal.stakeholders.length : 0} Stakeholders</span>
                <span class="deal-tag">${deal.calls ? deal.calls.length : 0} Calls logged</span>
                <span class="deal-tag">${deal.days_in_pipeline}d in pipe</span>
            </div>
            <div class="deal-meta">
                <span class="deal-value">$${Number(deal.deal_value).toLocaleString()}</span>
                <div class="deal-health">
                    <span style="font-size:0.75rem; color:var(--text-secondary)">Health: ${deal.health_score}%</span>
                    <div class="health-bar-container">
                        <div class="health-bar ${deal.health_score > 70 ? 'health-high' : deal.health_score > 40 ? 'health-mid' : 'health-low'}" style="width: ${deal.health_score}%"></div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Pipeline Board
async function loadPipelineBoard() {
    try {
        const res = await fetch('/api/pipeline');
        const data = await res.json();
        const board = document.getElementById('pipeline-board');
        if (!board) return;

        board.innerHTML = Object.entries(data.stages).map(([stageName, deals]) => `
            <div class="pipeline-col">
                <div class="pipeline-col-header">
                    <span class="pipeline-col-title">${stageName}</span>
                    <span class="pipeline-col-count">${deals.length}</span>
                </div>
                <div class="pipeline-cards">
                    ${deals.map(d => `
                        <div class="pipeline-item" onclick="openDealDetail('${d.id}')">
                            <strong style="display:block; margin-bottom:4px; font-size:0.9rem;">${d.name}</strong>
                            <div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:6px;">${d.company}</div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight:700; color:var(--accent-cyan); font-size:0.85rem;">$${Number(d.value).toLocaleString()}</span>
                                <span style="font-size:0.75rem; color:var(--text-muted);">${d.health_score}% health</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load pipeline:', err);
    }
}

// Deal Details Modal & Briefing
async function openDealDetail(dealId) {
    const deal = currentDeals.find(d => d.id === dealId);
    if (!deal) return;

    const modal = document.getElementById('deal-modal');
    const content = document.getElementById('deal-modal-content');

    content.innerHTML = `
        <h2 style="margin-bottom:8px;">${deal.deal_name}</h2>
        <p style="color:var(--text-secondary); margin-bottom:18px;">${deal.company} &bull; Stage: <strong style="color:var(--accent-cyan)">${deal.stage}</strong></p>
        
        <div style="display:flex; gap:12px; margin-bottom:20px;">
            <button class="btn btn-primary" onclick="generatePreCallBrief('${deal.id}')">⚡ Generate Memory Briefing</button>
        </div>

        <h4 style="margin:16px 0 8px;">Key Stakeholders:</h4>
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:20px;">
            ${(deal.stakeholders || []).map(s => `
                <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between;">
                    <span><strong>${s.name}</strong> (${s.role})</span>
                    <span style="color:var(--accent-emerald)">${s.sentiment}</span>
                </div>
            `).join('')}
        </div>

        <h4 style="margin:16px 0 8px;">Past Call Summaries:</h4>
        <div style="display:flex; flex-direction:column; gap:10px; max-height:220px; overflow-y:auto;">
            ${(deal.calls || []).map(c => `
                <div style="background:rgba(255,255,255,0.02); border-left:3px solid var(--primary); padding:8px 12px; border-radius:4px;">
                    <div style="font-size:0.8rem; color:var(--text-muted)">Call #${c.call_number} - ${c.date} with ${c.stakeholder}</div>
                    <div style="font-size:0.85rem; margin-top:4px;">${c.summary}</div>
                </div>
            `).join('')}
        </div>

        <div id="briefing-box" style="margin-top:20px;"></div>
    `;

    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('deal-modal').style.display = 'none';
}

async function generatePreCallBrief(dealId) {
    const box = document.getElementById('briefing-box');
    box.innerHTML = `<div style="color:var(--accent-cyan); padding:12px; background:rgba(0,210,255,0.1); border-radius:8px;">🧠 Recalling Hindsight memories and preparing executive briefing...</div>`;

    try {
        const res = await fetch(`/api/deal-brief?deal_id=${dealId}`, { method: 'POST' });
        const data = await res.json();
        box.innerHTML = `
            <div style="background:rgba(108,92,231,0.15); border:1px solid var(--border-accent); border-radius:8px; padding:16px; margin-top:10px;">
                <h4 style="color:var(--primary-light); margin-bottom:10px;">📋 Pre-Call Executive Briefing</h4>
                <div style="font-size:0.88rem; line-height:1.6; white-space: pre-wrap;">${data.brief}</div>
            </div>
        `;
    } catch (err) {
        box.innerHTML = `<div style="color:var(--accent-rose)">Failed to generate briefing.</div>`;
    }
}

// Coach Populate & Execution
function populateCoachDeals() {
    const sel = document.getElementById('coach-deal-select');
    if (!sel || sel.options.length > 1) return;
    currentDeals.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.innerText = `${d.deal_name} (${d.company})`;
        sel.appendChild(opt);
    });
}

function quickObjection(text) {
    document.getElementById('coach-objection').value = text;
    if (!document.getElementById('coach-deal-select').value && currentDeals.length > 0) {
        document.getElementById('coach-deal-select').value = currentDeals[0].id;
    }
}

async function submitObjection() {
    const dealId = document.getElementById('coach-deal-select').value;
    const role = document.getElementById('coach-role').value;
    const objection = document.getElementById('coach-objection').value;
    const context = document.getElementById('coach-context').value;

    if (!dealId || !objection) {
        alert('Please select a deal and enter an objection');
        return;
    }

    const empty = document.getElementById('coach-empty');
    const loading = document.getElementById('coach-loading');
    const result = document.getElementById('coach-result');

    if (empty) empty.style.display = 'none';
    if (result) result.style.display = 'none';
    if (loading) loading.style.display = 'block';

    try {
        const res = await fetch('/api/objection-coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deal_id: dealId,
                objection: objection,
                stakeholder_role: role,
                context: context
            })
        });

        const data = await res.json();
        if (loading) loading.style.display = 'none';
        if (result) {
            result.style.display = 'block';
            document.getElementById('memory-used-count').innerText = `${data.memories_used} Memories Recalled`;
            document.getElementById('coach-result-content').innerHTML = markedParse(data.response);

            const sourcesEl = document.getElementById('memory-sources');
            sourcesEl.innerHTML = `
                <span class="chip">📁 Deal History: ${data.memory_sources.deal_history} recalled</span>
                <span class="chip">📖 Playbook: ${data.memory_sources.playbook} recalled</span>
                <span class="chip">⚔️ Competitive Intel: ${data.memory_sources.competitive_intel} recalled</span>
            `;
        }
        loadMemoryStats();
    } catch (err) {
        if (loading) loading.style.display = 'none';
        alert('Error getting coach guidance: ' + err.message);
    }
}

// Memory Inspector
function populateTimelineDeals() {
    const sel = document.getElementById('timeline-deal-select');
    if (!sel || sel.options.length > 1) return;
    currentDeals.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.innerText = `${d.deal_name} (${d.company})`;
        sel.appendChild(opt);
    });
}

async function loadTimeline() {
    const dealId = document.getElementById('timeline-deal-select').value;
    if (!dealId) return;

    try {
        const res = await fetch(`/api/memory/timeline/${dealId}`);
        const data = await res.json();
        const container = document.getElementById('memory-timeline');

        if (!data.timeline || data.timeline.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted); padding:10px 0;">No episodic interactions recorded for this deal yet.</p>';
            return;
        }

        container.innerHTML = data.timeline.map(item => `
            <div class="timeline-item">
                <div class="timeline-date">${item.date} &bull; ${item.role}</div>
                <div class="timeline-title">${item.title}</div>
                <div class="timeline-desc">${item.description}</div>
                ${item.objections && item.objections.length > 0 ? `
                    <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
                        ${item.objections.map(o => `<span class="deal-tag" style="color:var(--accent-rose); border-color:rgba(244,63,94,0.3)">⚠️ ${o}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load timeline:', err);
    }
}

async function searchMemory() {
    const query = document.getElementById('memory-search-input').value;
    const bank = document.getElementById('memory-bank-select').value;
    const container = document.getElementById('memory-search-results');

    if (!query) return;
    container.innerHTML = '<p style="color:var(--accent-cyan); padding:10px 0;">Searching memory banks...</p>';

    try {
        const res = await fetch('/api/memory/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query, bank_id: bank })
        });
        const data = await res.json();

        if (!data.results || data.results.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted); padding:10px 0;">No matching memories found for this query.</p>';
            return;
        }

        container.innerHTML = data.results.map(r => {
            const content = typeof r === 'string' ? r : (r.content || JSON.stringify(r));
            return `
                <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; padding:12px; margin-top:8px;">
                    <div style="font-size:0.85rem; color:var(--text-primary); white-space:pre-wrap;">${content}</div>
                </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = `<p style="color:var(--accent-rose)">Search error: ${err.message}</p>`;
    }
}

// Ingest Call
function populateIngestDeals() {
    const sel = document.getElementById('ingest-deal-select');
    if (!sel || sel.options.length > 1) return;
    currentDeals.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.innerText = `${d.deal_name} (${d.company})`;
        sel.appendChild(opt);
    });
}

async function ingestCall() {
    const dealId = document.getElementById('ingest-deal-select').value;
    const stakeholder = document.getElementById('ingest-stakeholder').value;
    const role = document.getElementById('ingest-role').value;
    const transcript = document.getElementById('ingest-transcript').value;
    const objectionsRaw = document.getElementById('ingest-objections').value;
    const competitorsRaw = document.getElementById('ingest-competitors').value;

    if (!dealId || !stakeholder || !transcript) {
        alert('Please fill in Deal, Stakeholder, and Transcript');
        return;
    }

    const objections = objectionsRaw ? objectionsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    const competitors = competitorsRaw ? competitorsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    try {
        const res = await fetch(`/api/deals/${dealId}/calls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deal_id: dealId,
                call_number: 5,
                stakeholder_name: stakeholder,
                stakeholder_role: role,
                transcript: transcript,
                objections: objections,
                competitors_mentioned: competitors,
                action_items: []
            })
        });

        const data = await res.json();
        const resultCard = document.getElementById('ingest-result');
        const details = document.getElementById('ingest-result-details');

        resultCard.style.display = 'block';
        details.innerHTML = `
            <p style="margin-top:8px; font-size:0.9rem; color:var(--accent-cyan);">${data.memories_stored} new memories retained into Hindsight.</p>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">Deal updated. Head back to Dashboard or Objection Coach to see real-time learning in action.</p>
        `;

        loadDashboard();
        loadMemoryStats();
    } catch (err) {
        alert('Failed to ingest call: ' + err.message);
    }
}

// Basic markdown formatter helper
function markedParse(text) {
    if (!text) return '';
    return text
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/\n\n/gim, '<p></p>')
        .replace(/\n/gim, '<br>');
}
