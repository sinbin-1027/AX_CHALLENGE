const express  = require('express');
const { pool } = require('../db/database');

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
    res.json(rows);
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
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
