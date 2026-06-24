# 청약레이더 — Unit of Work ↔ Story Map

> 24개 스토리 전수를 5단위에 배정. 모든 스토리가 정확히 하나의 주 단위에 매핑됨.

## U1 — 수집 파이프라인 (E1) — 7 stories
| Story | 제목 | 우선순위 |
|---|---|---|
| US-1.1 | 일일 자동수집 cron | Must |
| US-1.2 | 청약홈 분양정보 수집 | Must |
| US-1.3 | LH 임대공고 수집 | Must |
| US-1.4 | 마이홈 공공임대 단지정보 수집 | Should |
| US-1.5 | SH 공고 크롤링 | Should |
| US-1.6 | 소스별 에러 격리 | Must |
| US-1.7 | 목업 데이터 모드 | Must |

## U2 — 데이터 플랫폼 (E2) — 3 stories
| Story | 제목 | 우선순위 |
|---|---|---|
| US-2.1 | notices 스키마 & upsert | Must |
| US-2.2 | 조회 인덱스 | Should |
| US-2.3 | RLS 익명 읽기전용 | Must |

## U3 — 탐색·필터 UI (E3) — 6 stories
| Story | 제목 | 우선순위 |
|---|---|---|
| US-3.1 | 신규 공고 강조 & NEW 배지 | Must |
| US-3.2 | 유형/신혼부부 배지 | Must |
| US-3.3 | D-day & 마감 자동숨김 | Must |
| US-3.4 | 목록 필터링 | Must |
| US-3.5 | 무한 스크롤/페이지네이션 | Should |
| US-3.6 | 필터 설정 저장 | Must |

## U4 — 상세·AI 요약 (E4) — 4 stories
| Story | 제목 | 우선순위 |
|---|---|---|
| US-4.1 | 면적별 세대수 테이블 | Must |
| US-4.2 | 청약 일정 타임라인 | Must |
| US-4.3 | 자격조건 AI 요약 | Must |
| US-4.4 | 원문 링크 | Must |

## U5 — 개인화·PWA·알림 (E5) — 4 stories
| Story | 제목 | 우선순위 |
|---|---|---|
| US-5.1 | 북마크 추가/제거 | Must |
| US-5.2 | 관심 공고 목록 | Must |
| US-5.3 | PWA 설치 & 오프라인 | Must |
| US-5.4 | Web Push 신규공고 알림 | Should |

## 커버리지 검증
- **총 스토리**: 24 = U1(7) + U2(3) + U3(6) + U4(4) + U5(4) ✅
- **미배정 스토리**: 없음 ✅
- **중복 배정**: 없음(협력 관계는 dependency 문서에 별도 기록) ✅
- **단위별 우선순위 구성**: 각 단위에 Must 스토리 존재 → 모든 단위가 MVP 가치 보유 ✅
