const express = require('express');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const GUEST = { username: 'guest', password: 'guest1234' };

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};

  if (username !== GUEST.username || password !== GUEST.password) {
    return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const token = jwt.sign(
    { username: 'guest', sessionId: uuidv4() },
    process.env.JWT_SECRET,
    { expiresIn: '24h' },
  );

  res.json({ ok: true, token, username: 'guest' });
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/check
router.get('/check', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  try {
    jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    res.json({ ok: true });
  } catch {
    res.status(401).json({ message: '로그인이 필요합니다.' });
  }
});

module.exports = router;
