# SEO-Mind API Reference

Base URL: `http://localhost:8000/api/v1`

All protected endpoints require: `Authorization: Bearer <jwt_token>`

Interactive docs: http://localhost:8000/docs

---

## Authentication

### POST /auth/register
Create a new user account.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "minLength8",
  "full_name": "Jane Smith"
}
```
**Response 201:**
```json
{
  "access_token": "eyJ...",
  "user": { "id": "uuid", "email": "...", "full_name": "...", "is_active": true }
}
```

### POST /auth/login
Authenticate and receive a JWT token. (form-encoded)

**Request:** `application/x-www-form-urlencoded`
- `username` — email address
- `password` — password

**Response 200:**
```json
{ "access_token": "eyJ...", "user": { ... } }
```

### GET /auth/me *(protected)*
Get the current user's profile.

### PUT /auth/me *(protected)*
Update profile fields (`full_name`, `new_password`).

---

## Websites

### POST /websites *(protected)*
Create a website and initialize its Hindsight memory bank.

**Request body:**
```json
{
  "domain": "example.com",
  "name": "My Website",
  "target_country": "US",
  "description": "Optional"
}
```
**Response 201:** Website object with `hindsight_bank_id`.

### GET /websites *(protected)*
List all websites belonging to the current user.

### GET /websites/{id} *(protected)*
Get a single website with aggregated stats.

### PUT /websites/{id} *(protected)*
Update website metadata.

### DELETE /websites/{id} *(protected)*
Delete website and all associated data.

---

## SEO Audits

### POST /audits/run *(protected)*
Crawl a page and run 8 SEO checks. Result is retained in Hindsight.

**Request body:**
```json
{
  "website_id": "uuid",
  "url": "https://example.com/page"  // optional — uses domain root if omitted
}
```
**Response 200:**
```json
{
  "id": "uuid",
  "website_id": "uuid",
  "health_score": 72,
  "total_issues": 4,
  "critical_count": 1,
  "warning_count": 2,
  "info_count": 1,
  "summary": "AI-generated summary...",
  "issues": [
    {
      "id": "uuid",
      "severity": "critical | warning | info",
      "title": "Missing meta description",
      "description": "...",
      "recommendation": "...",
      "affected_url": "..."
    }
  ],
  "audit_data": { "page_details": { ... } },
  "created_at": "ISO 8601"
}
```

### GET /audits/website/{website_id} *(protected)*
List all audits for a website, newest first.

### GET /audits/{id} *(protected)*
Get a full audit report including all issues.

---

## Keywords

### POST /keywords *(protected)*
Add a keyword to track.

**Request body:**
```json
{
  "website_id": "uuid",
  "keyword": "best seo tools",
  "target_page": "/products",
  "search_volume": 2400,
  "difficulty": 45,
  "current_position": 12
}
```

### GET /keywords/website/{website_id} *(protected)*
List all keywords for a website with current/previous positions.

### POST /keywords/observation *(protected)*
Record a new position observation.

**Request body:**
```json
{
  "keyword_id": "uuid",
  "position": 8,
  "source": "manual | gsc | semrush"
}
```

### POST /keywords/import-csv/{website_id} *(protected)*
Upload a CSV file (`multipart/form-data`, field name: `file`).

**CSV format:** `keyword, position, target_page, search_volume, difficulty`

---

## Optimizations

### POST /optimizations *(protected)*
Log an SEO optimization action. Retained in Hindsight.

**Request body:**
```json
{
  "website_id": "uuid",
  "page_url": "/products",
  "action_taken": "Updated H1 to include primary keyword",
  "previous_state": "Products",
  "new_state": "Premium SEO Tools",
  "notes": "Optional context"
}
```

### GET /optimizations/website/{website_id} *(protected)*
List optimization history for a website.

### POST /optimizations/outcome *(protected)*
Record the outcome of an optimization. Updates Hindsight memory.

**Request body:**
```json
{
  "optimization_id": "uuid",
  "outcome_description": "Position improved from 18 to 11 in 4 weeks",
  "impact_score": 7
}
```
`impact_score`: integer from -10 (negative) to +10 (very positive)

---

## Competitors

### POST /competitors *(protected)*
Add a competitor to track.

### GET /competitors/website/{website_id} *(protected)*
List competitors with their latest observations.

### POST /competitors/{id}/observe *(protected)*
Crawl a competitor page and store observation in Hindsight.

**Query param:** `?page_url=https://competitor.com/page`

---

## AI Recommendations

### POST /recommendations/generate *(protected)*
Generate a memory-informed AI recommendation via Groq.

**Request body:**
```json
{
  "website_id": "uuid",
  "user_query": "What should I fix first?",
  "use_hindsight_memory": true
}
```
**Response 201:**
```json
{
  "id": "uuid",
  "title": "Fix missing meta descriptions",
  "description": "...",
  "reasoning": "...",
  "priority": "high | medium | low",
  "implementation_steps": ["Step 1", "Step 2"],
  "affected_page": "/products",
  "memory_ids": ["id1", "id2"],
  "created_at": "ISO 8601"
}
```
`memory_ids` — actual Hindsight memory IDs used (never fabricated).

### GET /recommendations/website/{website_id} *(protected)*
List recommendations newest-first.

### POST /recommendations/feedback *(protected)*
Submit feedback. Retained in Hindsight to improve future recommendations.

**Request body:**
```json
{
  "recommendation_id": "uuid",
  "rating": 4,
  "feedback_text": "Helpful, but I want more detail on implementation"
}
```

---

## Memory

### GET /memory/status *(protected)*
Get Hindsight service health.

**Response:**
```json
{
  "hindsight_online": true,
  "hindsight_url": "http://localhost:7400",
  "bank_count": 3,
  "message": "Hindsight is online"
}
```

### GET /memory/explorer/{website_id} *(protected)*
Semantic search over a website's memory bank.

**Query params:**
- `q` — search query (default: "SEO history")
- `limit` — max results (default: 10)

---

## Memory Lab (Agent)

### POST /agent/memory-lab-comparison *(protected)*
Run side-by-side Scenario A (no memory) vs Scenario B (Hindsight memory).

**Query params:**
- `website_id` — required
- `user_query` — required

**Response:**
```json
{
  "query": "What should I focus on next?",
  "website_id": "uuid",
  "memory_available": true,
  "scenario_a": {
    "summary": "Without memory analysis...",
    "recommendations": ["Fix meta tags", "Improve H1"],
    "historical_context": null,
    "memory_ids": []
  },
  "scenario_b": {
    "summary": "With memory analysis...",
    "recommendations": ["Focus on title tags based on past success"],
    "historical_context": "Past audits show title issues improved scores by 15 points",
    "memory_ids": [{ "event_type": "audit_summary", "content": "..." }],
    "memories_retrieved": 4
  },
  "comparison_summary": "Memory context added specific historical evidence..."
}
```

---

## Dashboard

### GET /dashboard/metrics *(protected)*
Aggregated stats across all the user's websites.

**Response:**
```json
{
  "total_websites": 3,
  "latest_health_score": 72,
  "total_issues": 8,
  "critical_issues": 2,
  "tracked_keywords": 15,
  "total_optimizations": 12,
  "hindsight_online": true
}
```

---

## Health

### GET /health
No auth required. Returns service status.

```json
{
  "status": "healthy",
  "service": "SEO-Mind API",
  "database": "ok",
  "hindsight_memory_status": "online | offline_fallback"
}
```
