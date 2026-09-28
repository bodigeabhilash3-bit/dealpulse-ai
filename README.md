# ⚡ DealPulse AI — Autonomous Deal Intelligence & Objection-Learning Copilot

> Enterprise Deal Intelligence Platform | Powered by **Hindsight Memory** & **Groq LLM**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![Hindsight Memory](https://img.shields.io/badge/Memory-Vectorize%20Hindsight-6C5CE7.svg)](https://hindsight.vectorize.io)
[![Groq](https://img.shields.io/badge/LLM-Groq%20openai%2Fgpt--oss--120b-F55036.svg)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📌 The Problem
In enterprise B2B sales, closing a deal takes between **3 to 9 months** and involves **4 to 8 different stakeholders** (CTO, CFO, VP of Engineering, Procurement).

* **Sales Rep Fatigue:** Account executives spend up to **45 minutes before every meeting** re-reading disjointed CRM notes, emails, and call summaries.
* **Lost Deal Context:** Critical past objections (e.g., CFO blocking on upfront pricing, CTO demanding SOC2 compliance) are forgotten across long sales cycles.
* **The "Stateless Chatbot" Flaw:** Traditional AI sales assistants possess no persistent episodic memory. Every call is treated in a silo, offering generic advice that damages credibility with enterprise buyers.

---

## 💡 The Solution: DealPulse AI
**DealPulse AI** is an autonomous sales intelligence copilot that **remembers, recalls, and gets smarter after every interaction**. Powered by Vectorize's **Hindsight** memory system, DealPulse tracks multi-stakeholder corporate dynamics, maintains persistent memory across weeks of discussions, and provides real-time objection coaching grounded in actual deal history.

---

## 🧠 Memory Architecture (Powered by Hindsight)

DealPulse AI structures enterprise sales intelligence across **3 distinct Hindsight Memory Banks**:

```
                       ┌─────────────────────────┐
                       │   Sales Call Audio /    │
                       │       Transcript        │
                       └───────────┬─────────────┘
                                   │
                           [ Call Ingestion ]
                                   │
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
  │  dealpulse-deals │   │dealpulse-playbook│   │   dealpulse-     │
  │ (Episodic Memory)│   │(Procedural/Rules)│   │   competitors    │
  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
           │                      │                      │
           └──────────────────────┼──────────────────────┘
                                  │
                       [ Hindsight Recall ]
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ Groq LLM (gpt-oss-120b) │
                     │   Synthesizer Engine    │
                     └────────────┬────────────┘
                                  ▼
                   ╔═════════════════════════════╗
                   ║  Tactical Objection Coach   ║
                   ║   & Executive Deal Brief    ║
                   ╚═════════════════════════════╝
```

1. **`dealpulse-deals` (Episodic Deal Memory):**
   * Stores chronological meeting logs, attendee sentiments, explicit promises, and open questions across months of pipeline progress.
2. **`dealpulse-playbook` (Procedural & Strategy Memory):**
   * Accumulates winning tactics and patterns that successfully resolved objections in past closed-won deals (e.g., offering a 3-year TCO analysis when CFOs push back on price).
3. **`dealpulse-competitors` (Competitive Intel Memory):**
   * Retains competitor claims, pricing weaknesses, and verified counter-strategies for rivals like DataDog, Splunk, and AWS.

---

## ✨ Key Features

* **📊 Live Deal Intelligence Dashboard:** Real-time visibility into pipeline value, deal health scores, active stakeholder counts, and memory volume.
* **📋 Kanban Pipeline Board:** Interactive stage tracking from Discovery to Closed Won with health decay warnings.
* **🧠 Real-Time Objection Coach:** Sales reps type or select an objection, and DealPulse recalls relevant past meetings and winning playbook strategies to generate an exact word-for-word response.
* **⚡ 1-Click Pre-Call Executive Briefing:** Generates comprehensive stakeholder maps, past chronological context, and recommended next moves in under 3 seconds.
* **🔍 Hindsight Memory Inspector:** Directly search memory banks and view the chronological episodic timeline of interactions.
* **📞 Real-Time Call Ingestion:** Ingest new meeting transcripts and watch memories, sentiment, and deal health update instantaneously.

---

## 🚀 Quickstart & Setup

### Prerequisites
* Python 3.10+
* Free Groq API Key ([groq.com](https://groq.com))
* (Optional) Hindsight Cloud API Key ([ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io))

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/dealpulse-ai.git
cd dealpulse-ai
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Groq LLM Configuration (Required)
GROQ_API_KEY=your-groq-api-key-here

# Hindsight Configuration (Optional - runs in high-performance local memory mode if omitted)
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=your-hindsight-cloud-key-here
```

### 3. Run the Application
```bash
python app.py
```
Open your browser and navigate to:
```
http://localhost:8000
```

---

## 🎬 60-Second Product Walkthrough

1. **Dashboard:** Observe the synthetic enterprise pipeline ($885k total) and live memory counters.
2. **Objection Coach:**
   * Select **Nexus Cloud Platform**.
   * Role: **CFO** (Marcus Rivera).
   * Objection: *"Your price is 2x our current spend. CFO will not approve."*
   * Click **"Analyze with Memory Recall"**.
   * Watch DealPulse recall Call #3, Sarah Chen's champion role, competitor Splunk mentions, and output an exact scripted TCO response.
3. **Memory Inspector:** Inspect the episodic timeline and search across memory banks.
4. **Call Ingest:** Add a new call transcript and show live memory retention in real time.

---

## 👥 The Team
Built with passion by Team DealPulse.
