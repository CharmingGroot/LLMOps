# LLMOps Platform

Modular ML Pipeline Orchestration Platform

## Architecture

- **Monorepo**: pnpm workspace (TypeScript)
- **Orchestrator**: Registry/Plugin 패턴 기반 파이프라인 엔진
- **State**: MLflow REST API 클라이언트
- **Modules**: Python AI 모듈 (전처리/학습/벤치마크/배포)
- **Dashboard**: Express API + WebSocket + React UI

## Project Structure

```
llmops/
├── packages/
│   ├── core/             # 타입, 에러, 로거(Winston), 검증(Zod)
│   ├── state/            # MLflow 클라이언트, RunManager
│   ├── orchestrator/     # 파이프라인 엔진, Stage 구현체 4종
│   ├── cli/              # CLI (run, status, validate)
│   ├── dashboard-api/    # Express REST API + WebSocket
│   └── dashboard-ui/     # React 컴포넌트
├── modules/              # Python AI 모듈
│   ├── preprocess/
│   ├── train/
│   ├── benchmark/
│   └── deploy/
├── config/               # 파이프라인 설정 예시
├── Dockerfile
└── docker-compose.yml
```

---

## Quick Start (로컬)

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Python >= 3.10

### 설치 및 테스트

```bash
pnpm install
npx vitest run        # 198개 테스트 실행
```

### CLI 사용

```bash
# 설정 파일 검증
npx tsx packages/cli/src/index.ts validate config/pipeline.example.json

# Dry Run (실행 없이 검증만)
npx tsx packages/cli/src/index.ts run config/pipeline.example.json --dry-run

# 도움말
npx tsx packages/cli/src/index.ts --help
```

### Dashboard API 로컬 실행

```bash
# MLflow가 localhost:5000에서 실행 중이어야 합니다
npx tsx packages/dashboard-api/src/server.ts
# → http://localhost:4000/api/health
# → ws://localhost:4000/ws
```

---

## Docker로 실행

### Prerequisites

- Docker >= 20.10
- Docker Compose >= 2.0

### 1. 전체 스택 실행 (MLflow + Dashboard API)

```bash
docker compose up -d
```

이 명령으로 다음 서비스가 시작됩니다:

| 서비스 | 포트 | 설명 |
|--------|------|------|
| MLflow | http://localhost:5000 | MLflow Tracking Server |
| Dashboard API | http://localhost:4000 | REST API + WebSocket |

### 2. 서비스 확인

```bash
# 컨테이너 상태 확인
docker compose ps

# Dashboard API 헬스체크
curl http://localhost:4000/api/health

# MLflow UI 접속
# 브라우저에서 http://localhost:5000 열기
```

### 3. API 테스트

```bash
# Health Check
curl http://localhost:4000/api/health

# Pipeline Runs 조회 (MLflow experiment ID 필요)
curl "http://localhost:4000/api/pipelines/runs?experimentIds=0"

# 특정 Run 조회
curl http://localhost:4000/api/pipelines/runs/{run-id}
```

### 4. WebSocket 연결 테스트

```bash
# wscat 설치 후 (npm i -g wscat)
wscat -c ws://localhost:4000/ws
# → {"type":"connected","message":"Connected to LLMOps pipeline stream",...}
```

### 5. CLI를 Docker로 실행

```bash
# 설정 파일 검증
docker compose run --rm cli validate config/pipeline.example.json

# Dry Run
docker compose run --rm cli run config/pipeline.example.json --dry-run
```

CLI 컨테이너를 docker-compose에 추가하려면:

```yaml
# docker-compose.yml에 추가
  cli:
    build:
      context: .
      target: cli
    environment:
      - MLFLOW_TRACKING_URI=http://mlflow:5000
    depends_on:
      mlflow:
        condition: service_healthy
    profiles:
      - cli
```

### 6. 로그 확인

```bash
docker compose logs -f dashboard-api
docker compose logs -f mlflow
```

### 7. 종료

```bash
docker compose down          # 컨테이너 종료
docker compose down -v       # 볼륨 포함 삭제 (MLflow 데이터 초기화)
```

---

## 개별 Docker 빌드

```bash
# API 이미지만 빌드
docker build --target api -t llmops-api .

# CLI 이미지만 빌드
docker build --target cli -t llmops-cli .

# API 단독 실행 (외부 MLflow 사용)
docker run -p 4000:4000 -e MLFLOW_TRACKING_URI=http://host.docker.internal:5000 llmops-api

# CLI 단독 실행
docker run --rm llmops-cli validate config/pipeline.example.json
```

---

## 테스트

```bash
# 전체 테스트 (198개)
npx vitest run

# Phase별 테스트
npx vitest run packages/core/tests           # Phase 1
npx vitest run packages/state/tests          # Phase 1
npx vitest run packages/orchestrator/tests   # Phase 2, 3
npx vitest run packages/cli/tests            # Phase 4
npx vitest run packages/dashboard-api/tests  # Phase 5
npx vitest run packages/dashboard-ui/tests   # Phase 5

# Watch 모드
npx vitest
```

자세한 테스트 시나리오는 [TEST_SCENARIOS.md](./TEST_SCENARIOS.md)를 참고하세요.

---

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `4000` | Dashboard API 포트 |
| `MLFLOW_TRACKING_URI` | `http://localhost:5000` | MLflow 서버 주소 |
| `LOG_LEVEL` | `info` | 로그 레벨 (error/warn/info/debug) |
| `LOG_FILE` | - | 로그 파일 경로 (설정 시 파일 로깅 활성화) |
| `ERROR_LOG_FILE` | - | 에러 전용 로그 파일 경로 |

## License

MIT
