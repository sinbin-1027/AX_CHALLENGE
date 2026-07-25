const express     = require('express');
const sessionAuth = require('../middleware/auth');
const { pool }    = require('../db/database');

const router = express.Router();

// ── GET /api/uploads/history ─────────────────────────────────────────────────

router.get('/history', sessionAuth, async (req, res, next) => {
  try {
    const { deptId } = req.query;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

    const { rows } = await pool.query(
      `SELECT id, description, uploaded_at FROM upload_logs WHERE dept_id = $1 ORDER BY uploaded_at DESC`,
      [deptId],
    );

    res.json(rows.map(r => ({
      id:          r.id,
      description: r.description,
      uploadedAt:  r.uploaded_at,
    })));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
