# Server - Tender Management System

Express-based API for the Tender Management System.

## Setup

1. Copy `.env.example` to `.env` and fill in values.
2. Install dependencies.

```bash
npm install
```

## Development

```bash
npm run dev
```

Server runs on http://localhost:5000 by default.

## Environment Variables (key ones)

- `PORT` - server port (default: 5000)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Postgres connection
- `JWT_SECRET` - JWT signing secret (required)
- `OPENAI_API_KEY` - required for AI features
- `OPENAI_CHAT_MODEL`, `OPENAI_EMBEDDING_MODEL`, `OPENAI_CHAT_TEMPERATURE` - AI tuning (optional)
- `CORS_ORIGINS` - comma-separated allowlist (e.g., http://localhost:5173)
- `CORS_ALLOW_CREDENTIALS` - whether to allow credentials (true/false)
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` - rate limiting window and max requests per window

## Routes

- `GET /health` - health check
- `POST /api/auth/login` - login
- `POST /api/auth/register` - register
- `GET /api/auth/me` - get current user
- `GET /api/tenders/:id` - get tender by id
- `POST /api/ai/query` - ask AI about published tender (auth)
- `POST /api/ai/generate` - AI-assisted draft content for tender (auth, authority)
