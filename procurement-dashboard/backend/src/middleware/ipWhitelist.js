// IP 화이트리스트 미들웨어
// ENABLE_IP_WHITELIST=true 일 때만 동작 — 평소 개발 중에는 false로 꺼둔 채 사용
function normalizeIp(ip) {
  return (ip ?? '').replace(/^::ffff:/, '');
}

module.exports = function ipWhitelist(req, res, next) {
  if (process.env.ENABLE_IP_WHITELIST !== 'true') return next();

  const allowedIps = (process.env.ALLOWED_IPS ?? '')
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean);

  const clientIp = normalizeIp(req.ip);

  if (allowedIps.includes(clientIp)) return next();

  res.status(403).json({ message: '접근이 제한된 네트워크입니다.' });
};
