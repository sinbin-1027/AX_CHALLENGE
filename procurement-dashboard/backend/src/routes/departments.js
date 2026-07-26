const express  = require('express');
const { pool } = require('../db/database');
const { BETA_DEPT_ALIAS } = require('../config/betaDeptAlias');

const router = express.Router();

const SELECT_COLS = `
  d.id,
  d.code,
  d.name,
  g.name          AS group_name,
  g.score_weight,
  g.total_points,
  d.headcount,
  d.green_product_target,
  d.jawal_veteran_target
`;

// 베타테스트 노출 대상(BETA_DEPT_ALIAS의 key)만 남기고, name을 가칭으로 치환.
// 실제 부서명은 realName으로 유지 (내부 로직에서 필요할 수 있으므로 버리지 않음).
// group_name(직군)은 그대로 둔다.
function applyBetaAlias(row) {
  const alias = BETA_DEPT_ALIAS[row.name];
  if (!alias) return null;
  return { ...row, realName: row.name, name: alias };
}

// BETA_DEPT_ALIAS에 정의된 key 순서(A사업처 -> B운영실 -> ... ) 고정 순서
const BETA_DEPT_ORDER = new Map(Object.keys(BETA_DEPT_ALIAS).map((name, i) => [name, i]));

function sortByBetaOrder(rows) {
  return [...rows].sort((a, b) => BETA_DEPT_ORDER.get(a.realName) - BETA_DEPT_ORDER.get(b.realName));
}

// GET /api/departments
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT ${SELECT_COLS}
      FROM departments d
      LEFT JOIN dept_groups g ON g.id = d.group_id
      WHERE d.is_active = true
      ORDER BY g.name, d.name
    `);

    const aliased = rows.map(applyBetaAlias).filter(Boolean);
    res.json(sortByBetaOrder(aliased));
  } catch (err) {
    next(err);
  }
});

// GET /api/departments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT ${SELECT_COLS}
      FROM departments d
      LEFT JOIN dept_groups g ON g.id = d.group_id
      WHERE d.id = $1 AND d.is_active = true
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ message: '부서를 찾을 수 없습니다.' });

    const aliased = applyBetaAlias(rows[0]);
    if (!aliased) return res.status(404).json({ message: '부서를 찾을 수 없습니다.' });

    res.json(aliased);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
