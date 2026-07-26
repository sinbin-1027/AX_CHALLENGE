const express     = require('express');
const sessionAuth = require('../middleware/auth');
const { pool }    = require('../db/database');

const router = express.Router();

// ── GET /api/years ───────────────────────────────────────────────────────────
// raw_purchases와 budget_allocations 양쪽에 존재하는 회계연도를 모아
// 내림차순으로 반환 (프론트 회계연도 드롭다운용)

router.get('/', sessionAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT 회계연도 FROM (
        SELECT 회계연도 FROM raw_purchases     WHERE 회계연도 IS NOT NULL
        UNION
        SELECT 회계연도 FROM budget_allocations WHERE 회계연도 IS NOT NULL
      ) t
      ORDER BY 회계연도 DESC
    `);
    res.json(rows.map(r => r.회계연도));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
