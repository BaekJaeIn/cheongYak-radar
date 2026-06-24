// MockDataProvider (US-1.7, BR-7). 순수 — vitest 테스트 가능.
// COLLECT_MODE=mock 또는 API 키 없을 때 실 Collector를 대체.

import { normalize, type RawNotice } from "./normalize.ts";
import type { NoticeInput, SourceType } from "./types.ts";

/** 기준일로부터 n일 뒤 YYYY-MM-DD (UTC 기준, 목업 근사). */
function day(base: Date, n: number): string {
  const d = new Date(base.getTime() + n * 86400000);
  return d.toISOString().slice(0, 10);
}

interface MockSpec extends RawNotice {
  source: SourceType;
}

/** 관심지역 중심 현실 세트(약 16건): 4개 source, 마감 전/임박/마감, 신혼/예비/무순위 혼합. */
export function getMockNotices(today: Date = new Date()): NoticeInput[] {
  const specs: MockSpec[] = [
    {
      source: "apt",
      source_no: "2026000101",
      title: "평촌 어바인퍼스트 신혼희망타운",
      address: "경기도 안양시 동안구 평촌대로",
      areaText: "전용 46.97㎡ ~ 59.96㎡",
      supplyType: "신혼희망타운",
      priorityText: "1순위",
      notice_date: day(today, -2),
      apply_start: day(today, 3),
      apply_end: day(today, 7),
      winner_date: day(today, 14),
      url: "https://www.applyhome.co.kr",
    },
    {
      source: "apt",
      source_no: "2026000102",
      title: "산본역 SK뷰 일반분양",
      address: "경기도 군포시 산본동",
      areaText: "84.95㎡",
      supplyType: "일반공급",
      priorityText: "1순위",
      notice_date: day(today, -1),
      apply_start: day(today, 2),
      apply_end: day(today, 3),
      winner_date: day(today, 10),
      url: "https://www.applyhome.co.kr",
    },
    {
      source: "apt",
      source_no: "2026000103",
      title: "의왕 백운밸리 무순위 줍줍",
      address: "경기도 의왕시 학의동",
      areaText: "전용 84.99㎡",
      supplyType: "무순위",
      priorityText: "무순위",
      notice_date: day(today, -10),
      apply_start: day(today, -5),
      apply_end: day(today, -2), // 마감됨
      winner_date: day(today, 1),
      url: "https://www.applyhome.co.kr",
    },
    {
      source: "lh",
      source_no: "2026LH2001",
      title: "안양 관양 행복주택 예비신혼부부 모집",
      address: "경기도 안양시 동안구 관양동",
      areaText: "16㎡~36㎡",
      supplyType: "행복주택 예비신혼부부",
      priorityText: "",
      notice_date: day(today, 0),
      apply_start: day(today, 5),
      apply_end: day(today, 12),
      url: "https://www.myhome.go.kr",
    },
    {
      source: "lh",
      source_no: "2026LH2002",
      title: "군포 대야미 국민임대 입주자모집",
      address: "경기도 군포시 대야미동",
      areaText: "transitional 26㎡ ~ 46㎡",
      supplyType: "국민임대",
      notice_date: day(today, -3),
      apply_start: day(today, 1),
      apply_end: day(today, 6),
      url: "https://www.myhome.go.kr",
    },
    {
      source: "lh",
      source_no: "2026LH2003",
      title: "의왕 포일 영구임대 공급",
      address: "경기도 의왕시 포일동",
      areaText: "26㎡",
      supplyType: "영구임대",
      notice_date: day(today, -8),
      apply_end: day(today, -1), // 마감됨
      url: "https://www.myhome.go.kr",
    },
    {
      source: "sh",
      source_no: "SH2026A100",
      title: "SH 서울 장기전세 신혼부부 우선공급",
      address: "서울특별시 강서구",
      areaText: "49㎡ ~ 59㎡",
      supplyType: "장기전세 신혼부부",
      notice_date: day(today, -1),
      apply_end: day(today, 9),
      url: "https://housing.seoul.go.kr",
    },
    {
      source: "sh",
      source_no: "SH2026A101",
      title: "SH 서울 행복주택 청년·신혼",
      address: "서울특별시 송파구",
      areaText: "29㎡ ~ 39㎡",
      supplyType: "행복주택",
      notice_date: day(today, 0),
      apply_end: day(today, 4),
      url: "https://housing.seoul.go.kr",
    },
    {
      source: "private",
      source_no: "PRV2026X1",
      title: "안양 평촌 민간임대 예비신혼 특화",
      address: "경기도 안양시 만안구",
      areaText: "전용 59.8㎡",
      supplyType: "민간임대 예비신혼부부",
      notice_date: day(today, -1),
      apply_end: day(today, 15),
      url: "https://example.com",
    },
    {
      source: "private",
      source_no: "PRV2026X2",
      title: "수원 광교 민간임대 일반",
      address: "경기도 수원시 영통구 광교",
      areaText: "74㎡ ~ 84㎡",
      supplyType: "민간임대",
      notice_date: day(today, -4),
      apply_end: day(today, 20),
      url: "https://example.com",
    },
    {
      source: "apt",
      source_no: "2026000104",
      title: "과천지식정보타운 공공분양 신혼부부 특별공급",
      address: "경기도 과천시 갈현동",
      areaText: "55㎡ ~ 74㎡",
      supplyType: "신혼부부 특별공급",
      priorityText: "1순위",
      notice_date: day(today, 0),
      apply_start: day(today, 6),
      apply_end: day(today, 13),
      winner_date: day(today, 20),
      url: "https://www.applyhome.co.kr",
    },
    {
      source: "apt",
      source_no: "2026000105",
      title: "안산 그랑시티 2순위 분양",
      address: "경기도 안산시 단원구",
      areaText: "59㎡",
      supplyType: "일반공급",
      priorityText: "2순위",
      notice_date: day(today, -2),
      apply_start: day(today, 1),
      apply_end: day(today, 5),
      url: "https://www.applyhome.co.kr",
    },
    {
      source: "lh",
      source_no: "2026LH2004",
      title: "성남 신혼희망타운 입주자모집",
      address: "경기도 성남시 수정구",
      areaText: "46㎡ ~ 55㎡",
      supplyType: "신혼희망타운",
      notice_date: day(today, -1),
      apply_end: day(today, 8),
      url: "https://www.myhome.go.kr",
    },
    {
      source: "sh",
      source_no: "SH2026A102",
      title: "SH 서울 청년안심주택",
      address: "서울특별시 영등포구",
      areaText: "19㎡ ~ 24㎡",
      supplyType: "청년안심주택",
      notice_date: day(today, -6),
      apply_end: day(today, -3), // 마감됨
      url: "https://housing.seoul.go.kr",
    },
    {
      source: "private",
      source_no: "PRV2026X3",
      title: "군포 산본 민간임대 신혼부부",
      address: "경기도 군포시 산본동",
      areaText: "49㎡ ~ 59㎡",
      supplyType: "민간임대 신혼부부",
      notice_date: day(today, 0),
      apply_end: day(today, 11),
      url: "https://example.com",
    },
    {
      source: "apt",
      source_no: "2026000106",
      title: "의왕 인덕원 공공분양 일반공급",
      address: "경기도 의왕시 내손동 인덕원",
      areaText: "59㎡ ~ 84㎡",
      supplyType: "일반공급",
      priorityText: "1순위",
      notice_date: day(today, -1),
      apply_start: day(today, 4),
      apply_end: day(today, 10),
      winner_date: day(today, 18),
      url: "https://www.applyhome.co.kr",
    },
  ];

  const out: NoticeInput[] = [];
  for (const s of specs) {
    const n = normalize(s.source, s);
    if (n) out.push(n);
  }
  return out;
}
