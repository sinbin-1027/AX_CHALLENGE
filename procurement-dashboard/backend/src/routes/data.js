const express  = require('express');
const auth     = require('../middleware/auth');
const db       = require('../db/database');

const router = express.Router();

// POST /api/data/upload  (인증 필요)
router.post('/upload', auth, (req, res) => {
  const { filename, rows } = req.body;

  if (!filename || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'filename과 rows 배열이 필요합니다.' });
  }

  const { lastInsertRowid } = db
    .prepare('INSERT INTO uploads (user_id, filename, raw_data) VALUES (?, ?, ?)')
    .run(req.user.id, filename, JSON.stringify(rows));

  res.status(201).json({
    id: lastInsertRowid,
    filename,
    rowCount: rows.length,
  });
});

// GET /api/data/latest  (인증 필요)
router.get('/latest', auth, (req, res) => {
  const upload = db
    .prepare('SELECT * FROM uploads WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 1')
    .get(req.user.id);

  if (!upload) {
    return res.status(404).json({ message: '업로드 내역이 없습니다.' });
  }

  res.json({
    id:          upload.id,
    filename:    upload.filename,
    uploadedAt:  upload.uploaded_at,
    rows:        JSON.parse(upload.raw_data),
  });
});

module.exports = router;
