"""
DealPulse AI — Autonomous Deal Intelligence & Objection-Learning Copilot
Powered by Hindsight Memory System + Groq LLM
"""

import os
import sys
import json
import asyncio

# Ensure UTF-8 output on Windows consoles
if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from groq import Groq

load_dotenv()

# ─── Configuration ───────────────────────────────────────────────────────────
HINDSIGHT_BASE_URL = os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888")
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Memory Bank IDs
BANK_DEALS = "dealpulse-deals"          # Deal-level memory (objections, stakeholders, history)
BANK_PLAYBOOK = "dealpulse-playbook"    # Learned tactics & winning patterns
BANK_COMPETITORS = "dealpulse-competitors"  # Competitive intelligence

# ─── Hindsight Client Setup ──────────────────────────────────────────────────
hindsight_client = None
USE_HINDSIGHT = False

try:
    from hindsight_client import Hindsight
    # If using cloud, ensure API key is present
    is_cloud = "hindsight.vectorize.io" in HINDSIGHT_BASE_URL
    if is_cloud and not HINDSIGHT_API_KEY:
        print("[INFO] Hindsight Cloud specified without API key — using built-in memory engine until key is provided")
    elif HINDSIGHT_BASE_URL:
        hindsight_kwargs = {"base_url": HINDSIGHT_BASE_URL}
        if HINDSIGHT_API_KEY:
            hindsight_kwargs["api_key"] = HINDSIGHT_API_KEY
        hindsight_client = Hindsight(**hindsight_kwargs)
        USE_HINDSIGHT = True
        print(f"[OK] Hindsight connected at {HINDSIGHT_BASE_URL}")
except Exception as e:
    print(f"[INFO] Hindsight fallback active: {e}")
    print("   Running in demo mode with in-memory storage")

# ─── In-Memory Fallback (for demo without Hindsight server) ──────────────────
memory_store = {
    BANK_DEALS: [],
    BANK_PLAYBOOK: [],
    BANK_COMPETITORS: [],
}

# ─── Groq LLM Setup ─────────────────────────────────────────────────────────
groq_client = None
if GROQ_API_KEY and GROQ_API_KEY != "your-groq-api-key-here":
    groq_client = Groq(api_key=GROQ_API_KEY)
    print("[OK] Groq LLM connected")
else:
    print("[INFO] Groq API key not set — using template fallback")

# ─── FastAPI App ─────────────────────────────────────────────────────────────
app = FastAPI(title="DealPulse AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")


# ─── Pydantic Models ────────────────────────────────────────────────────────
class DealCreate(BaseModel):
    deal_name: str
    company: str
    deal_value: float
    stage: str = "Discovery"
    stakeholders: list = []
    notes: str = ""


class CallTranscript(BaseModel):
    deal_id: str
    call_number: int
    stakeholder_name: str
    stakeholder_role: str
    transcript: str
    objections: list = []
    competitors_mentioned: list = []
    action_items: list = []


class ObjectionQuery(BaseModel):
    deal_id: str
    objection: str
    stakeholder_role: str = ""
    context: str = ""


class MemoryQuery(BaseModel):
    query: str
    bank_id: str = BANK_DEALS


# ─── In-Memory Deal Store ───────────────────────────────────────────────────
deals_db = {}

# Synthetic demo data
DEMO_DEALS = {
    "deal-001": {
        "id": "deal-001",
        "deal_name": "Nexus Cloud Platform — Enterprise License",
        "company": "Nexus Technologies",
        "deal_value": 285000,
        "stage": "Negotiation",
        "health_score": 72,
        "days_in_pipeline": 47,
        "stakeholders": [
            {"name": "Sarah Chen", "role": "VP of Engineering", "sentiment": "champion", "last_contact": "2026-09-25"},
            {"name": "Marcus Rivera", "role": "CFO", "sentiment": "skeptical", "last_contact": "2026-09-22"},
            {"name": "Priya Patel", "role": "CTO", "sentiment": "neutral", "last_contact": "2026-09-20"},
            {"name": "David Kim", "role": "Procurement Lead", "sentiment": "blockers", "last_contact": "2026-09-18"}
        ],
        "calls": [
            {
                "call_number": 1,
                "date": "2026-09-05",
                "stakeholder": "Sarah Chen",
                "role": "VP of Engineering",
                "summary": "Initial discovery call. Sarah expressed frustration with current vendor's downtime issues. Team of 120 engineers. Main pain: deployment reliability and observability gaps. Budget cycle ends Q4.",
                "objections": [],
                "competitors": ["DataDog", "Splunk"],
                "sentiment": "positive"
            },
            {
                "call_number": 2,
                "date": "2026-09-12",
                "stakeholder": "Priya Patel",
                "role": "CTO",
                "summary": "Technical deep-dive with CTO. Priya concerned about SOC2 compliance timeline — needs certification by January. Asked about data residency in India. Wants on-prem option. Impressed by API-first architecture.",
                "objections": ["SOC2 compliance timeline concern", "Data residency requirements"],
                "competitors": ["DataDog"],
                "sentiment": "cautiously positive"
            },
            {
                "call_number": 3,
                "date": "2026-09-19",
                "stakeholder": "Marcus Rivera",
                "role": "CFO",
                "summary": "Budget review with CFO. Marcus pushed back hard on pricing — said $285K is 2x their current spend. Wants phased rollout to reduce upfront cost. Mentioned competitor offered 40% discount. Concerned about ROI timeline — wants to see value in 90 days.",
                "objections": ["Price is 2x current spend", "Competitor offered 40% discount", "ROI timeline concern - 90 day window"],
                "competitors": ["Splunk"],
                "sentiment": "skeptical"
            },
            {
                "call_number": 4,
                "date": "2026-09-25",
                "stakeholder": "Sarah Chen",
                "role": "VP of Engineering",
                "summary": "Follow-up with champion. Sarah confirmed internal alignment with engineering team. Shared that Priya is warming up after SOC2 roadmap we sent. Main blocker now is Marcus on price. Sarah suggested presenting a 3-year TCO comparison showing savings vs current multi-tool stack.",
                "objections": ["CFO still blocking on price"],
                "competitors": [],
                "sentiment": "very positive"
            }
        ],
        "learned_tactics": [
            "Sarah Chen is the internal champion — route all internal selling through her",
            "CFO responds to TCO comparisons, not feature lists",
            "CTO cares about compliance first, features second",
            "Phased rollout proposal might unlock the budget blocker"
        ]
    },
    "deal-002": {
        "id": "deal-002",
        "deal_name": "HealthSync Analytics — SaaS Migration",
        "company": "HealthSync Corp",
        "deal_value": 180000,
        "stage": "Discovery",
        "health_score": 45,
        "days_in_pipeline": 12,
        "stakeholders": [
            {"name": "Dr. James Walker", "role": "Chief Medical Officer", "sentiment": "interested", "last_contact": "2026-09-26"},
            {"name": "Lisa Huang", "role": "Head of IT", "sentiment": "neutral", "last_contact": "2026-09-24"}
        ],
        "calls": [
            {
                "call_number": 1,
                "date": "2026-09-24",
                "stakeholder": "Lisa Huang",
                "role": "Head of IT",
                "summary": "Initial discovery. Lisa mentioned HIPAA compliance is non-negotiable. Current system is legacy on-prem with significant technical debt. Migration timeline critical — board wants cloud-first by Q2 2027. 50 users initially, 200+ by year-end.",
                "objections": ["HIPAA compliance requirements", "Migration risk from legacy system"],
                "competitors": ["AWS HealthLake"],
                "sentiment": "cautious"
            }
        ],
        "learned_tactics": [
            "Lead with HIPAA compliance story — it's the gatekeeper issue",
            "Board-mandated timeline creates urgency — use it"
        ]
    },
    "deal-003": {
        "id": "deal-003",
        "deal_name": "FinEdge Trading — Real-time Analytics",
        "company": "FinEdge Capital",
        "deal_value": 420000,
        "stage": "Closed Won",
        "health_score": 95,
        "days_in_pipeline": 62,
        "stakeholders": [
            {"name": "Robert Zhang", "role": "Head of Quant Research", "sentiment": "champion", "last_contact": "2026-09-15"},
            {"name": "Amanda Foster", "role": "COO", "sentiment": "champion", "last_contact": "2026-09-15"}
        ],
        "calls": [
            {
                "call_number": 1,
                "date": "2026-08-01",
                "stakeholder": "Robert Zhang",
                "role": "Head of Quant Research",
                "summary": "Technical evaluation. Robert needs sub-millisecond latency for streaming analytics. Current solution can't handle their data volume growth (10x in 18 months). Budget approved if we hit performance benchmarks.",
                "objections": ["Performance benchmarks must be met", "Integration with proprietary trading systems"],
                "competitors": ["Kx Systems", "InfluxDB"],
                "sentiment": "highly technical"
            },
            {
                "call_number": 2,
                "date": "2026-08-20",
                "stakeholder": "Amanda Foster",
                "role": "COO",
                "summary": "Business case review. Amanda focused on operational efficiency — reducing from 3 analytics tools to 1. Won her over with the consolidation narrative and projected 40% cost reduction.",
                "objections": ["Tool consolidation risk"],
                "competitors": ["Kx Systems"],
                "sentiment": "positive"
            },
            {
                "call_number": 3,
                "date": "2026-09-10",
                "stakeholder": "Robert Zhang",
                "role": "Head of Quant Research",
                "summary": "POC results review. Exceeded latency benchmarks by 3x. Robert's team ran it against their production workload for 2 weeks — zero issues. Signed off on technical approval. Deal closed at $420K, 3-year contract.",
                "objections": [],
                "competitors": [],
                "sentiment": "deal won"
            }
        ],
        "learned_tactics": [
            "POC with real production data is the ultimate closer for technical buyers",
            "Consolidation narrative works for COOs focused on operational efficiency",
            "Let the champion's team validate — peer approval > vendor promises",
            "3-year contract sweetens the deal for finance teams"
        ]
    }
}

deals_db = DEMO_DEALS.copy()


# ─── Helper Functions ────────────────────────────────────────────────────────

async def retain_memory(bank_id: str, content: str):
    """Store information in Hindsight memory and maintain local mirror"""
    # Always maintain fast local mirror
    if bank_id not in memory_store:
        memory_store[bank_id] = []
    memory_store[bank_id].append({
        "content": content,
        "timestamp": datetime.now().isoformat()
    })

    if USE_HINDSIGHT and hindsight_client:
        try:
            if hasattr(hindsight_client, "aretain"):
                await hindsight_client.aretain(bank_id=bank_id, content=content)
            else:
                hindsight_client.retain(bank_id=bank_id, content=content)
        except Exception as e:
            print(f"[INFO] Hindsight retain fallback: {e}")
    return True


async def recall_memory(bank_id: str, query: str):
    """Search memories from Hindsight with local fallback"""
    hindsight_results = []
    if USE_HINDSIGHT and hindsight_client:
        try:
            if hasattr(hindsight_client, "arecall"):
                res = await hindsight_client.arecall(bank_id=bank_id, query=query)
            else:
                res = hindsight_client.recall(bank_id=bank_id, query=query)
            if res:
                hindsight_results = res if isinstance(res, list) else [res]
        except Exception as e:
            print(f"[INFO] Hindsight recall notice: {e}")

    if hindsight_results:
        return hindsight_results

    # Local mirror keyword search
    if bank_id not in memory_store:
        return []
    results = []
    query_lower = query.lower()
    for mem in memory_store[bank_id]:
        if any(word in mem["content"].lower() for word in query_lower.split()):
            results.append(mem)
    return results


async def reflect_memory(bank_id: str, query: str):
    """Get synthesized insight from Hindsight"""
    if USE_HINDSIGHT and hindsight_client:
        try:
            if hasattr(hindsight_client, "areflect"):
                result = await hindsight_client.areflect(bank_id=bank_id, query=query)
            else:
                result = hindsight_client.reflect(bank_id=bank_id, query=query)
            return result
        except Exception as e:
            print(f"[INFO] Hindsight reflect notice: {e}")
    return None


def generate_llm_response(system_prompt: str, user_prompt: str, memory_context: str = ""):
    """Generate response using Groq LLM with memory context"""
    if not groq_client:
        return generate_template_response(user_prompt, memory_context)

    messages = [{"role": "system", "content": system_prompt}]

    if memory_context:
        messages.append({
            "role": "system",
            "content": f"RELEVANT MEMORY CONTEXT FROM PAST INTERACTIONS:\n{memory_context}"
        })

    messages.append({"role": "user", "content": user_prompt})

    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            temperature=0.7,
            max_tokens=1500,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Groq error: {e}")
        return generate_template_response(user_prompt, memory_context)


def generate_template_response(user_prompt: str, memory_context: str = ""):
    """Fallback response when LLM is not available"""
    return f"""Based on the deal history and accumulated memory:

**Memory-Powered Analysis:**
{memory_context if memory_context else 'No prior memory available — this is a cold interaction.'}

**Recommended Strategy:**
1. Reference specific past interactions to build continuity
2. Address previously raised concerns proactively  
3. Use learned winning patterns from similar deals

*Note: Connect Groq API key for AI-powered responses. Get free credits at groq.com*"""


# ─── Seed Hindsight Memory ──────────────────────────────────────────────────

async def seed_demo_memories():
    """Seed Hindsight with demo deal data"""
    for deal_id, deal in DEMO_DEALS.items():
        # Store each call as a memory
        for call in deal.get("calls", []):
            memory_content = f"""
            Deal: {deal['deal_name']} ({deal['company']})
            Call #{call['call_number']} on {call['date']}
            Stakeholder: {call['stakeholder']} ({call['role']})
            Summary: {call['summary']}
            Objections raised: {', '.join(call.get('objections', [])) or 'None'}
            Competitors mentioned: {', '.join(call.get('competitors', [])) or 'None'}
            Sentiment: {call.get('sentiment', 'unknown')}
            """
            await retain_memory(BANK_DEALS, memory_content.strip())

        # Store learned tactics
        for tactic in deal.get("learned_tactics", []):
            await retain_memory(BANK_PLAYBOOK, f"Deal: {deal['deal_name']} | Tactic: {tactic}")

    # Store competitive intelligence
    comp_intel = [
        "DataDog: Strong in observability. Weakness — expensive at scale, complex pricing model. Counter: show TCO comparison at 100+ hosts.",
        "Splunk: Enterprise-grade logging. Weakness — steep learning curve, migration pain. Counter: offer free migration assistance and training.",
        "AWS HealthLake: HIPAA-compliant. Weakness — vendor lock-in, limited customization. Counter: emphasize multi-cloud flexibility.",
        "Kx Systems: Best-in-class for time-series. Weakness — niche, limited ecosystem. Counter: broader analytics platform + integrations.",
        "InfluxDB: Good for IoT/time-series. Weakness — struggles at enterprise scale. Counter: show enterprise benchmark results."
    ]
    for intel in comp_intel:
        await retain_memory(BANK_COMPETITORS, intel)

    print("[OK] Demo memories seeded successfully")


# ─── API Routes ──────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await seed_demo_memories()


@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/api/deals")
async def get_deals():
    """Get all deals with health scores"""
    return {"deals": list(deals_db.values())}


@app.get("/api/deals/{deal_id}")
async def get_deal(deal_id: str):
    """Get detailed deal information"""
    if deal_id not in deals_db:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deals_db[deal_id]


@app.post("/api/deals")
async def create_deal(deal: DealCreate):
    """Create a new deal"""
    deal_id = f"deal-{len(deals_db) + 1:03d}"
    deal_data = {
        "id": deal_id,
        **deal.dict(),
        "health_score": 50,
        "days_in_pipeline": 0,
        "calls": [],
        "learned_tactics": []
    }
    deals_db[deal_id] = deal_data

    # Store in Hindsight
    await retain_memory(BANK_DEALS, f"New deal created: {deal.deal_name} at {deal.company}, value ${deal.deal_value:,.0f}, stage: {deal.stage}")

    return deal_data


@app.post("/api/deals/{deal_id}/calls")
async def ingest_call(deal_id: str, call: CallTranscript):
    """Ingest a new call transcript and store in Hindsight memory"""
    if deal_id not in deals_db:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal = deals_db[deal_id]

    # Build call record
    call_record = {
        "call_number": call.call_number,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "stakeholder": call.stakeholder_name,
        "role": call.stakeholder_role,
        "summary": call.transcript,
        "objections": call.objections,
        "competitors": call.competitors_mentioned,
        "sentiment": "analyzing"
    }
    deal["calls"].append(call_record)

    # Store in Hindsight memory
    memory_content = f"""
    Deal: {deal['deal_name']} ({deal['company']})
    Call #{call.call_number} on {call_record['date']}
    Stakeholder: {call.stakeholder_name} ({call.stakeholder_role})
    Transcript/Summary: {call.transcript}
    Objections raised: {', '.join(call.objections) if call.objections else 'None'}
    Competitors mentioned: {', '.join(call.competitors_mentioned) if call.competitors_mentioned else 'None'}
    Action items: {', '.join(call.action_items) if call.action_items else 'None'}
    """
    await retain_memory(BANK_DEALS, memory_content.strip())

    # Store objections as separate memories for pattern learning
    for objection in call.objections:
        await retain_memory(BANK_PLAYBOOK, f"Objection from {call.stakeholder_role} at {deal['company']}: {objection}")

    # Store competitor intel
    for comp in call.competitors_mentioned:
        await retain_memory(BANK_COMPETITORS, f"Competitor {comp} mentioned in {deal['deal_name']} by {call.stakeholder_name} ({call.stakeholder_role})")

    # Analyze sentiment and update health score
    if groq_client:
        analysis = generate_llm_response(
            "You are a deal analyst. Analyze the call and return JSON with: sentiment (string), health_delta (int -20 to +20), key_insights (list of strings). Return ONLY valid JSON.",
            f"Analyze this call:\n{call.transcript}\n\nObjections: {call.objections}\nCompetitors: {call.competitors_mentioned}"
        )
        try:
            parsed = json.loads(analysis)
            call_record["sentiment"] = parsed.get("sentiment", "neutral")
            deal["health_score"] = max(0, min(100, deal["health_score"] + parsed.get("health_delta", 0)))
        except:
            pass

    return {"message": "Call ingested and stored in memory", "call": call_record, "memories_stored": 1 + len(call.objections) + len(call.competitors_mentioned)}


@app.post("/api/objection-coach")
async def objection_coach(query: ObjectionQuery):
    """Get AI coaching on how to handle an objection, powered by Hindsight memory"""
    deal = deals_db.get(query.deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Step 1: Recall relevant memories from Hindsight
    deal_memories = await recall_memory(BANK_DEALS, f"{deal['deal_name']} {query.objection}")
    playbook_memories = await recall_memory(BANK_PLAYBOOK, query.objection)
    comp_memories = await recall_memory(BANK_COMPETITORS, query.objection)

    # Build memory context
    memory_context_parts = []

    if deal_memories:
        if isinstance(deal_memories, list):
            for mem in deal_memories[:5]:
                content = mem.get("content", str(mem)) if isinstance(mem, dict) else str(mem)
                memory_context_parts.append(f"[Deal History] {content}")
        else:
            memory_context_parts.append(f"[Deal History] {deal_memories}")

    if playbook_memories:
        if isinstance(playbook_memories, list):
            for mem in playbook_memories[:3]:
                content = mem.get("content", str(mem)) if isinstance(mem, dict) else str(mem)
                memory_context_parts.append(f"[Playbook] {content}")
        else:
            memory_context_parts.append(f"[Playbook] {playbook_memories}")

    if comp_memories:
        if isinstance(comp_memories, list):
            for mem in comp_memories[:3]:
                content = mem.get("content", str(mem)) if isinstance(mem, dict) else str(mem)
                memory_context_parts.append(f"[Competitive Intel] {content}")
        else:
            memory_context_parts.append(f"[Competitive Intel] {comp_memories}")

    # Add deal context from in-memory store
    deal_context = f"""
    Current Deal: {deal['deal_name']} at {deal['company']}
    Deal Value: ${deal['deal_value']:,.0f}
    Stage: {deal['stage']}
    Health Score: {deal['health_score']}%
    Days in Pipeline: {deal['days_in_pipeline']}
    Stakeholders: {json.dumps(deal['stakeholders'], indent=2)}
    Call History Summary: {len(deal['calls'])} calls completed
    Previous Learned Tactics: {json.dumps(deal.get('learned_tactics', []))}
    """
    memory_context_parts.insert(0, f"[Current Deal Context] {deal_context}")

    memory_context = "\n\n".join(memory_context_parts)

    # Step 2: Generate response with memory-augmented LLM
    system_prompt = """You are DealPulse AI, an elite sales intelligence copilot with perfect memory of every past interaction.

Your role: When a sales rep faces an objection, you recall ALL relevant context from past calls, stakeholder relationships, competitor mentions, and winning tactics — then generate a precise, actionable coaching response.

CRITICAL: You MUST reference specific details from the memory context. Don't give generic advice. Reference specific stakeholders by name, specific past conversations, specific competitor weaknesses, and specific winning tactics that worked before.

Format your response as:
## 🎯 Situation Assessment
(Brief analysis of where this objection fits in the deal cycle)

## 🧠 Memory Recall
(What you remember from past interactions relevant to this objection)

## 💡 Recommended Response
(Word-for-word script the rep can use)

## 🏆 Winning Tactic
(Strategic move based on patterns learned from past deals)

## ⚠️ Watch Out For
(Potential traps or follow-up objections to prepare for)"""

    user_prompt = f"""
    The sales rep is facing this objection:
    "{query.objection}"
    
    From stakeholder role: {query.stakeholder_role or 'Unknown'}
    Additional context: {query.context or 'None provided'}
    """

    response = generate_llm_response(system_prompt, user_prompt, memory_context)

    # Step 3: Store this interaction as a learning moment
    await retain_memory(BANK_PLAYBOOK, f"Objection coaching requested for '{query.objection}' on deal {deal['deal_name']}. Context: {query.context}")

    return {
        "response": response,
        "memories_used": len(memory_context_parts),
        "memory_sources": {
            "deal_history": len(deal_memories) if isinstance(deal_memories, list) else (1 if deal_memories else 0),
            "playbook": len(playbook_memories) if isinstance(playbook_memories, list) else (1 if playbook_memories else 0),
            "competitive_intel": len(comp_memories) if isinstance(comp_memories, list) else (1 if comp_memories else 0),
        },
        "memory_context_preview": memory_context[:500] + "..." if len(memory_context) > 500 else memory_context
    }


@app.post("/api/deal-brief")
async def deal_brief(deal_id: str):
    """Generate a pre-call briefing using Hindsight memory"""
    if deal_id not in deals_db:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal = deals_db[deal_id]

    # Recall all memories for this deal
    memories = await recall_memory(BANK_DEALS, deal['deal_name'])
    tactics = await recall_memory(BANK_PLAYBOOK, deal['company'])

    memory_context = ""
    if memories:
        if isinstance(memories, list):
            memory_context = "\n".join([m.get("content", str(m)) if isinstance(m, dict) else str(m) for m in memories[:10]])
        else:
            memory_context = str(memories)

    system_prompt = """You are DealPulse AI generating a pre-call briefing. Use the memory context to create a comprehensive, actionable brief that helps the sales rep walk into the next call fully prepared.

Format:
## 📋 Deal Brief: [Deal Name]

### 🔑 Key Facts
(Essential deal parameters)

### 🗓️ Interaction Timeline  
(Chronological summary of all past calls)

### 👥 Stakeholder Map
(Each stakeholder, their role, sentiment, and what matters to them)

### ⚡ Open Objections & Risks
(Unresolved objections that need addressing)

### 🎯 Recommended Next Moves
(Specific actions for the next call)

### 🏆 Winning Patterns from Similar Deals
(Tactics that worked in comparable situations)"""

    user_prompt = f"Generate a pre-call brief for: {deal['deal_name']} at {deal['company']}"

    response = generate_llm_response(system_prompt, user_prompt, memory_context)

    return {"brief": response, "deal": deal}


@app.get("/api/memory/stats")
async def memory_stats():
    """Get memory system statistics"""
    stats = {
        "hindsight_connected": USE_HINDSIGHT,
        "banks": {
            BANK_DEALS: len(memory_store.get(BANK_DEALS, [])),
            BANK_PLAYBOOK: len(memory_store.get(BANK_PLAYBOOK, [])),
            BANK_COMPETITORS: len(memory_store.get(BANK_COMPETITORS, [])),
        },
        "total_memories": sum(len(v) for v in memory_store.values()),
        "total_deals": len(deals_db),
        "total_calls": sum(len(d.get("calls", [])) for d in deals_db.values()),
    }
    return stats


@app.post("/api/memory/search")
async def search_memory(query: MemoryQuery):
    """Search Hindsight memory directly"""
    results = await recall_memory(query.bank_id, query.query)
    return {"query": query.query, "bank": query.bank_id, "results": results}


@app.get("/api/memory/timeline/{deal_id}")
async def memory_timeline(deal_id: str):
    """Get episodic memory timeline for a deal"""
    if deal_id not in deals_db:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal = deals_db[deal_id]
    timeline = []

    for call in deal.get("calls", []):
        timeline.append({
            "date": call["date"],
            "type": "call",
            "title": f"Call #{call['call_number']} with {call['stakeholder']}",
            "description": call["summary"][:200],
            "stakeholder": call["stakeholder"],
            "role": call["role"],
            "objections": call.get("objections", []),
            "competitors": call.get("competitors", []),
            "sentiment": call.get("sentiment", "unknown")
        })

    return {"deal_id": deal_id, "deal_name": deal["deal_name"], "timeline": timeline}


@app.get("/api/pipeline")
async def pipeline_overview():
    """Get full pipeline overview with health scores"""
    stages = {"Discovery": [], "Qualification": [], "Proposal": [], "Negotiation": [], "Closed Won": [], "Closed Lost": []}
    total_value = 0
    weighted_value = 0

    for deal in deals_db.values():
        stage = deal.get("stage", "Discovery")
        if stage not in stages:
            stages[stage] = []
        stages[stage].append({
            "id": deal["id"],
            "name": deal["deal_name"],
            "company": deal["company"],
            "value": deal["deal_value"],
            "health_score": deal.get("health_score", 50),
            "days": deal.get("days_in_pipeline", 0)
        })
        total_value += deal["deal_value"]
        weighted_value += deal["deal_value"] * (deal.get("health_score", 50) / 100)

    return {
        "stages": stages,
        "total_pipeline_value": total_value,
        "weighted_pipeline_value": weighted_value,
        "deal_count": len(deals_db)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
