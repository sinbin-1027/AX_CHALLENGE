const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db/database');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, password, department } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '아이디와 비밀번호를 입력하세요.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: '비밀번호는 6자 이상이어야 합니다.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ message: '이미 사용 중인 아이디입니다.' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (username, password, department) VALUES (?, ?, ?)')
    .run(username, hashed, department ?? null);

  const token = jwt.sign(
    { id: lastInsertRowid, username },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );

  res.status(201).json({ token, username, department: department ?? null });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '아이디와 비밀번호를 입력하세요.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );

  res.json({ token, username: user.username, department: user.department });
});

module.exports = router;
