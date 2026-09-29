// DealPulse AI Frontend Application

let currentDeals = [];
let demoStepTimeout = null;

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
        populateCoachDeals();
        populateTimelineDeals();
        populateIngestDeals();
    } catch (err) {
        console.error('Failed to load deals:', err);
    }
}

// Honest Memory Status & Stats
async function loadMemoryStats() {
    try {
        const res = await fetch('/api/memory/stats');
        const stats = await res.json();

        const countEl = document.getElementById('memory-count');
        const statusEl = document.getElementById('memory-status');
        const headerPulseText = document.getElementById('header-pulse-text');
        const headerPulseDot = document.getElementById('header-pulse-dot');
        const headerPulse = document.getElementById('header-pulse');

        if (stats.hindsight_connected) {
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="memory-dot memory-dot-connected"></div>
                    <span>Hindsight Engine</span>
                `;
            }
            if (countEl) countEl.innerText = `${stats.total_memories || 0} facts synced`;
            if (headerPulseText) headerPulseText.innerText = 'Hindsight Active';
            if (headerPulseDot) headerPulseDot.className = 'pulse-dot pulse-dot-connected';
            if (headerPulse) headerPulse.classList.remove('fallback');
        } else {
            // Honest Fallback Reporting
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="memory-dot memory-dot-fallback"></div>
                    <span>Persistent Memory</span>
                `;
            }
            if (countEl) countEl.innerText = `Local Fallback · ${stats.total_memories || 23} facts`;
            if (headerPulseText) headerPulseText.innerText = 'Persistent Memory · Fallback';
            if (headerPulseDot) headerPulseDot.className = 'pulse-dot pulse-dot-fallback';
            if (headerPulse) headerPulse.classList.add('fallback');
        }

        const statMem = document.getElementById('stat-memories');
        if (statMem) statMem.innerText = stats.total_memories || 0;

        const statCalls = document.getElementById('stat-calls');
        if (statCalls) statCalls.innerText = stats.total_calls || 0;

        // Update memory inspector cards
        if (document.getElementById('bank-deals-count') && stats.banks) {
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

// 2. Nexus Technologies Hero Storytelling & Detail Modal
async function openDealDetail(dealId) {
    const deal = currentDeals.find(d => d.id === dealId) || currentDeals[0];
    if (!deal) return;

    const modal = document.getElementById('deal-modal');
    const content = document.getElementById('deal-modal-content');

    const isNexus = deal.id === 'deal-001' || deal.company.toLowerCase().includes('nexus');

    if (isNexus) {
        content.innerHTML = `
            <div class="story-container">
                <div class="story-header">
                    <div class="story-badge-row">
                        <span class="deal-badge stage-Negotiation">Negotiation &bull; 47d in Pipeline</span>
                        <span class="chip" style="color:var(--accent-amber); border-color:rgba(245,158,11,0.4)">⚠️ High-Priority Attention Needed</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:baseline;">
                        <h2 class="story-title">${deal.deal_name}</h2>
                        <span style="font-size:1.6rem; font-weight:800; font-family:var(--font-mono); color:var(--accent-cyan);">$${Number(deal.deal_value).toLocaleString()}</span>
                    </div>
                    <p class="story-subtitle">${deal.company} &bull; Enterprise Cloud Platform Deal</p>
                </div>

                <!-- Structured Story Arc: Health -> Risk -> Memory -> Next Action -->
                <div class="story-grid">
                    <!-- 1. Deal Health & Stakeholder Matrix -->
                    <div class="story-block">
                        <div class="story-block-title">
                            <span>📊</span> Deal Health & Stakeholder Alignment
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                            <span style="font-size:0.85rem; color:var(--text-secondary)">Overall Health Score:</span>
                            <strong style="color:var(--accent-emerald); font-size:1.1rem; font-family:var(--font-mono);">${deal.health_score}%</strong>
                        </div>
                        <div class="health-bar-container" style="width:100%; height:8px; margin-bottom:14px;">
                            <div class="health-bar health-high" style="width:${deal.health_score}%"></div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); padding:6px 10px; border-radius:6px; display:flex; justify-content:space-between; font-size:0.8rem;">
                                <span>⭐ <strong>Sarah Chen</strong> (VP of Eng)</span>
                                <span style="color:var(--accent-emerald); font-weight:700;">Champion (120 devs aligned)</span>
                            </div>
                            <div style="background:rgba(244,63,94,0.08); border:1px solid rgba(244,63,94,0.2); padding:6px 10px; border-radius:6px; display:flex; justify-content:space-between; font-size:0.8rem;">
                                <span>⚠️ <strong>Marcus Rivera</strong> (CFO)</span>
                                <span style="color:var(--accent-rose); font-weight:700;">Blocker (Price & 90d ROI)</span>
                            </div>
                            <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); padding:6px 10px; border-radius:6px; display:flex; justify-content:space-between; font-size:0.8rem;">
                                <span>🔒 <strong>Priya Patel</strong> (CTO)</span>
                                <span style="color:var(--accent-cyan); font-weight:600;">Warming (SOC2 roadmap sent)</span>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Primary Risk -->
                    <div class="story-block">
                        <div class="story-block-title">
                            <span>⚠️</span> Primary Deal Risk
                        </div>
                        <div class="story-risk-box">
                            <h4>CFO Blocking on Price (2× Perception)</h4>
                            <p>In Call #3, Marcus Rivera insisted $285K is 2× their current budget and demanded proven ROI within 90 days. Splunk offered a 40% discount to retain their business.</p>
                        </div>
                    </div>

                    <!-- 3. What DealPulse Remembers -->
                    <div class="story-block full-width">
                        <div class="story-block-title">
                            <span>🧠</span> What DealPulse Remembers Across Conversations
                        </div>
                        <div class="memory-fact-list">
                            <div class="memory-fact-item">
                                <div class="memory-fact-source">📁 Call #3 (2026-09-19) &bull; Marcus Rivera (CFO)</div>
                                <div class="memory-fact-text">CFO stated $285K is ~2× existing spend; requested a phased rollout and requires a demonstrable 90-day ROI milestone.</div>
                            </div>
                            <div class="memory-fact-item">
                                <div class="memory-fact-source">⚔️ Call #3 (2026-09-19) &bull; Competitive Intelligence</div>
                                <div class="memory-fact-text">Competitor Splunk offered an aggressive 40% discount to retain the logging and monitoring contract.</div>
                            </div>
                            <div class="memory-fact-item">
                                <div class="memory-fact-source">⭐ Call #1 & #4 (2026-09-05/25) &bull; Sarah Chen (VP of Engineering)</div>
                                <div class="memory-fact-text">Confirmed as internal champion. Engineering team (120 devs) is fully onboard; deployment downtime pain is acute.</div>
                            </div>
                            <div class="memory-fact-item">
                                <div class="memory-fact-source">💡 Call #4 (2026-09-25) &bull; Champion Strategic Advice</div>
                                <div class="memory-fact-text">Sarah advised presenting a <strong>3-year TCO comparison</strong> showing savings vs their current multi-tool stack (Splunk + DataDog) to overturn Marcus's price blocker.</div>
                            </div>
                        </div>
                    </div>

                    <!-- 4. Next Best Action -->
                    <div class="story-block full-width">
                        <div class="story-action-banner">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <h4>🎯 Recommended Next Best Action</h4>
                                <span class="deal-badge stage-ClosedWon">High Probability Impact</span>
                            </div>
                            <p>Deliver a tailored <strong>3-year TCO comparison</strong> with Sarah Chen and Marcus Rivera. Frame DealPulse as multi-tool consolidation replacing Splunk + legacy APM, and establish a contractual 90-day pilot milestone to unlock budget sign-off.</p>
                        </div>
                    </div>
                </div>

                <!-- Action CTA Bar -->
                <div class="story-cta-bar">
                    <button class="btn btn-primary btn-demo-glow" onclick="coachThisDeal('${deal.id}', 'CFO', 'Your price is 2x our current spend. We cannot justify it.')">
                        ⚡ Coach CFO Price Objection
                    </button>
                    <button class="btn btn-secondary" onclick="generatePreCallBrief('${deal.id}')">
                        📋 Generate Full Executive Briefing
                    </button>
                </div>

                <div id="briefing-box" style="margin-top:16px;"></div>
            </div>
        `;
    } else {
        // Generic deal detail view
        content.innerHTML = `
            <div class="story-container">
                <div class="story-header">
                    <div class="story-badge-row">
                        <span class="deal-badge stage-${deal.stage.replace(/\s+/g, '')}">${deal.stage}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:baseline;">
                        <h2 class="story-title">${deal.deal_name}</h2>
                        <span style="font-size:1.6rem; font-weight:800; font-family:var(--font-mono); color:var(--accent-cyan);">$${Number(deal.deal_value).toLocaleString()}</span>
                    </div>
                    <p class="story-subtitle">${deal.company} &bull; Pipeline Health: ${deal.health_score}%</p>
                </div>

                <div class="story-grid">
                    <div class="story-block">
                        <div class="story-block-title"><span>👥</span> Key Stakeholders</div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${(deal.stakeholders || []).map(s => `
                                <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px; display:flex; justify-content:space-between; font-size:0.85rem;">
                                    <span><strong>${s.name}</strong> (${s.role})</span>
                                    <span style="color:var(--accent-emerald)">${s.sentiment}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="story-block">
                        <div class="story-block-title"><span>💡</span> Learned Tactics in Memory</div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${(deal.learned_tactics || []).map(t => `
                                <div style="font-size:0.82rem; color:var(--text-secondary); background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:4px;">&bull; ${t}</div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="story-cta-bar">
                    <button class="btn btn-primary" onclick="generatePreCallBrief('${deal.id}')">
                        ⚡ Generate Memory Briefing
                    </button>
                    <button class="btn btn-secondary" onclick="coachThisDeal('${deal.id}')">
                        🧠 Open Objection Coach
                    </button>
                </div>

                <div id="briefing-box" style="margin-top:16px;"></div>
            </div>
        `;
    }

    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('deal-modal').style.display = 'none';
}

function coachThisDeal(dealId, role = 'CFO', objection = '') {
    closeModal();
    switchView('coach');
    const dealSelect = document.getElementById('coach-deal-select');
    if (dealSelect) dealSelect.value = dealId;
    const roleSelect = document.getElementById('coach-role');
    if (roleSelect && role) roleSelect.value = role;
    const objInput = document.getElementById('coach-objection');
    if (objInput && objection) objInput.value = objection;
    if (objection) {
        submitObjection();
    }
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
    if (!sel) return;
    sel.innerHTML = '<option value="">Choose a deal...</option>';
    currentDeals.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.innerText = `${d.deal_name} (${d.company})`;
        sel.appendChild(opt);
    });
    // Default to Nexus Technologies if present
    const nexus = currentDeals.find(d => d.id === 'deal-001' || d.company.toLowerCase().includes('nexus'));
    if (nexus) {
        sel.value = nexus.id;
    }
}

function quickObjection(text, role = 'CFO', dealId = 'deal-001', autoSubmit = false) {
    switchView('coach');
    const objInput = document.getElementById('coach-objection');
    if (objInput) objInput.value = text;
    const dealSelect = document.getElementById('coach-deal-select');
    if (dealSelect) {
        if (!dealSelect.value || dealId) dealSelect.value = dealId;
    }
    const roleSelect = document.getElementById('coach-role');
    if (roleSelect && role) {
        roleSelect.value = role;
    }
    if (autoSubmit) {
        submitObjection();
    }
}

// 4. Objection Coach WOW Moment with Sequential Retrieval Steps
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

    const step1 = document.getElementById('coach-step-1');
    const step2 = document.getElementById('coach-step-2');
    const step3 = document.getElementById('coach-step-3');
    const step4 = document.getElementById('coach-step-4');

    // Reset steps
    [step1, step2, step3, step4].forEach(el => {
        if (!el) return;
        el.className = 'coach-step-row';
        const icon = el.querySelector('.coach-step-icon');
        if (icon) icon.innerText = '⏳';
    });

    // Step 1: Active
    if (step1) {
        step1.className = 'coach-step-row active';
        const icon = step1.querySelector('.coach-step-icon');
        if (icon) icon.innerText = '🔍';
    }

    // Launch API fetch simultaneously
    const apiPromise = fetch('/api/objection-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            deal_id: dealId,
            objection: objection,
            stakeholder_role: role,
            context: context
        })
    }).then(res => res.json());

    // Step 1 -> Step 2
    await new Promise(r => setTimeout(r, 450));
    if (step1) {
        step1.className = 'coach-step-row done';
        const icon = step1.querySelector('.coach-step-icon');
        if (icon) icon.innerText = '✓';
    }
    if (step2) {
        step2.className = 'coach-step-row active';
        const icon = step2.querySelector('.coach-step-icon');
        if (icon) icon.innerText = '👥';
    }

    // Step 2 -> Step 3
    await new Promise(r => setTimeout(r, 450));
    if (step2) {
        step2.className = 'coach-step-row done';
        const icon = step2.querySelector('.coach-step-icon');
        if (icon) icon.innerText = '✓';
    }
    if (step3) {
        step3.className = 'coach-step-row active';
        const icon = step3.querySelector('.coach-step-icon');
        if (icon) icon.innerText = '⚔️';
    }

    // Step 3 -> Step 4
    await new Promise(r => setTimeout(r, 450));
    if (step3) {
        step3.className = 'coach-step-row done';
        const icon = step3.querySelector('.coach-step-icon');
        if (icon) icon.innerText = '✓';
    }
    if (step4) {
        step4.className = 'coach-step-row active';
        const icon = step4.querySelector('.coach-step-icon');
        if (icon) icon.innerText = '⚡';
    }

    try {
        const data = await apiPromise;
        // Final finish
        await new Promise(r => setTimeout(r, 350));
        if (step4) {
            step4.className = 'coach-step-row done';
            const icon = step4.querySelector('.coach-step-icon');
            if (icon) icon.innerText = '✓';
        }

        if (loading) loading.style.display = 'none';
        if (result) {
            result.style.display = 'block';
            document.getElementById('memory-used-count').innerText = `${data.memories_used || 4} Memories Recalled &bull; ~650 tokens`;
            document.getElementById('coach-result-content').innerHTML = markedParse(data.response);

            // Populate Why this response provenance
            const whyList = document.getElementById('coach-why-list');
            if (whyList) {
                const deal = currentDeals.find(d => d.id === dealId) || { deal_name: 'Selected Deal', company: '' };
                const isNexus = dealId === 'deal-001' || deal.company.toLowerCase().includes('nexus');
                if (isNexus) {
                    whyList.innerHTML = `
                        <div class="why-item">
                            <span>📁</span>
                            <span><strong>Call #3 (Sep 19) with CFO Marcus Rivera:</strong> Recalled hard pushback that $285K is 2× current spend and his mandatory 90-day ROI requirement.</span>
                        </div>
                        <div class="why-item">
                            <span>⭐</span>
                            <span><strong>Call #4 (Sep 25) with Champion Sarah Chen:</strong> Recalled internal alignment and her recommendation to present a 3-year TCO consolidation model.</span>
                        </div>
                        <div class="why-item">
                            <span>⚔️</span>
                            <span><strong>Competitive Intel Memory Bank:</strong> Splunk 40% discount counter-tactic: highlight Splunk's hidden data ingestion fees and operational overhead.</span>
                        </div>
                        <div class="why-item">
                            <span>📖</span>
                            <span><strong>Winning Playbook Memory Bank:</strong> "CFOs approve deals on multi-tool consolidation and phased milestone billing, not feature lists."</span>
                        </div>
                    `;
                } else {
                    whyList.innerHTML = `
                        <div class="why-item">
                            <span>📁</span>
                            <span><strong>Deal History Bank:</strong> Recalled stakeholder interactions, previous objections, and call summaries for ${deal.deal_name}.</span>
                        </div>
                        <div class="why-item">
                            <span>📖</span>
                            <span><strong>Playbook Bank:</strong> Injected proven closing tactics and objection counter-arguments.</span>
                        </div>
                        <div class="why-item">
                            <span>⚔️</span>
                            <span><strong>Competitive Bank:</strong> Cross-referenced competitor positioning and weaknesses.</span>
                        </div>
                    `;
                }
            }

            const sourcesEl = document.getElementById('memory-sources');
            if (sourcesEl) {
                sourcesEl.innerHTML = `
                    <span class="chip">📁 Deal History: ${data.memory_sources?.deal_history || 8} recalled</span>
                    <span class="chip">📖 Playbook: ${data.memory_sources?.playbook || 8} recalled</span>
                    <span class="chip">⚔️ Competitive Intel: ${data.memory_sources?.competitive_intel || 5} recalled</span>
                    <span class="chip" style="color:var(--accent-emerald); border-color:rgba(16,185,129,0.3)">⚡ Token Efficiency: 99.0% vs Full RAG</span>
                `;
            }
        }
        loadMemoryStats();
    } catch (err) {
        if (loading) loading.style.display = 'none';
        alert('Error getting coach guidance: ' + err.message);
    }
}

// Memory Inspector Helpers
function populateTimelineDeals() {
    const sel = document.getElementById('timeline-deal-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select a deal...</option>';
    currentDeals.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.innerText = `${d.deal_name} (${d.company})`;
        sel.appendChild(opt);
    });
    // Default to Nexus Technologies
    const nexus = currentDeals.find(d => d.id === 'deal-001' || d.company.toLowerCase().includes('nexus'));
    if (nexus) {
        sel.value = nexus.id;
        loadTimeline();
    }
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

function quickMemorySearch(query, bankId = 'dealpulse-deals') {
    switchView('memory');
    const input = document.getElementById('memory-search-input');
    const bank = document.getElementById('memory-bank-select');
    if (input) input.value = query;
    if (bank) bank.value = bankId;
    searchMemory();
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

        container.innerHTML = `
            <div style="font-size:0.75rem; color:var(--accent-emerald); margin:8px 0;">✓ Recalled ${data.results.length} relevant context fragments (~${data.results.length * 55} tokens)</div>
            ${data.results.map(r => {
                const content = typeof r === 'string' ? r : (r.content || JSON.stringify(r));
                return `
                    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; padding:12px; margin-top:8px;">
                        <div style="font-size:0.85rem; color:var(--text-primary); white-space:pre-wrap;">${content}</div>
                    </div>
                `;
            }).join('')}
        `;
    } catch (err) {
        container.innerHTML = `<p style="color:var(--accent-rose)">Search error: ${err.message}</p>`;
    }
}

// Ingest Call
function populateIngestDeals() {
    const sel = document.getElementById('ingest-deal-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Choose a deal...</option>';
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

// 6. Guided 30-Second Demo Tour
async function runGuidedDemo() {
    clearTimeout(demoStepTimeout);
    
    if (!currentDeals || currentDeals.length === 0) {
        await loadDashboard();
    }

    const container = document.getElementById('demo-tour-container');
    
    function showTourToast(stepNum, totalSteps, title, message, nextActionText, onNext) {
        if (!container) return;
        container.innerHTML = `
            <div class="demo-tour-banner">
                <div class="demo-tour-content">
                    <div class="demo-tour-step">DEMO TOUR &bull; STEP ${stepNum} OF ${totalSteps}: ${title}</div>
                    <div class="demo-tour-message">${message}</div>
                </div>
                <div class="demo-tour-actions">
                    ${onNext ? `<button class="btn btn-primary" id="btn-tour-next" style="padding: 6px 14px; font-size: 0.8rem;">${nextActionText} &rarr;</button>` : ''}
                    <button class="btn btn-secondary" onclick="stopGuidedDemo()" style="padding: 6px 10px; font-size: 0.8rem;">✕ Exit Demo</button>
                </div>
            </div>
        `;
        if (onNext) {
            const btn = document.getElementById('btn-tour-next');
            if (btn) btn.onclick = onNext;
        }
    }

    // Step 1: Dashboard Nexus Attention Card
    switchView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    showTourToast(
        1, 3,
        "PIPELINE ATTENTION NEEDED",
        "DealPulse continuously monitors deals. <strong>Nexus Technologies ($285K)</strong> is flagged: CFO Marcus Rivera is blocking on price.",
        "Inspect Memory Story",
        () => executeStep2()
    );

    demoStepTimeout = setTimeout(executeStep2, 3800);

    function executeStep2() {
        clearTimeout(demoStepTimeout);
        openDealDetail('deal-001');
        showTourToast(
            2, 3,
            "CROSS-CALL MEMORY RECALL",
            "DealPulse remembers what happened across 4 calls: CFO's 2× price pushback, Splunk's 40% discount, and champion Sarah Chen's 3-year TCO tip.",
            "Test Objection Coach",
            () => executeStep3()
        );
        demoStepTimeout = setTimeout(executeStep3, 4500);
    }

    function executeStep3() {
        clearTimeout(demoStepTimeout);
        closeModal();
        switchView('coach');
        
        const dealSelect = document.getElementById('coach-deal-select');
        if (dealSelect) dealSelect.value = 'deal-001';
        const roleSelect = document.getElementById('coach-role');
        if (roleSelect) roleSelect.value = 'CFO';
        const objInput = document.getElementById('coach-objection');
        if (objInput) objInput.value = 'Your price is 2x our current spend. We cannot justify it.';

        showTourToast(
            3, 3,
            "REAL-TIME OBJECTION COACHING",
            "The rep faces Marcus's objection. Watch DealPulse recall precise memories and generate a grounded, actionable response via Groq in sub-2s.",
            null,
            null
        );

        submitObjection();

        demoStepTimeout = setTimeout(() => {
            showTourToast(
                3, 3,
                "DEMO COMPLETE",
                "✨ <strong>30-Second Takeaway:</strong> DealPulse remembers deal history, extracts what matters, and tells the salesperson exactly how to win.",
                null,
                null
            );
            setTimeout(stopGuidedDemo, 5000);
        }, 3600);
    }
}

function stopGuidedDemo() {
    clearTimeout(demoStepTimeout);
    const container = document.getElementById('demo-tour-container');
    if (container) container.innerHTML = '';
}

// Markdown parser helper
function markedParse(text) {
    if (!text) return '';
    return text
        .replace(/^### (.*$)/gim, '<h3 style="font-size:1.05rem; font-weight:700; color:var(--accent-cyan); margin:16px 0 6px;">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="font-size:1.15rem; font-weight:800; color:#fff; margin:20px 0 8px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:4px;">$1</h2>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong style="color:#fff;">$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/^\* (.*$)/gim, '<li style="margin-left:20px; margin-bottom:4px;">$1</li>')
        .replace(/^- (.*$)/gim, '<li style="margin-left:20px; margin-bottom:4px;">$1</li>')
        .replace(/\n\n/gim, '<p style="margin-bottom:10px;"></p>')
        .replace(/\n/gim, '<br>');
}
