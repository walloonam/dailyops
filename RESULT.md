# DailyOps 결과 요약

이 문서는 DailyOps 풀스택 스켈레톤 생성 결과를 한국어로 정리한 것입니다.

## 생성된 구조
- `dailyops/` 루트에 API(Rust/Axum)와 Web(React/Vite) 앱을 분리 구성했습니다.
- 백엔드는 `apps/api`, 프론트는 `apps/web`에 위치합니다.

## 백엔드 (Rust / Axum)
- 기본 라우팅과 인증/CRUD가 동작하도록 구성했습니다.
- 주요 엔드포인트:
  - `GET /healthz`
  - `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`
  - `POST/GET/GET:id/PATCH/DELETE /api/v1/tasks`
  - `POST/GET/GET:id/PATCH/DELETE /api/v1/notes`
  - `GET /api/v1/dashboard/summary`
- JWT 인증 미들웨어를 통해 `user_id` 기반으로 접근을 제한합니다.
- sqlx migrations 기반 테이블 생성 스크립트를 포함했습니다.

## 프론트 (React / Vite)
- 라우팅 구조와 공통 레이아웃(사이드바 + 헤더)을 구성했습니다.
- 로그인/회원가입, 대시보드, 태스크/노트 CRUD, 캘린더, 설정 페이지가 포함됩니다.
- API 클라이언트는 `Authorization` 헤더를 자동으로 첨부합니다.
- 태스크 목록은 검색/필터/정렬/페이지네이션을 지원합니다.

## 주요 파일 위치
- 백엔드 코드: `apps/api/src/`
- 마이그레이션: `apps/api/migrations/`
- 프론트 페이지: `apps/web/src/pages/`
- 공통 레이아웃/컴포넌트: `apps/web/src/components/`
- 환경변수 예시: `.env.example`

## 실행 요약
1) DB 준비 및 마이그레이션
```
cd apps/api
cp .env.example .env
sqlx migrate run
```
2) 백엔드 실행
```
cd apps/api
cargo run
```
3) 프론트 실행
```
cd apps/web
pnpm i
pnpm dev
```

## 참고
- Docker/K8s/배포 설정은 포함하지 않았습니다.
- 개발용 스켈레톤이므로 필요에 따라 검증/에러 처리 강화가 가능합니다.
