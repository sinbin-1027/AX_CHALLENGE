import { buildExcludeTargets } from '../data/groupIndicators.js';

// 부서(dept) 정보를 바탕으로 calcEngine에 넘길 옵션 객체를 만든다.
// 실제 화면(App.js)과 시뮬레이션(SimulationPage.jsx)이 같은 로직을 공유해서 쓴다 —
// 여기 말고 다른 곳에서 따로 excludeTargets/scoreWeight/totalPoints를 만들지 않는다.
export function buildCalcOptions(dept) {
  const isTokwha = dept.group_name === '특화기능';

  return {
    headcount:    dept.headcount,
    fixedTargets: {
      green_product: dept.green_product_target,
      jawal_veteran: dept.jawal_veteran_target,
    },
    scoreWeight:     isTokwha ? 3  : dept.score_weight,
    totalPoints:     isTokwha ? 10 : Number(dept.total_points),
    targetOverrides: isTokwha ? {
      startup:           { points: 1.0 },
      social_enterprise: { points: 1.0 },
      onnuri_voucher:    { points: 8.0 },
    } : {},
    excludeTargets: buildExcludeTargets(dept.group_name),
  };
}
