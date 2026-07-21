const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { pool } = require('../db/database');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, department } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '아이디와 비밀번호를 입력하세요.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username],
    );
    if (existing.length) {
      return res.status(409).json({ message: '이미 사용 중인 아이디입니다.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password, department) VALUES ($1, $2, $3) RETURNING id',
      [username, hashed, department ?? null],
    );

    const token = jwt.sign(
      { id: rows[0].id, username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.status(201).json({ token, username, department: department ?? null });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '아이디와 비밀번호를 입력하세요.' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.json({ token, username: user.username, department: user.department });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
