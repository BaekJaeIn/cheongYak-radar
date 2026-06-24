# AI-DLC State Tracking

## Project Information
- **Project Name**: 청약레이더 (CheongYak Radar)
- **Project Type**: Greenfield
- **Start Date**: 2026-06-24T05:47:53Z
- **Current Stage**: CONSTRUCTION - Unit U1 (Collection Pipeline) - Functional Design
- **Unit Order**: U2 ✅ → U1 (current) → U3 → U4 → U5
- **Current Unit**: U1 Collection Pipeline
- **Source of Intent**: SPEC.md (project specification provided by user)

## Workspace State
- **Existing Code**: No
- **Reverse Engineering Needed**: No
- **Build System**: None yet (planned: npm / Next.js 14)
- **Project Structure**: Empty (docs + spec only)
- **Workspace Root**: /Users/baekjaein/git-repo/cheongYak-radar

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | No | Requirements Analysis |
| Resiliency Baseline | No | Requirements Analysis |
| Property-Based Testing | No | Requirements Analysis |

## Execution Plan Summary
- **Stages to Execute**: Application Design, Units Generation, Functional Design (per-unit), Infrastructure Design (per-unit), Code Generation (per-unit), Build and Test
- **Stages to Skip**: Reverse Engineering (greenfield), NFR Requirements (tech stack fixed by SPEC; NFRs already captured; extensions off), NFR Design (follows NFR Requirements skip)
- **Proposed Units**: U1 수집 파이프라인 · U2 데이터 플랫폼 · U3 탐색·필터 UI · U4 상세·AI 요약 · U5 개인화·PWA·알림

## Stage Progress
### 🔵 INCEPTION PHASE
- [x] Workspace Detection
- [x] Reverse Engineering (SKIP — greenfield)
- [x] Requirements Analysis
- [x] User Stories
- [x] Workflow Planning
- [x] Application Design — EXECUTE
- [x] Units Generation — EXECUTE

### 🟢 CONSTRUCTION PHASE
**Unit U2 (Data Platform)** — ✅ COMPLETE
- [x] Functional Design
- [~] NFR Requirements — SKIP
- [~] NFR Design — SKIP
- [x] Infrastructure Design
- [x] Code Generation (vitest 21 passed)
**Unit U1 (Collection Pipeline)** — ✅ COMPLETE (+v2 criteria 보강)
- [x] Functional Design — DONE
- [~] NFR Requirements — SKIP
- [~] NFR Design — SKIP
- [x] Infrastructure Design — DONE
- [x] Code Generation — DONE (vitest 60 passed total incl. v2 criteria)
**Unit U6 (Recommendation)** — in progress
- [x] Functional Design — DONE (BR-U6-1~17)
- [~] NFR Requirements — SKIP
- [~] NFR Design — SKIP
- [x] Infrastructure Design — DONE (recommendations 0005·RLS, recompute in collect, criteria TS config, /api/profile)
- [ ] Code Generation
**v2 추가 작업 (Change Request — 부부 추천)**
- [x] U2 migration 0004 — notices.eligibility(JSONB) + household_profile (RLS, upsert RPC 재정의 / vitest 43 passed, tsc clean)
- [x] U1 정규화 criteria 보강 + 수집 지역 서울·경기 한정 (criteria.ts CriteriaExtractor + isRegionInScope, normalize 연결, EligibilityCriteria 미러 / vitest 60 passed, tsc clean)
- [ ] **Unit U6 (프로필·자격매칭·추천)** — Functional → Infra → Code
**Units U3/U4/U5** — pending (추천 중심으로 설계 조정)
- [ ] Build and Test — EXECUTE (after all units)
**v2 잔여 순서**: ~~0004~~ → ~~U1 보강~~ → **U6** → U3 → U4 → U5 → Build&Test

### 🟡 OPERATIONS PHASE
- [ ] Operations — PLACEHOLDER

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: CONSTRUCTION (v2 cascade) — Unit U6 **Infrastructure Design DONE** (Q-IU6-1~4=A: recommendations 0005 anon-read/service-write + upsert/prune RPC, recompute in collect Edge Function, criteria-2026.ts config, /api/profile Route Handler). Awaiting approval → U6 Code Generation.
- **Next Stage**: U6 Code Generation (matcher/scorer/criteria/service + 0005 migration + /api/profile + tests)
- **Status**: In progress
