# SEO-Mind 🧠

> **An AI-powered SEO optimization platform with persistent memory via Hindsight by Vectorize**

SEO-Mind is an intelligent SEO agent that combines real-time technical audits, keyword tracking, competitor intelligence, and a Groq-powered AI assistant — all enhanced by Hindsight persistent memory. The AI remembers past audits, optimization outcomes, and competitor changes, learning from your history to provide increasingly accurate recommendations.

---

## 🏆 Hackathon Showcase: Memory Lab..

The **Memory Lab** page demonstrates the core innovation: running the same AI query with and without Hindsight historical memory, showing side-by-side how memory context changes recommendations.

- **Scenario A** — Standard AI reasoning, no historical context
- **Scenario B** — Same model + Hindsight recall of past audits, optimizations, and outcomes

---

## ✨ Features

| Feature | Description |
|---|---|
| **SEO Audit Engine** | 8-rule deterministic audit: title, meta, H1, canonical, robots, HTTPS, alt text, word count |
| **Keyword Tracking** | Track positions, trends, CSV import, manual observation recording |
| **AI Assistant** | Groq-powered recommendations with Hindsight memory recall |
| **Memory Lab** | Side-by-side Scenario A vs B comparison (hackathon showcase) |
| **Memory Explorer** | Semantic search over Hindsight memory banks |
| **Competitor Intelligence** | Track and observe competitor pages with Hindsight retention |
| **Optimization History** | Log actions → record outcomes → AI learns what worked |
| **Dashboard** | Recharts-powered SEO health trend charts |

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** — Async Python API
- **SQLAlchemy 2.0** — Async ORM (PostgreSQL / SQLite fallback)
- **Groq** — Llama 3 AI completions (structured JSON output)
- **Hindsight by Vectorize** — Persistent semantic memory (retain / recall / reflect)
- **httpx + BeautifulSoup4** — SSRF-safe web crawler for SEO audits
- **bcrypt** — Password hashing (direct, not passlib)
- **JWT (python-jose)** — Auth tokens

### Frontend
- **React 18 + TypeScript + Vite** — Modern build toolchain
- **Tailwind CSS** — Utility-first dark theme
- **Recharts** — SEO trend charts
- **React Router v6** — Client-side routing
- **TanStack Query** — Server state caching

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Optional: Hindsight by Vectorize running locally or API key

### 1. Clone and Configure

```bash
git clone <repo-url>
cd SEO-Mind
cp .env.example .env
# Edit .env with your GROQ_API_KEY, SECRET_KEY, etc.
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cd ..

# Start backend
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:3000** — API proxied to port 8000.

---

## 🐳 Docker Compose (Full Stack)

```bash
# Copy and edit environment
cp .env.example .env

# Start all services (PostgreSQL, Hindsight, Backend, Frontend)
docker compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs (Swagger)
- Hindsight: http://localhost:7400

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | From [console.groq.com](https://console.groq.com) |
| `SECRET_KEY` | Yes | JWT signing secret (random 32+ chars) |
| `HINDSIGHT_API_KEY` | No | Hindsight/Vectorize API key |
| `HINDSIGHT_BASE_URL` | No | Hindsight URL (default: http://localhost:7400) |
| `DATABASE_URL` | No | PostgreSQL URL (default: SQLite for local dev) |
| `USE_SQLITE_FALLBACK` | No | `True` for local dev without PostgreSQL |

---

## 🧠 Hindsight Memory Architecture

The Hindsight learning loop stores 5 types of events:

```
SEO Action → Outcome → Hindsight retain → Future recall/reflect → Memory-informed recommendation
```

| Event Type | When Stored |
|---|---|
| `audit_summary` | Every SEO audit completion |
| `optimization_action` | Every optimization event logged |
| `ranking_outcome` | When outcome is recorded for an optimization |
| `competitor_change` | On competitor page observation |
| `user_feedback` | On AI recommendation rating |

**Graceful degradation:** If Hindsight is offline, all features continue working normally — `memory_available: false` is returned and shown to the user.

---

## 🧪 Running Tests

```bash
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\pytest backend/tests -v
```

**6 tests, all passing:**
- `test_ssrf_protection` — SSRF blocker
- `test_audit_unreachable_site` — Offline audit handling
- `test_register_user` — Auth registration
- `test_login_user` — Auth login
- `test_get_current_user_profile` — JWT protected routes
- `test_create_and_list_websites` — Website CRUD

---

## 📁 Project Structure

```
SEO-Mind/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Route handlers (auth, websites, audits, etc.)
│   │   ├── core/            # Config, database, security
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic v2 request/response schemas
│   │   └── services/        # Business logic (auditor, crawler, Groq, Hindsight)
│   ├── tests/               # pytest test suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # Typed API client
│   │   ├── components/      # Layout + UI components
│   │   ├── context/         # Auth + Toast context
│   │   └── pages/           # 14 page components
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🎓 Academic Project Notes

This project demonstrates:
1. **Full-stack development** with modern async Python and React TypeScript
2. **AI/ML integration** — Groq LLM with structured output, memory-augmented generation
3. **Persistent AI memory** — Hindsight vector memory store for learning over time
4. **Security best practices** — SSRF protection, JWT auth, bcrypt password hashing
5. **DevOps** — Docker Compose multi-service deployment, Nginx reverse proxy

---

*Built with ❤️ for academic project & hackathon submission*
