# LLMOps 테스트 시나리오

## 사전 준비

```bash
cd llmops
pnpm install
```

---

## 시나리오 1: 전체 테스트 실행

모든 Phase의 테스트를 한 번에 실행합니다.

```bash
npx vitest run
```

**기대 결과:** 25개 파일, 198개 테스트 전부 PASS

---

## 시나리오 2: Phase별 테스트 실행

### Phase 1 — Core Infrastructure
```bash
npx vitest run packages/core/tests
npx vitest run packages/state/tests
```

**검증 항목:**
- 타입 정의 (StageType, PipelineEvent enum 값)
- Zod 검증 (유효/무효 config, 순환 의존성 감지)
- 에러 클래스 계층 (LLMOpsError → 7개 하위 클래스)
- Logger 동작 (winston child logger, 로그 레벨)
- MLflowClient CRUD (axios mock 기반)
- RunManager 파이프라인 생명주기

### Phase 2 — Orchestration Engine
```bash
npx vitest run packages/orchestrator/tests/stage-registry.test.ts
npx vitest run packages/orchestrator/tests/event-bus.test.ts
npx vitest run packages/orchestrator/tests/pipeline-engine.test.ts
npx vitest run packages/orchestrator/tests/base-stage.test.ts
npx vitest run packages/orchestrator/tests/stream-handler.test.ts
```

**검증 항목:**
- Registry: 등록/조회/삭제/덮어쓰기
- EventBus: on/off/once/emit/broadcast/removeAll
- PipelineEngine: 순차 실행, 스킵, 실패 시 중단, 컨텍스트 전파
- BaseStage: 성공/실패 생명주기
- StreamHandler: stdout/stderr 로그 레벨 감지

### Phase 3 — Module Implementation
```bash
npx vitest run packages/orchestrator/tests/preprocess-stage.test.ts
npx vitest run packages/orchestrator/tests/train-stage.test.ts
npx vitest run packages/orchestrator/tests/benchmark-stage.test.ts
npx vitest run packages/orchestrator/tests/deploy-stage.test.ts
```

**검증 항목:**
- 각 Stage가 IStage 인터페이스 준수
- stdout에서 METRIC:/ARTIFACT:/DEPLOY: 파싱
- MLflow 메트릭 로깅 연동
- 벤치마크 게이팅: gt/gte/lt/lte/eq/ne 연산자 6종
- 게이팅 실패 시 예외 발생

### Phase 4 — CLI
```bash
npx vitest run packages/cli/tests
```

**검증 항목:**
- run/status/validate 커맨드 생성 및 옵션 파싱
- Config 파일 로드 (유효 JSON, 파일 없음, 잘못된 JSON)
- 결과 포맷터 (성공/실패/스킵 상태, 시간 표시)

### Phase 5 — Dashboard
```bash
npx vitest run packages/dashboard-api/tests
npx vitest run packages/dashboard-ui/tests
```

**검증 항목:**
- API: GET /api/health 응답, GET /api/pipelines/runs 목록, 에러 처리
- WebSocket: 연결, welcome 메시지, broadcast, 연결 해제
- UI: StatusBadge 렌더링 (6가지 상태), RunList (로딩/에러/빈/데이터), ConnectionIndicator (4가지 상태 + 재연결 버튼)

---

## 시나리오 3: CLI 직접 실행 (Config 검증)

```bash
# TypeScript 직접 실행 (빌드 없이)
npx tsx packages/cli/src/index.ts validate config/pipeline.example.json
```

**기대 결과:**
```
Configuration is valid.
  Pipeline: LLM Training Pipeline (llm-pipeline-001)
  Stages:   4
  MLflow:   http://localhost:5000
  Flow:     preprocess → train → benchmark → deploy
```

---

## 시나리오 4: CLI Dry Run

```bash
npx tsx packages/cli/src/index.ts run config/pipeline.example.json --dry-run
```

**기대 결과:**
```
[DRY RUN] Configuration is valid.
Pipeline: LLM Training Pipeline (llm-pipeline-001)
Stages: preprocess → train → benchmark → deploy
```

---

## 시나리오 5: CLI 도움말

```bash
npx tsx packages/cli/src/index.ts --help
npx tsx packages/cli/src/index.ts run --help
npx tsx packages/cli/src/index.ts status --help
```

**기대 결과:** 각 커맨드의 옵션과 인자 설명 출력

---

## 시나리오 6: Watch 모드 테스트 (개발 중)

```bash
npx vitest
```

파일을 수정하면 관련 테스트가 자동으로 재실행됩니다.

---

## 시나리오 7: 특정 테스트만 실행

```bash
# 패턴 매칭
npx vitest run -t "gating"
npx vitest run -t "WebSocket"
npx vitest run -t "MLflow"
```

---

## 시나리오 8: Python 모듈 직접 실행

```bash
python modules/preprocess/main.py --run-id test-001 --mlflow-tracking-uri http://localhost:5000 --experiment-id exp-1
python modules/train/main.py --run-id test-001 --mlflow-tracking-uri http://localhost:5000 --experiment-id exp-1 --epochs 5
python modules/benchmark/main.py --run-id test-001 --mlflow-tracking-uri http://localhost:5000 --experiment-id exp-1
python modules/deploy/main.py --run-id test-001 --mlflow-tracking-uri http://localhost:5000 --experiment-id exp-1 --target staging
```

**기대 결과:** 각 모듈이 METRIC:/ARTIFACT:/DEPLOY: 형식으로 stdout 출력

---

## 프로젝트 구조 요약

```
llmops/
├── packages/
│   ├── core/           (타입, 에러, 로거, 검증)
│   ├── state/          (MLflowClient, RunManager)
│   ├── orchestrator/   (PipelineEngine, Registry, Stage 구현체 4개)
│   ├── cli/            (run, status, validate 커맨드)
│   ├── dashboard-api/  (Express API, WebSocket)
│   └── dashboard-ui/   (React 컴포넌트, 훅)
├── modules/            (Python 모듈 4개)
├── config/             (파이프라인 설정 예시)
└── 198개 테스트 전부 통과
```
