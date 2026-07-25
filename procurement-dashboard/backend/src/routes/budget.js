const express     = require('express');
const sessionAuth = require('../middleware/auth');
const { pool }    = require('../db/database');

const router = express.Router();

// ── 잔여예산 계산 ────────────────────────────────────────────────────────────

async function getBudgetSummary(client, deptId) {
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
  `, [new Date().getFullYear(), deptId]);

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

    const summary = await getBudgetSummary(pool, deptId);
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

    const { rows } = await pool.query(`
      SELECT 절명, 예산과목명, 회계연도, 배정액, 집행액, 잔액, 집행률, 기금수탁여부
      FROM budget_allocations
      WHERE dept_id = $1
      ORDER BY 절명, 예산과목코드
    `, [deptId]);

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

    res.json({ groups, total });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
