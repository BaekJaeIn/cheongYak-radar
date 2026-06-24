// 추천 점수 기본 가중치 (BR-U6-10, Q-FU6-4=A). 합=100. 추후 조정 가능.
import type { Weights } from "./types.ts";

export const DEFAULT_WEIGHTS: Weights = {
  region: 40, // 희망지역 일치
  eligibility: 20, // 자격 여유(eligible/conditional)
  area: 15, // 면적 적합
  priority: 15, // 청약 순위
  deadline: 10, // 마감 임박
};
