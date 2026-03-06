# LLMOps 작업 계획서

## 완료된 작업 (Phase 1~5)

- [x] Phase 1: Core Infrastructure (타입, 에러, 로거, 검증, MLflow 클라이언트)
- [x] Phase 2: Orchestration Engine (PipelineEngine, StageRegistry, EventBus)
- [x] Phase 3: Module Implementation (Python 스켈레톤 모듈 4종)
- [x] Phase 4: CLI & Monitoring (run/status/validate 명령)
- [x] Phase 5: Dashboard (Express API + WebSocket + React 컴포넌트)
- [x] Docker 컨테이너화 (Dockerfile + docker-compose.yml)
- [x] 테스트 198개 전체 통과
- [x] TypeScript 빌드 오류 수정 및 Docker 정상 실행

---

## Phase 6: Dashboard UI 완성 (B)

### 목표
브라우저에서 접근 가능한 대시보드 앱 완성 (Vite + React SPA)

### 6-1. 프로젝트 설정
- [ ] Vite 번들러 도입 (dashboard-ui 패키지)
- [ ] index.html 엔트리포인트 생성
- [ ] CSS 기본 스타일링 (다크 테마, 레이아웃)
- [ ] API 프록시 설정 (dev 모드에서 dashboard-api 연동)

### 6-2. 페이지 및 레이아웃
- [ ] App.tsx — 메인 레이아웃 (사이드바 + 콘텐츠)
- [ ] Header — 로고, ConnectionIndicator, 네비게이션
- [ ] Sidebar — 메뉴 (Dashboard, Runs, Config)

### 6-3. Dashboard 메인 페이지
- [ ] PipelineOverview — 최근 실행 요약, 성공/실패 통계
- [ ] RunList 연동 — API에서 실행 목록 조회
- [ ] 자동 새로고침 (WebSocket 이벤트 수신 시)

### 6-4. Run 상세 페이지
- [ ] RunDetail — 개별 Run 정보 (파라미터, 메트릭, 태그)
- [ ] StageTimeline — 스테이지별 실행 상태 타임라인
- [ ] MetricsChart — 메트릭 시각화 (간단한 바 차트)
- [ ] ArtifactList — 아티팩트 목록 표시

### 6-5. 실시간 모니터링
- [ ] LiveLog — WebSocket 기반 실시간 로그 스트림
- [ ] 실행 상태 실시간 변경 반영

### 6-6. Docker 연동
- [ ] Vite 빌드 → Nginx로 정적 파일 서빙
- [ ] Dockerfile에 dashboard-ui 타겟 추가
- [ ] docker-compose.yml에 dashboard-ui 서비스 추가 (포트 3000)
- [ ] API 프록시 (Nginx → dashboard-api:4000)

### 6-7. 테스트
- [ ] 기존 컴포넌트 테스트 유지 (198개)
- [ ] 신규 컴포넌트 테스트 추가
- [ ] E2E 동작 확인 (docker compose up → 브라우저 접속)

### 완료 조건
```bash
npx vitest run                          # 전체 테스트 통과
docker compose up -d                     # 3서비스 정상 실행
# http://localhost:3000 → 대시보드 화면 표시
# http://localhost:4000/api/health → OK
# http://localhost:5000 → MLflow UI
```

---

## Phase 7: 실제 LLM 파이프라인 모듈 구현 (A)

### 목표
Python 모듈에 실제 AI 로직 구현 — HuggingFace 기반 텍스트 분류 파이프라인

### 7-1. 공통 인프라
- [ ] modules/requirements.txt — 공통 의존성 (transformers, datasets, torch, mlflow)
- [ ] modules/common/mlflow_utils.py — MLflow 로깅 헬퍼
- [ ] modules/common/config.py — 모듈 공통 설정 파서

### 7-2. preprocess 모듈
- [ ] HuggingFace datasets 로드 (예: imdb, ag_news)
- [ ] 토크나이징 (AutoTokenizer)
- [ ] Train/Val/Test 분할
- [ ] 전처리 결과 저장 및 METRIC 출력

### 7-3. train 모듈
- [ ] HuggingFace Trainer API 연동
- [ ] 에폭별 loss/accuracy METRIC 출력 (step 기반)
- [ ] 체크포인트 저장, ARTIFACT 출력
- [ ] MLflow에 모델 아티팩트 로깅

### 7-4. benchmark 모듈
- [ ] 테스트 데이터셋으로 평가 (accuracy, f1, precision, recall)
- [ ] 추론 레이턴시/처리량 측정
- [ ] 게이팅 조건 검증 (accuracy >= threshold)
- [ ] METRIC 출력

### 7-5. deploy 모듈
- [ ] MLflow Model Registry 등록
- [ ] 모델 스테이지 전환 (None → Staging → Production)
- [ ] DEPLOY 출력

### 7-6. Docker 연동
- [ ] Python 의존성 Docker 이미지에 포함
- [ ] GPU 지원 옵션 (nvidia-docker)
- [ ] 예시 데이터셋 포함 또는 자동 다운로드

### 완료 조건
```bash
# 로컬에서 전체 파이프라인 실행
npx tsx packages/cli/src/index.ts run config/pipeline.example.json
# → preprocess → train → benchmark → deploy 순차 실행
# → MLflow에 메트릭/파라미터/아티팩트 기록 확인
```

---

## Phase 8: CI/CD 파이프라인 (C)

### 목표
GitHub Actions로 테스트/빌드/배포 자동화

### 8-1. CI 워크플로우
- [ ] .github/workflows/ci.yml
- [ ] PR 시 자동 테스트 실행 (vitest)
- [ ] TypeScript 빌드 검증
- [ ] Python 린트 (ruff/flake8)

### 8-2. CD 워크플로우
- [ ] .github/workflows/cd.yml
- [ ] main 푸시 시 Docker 이미지 빌드
- [ ] GitHub Container Registry (ghcr.io) 푸시
- [ ] 이미지 태깅 (latest + commit SHA)

### 8-3. 품질 게이트
- [ ] 테스트 커버리지 리포트
- [ ] 빌드 실패 시 머지 차단 (branch protection)

### 완료 조건
```bash
# PR 생성 → CI 자동 실행 → 테스트 통과 확인
# main 머지 → CD 실행 → ghcr.io에 이미지 푸시 확인
```

---

## Phase 9: 모델 레지스트리 연동 (D)

### 목표
MLflow Model Registry를 활용한 모델 버전 관리 및 승격 워크플로우

### 9-1. Model Registry API
- [ ] packages/state — MLflow Model Registry 클라이언트 메서드 추가
  - registerModel, transitionModelStage, getLatestVersions
- [ ] 모델 등록/조회/스테이지 전환 API

### 9-2. Dashboard 연동
- [ ] 모델 목록 페이지 (Model Registry 조회)
- [ ] 모델 버전 비교 (메트릭 비교 테이블)
- [ ] 스테이지 전환 UI (Staging → Production 버튼)

### 9-3. 자동 승격 로직
- [ ] 벤치마크 통과 시 자동 Staging 등록
- [ ] 수동 승인 후 Production 전환
- [ ] 롤백 기능

### 9-4. API 엔드포인트
- [ ] GET /api/models — 등록된 모델 목록
- [ ] GET /api/models/:name/versions — 버전 목록
- [ ] POST /api/models/:name/promote — 스테이지 전환

### 완료 조건
```bash
# 파이프라인 실행 후 모델 자동 등록 확인
# 대시보드에서 모델 버전 조회 및 승격 가능
# curl http://localhost:4000/api/models → 모델 목록 응답
```

---

## 작업 순서 요약

| 순서 | Phase | 내용 | 상태 |
|------|-------|------|------|
| 1 | Phase 1~5 | Core → Orchestrator → Module → CLI → Dashboard | 완료 |
| 2 | Docker | 컨테이너화 + 빌드 오류 수정 | 완료 |
| 3 | **Phase 6** | **Dashboard UI 완성 (Vite + React SPA)** | **진행 예정** |
| 4 | Phase 7 | 실제 LLM 파이프라인 모듈 구현 | 대기 |
| 5 | Phase 8 | CI/CD 파이프라인 (GitHub Actions) | 대기 |
| 6 | Phase 9 | 모델 레지스트리 연동 | 대기 |
