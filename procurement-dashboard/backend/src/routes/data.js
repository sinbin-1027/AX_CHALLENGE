const express  = require('express');
const auth     = require('../middleware/auth');
const { pool } = require('../db/database');

const router = express.Router();

// POST /api/data/upload
router.post('/upload', auth, async (req, res, next) => {
  try {
    const { filename, rows } = req.body;

    if (!filename || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'filename과 rows 배열이 필요합니다.' });
    }

    const { rows: inserted } = await pool.query(
      'INSERT INTO uploads (user_id, filename, raw_data) VALUES ($1, $2, $3) RETURNING id',
      [req.user.id, filename, JSON.stringify(rows)],
    );

    res.status(201).json({ id: inserted[0].id, filename, rowCount: rows.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/data/latest
router.get('/latest', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM uploads WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1',
      [req.user.id],
    );
    const upload = rows[0];
    if (!upload) {
      return res.status(404).json({ message: '업로드 내역이 없습니다.' });
    }

    res.json({
      id:         upload.id,
      filename:   upload.filename,
      uploadedAt: upload.uploaded_at,
      rows:       JSON.parse(upload.raw_data),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
