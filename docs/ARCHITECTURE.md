# SEO-Mind — Architecture Document

## Overview

SEO-Mind follows a **clean three-tier architecture** with an async Python backend, a React TypeScript frontend, and an optional Hindsight persistent memory layer. All AI reasoning goes through Groq (Llama 3), and all deterministic SEO checks are executed in pure Python.

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│           React 18 + TypeScript + Vite SPA              │
│         (Tailwind CSS, Recharts, TanStack Query)        │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/JSON  (Vite proxy /api → :8000)
┌───────────────────────▼─────────────────────────────────┐
│                  FastAPI Backend :8000                   │
│   ┌──────────────┐ ┌───────────────┐ ┌───────────────┐  │
│   │  API Routers │ │   Services    │ │  Auth/Security│  │
│   │  /auth       │ │  AuditorSvc   │ │  JWT + bcrypt │  │
│   │  /websites   │ │  CrawlerSvc   │ │               │  │
│   │  /audits     │ │  GroqSvc      │ └───────────────┘  │
│   │  /keywords   │ │  HindsightSvc │                    │
│   │  /optims     │ │  AgentSvc     │                    │
│   │  /recommends │ └───────────────┘                    │
│   │  /memory     │                                      │
│   │  /agent      │                                      │
│   │  /dashboard  │                                      │
│   └──────────────┘                                      │
└───────┬───────────────────┬─────────────────────────────┘
        │                   │
┌───────▼──────────────────────────┐   ┌────────▼────────┐   ┌──────────────┐
│  PostgreSQL / Neon Cloud DB      │   │ Hindsight :7400 │   │  Groq API    │
│  (SQLAlchemy 2.0 Async + asyncpg │   │ (Vector memory  │   │  (Llama 3.3) │
│   statement_cache_size=0)        │   │  retain/recall) │   │              │
└──────────────────────────────────┘   └─────────────────┘   └──────────────┘
```

---

## Backend Module Map

```
backend/app/
├── main.py                  FastAPI app, lifespan, CORS, router mount
├── core/
│   ├── config.py            Pydantic Settings v2 — env vars, SQLite/PG switching
│   ├── database.py          Async SQLAlchemy engine, session factory, Base
│   └── security.py          bcrypt hashing, JWT create/verify
├── models/
│   ├── user.py              User (id, email, hashed_password, full_name)
│   ├── website.py           Website + WebsitePage
│   ├── audit.py             SEOAudit + SEOIssue
│   ├── keyword.py           Keyword + KeywordObservation
│   ├── optimization.py      OptimizationEvent + OptimizationOutcome
│   ├── competitor.py        Competitor + CompetitorObservation
│   └── recommendation.py    AIRecommendation + RecommendationFeedback
├── schemas/                 Pydantic v2 request/response schemas (one per model)
├── services/
│   ├── crawler_service.py   SSRF-safe httpx crawler + BeautifulSoup4 parser
│   ├── auditor_service.py   8-rule deterministic SEO audit engine
│   ├── groq_service.py      Groq API client with structured JSON output
│   ├── hindsight_service.py REST abstraction over Hindsight (retain/recall/reflect)
│   └── agent_service.py     AI Agent: recommendations + Memory Lab A vs B
└── api/v1/
    ├── deps.py              JWT auth dependency, DB session dependency
    ├── auth.py              Register, Login, Me, Update
    ├── websites.py          Website CRUD + Hindsight bank init
    ├── audits.py            Run audit, List, Get — triggers Hindsight retain
    ├── keywords.py          CRUD, CSV import, observation recording
    ├── optimizations.py     Log event + outcome — Hindsight learning loop
    ├── competitors.py       CRUD + page observation with Hindsight retain
    ├── recommendations.py   Generate with memory, feedback → Hindsight retain
    ├── memory.py            Status, Memory Explorer
    ├── agent.py             Memory Lab comparison endpoint
    ├── dashboard.py         Aggregated metrics
    ├── health.py            Health check
    └── router.py            Master API router
```

---

## Hindsight Memory Design

### Bank Naming Convention
Each website gets its own isolated memory bank:
```
seomind_website_{website_id_with_dashes_replaced_by_underscores}
```

### Event Schema (retained as JSON)
```json
{
  "event_type": "audit_summary | optimization_action | ranking_outcome | competitor_change | user_feedback",
  "website_id": "uuid",
  "content": "Human-readable summary text for semantic indexing",
  "data": { ...structured fields... },
  "created_at": "ISO 8601 timestamp"
}
```

### Memory Lab Comparison Flow
```
User Query
    │
    ├──► Scenario A: GroqSvc.generate(query, context=current_audit_only)
    │
    └──► Scenario B: HindsightSvc.recall(query) → memories
                         │
                         └──► GroqSvc.generate(query, context=current_audit + memories)
```

### Graceful Fallback
All Hindsight calls are wrapped in `try/except`. On failure:
- `memory_available: false` is included in every response
- All CRUD operations continue normally
- Memory Lab Scenario B returns the same response as A with a degraded-mode notice

---

## SEO Audit Engine — 8 Rules

| Rule | Severity | Check |
|---|---|---|
| Title tag | critical | Present, 10–70 chars |
| Meta description | warning | Present, 50–160 chars |
| H1 heading | critical | Exactly one H1 |
| Canonical tag | warning | `<link rel="canonical">` present |
| HTTPS | critical | URL scheme is https |
| Image alt text | warning | All `<img>` tags have `alt` attribute |
| Word count | info | Body text ≥ 250 words |
| Robots meta | info | No `noindex` directive |

Health Score = `100 − (critical × 15) − (warning × 7) − (info × 3)`, clamped to `[0, 100]`.

---

## Security Architecture

| Layer | Mechanism |
|---|---|
| Authentication | JWT HS256 via `python-jose`, 30-day expiry |
| Password hashing | Direct `bcrypt.hashpw` — truncated to 72 bytes before hashing |
| SSRF protection | `crawler_service.is_safe_url()` blocks RFC-1918 + loopback addresses |
| Input validation | Pydantic v2 schemas with strict types on all endpoints |
| CORS | Configured to allow `localhost:3000` and `localhost:5173` in dev |

---

## Data Flow: Optimization Learning Loop

```
1. User logs optimization action
        ↓
2. POST /api/v1/optimizations → OptimizationEvent created in DB
        ↓
3. HindsightSvc.retain("optimization_action", {...})
        ↓ (stored in vector memory)
4. User records outcome weeks later
        ↓
5. POST /api/v1/optimizations/outcome → OptimizationOutcome created
        ↓
6. HindsightSvc.retain("ranking_outcome", {action, outcome, impact_score})
        ↓ (memory updated with result)
7. Next AI recommendation → HindsightSvc.recall() returns this outcome
        ↓
8. Groq generates memory-informed recommendation referencing past success/failure
```

---

## Frontend Architecture

### Component Hierarchy
```
App.tsx (QueryClient + AuthProvider + ToastProvider + Router)
└── AppLayout.tsx (auth guard → Sidebar + main content)
    ├── components/ui/index.tsx    (Card, Button, Badge, Input, Modal, StatCard, ...)
    └── pages/
        ├── LoginPage / RegisterPage       (public)
        ├── DashboardPage                  (Recharts AreaChart)
        ├── WebsitesPage                   (CRUD grid)
        ├── WebsiteDetailsPage             (SVG score ring + tabbed layout)
        ├── SEOAuditPage / AuditReportPage (live crawl + grouped issues)
        ├── KeywordTrackingPage            (table with ↑↓ trend indicators)
        ├── OptimizationsPage              (timeline + impact slider)
        ├── AIAssistantPage                (memory toggle + evidence display)
        ├── CompetitorsPage                (CRUD + observe flow)
        ├── MemoryLabPage                  (A vs B side-by-side comparison)
        ├── MemoryExplorerPage             (semantic search + event coloring)
        ├── SettingsPage                   (service health + config ref)
        └── ProfilePage                    (account management)
```

### State Management Strategy
- **Server state** — TanStack Query with 30s stale time, 1 retry
- **Auth state** — React Context (`AuthContext`) backed by `localStorage` JWT
- **UI state** — Local `useState` per component (modals, forms, loading)
- **Toast notifications** — React Context (`ToastContext`) with auto-dismiss

---

## Database Schema (simplified ERD)

```
users (id, email, hashed_password, full_name, is_active, is_superuser)
  │
  └── websites (id, user_id, domain, name, target_country, hindsight_bank_id)
        │
        ├── seo_audits (id, website_id, health_score, created_at)
        │     └── seo_issues (id, audit_id, severity, title, description, recommendation)
        │
        ├── keywords (id, website_id, keyword, current_position, previous_position)
        │     └── keyword_observations (id, keyword_id, position, source)
        │
        ├── optimization_events (id, website_id, page_url, action_taken, ...)
        │     └── optimization_outcomes (id, optimization_id, description, impact_score)
        │
        ├── competitors (id, website_id, name, domain_url)
        │     └── competitor_observations (id, competitor_id, page_url, ...)
        │
        └── ai_recommendations (id, website_id, title, description, priority, ...)
              └── recommendation_feedback (id, recommendation_id, rating, ...)
```
