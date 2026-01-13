# DailyOps

풀스택 개인 운영 대시보드입니다. (개발 환경 기준)

## 사전 요구사항
- Rust stable
- Node.js 18+
- pnpm
- 로컬 Postgres

Docker로 Postgres 예시(이미 있다면 생략):
```bash
docker run --name dailyops-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dailyops -p 5432:5432 -d postgres:16
```

## 데이터베이스 설정
```bash
cd apps/api
cp .env.example .env
# 필요하면 DATABASE_URL 수정
sqlx migrate run
```

## 백엔드 실행
```bash
cd apps/api
cargo run
```
API 주소: http://localhost:8080

### 로컬 AI(Ollama) 옵션
```bash
# 로컬에서 사용할 모델 다운로드 (예: phi3.5:mini)
ollama pull phi3.5:mini
ollama serve  # http://localhost:11434

# apps/api/.env에 설정 (기본값 그대로면 수정 불필요)
AI_BASE_URL=http://localhost:11434
AI_MODEL=phi3.5:mini
```
- 위 설정 후 `/assistant` 엔드포인트 요청 시 로컬 Ollama를 통해 응답합니다.

## 프론트엔드 실행
```bash
cd apps/web
pnpm i
pnpm dev
```
웹 주소: http://localhost:5173

## 배포 설정 예시(프런트·백 동일 서버)
- 백엔드 서비스: 127.0.0.1:8080 등 내부 포트로 띄우고, Nginx 등 리버스 프록시가 `https://your-domain/api` → `http://127.0.0.1:8080`으로 전달.
- 프런트 정적 파일: `https://your-domain`에서 서빙.
- 브라우저가 볼 API 주소는 도메인 기준이어야 하므로 `.env`에 다음처럼 설정:
  - `VITE_API_BASE_URL=https://your-domain/api`
  - `VITE_MOCK=false`
- 백엔드 `.env` 기본값 예시:
  - `DATABASE_URL=postgres://<user>:<password>@127.0.0.1:5432/dailyops`
  - `JWT_SECRET`는 강한 랜덤 문자열로 변경
  - `PORT=8080` (필요 시 변경)
  - `AI_BASE_URL`/`AI_MODEL`: 로컬 또는 외부 모델 엔드포인트에 맞게 설정

## 참고
- JWT가 localStorage에 저장됩니다.
- 먼저 회원가입(Signup) 페이지에서 계정을 만든 뒤 사용하세요.
