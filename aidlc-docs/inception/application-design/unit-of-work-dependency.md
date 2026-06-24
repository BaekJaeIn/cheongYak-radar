# 청약레이더 — Unit of Work Dependency

## 의존 매트릭스
| Unit \ depends on | U1 | U2 | U3 | U4 | U5 |
|---|:--:|:--:|:--:|:--:|:--:|
| **U1 수집** | – | ✅(write notices) | – | △(요약 컬럼/프롬프트는 U4 소유) | △(push 트리거→U5) |
| **U2 데이터** | – | – | – | – | – |
| **U3 탐색·필터** | – | ✅(read) | – | – | – |
| **U4 상세·AI** | – | ✅(read) | – | – | – |
| **U5 개인화·PWA·알림** | △(신규공고 트리거 from U1) | ✅(read/subs) | – | – | – |

✅ 강한 의존 / △ 약한·런타임 협력

## 핵심 사실
- **U2는 모든 단위의 기반** — 데이터 타입·테이블·RLS 확정이 선행되어야 함. → 가장 먼저.
- **U1 → U2(write)**: 수집은 Upserter(U2) 경유로 저장.
- **U3·U4·U5 → U2(read)**: 화면은 NoticeRepository(U2) 경유 조회.
- **U1 ↔ U4 협력**: 요약 생성기(C6)는 U1 수집 파이프라인에서 실행되지만, 모델/프롬프트/표시 규칙은 U4 소유. 코드상 `supabase/functions/collect/summarizer`에 위치, 사양은 U4 Functional Design에서 정의.
- **U1 ↔ U5 협력**: 신규 공고 발생 시 U1이 PushDispatcher(U5)를 트리거.

## 빌드/개발 순서 (Critical Path)
```
U2 (데이터 플랫폼)        ← 우선, 다른 모든 단위의 선행조건
  └→ U1 (수집, 목업 우선)
  └→ U3 (탐색·필터)
       └→ U4 (상세·AI)    ← U1의 요약 컬럼과 협력
            └→ U5 (개인화·PWA·알림)  ← U1 push 트리거와 협력
```
- **순차 진행**(Q-U2=A): U2 → U1 → U3 → U4 → U5.
- **병행 여지**: U3는 U2 완료 후 목업 데이터로 U1과 무관하게 진행 가능(개인 개발은 순차 권장).

## 통합 지점 (Integration Points)
1. **U1→U2**: `NoticeUpserter.upsertMany()` 계약 (Notice 타입)
2. **U3/U4→U2**: `NoticeRepository.list/getById` 계약 (NoticeFilter 타입)
3. **U1→U4**: `notices.eligibility_summary` 컬럼 (요약 저장 형식)
4. **U1→U5**: 신규 `newIds` → `PushDispatcher.dispatchForNew()`
5. **U5→U2**: push subscriptions 테이블

## 리스크/완화
- 외부 API 스키마 불확실 → U1을 목업 모드로 먼저(US-1.7), 계약(Notice)으로 격리.
- SH HTML 변동 → U1 내 격리(파싱 실패 skip).
- Free tier → U2 인덱스로 쿼리 비용 최소화.

## v2 추가 — U6 의존 (프로필·매칭·추천)
- **U6 → U2**: `notices`(서울·경기) + `household_profile` 읽기.
- **U6 ← U1**: U1이 `notices.eligibility`(JSONB criteria) 적재(C28) → U6 매칭 입력.
- **U6 → U5**: 신규 자격충족 → Push (US-6.7).
- **U3/U4 → U6**: 추천 피드/자격판정 표시 위해 RecommendationService 사용.
- **순서(v2)**: 0004 마이그레이션(eligibility+profile) → U1 criteria 보강 → **U6** → U3 → U4 → U5.
- 리스크: 자격조건 자동 추출 난이도 → 기준표(config)+Claude 보조, 미상값은 가정/보수적 판정.
