# 🚀 Official Reddit Posts for DealPulse AI

> **Strict Compliance Verified (Hackathon Content Guide Rules):**  
> 1. ✅ **ZERO mentions of "hackathon"** (protects you from disqualification).  
> 2. ✅ **Engineered for skeptical developers** on Reddit (no marketing hype, no buzzwords).  
> 3. ✅ **Target Subreddits (from Content Guide Page 6):**  
>    * [r/llmdevs](https://reddit.com/r/llmdevs)  
>    * [r/aiagents](https://reddit.com/r/aiagents)  
>    * [r/sideproject](https://reddit.com/r/sideproject)  
>    * [r/aimemory](https://reddit.com/r/aimemory)  

---

## 📌 How to Post on Reddit (Step-by-Step)

The guide recommends **Link Posts**, but many subreddits (like `r/llmdevs` and `r/aiagents`) also reward **Text Posts with discussion**. Both options are provided below:

---

### Option A: Direct Link Post (Quickest — Recommended by Guide)
1. Go to the subreddit (e.g. `https://reddit.com/r/llmdevs/submit` or `r/aiagents/submit`).
2. Click the **"Link"** tab at the top.
3. **Title:** Pick one of the titles below.
4. **URL:** Paste your published article URL (Medium, Dev.to, or LinkedIn Article).
5. Click **Post**.

#### High-Converting Reddit Link Titles:
* `Why We Replaced Stateless Prompt Chaining with Multi-Bank Agent Memory`
* `Why vector similarity search fails for multi-month business agents (and what we used instead)`
* `How we got sub-2s LLM objection coaching using Groq and indexed agent memory`
* `The death of context window stuffing: Why feeding 60 pages of transcripts into 128k LLMs degrades reasoning`
* `Built an open-source copilot that tracks 6-month enterprise sales cycles without amnesia`

---

### Option B: High-Engagement Technical Text Post (Best for Upvotes & Comments)
*(Select the **"Post"** or **"Text"** tab on Reddit, copy & paste the following markdown)*

#### Subreddit: r/llmdevs or r/aiagents or r/aimemory

**Title:**  
`Why vector similarity search fails for multi-month business agents (and how we fixed it with 3-bank memory)`

**Post Body (Markdown):**
```text
Hey everyone,

Over the past few weeks, we’ve been working on DealPulse AI, an autonomous deal intelligence copilot designed to help sales reps navigate 6-to-9 month enterprise B2B sales cycles.

We started with the standard "agent memory" stack: chunking call transcripts, throwing embeddings into a vector database, and doing cosine similarity retrieval into an LLM prompt.

In production, that approach fell apart immediately:

1. **Temporal Blindness:** Vectors don't understand time. A prospect's hard rejection on Day 1 scored the exact same cosine similarity as their contract concession on Day 60. The LLM would retrieve both and hallucinate that the deal was blocked.
2. **Context Stuffing Penalties:** Stuffing 50k+ tokens of raw transcripts into 128k context windows caused the "Lost in the Middle" phenomenon—the model repeatedly missed explicit budget conditions buried on page 30.
3. **Entity Dilution:** Vector search conflated statements between the CFO, CTO, and VP of Engineering based on shared keywords.

### How We Fixed It: Multi-Bank Persistent Memory
We replaced naive vector search with Vectorize Hindsight, an open-source agent memory engine. We partitioned memory into 3 isolated banks:
- **`dealpulse-deals` (Episodic):** Chronological call events, stakeholder quotes, and milestone commitments.
- **`dealpulse-playbook` (Semantic):** Proven counter-tactics and concession rules.
- **`dealpulse-competitors` (Entity):** Competitor battlecards and trap questions.

### Concrete Example (Live Objection Handling):
When the client CFO stated: *"Your $285k quote is 2x our spend, and Splunk offered 40% off."*
- **Stateless LLM with naive RAG:** *"I understand your budget concern. We can offer a 10% pilot discount."* (Immediately surrendered margin).
- **DealPulse with Hindsight:** *"Marcus, on Sept 19th you emphasized 90-day ROI was mandatory. Sarah Chen (VP Eng) already approved our 3-year TCO consolidation model. Rather than Splunk's discount on an incomplete tier, let's execute Sarah's phased $95k Q4 rollout to prove 90-day ROI before the full commitment."*

### Performance & Latency:
By combining indexed Hindsight recall with Groq LPU inference (llama-3.3-70b), our end-to-end response time dropped to **~1.4 seconds** (compared to 7.4s with traditional RAG pipelines). Prompt size decreased by 99% (from 68k tokens down to 650 tokens).

We open-sourced the full codebase and wrote a detailed technical breakdown:

- Code: https://github.com/bodigeabhilash3-bit/dealpulse-ai
- Full Technical Write-up: [PASTE YOUR PUBLISHED MEDIUM / DEV.TO ARTICLE LINK HERE]
- Memory engine used: https://github.com/vectorize-io/hindsight

Would love to hear how other teams are tackling temporal tracking and memory partitioning in long-horizon agents!
```

---

### Option C: SideProject / Show HN Style Post
#### Subreddit: r/sideproject

**Title:**  
`DealPulse AI: An open-source sales copilot with photographic memory for multi-month deals`

**Post Body (Markdown):**
```text
Hey r/sideproject!

Most AI sales assistants give generic advice because they suffer from complete digital amnesia. If a deal takes 6 months across 5 executives (CFO, CTO, VP Eng), a standard stateless LLM forgets what was promised 3 weeks ago.

We built **DealPulse AI** to solve this. It's a real-time negotiation copilot powered by persistent agent memory:

- **Photographic Deal History:** Retains exact stakeholder quotes, pricing objections, and agreed terms across every call using Vectorize Hindsight.
- **Sub-2s Objection Coach:** Sales reps type an objection live in a meeting and get a context-grounded counter-tactic in under 1.5s powered by Groq LPUs.
- **Multi-Stakeholder Navigation:** Balances conflicting demands (CFO budget caps vs. VP of Engineering architecture demands) without needlessly discounting.

Check out the project:
- GitHub (Open Source): https://github.com/bodigeabhilash3-bit/dealpulse-ai
- Technical Article: [PASTE YOUR ARTICLE URL HERE]

Feedback, questions, and PRs are very welcome!
```
