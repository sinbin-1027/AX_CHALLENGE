import { buildExcludeTargets } from '../data/groupIndicators.js';

// 특화기능 직군: 창업기업/사회적기업/온누리상품권 3개만 적용, 배점도 완전히 재산정(합계 10점)
const TOKWHA_OVERRIDES = {
  startup:           { points: 1.0 },
  social_enterprise: { points: 1.0 },
  onnuri_voucher:    { points: 8.0 },
};

// 창업기업 배점은 직군마다 다르다 — 금융업무지원/지역본지부는 1.0점,
// 그 외(기획관리/사업/연수)는 targets.js 기본값(0.5점) 그대로
const STARTUP_1POINT_GROUPS = new Set(['금융업무지원', '지역본지부']);

// 부서(dept) 정보를 바탕으로 calcEngine에 넘길 옵션 객체를 만든다.
// 실제 화면(App.js)과 시뮬레이션(SimulationPage.jsx)이 같은 로직을 공유해서 쓴다 —
// 여기 말고 다른 곳에서 따로 excludeTargets/scoreWeight/totalPoints/targetOverrides를 만들지 않는다.
export function buildCalcOptions(dept) {
  const isTokwha = dept.group_name === '특화기능';

  const targetOverrides = isTokwha
    ? TOKWHA_OVERRIDES
    : STARTUP_1POINT_GROUPS.has(dept.group_name)
      ? { startup: { points: 1.0 } }
      : {};

  return {
    headcount:    dept.headcount,
    fixedTargets: {
      green_product: dept.green_product_target,
      jawal_veteran: dept.jawal_veteran_target,
    },
    scoreWeight:     isTokwha ? 3  : dept.score_weight,
    totalPoints:     isTokwha ? 10 : Number(dept.total_points),
    targetOverrides,
    excludeTargets: buildExcludeTargets(dept.group_name),
  };
}
