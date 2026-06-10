import {
  TARGETS,
  calcTargetAmount,
  calcAchievedPoints,
  calcFinalScore,
} from '../data/targets.js';

const ONNURI    = '온누리상품권';
const GOODS     = '물품';
const SERVICE   = '용역';
const CONSTRUCTION = '공사';
const NOT_APPLICABLE = '해당없음';

function isY(val) {
  return val === 'Y';
}

function isNotNA(val) {
  return val != null && val !== '' && val !== NOT_APPLICABLE && val !== '해당사항없음';
}

function amountOf(row) {
  return Number(row['물품금액']) || 0;
}

function sumWhere(rows, predicate) {
  let total = 0;
  for (const row of rows) {
    if (predicate(row)) total += amountOf(row);
  }
  return total;
}

// 분모로 사용되는 기준 금액 집계
function aggregateBaseAmounts(rows) {
  return {
    totalPurchase:        sumWhere(rows, r => r['구매구분'] !== ONNURI),
    goodsPurchase:        sumWhere(rows, r => r['구매구분'] === GOODS),
    servicePurchase:      sumWhere(rows, r => r['구매구분'] === SERVICE),
    constructionPurchase: sumWhere(rows, r => r['구매구분'] === CONSTRUCTION),
    smeGoodsPurchase:     sumWhere(rows, r => r['구매구분'] === GOODS && isY(r['중소기업제품(연동)'])),
    nepTargetPurchase:    sumWhere(rows, r => isNotNA(r['신제품인증(NEP) 대상품목'])),
  };
}

// 지표 key → 실적액 집계
function aggregateActuals(rows) {
  const nonOnnuri     = r => r['구매구분'] !== ONNURI;
  const goodsOrSvc    = r => r['구매구분'] === GOODS || r['구매구분'] === SERVICE;
  const smeGoods      = r => r['구매구분'] === GOODS && isY(r['중소기업제품(연동)']);

  return {
    sme:                  sumWhere(rows, r => nonOnnuri(r)   && isY(r['중소기업제품(연동)'])),
    startup:              sumWhere(rows, r => nonOnnuri(r)   && isY(r['창업기업제품'])),
    women_goods:          sumWhere(rows, r => r['구매구분'] === GOODS        && isY(r['여성기업제품(연동)'])),
    women_service:        sumWhere(rows, r => r['구매구분'] === SERVICE      && isY(r['여성기업제품(연동)'])),
    women_construction:   sumWhere(rows, r => r['구매구분'] === CONSTRUCTION && isY(r['여성기업제품(연동)'])),
    social_enterprise:    sumWhere(rows, r => goodsOrSvc(r)  && isY(r['사회적기업'])),
    cooperative:          sumWhere(rows, r => goodsOrSvc(r)  && isY(r['사회적협동조합제품여부'])),
    disabled_enterprise:  sumWhere(rows, r => nonOnnuri(r)   && isY(r['장애인구매(연동)'])),
    standard_workshop:    sumWhere(rows, r => goodsOrSvc(r)  && isY(r['장애인표준사업장여부'])),
    severe_disabled:      sumWhere(rows, r => goodsOrSvc(r)  && isY(r['중증장애인제품'])),
    tech_development:     sumWhere(rows, r => smeGoods(r)    && isNotNA(r['기술개발제품대상품목조회'])),
    pilot_purchase:       sumWhere(rows, r => smeGoods(r)    && isY(r['시범구매여부'])),
    nep:                  sumWhere(rows, r => isY(r['신제품인증(NEP)여부'])),
    green_product:        sumWhere(rows, r => isY(r['친환경제품'])),
    jawal_veteran:        sumWhere(rows, r => isY(r['자활용사촌제품'])),
    onnuri_voucher:       sumWhere(rows, r => r['구매구분'] === ONNURI),
  };
}

/**
 * RAW 엑셀 데이터(행 배열)를 받아 지표별 실적 및 점수를 계산한다.
 *
 * @param {object[]} rows      - 엑셀 헤더를 key로 갖는 행 객체 배열
 * @param {object}   overrides - 목표액 보정값
 *   @param {number}  [overrides.headcount]           - 온누리상품권 인원수 (기본 14)
 *   @param {object}  [overrides.fixedTargets]        - fixed_amount 지표별 목표액
 *     e.g. { green_product: 2500000, jawal_veteran: 1500000 }
 *
 * @returns {{ results: object[], totalScore: number, finalScore: number }}
 */
export function calcEngine(rows, overrides = {}) {
  const baseAmounts = aggregateBaseAmounts(rows);
  const actuals     = aggregateActuals(rows);

  const results = TARGETS.map(target => {
    const { targetAmount, denominator } = calcTargetAmount(
      target,
      baseAmounts,
      {
        fixedTarget: overrides.fixedTargets?.[target.key],
        headcount:   overrides.headcount,
      },
    );

    const actual = actuals[target.key] ?? 0;
    const score  = calcAchievedPoints(target, actual, targetAmount, denominator);

    const achievementRate =
      targetAmount > 0
        ? actual / targetAmount
        : target.autoFullScore &&
          target.autoFullScoreCondition === 'denominator_zero' &&
          denominator === 0
        ? 1
        : 0;

    return {
      key:             target.key,
      label:           target.label,
      targetAmount,
      actual,
      denominator,
      achievementRate,
      points:          target.points,
      achieved:        score >= target.points,
      score,
    };
  });

  const totalScore = results.reduce((acc, r) => acc + r.score, 0);
  const finalScore = calcFinalScore(totalScore);

  const stats = {
    totalPurchaseAll: baseAmounts.totalPurchase + (actuals.onnuri_voucher ?? 0),
    totalPurchase:    baseAmounts.totalPurchase,
    totalTargetSum:   results.reduce((a, r) => a + r.targetAmount, 0),
    totalActualSum:   results.reduce((a, r) => a + r.actual, 0),
    rowCount:         rows.length,
  };

  return { results, totalScore, finalScore, stats };
}
