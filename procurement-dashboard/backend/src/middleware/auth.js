const jwt = require('jsonwebtoken');

module.exports = function sessionAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ message: '로그인이 필요합니다' });
  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: '로그인이 필요합니다' });
  }
};
