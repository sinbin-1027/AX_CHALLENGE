const express        = require('express');
const path           = require('path');
const fs             = require('fs');
const multer         = require('multer');
const { v4: uuidv4 } = require('uuid');
const sessionAuth    = require('../middleware/auth');
const { pool }       = require('../db/database');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../../uploads/guides');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

function toGuideDTO(row) {
  return {
    id:               row.id,
    title:            row.title,
    originalFilename: row.original_filename,
    fileSize:         row.file_size,
    uploadedAt:       row.uploaded_at,
  };
}

// ── POST /api/guides ─────────────────────────────────────────────────────────

router.post('/', sessionAuth, upload.single('file'), async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title)    return res.status(400).json({ message: 'title이 필요합니다.' });
    if (!req.file) return res.status(400).json({ message: '파일이 필요합니다.' });

    const { filename, size, path: filePath } = req.file;
    // busboy(멀터)가 multipart 헤더를 latin1로 파싱해서 originalname의 한글이
    // 깨져 들어오므로, latin1 → utf8로 재해석해서 복원한다.
    const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    const { rows } = await pool.query(
      `INSERT INTO guides (title, original_filename, stored_filename, file_path, file_size, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [title, originalname, filename, filePath, size],
    );

    res.status(201).json(toGuideDTO(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/guides ──────────────────────────────────────────────────────────

router.get('/', sessionAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM guides ORDER BY uploaded_at DESC');
    res.json(rows.map(toGuideDTO));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/guides/:id ───────────────────────────────────────────────────────

router.get('/:id', sessionAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM guides WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: '가이드를 찾을 수 없습니다.' });
    res.json(toGuideDTO(rows[0]));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/guides/:id/download ──────────────────────────────────────────────

router.get('/:id/download', sessionAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT file_path, original_filename FROM guides WHERE id = $1',
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ message: '가이드를 찾을 수 없습니다.' });

    const { file_path, original_filename } = rows[0];
    if (!fs.existsSync(file_path)) return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });

    // res.download의 두 번째 인자는 content-disposition 모듈을 거쳐
    // filename*=UTF-8''... (RFC 5987) 형태로 자동 인코딩되어 한글 파일명도 깨지지 않는다.
    res.download(file_path, original_filename);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
