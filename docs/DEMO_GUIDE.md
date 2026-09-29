# SEO-Mind — Hackathon Demo Guide

## The Pitch (30 seconds)

> "SEO-Mind is the first SEO optimization platform where the AI actually **remembers** what worked for your website. Using Hindsight by Vectorize, every audit, every optimization, and every outcome is stored in persistent semantic memory — so the AI gets smarter with every action you take."

---

## Demo Flow (8 minutes)

### 1. Register & Dashboard (1 min)

1. Open http://localhost:3000
2. Click **Create one** → register with demo credentials
3. Show the **Dashboard** — metrics, quick actions, Hindsight status badge

> **Talking point:** "Notice the Hindsight memory indicator. Right now it's offline because we haven't set up the memory server, but the app degrades gracefully."

---

### 2. Add a Website + SEO Audit (2 min)

1. Go to **Websites** → **Add Website**
   - Domain: `example.com`, Name: "Demo Website", Country: US
   - Show the "Hindsight memory bank initialized" toast
2. Go to **SEO Audit** → Select the website → **Run SEO Audit**
   - Wait for the crawl (~3s for unreachable site)
   - Show the health score, issue count breakdown
   - Expand a critical issue to show recommendation
3. Click **View Full Report** → show the complete report page

> **Talking point:** "Every audit result is automatically retained in Hindsight persistent memory. The AI builds a history of your website's SEO health over time."

---

### 3. Keyword Tracking (1 min)

1. Go to **Keywords** → select website → **Add Keyword**
   - Keyword: "best SEO tools", Volume: 2400, Difficulty: 45, Position: 12
2. Click **Record Position** → enter 10 → show the ↑2 improvement indicator
3. Mention CSV import for bulk tracking

---

### 4. Log an Optimization + Outcome (1 min)

1. Go to **Optimizations** → select website → **Log Optimization**
   - Page: `/products`, Action: "Updated H1 to include primary keyword"
   - Before: "Products", After: "Premium SEO Tools & Services"
   - Submit → show "Retained in Hindsight" badge
2. Click **Record Outcome** → slide impact to +7 → enter outcome text
   - Submit → show "Hindsight memory updated" toast

> **Talking point:** "Now Hindsight has evidence that this type of H1 optimization produced a positive outcome. The AI will recall this when making future recommendations."

---

### 5. AI Assistant — Memory-Informed Recommendations (1 min)

1. Go to **AI Assistant** → select website
2. Show the memory toggle: **Use Hindsight Memory** is ON
3. Type: "What optimizations should I prioritize next?"
4. Submit → show recommendation with **memory evidence** section
5. Rate it → show feedback submission and "Hindsight updated" toast

> **Talking point:** "Unlike generic AI tools, SEO-Mind's assistant knows your specific history. See those memory IDs? Those are real evidence retrieved from Hindsight — not hallucinations."

---

### 6. 🌟 Memory Lab — The Hackathon Showcase (2 min)

**This is the centrepiece — spend the most time here.**

1. Go to **Memory Lab** page
2. Read the explanation banner aloud:
   - Scenario A: Same model, no historical memory
   - Scenario B: Same model + Hindsight recall
   - "The only difference is the context we give the AI"
3. Select the website → use default query → **Run Memory Lab Comparison**
4. Show both panels side by side:
   - Point to Scenario A: generic recommendation
   - Point to Scenario B: same model, but now references your actual audit history
   - Show the **Memory Evidence** section — real retrieved memories
5. Highlight the comparison summary at the bottom

> **Key message:** "Both scenarios use the exact same Groq Llama 3 model. Both have access to the same current audit data. The only difference is that Scenario B has historical memory context from Hindsight. This is what memory-augmented AI looks like in practice."

---

### 7. Memory Explorer (30 sec)

1. Go to **Memory Explorer** → select website → **Query Memory Bank**
2. Show the colored memory entries by event type
3. Change the query to "optimization outcomes" → show filtered results

---

## Judging Criteria Checklist

| Criterion | Evidence |
|---|---|
| **Technical Innovation** | Hindsight persistent memory, Memory Lab A vs B |
| **Completeness** | 14 pages, full CRUD, real AI calls |
| **Production Quality** | Docker Compose, JWT auth, SSRF protection, async DB |
| **AI Integration** | Groq Llama 3, structured JSON output, memory-augmented prompts |
| **Use of Hindsight** | 5 event types retained, recall on every recommendation |
| **Demo Clarity** | Memory Lab visually shows memory value proposition |

---

## Fallback: If Hindsight is Offline

The app clearly shows the graceful degradation:
- Settings page shows "Hindsight: Offline" with red indicator
- Memory Lab shows a yellow banner: "Hindsight was offline — responses are equivalent"
- All other features (audits, keywords, optimizations, AI chat) continue working

> Say: "Notice that even with Hindsight offline, every feature still works. We store actions locally and will sync memories when the service comes back. This is production-grade fault tolerance."

---

## Setup Before Demo

```powershell
# 1. Edit .env with your keys
notepad .env

# 2. Start backend
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000

# 3. Start frontend (separate terminal)
cd frontend
npm run dev

# 4. (Optional) Start Hindsight via Docker
docker run -p 7400:7400 vectorize/hindsight:latest
```

---

## Quick Demo Account

After starting, register at http://localhost:3000/register with any credentials.
