// 공공구매 실적관리 목표 설정값
// 총배점 9.5점, 최종점수 = 4 × 달성배점합계 / 9.5

export const TOTAL_SCORE_WEIGHT = 4;
export const TOTAL_POINTS = 9.5;

// 달성기준 유형
// - 'total_ratio'     : 총구매액 대비 비율
// - 'goods_ratio'     : 물품구매액 대비 비율
// - 'service_ratio'   : 용역구매액 대비 비율
// - 'construction_ratio' : 공사구매액 대비 비율
// - 'goods_service_ratio': (물품+용역) 대비 비율
// - 'sme_goods_ratio' : 중소기업물품구매액 대비 비율
// - 'nep_ratio'       : NEP대상품목구매액 대비 비율
// - 'fixed_amount'    : 별도 목표금액 기준
// - 'per_person'      : 부서인원 × 단가

export const TARGETS = [
  {
    key: 'sme',
    label: '중소기업',
    type: 'total_ratio',
    rate: 0.80,
    points: 1.0,
    autoFullScore: false,
  },
  {
    key: 'startup',
    label: '창업기업',
    type: 'total_ratio',
    rate: 0.15,
    points: 0.5,
    autoFullScore: false,
  },
  {
    key: 'women_goods',
    label: '여성기업(물품)',
    type: 'goods_ratio',
    rate: 0.05,
    points: 0.5,
    autoFullScore: false,
  },
  {
    key: 'women_service',
    label: '여성기업(용역)',
    type: 'service_ratio',
    rate: 0.05,
    points: 0.5,
    autoFullScore: false,
  },
  {
    key: 'women_construction',
    label: '여성기업(공사)',
    type: 'construction_ratio',
    rate: 0.03,
    points: 0.5,
    // 공사구매액=0이면 자동만점
    autoFullScore: true,
    autoFullScoreCondition: 'denominator_zero',
  },
  {
    key: 'social_enterprise',
    label: '사회적기업',
    type: 'goods_service_ratio',
    rate: 0.05,
    points: 0.7,
    autoFullScore: false,
  },
  {
    key: 'cooperative',
    label: '협동조합',
    type: 'goods_service_ratio',
    rate: 0.001,
    points: 0.3,
    autoFullScore: false,
  },
  {
    key: 'disabled_enterprise',
    label: '장애인기업',
    type: 'total_ratio',
    rate: 0.01,
    points: 0.5,
    autoFullScore: false,
  },
  {
    key: 'standard_workshop',
    label: '표준사업장',
    type: 'goods_service_ratio',
    rate: 0.008,
    points: 0.5,
    autoFullScore: false,
  },
  {
    key: 'severe_disabled',
    label: '중증장애인',
    type: 'goods_service_ratio',
    rate: 0.011,
    points: 0.5,
    autoFullScore: false,
  },
  {
    key: 'tech_development',
    label: '기술개발제품',
    type: 'sme_goods_ratio',
    rate: 0.20,
    points: 0.5,
    autoFullScore: false,
  },
  {
    key: 'pilot_purchase',
    label: '시범구매',
    type: 'sme_goods_ratio',
    rate: 0.015,
    points: 0.3,
    autoFullScore: false,
  },
  {
    key: 'nep',
    label: 'NEP',
    type: 'nep_ratio',
    rate: 0.20,
    points: 0.2,
    // NEP대상품목구매액(분모)=0이면 자동만점
    autoFullScore: true,
    autoFullScoreCondition: 'denominator_zero',
  },
  {
    key: 'green_product',
    label: '녹색제품',
    type: 'fixed_amount',
    defaultTarget: 2247000,
    points: 1.0,
    autoFullScore: false,
  },
  {
    key: 'jawal_veteran',
    label: '자활용사촌',
    type: 'fixed_amount',
    defaultTarget: 1420000,
    points: 1.0,
    autoFullScore: false,
  },
  {
    key: 'onnuri_voucher',
    label: '온누리상품권',
    type: 'per_person',
    pricePerPerson: 250000,
    defaultHeadcount: 14,
    points: 1.0,
    autoFullScore: false,
  },
];

// 목표액 계산 헬퍼
export function calcTargetAmount(target, baseAmounts, overrides = {}) {
  const {
    totalPurchase = 0,
    goodsPurchase = 0,
    servicePurchase = 0,
    constructionPurchase = 0,
    smeGoodsPurchase = 0,
    nepTargetPurchase = 0,
    headcount = target.defaultHeadcount ?? 14,
    fixedTarget,
  } = { ...baseAmounts, ...overrides };

  switch (target.type) {
    case 'total_ratio':
      return { targetAmount: totalPurchase * target.rate, denominator: totalPurchase };
    case 'goods_ratio':
      return { targetAmount: goodsPurchase * target.rate, denominator: goodsPurchase };
    case 'service_ratio':
      return { targetAmount: servicePurchase * target.rate, denominator: servicePurchase };
    case 'construction_ratio':
      return { targetAmount: constructionPurchase * target.rate, denominator: constructionPurchase };
    case 'goods_service_ratio': {
      const base = goodsPurchase + servicePurchase;
      return { targetAmount: base * target.rate, denominator: base };
    }
    case 'sme_goods_ratio':
      return { targetAmount: smeGoodsPurchase * target.rate, denominator: smeGoodsPurchase };
    case 'nep_ratio':
      return { targetAmount: nepTargetPurchase * target.rate, denominator: nepTargetPurchase };
    case 'fixed_amount':
      return { targetAmount: fixedTarget ?? target.defaultTarget, denominator: null };
    case 'per_person':
      return { targetAmount: headcount * target.pricePerPerson, denominator: null };
    default:
      return { targetAmount: 0, denominator: null };
  }
}

// 달성점수 계산 헬퍼
// actual: 실제 구매액, targetAmount: 목표액, denominator: 분모(비율형)
export function calcAchievedPoints(target, actual, targetAmount, denominator) {
  if (target.autoFullScore && target.autoFullScoreCondition === 'denominator_zero') {
    if (denominator === 0) return target.points;
  }
  if (targetAmount <= 0) return 0;
  const ratio = actual / targetAmount;
  return ratio >= 1 ? target.points : 0;
}

// 최종점수 계산
export function calcFinalScore(achievedPointsTotal) {
  return (TOTAL_SCORE_WEIGHT * achievedPointsTotal) / TOTAL_POINTS;
}
