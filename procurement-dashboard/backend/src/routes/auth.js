const express = require('express');

const router = express.Router();

const GUEST = { username: 'guest', password: 'guest1234' };

function initTempData() {
  return {
    uploadedRows: {},  // deptId: rows[]
    manualRows:   {},  // deptId: rows[]
    excludedNos:  {},  // deptId: string[]
    rowEdits:     {},  // deptId: { 결의번호: { 컬럼명: 수정값 } }
    deletedNos:   {},  // deptId: string[]
  };
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};

  if (username !== GUEST.username || password !== GUEST.password) {
    return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  req.session.isLoggedIn = true;
  req.session.tempData   = initTempData();

  res.json({ ok: true, username });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: '로그아웃 실패' });
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// GET /api/auth/check
router.get('/check', (req, res) => {
  if (req.session?.isLoggedIn) return res.json({ ok: true, username: GUEST.username });
  res.status(401).json({ message: '로그인이 필요합니다.' });
});

module.exports = router;
