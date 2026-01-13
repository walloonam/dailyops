# DailyOps

Fullstack personal ops dashboard. Dev-only setup.

## Prerequisites
- Rust stable
- Node.js 18+
- pnpm
- Postgres running locally

Example Postgres (Docker optional, but not required):
```
# If you already have Postgres, skip this.
docker run --name dailyops-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dailyops -p 5432:5432 -d postgres:16
```

## Database setup
```
cd apps/api
cp .env.example .env
# edit DATABASE_URL if needed
sqlx migrate run
```

## Run backend
```
cd apps/api
cargo run
```

API runs on http://localhost:8080

### Local AI 비서 (Ollama)
```
# 로컬에서 모델 준비 (예: phi3.5:mini)
ollama pull phi3.5:mini
ollama serve  # http://localhost:11434

# apps/api/.env 에 설정 (기본값 그대로면 생략 가능)
AI_BASE_URL=http://localhost:11434
AI_MODEL=phi3.5:mini
```
- 프런트에서 `/assistant` 페이지로 접속하면 로컬 Ollama를 통해 업무/노트 컨텍스트 기반 답변을 받습니다.

## Run frontend
```
cd apps/web
pnpm i
pnpm dev
```

Web runs on http://localhost:5173

## Notes
- JWT stored in localStorage
- Use the Signup page first
