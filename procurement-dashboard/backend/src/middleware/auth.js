module.exports = function sessionAuth(req, res, next) {
  if (req.session?.isLoggedIn) return next();
  res.status(401).json({ message: '로그인이 필요합니다.' });
};
