const express     = require('express');
const sessionAuth = require('../middleware/auth');
const { pool }    = require('../db/database');

const router = express.Router();

// ── 집행추이분석 계산 헬퍼 ───────────────────────────────────────────────────

const TREND_KEYWORDS = [
  { key: 'expense', label: '업무추진비', keyword: '업무추진비' },
  { key: 'meal',     label: '특근매식비', keyword: '특근매식비' },
];

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function totalDaysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}

// 회계연도 1/1부터 "오늘"까지의 경과일수 (year가 올해가 아니면 그 해 전체가 경과한 것으로 간주)
function getElapsedDays(year) {
  const now = new Date();
  if (year !== now.getFullYear()) return totalDaysInYear(year);

  const startOfYear = Date.UTC(year, 0, 1);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today - startOfYear) / 86400000) + 1;
}

// 연말 예상 총지출(spentSoFar + dailyAvg * daysRemainingInYear) 기준으로
// 부족/불용 2분기 (라이브 카드·스냅샷 카드 공통 — 4개 카드 전부 동일 공식)
// allocatedTotal이 0 이하인 경우만 판단 불가로 onTrack 유지, 그 외에는 diff 부호로 무조건 shortage/underspend 중 하나로 분류
function computeForecast({ allocatedTotal, spentSoFar, dailyAvg, daysRemainingInYear }) {
  if (dailyAvg == null) return null;
  if (allocatedTotal <= 0) return { type: 'onTrack' };

  const projectedTotal = spentSoFar + dailyAvg * daysRemainingInYear;
  const diff = projectedTotal - allocatedTotal;

  if (diff >= 0) return { type: 'shortage',   amount: diff };
  return { type: 'underspend', amount: -diff };
}

// ── 집행추이분석: 스냅샷 기반(국내여비/국외업무여비) 헬퍼 ───────────────────
// budget_allocations는 일별 데이터가 없는 스냅샷이라, budget_snapshot_meta의
// 기준일 하나를 기준으로 라이브 데이터와는 별도 방식으로 elapsedDays/daysRemaining을 구한다.

const SNAPSHOT_KEYWORDS = [
  { key: 'domestic_travel', label: '국내여비',     keyword: '국내여비' },
  { key: 'overseas_travel', label: '국외업무여비', keyword: '국외업무여비' },
];

// ── 잔여예산 계산 ────────────────────────────────────────────────────────────

async function getBudgetSummary(client, deptId, year) {
  const result = await client.query(`
    WITH budget_with_mokname AS (
      SELECT *, reverse(split_part(reverse(예산과목명), '-', 1)) AS 목명
      FROM budget_allocations
      WHERE 회계연도 = $1 AND dept_id = $2
    )
    SELECT
      COALESCE(SUM(배정액), 0) AS allocated_budget,
      COALESCE(SUM(배정액 - 집행액), 0) AS remaining_budget
    FROM budget_with_mokname
    WHERE
      목명 LIKE '일반수용비%'
      OR 목명 LIKE '%용역비%'
      OR 목명 = '일반연구비'
      OR 목명 = '공사비'
      OR 목명 = '감리비'
      OR 목명 = '실시설계비'
  `, [year, deptId]);

  return {
    allocatedBudget: Number(result.rows[0].allocated_budget),
    remainingBudget: Number(result.rows[0].remaining_budget),
  };
}

// ── GET /api/budget/remaining ────────────────────────────────────────────────

router.get('/remaining', sessionAuth, async (req, res, next) => {
  try {
    const { deptId } = req.query;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const summary = await getBudgetSummary(pool, deptId, year);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/budget/allocation ────────────────────────────────────────────────

router.get('/allocation', sessionAuth, async (req, res, next) => {
  try {
    const { deptId } = req.query;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

    let year = req.query.year ? Number(req.query.year) : null;
    if (!year) {
      const { rows: maxYearRows } = await pool.query(
        'SELECT MAX(회계연도) AS max_year FROM budget_allocations WHERE dept_id = $1',
        [deptId],
      );
      year = maxYearRows[0].max_year ?? new Date().getFullYear();
    }

    const { rows } = await pool.query(`
      SELECT 절명, 예산과목명, 회계연도, 년예산, 배정액, 집행액, 잔액, 집행률, 기금수탁여부
      FROM budget_allocations
      WHERE dept_id = $1 AND 회계연도 = $2
      ORDER BY 절명, 예산과목코드
    `, [deptId, year]);

    const groupMap = new Map();
    for (const row of rows) {
      const key = row.절명 ?? '기타';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key).push(row);
    }

    const groups = [...groupMap.entries()].map(([절명, items]) => {
      const 배정액합계 = items.reduce((s, r) => s + (Number(r.배정액) || 0), 0);
      const 집행액합계 = items.reduce((s, r) => s + (Number(r.집행액) || 0), 0);
      const 잔액합계   = items.reduce((s, r) => s + (Number(r.잔액)   || 0), 0);
      const 집행률평균 = items.length
        ? +(items.reduce((s, r) => s + (Number(r.집행률) || 0), 0) / items.length).toFixed(2)
        : 0;

      return {
        절명,
        items: items.map(r => ({
          예산과목명:   r.예산과목명,
          회계연도:     r.회계연도,
          년예산:       Number(r.년예산) || 0,
          배정액:       Number(r.배정액) || 0,
          집행액:       Number(r.집행액) || 0,
          잔액:         Number(r.잔액)   || 0,
          집행률:       Number(r.집행률) || 0,
          기금수탁여부: r.기금수탁여부,
        })),
        subtotal: { 배정액합계, 집행액합계, 잔액합계, 집행률평균 },
      };
    });

    const total = groups.reduce((acc, g) => ({
      배정액합계: acc.배정액합계 + g.subtotal.배정액합계,
      집행액합계: acc.집행액합계 + g.subtotal.집행액합계,
      잔액합계:   acc.잔액합계   + g.subtotal.잔액합계,
    }), { 배정액합계: 0, 집행액합계: 0, 잔액합계: 0 });

    res.json({ groups, total, year });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/budget/execution-trend ─────────────────────────────────────────

router.get('/execution-trend', sessionAuth, async (req, res, next) => {
  try {
    const { deptId } = req.query;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    const elapsedDays        = getElapsedDays(year);
    const totalDays          = totalDaysInYear(year);
    const daysRemainingInYear = totalDays - elapsedDays;

    const now = new Date();
    const currentMonthLimit = year === now.getFullYear() ? now.getMonth() + 1 : 12;

    const results = await Promise.all(TREND_KEYWORDS.map(async ({ key, label, keyword }) => {
      const allocRes = await pool.query(
        `SELECT COALESCE(SUM(배정액), 0) AS total
         FROM budget_allocations
         WHERE dept_id = $1 AND 회계연도 = $2 AND 예산과목명 LIKE $3`,
        [deptId, year, `%${keyword}%`],
      );
      const allocatedTotal = Number(allocRes.rows[0].total);

      const monthRes = await pool.query(
        `SELECT EXTRACT(MONTH FROM 발의일자::timestamp)::int AS month, COALESCE(SUM(채주지급금액), 0) AS total
         FROM raw_purchases
         WHERE dept_id = $1 AND 회계연도 = $2 AND 제외여부 = 0 AND 예산명 LIKE $3
         GROUP BY month`,
        [deptId, year, `%${keyword}%`],
      );
      const monthMap = new Map(monthRes.rows.map(r => [r.month, Number(r.total)]));

      const monthlyActual = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        return m > currentMonthLimit ? null : (monthMap.get(m) ?? 0);
      });

      const spentSoFar = monthlyActual.reduce((s, v) => s + (v ?? 0), 0);
      const dailyAvg    = elapsedDays > 0 ? spentSoFar / elapsedDays : 0;
      const thisMonthActual = monthlyActual[currentMonthLimit - 1] ?? 0;

      const forecast = computeForecast({ allocatedTotal, spentSoFar, dailyAvg, daysRemainingInYear });

      const monthlyRecommended = allocatedTotal / 12;

      return {
        key, label,
        allocatedTotal, monthlyActual, elapsedDays,
        dailyAvg, spentSoFar, thisMonthActual, forecast,
        monthlyRecommended,
      };
    }));

    // ── 스냅샷 기반 카드 (국내여비 / 국외업무여비) ──────────────────────────────
    const snapshotRes = await pool.query(
      `SELECT 기준일::text AS 기준일 FROM budget_snapshot_meta WHERE 회계연도 = $1`,
      [year],
    );
    const snapshotDateStr = snapshotRes.rows[0]?.기준일 ?? null;

    let snapshotResults;
    if (!snapshotDateStr) {
      snapshotResults = SNAPSHOT_KEYWORDS.map(({ key, label }) => ({ key, label, noSnapshotData: true }));
    } else {
      const [sy, sm, sd] = snapshotDateStr.split('-').map(Number);
      const snapshotUTC    = Date.UTC(sy, sm - 1, sd);
      const startOfYearUTC = Date.UTC(year, 0, 1);
      const endOfYearUTC       = Date.UTC(year, 11, 31);
      const snapshotElapsedDays = Math.round((snapshotUTC - startOfYearUTC) / 86400000);
      const snapshotDaysRemaining = Math.round((endOfYearUTC - snapshotUTC) / 86400000);

      snapshotResults = await Promise.all(SNAPSHOT_KEYWORDS.map(async ({ key, label, keyword }) => {
        const r = await pool.query(
          `SELECT COALESCE(SUM(배정액), 0) AS allocated, COALESCE(SUM(집행액), 0) AS spent
           FROM budget_allocations
           WHERE dept_id = $1 AND 회계연도 = $2 AND 예산과목명 LIKE $3`,
          [deptId, year, `%${keyword}%`],
        );
        const allocatedTotal = Number(r.rows[0].allocated);
        const spentSoFar     = Number(r.rows[0].spent);
        const dailyAvg       = snapshotElapsedDays > 0 ? spentSoFar / snapshotElapsedDays : null;

        const forecast = computeForecast({
          allocatedTotal, spentSoFar, dailyAvg, daysRemainingInYear: snapshotDaysRemaining,
        });

        const monthlyRecommended = allocatedTotal / 12;

        return {
          key, label,
          allocatedTotal, spentSoFar, elapsedDays: snapshotElapsedDays, dailyAvg,
          forecast, monthlyRecommended,
          기준일: snapshotDateStr,
        };
      }));
    }

    res.json([...results, ...snapshotResults]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
