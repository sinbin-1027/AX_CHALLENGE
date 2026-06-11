const express = require('express');
const auth    = require('../middleware/auth');
const db      = require('../db/database');

const router = express.Router();

// ── 상수 ─────────────────────────────────────────────────────────────────────

const CERT_TYPE_TO_COL = {
  sme:               '인증_중소기업',
  women:             '인증_여성',
  startup:           '인증_창업',
  disabled:          '인증_장애인',
  severe_disabled:   '인증_중증장애인',
  standard_workshop: '인증_표준사업장',
  social:            '인증_사회적기업',
  cooperative:       '인증_협동조합',
  green:             '인증_녹색',
  jawal:             '인증_자활용사촌',
  pilot:             '인증_시범구매',
  tech:              '인증_기술개발',
  nep:               '인증_NEP',
  innovative_product:'인증_혁신제품',
};

const KEY_TO_COL = {
  sme:                    '인증_중소기업',
  women_goods:            '인증_여성',
  women_service:          '인증_여성',
  women_construction:     '인증_여성',
  startup:                '인증_창업',
  disabled_enterprise:    '인증_장애인',
  severe_disabled:        '인증_중증장애인',
  standard_workshop:      '인증_표준사업장',
  social_enterprise:      '인증_사회적기업',
  cooperative:            '인증_협동조합',
  green_product:          '인증_녹색',
  jawal_veteran:          '인증_자활용사촌',
  pilot_purchase:         '인증_시범구매',
  tech_development:       '인증_기술개발',
  nep:                    '인증_NEP',
  innovative_product:     '인증_혁신제품',
};

const ALL_CERT_COLS = [
  '인증_중소기업', '인증_여성',    '인증_창업',    '인증_장애인',
  '인증_중증장애인','인증_표준사업장','인증_사회적기업','인증_협동조합',
  '인증_녹색',     '인증_자활용사촌','인증_시범구매', '인증_기술개발',
  '인증_NEP',      '인증_혁신제품',
];

const CERT_LABEL = {
  '인증_중소기업':   '중소기업',
  '인증_여성':       '여성기업',
  '인증_창업':       '창업기업',
  '인증_장애인':     '장애인기업',
  '인증_중증장애인': '중증장애인',
  '인증_표준사업장': '표준사업장',
  '인증_사회적기업': '사회적기업',
  '인증_협동조합':   '협동조합',
  '인증_녹색':       '녹색제품',
  '인증_자활용사촌': '자활용사촌',
  '인증_시범구매':   '시범구매',
  '인증_기술개발':   '기술개발',
  '인증_NEP':        'NEP',
  '인증_혁신제품':   '혁신제품',
};

// 인증수 재계산 표현식
const CERT_SUM_EXPR = ALL_CERT_COLS.map(c => `COALESCE(${c}, 0)`).join(' + ');

// ── POST /api/vendors/upload ──────────────────────────────────────────────────

router.post('/upload', auth, (req, res) => {
  const { certType, rows } = req.body;

  if (!certType || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'certType과 rows 배열이 필요합니다.' });
  }

  const certCol = CERT_TYPE_TO_COL[certType];
  if (!certCol) {
    return res.status(400).json({ message: `유효하지 않은 certType: ${certType}` });
  }

  const today = new Date().toISOString().slice(0, 10);
  let inserted = 0;
  let updated  = 0;

  db.exec('BEGIN');
  try {
    for (const row of rows) {
      const bizNo = String(row['사업자번호'] ?? '').trim();
      const name  = String(row['업체명']    ?? '').trim();
      if (!bizNo || !name) continue;

      const item     = String(row['취급품목'] ?? '').trim();
      const existing = db.prepare('SELECT id FROM vendors WHERE 사업자번호 = ?').get(bizNo);

      if (existing) {
        db.prepare(`
          UPDATE vendors
          SET ${certCol} = 1,
              데이터기준일 = ?,
              updated_at   = datetime('now', 'localtime')
          WHERE 사업자번호 = ?
        `).run(today, bizNo);
        updated++;
      } else {
        db.prepare(`
          INSERT INTO vendors (사업자번호, 업체명, 취급품목, ${certCol}, 인증수, 데이터기준일, updated_at)
          VALUES (?, ?, ?, 1, 1, ?, datetime('now', 'localtime'))
        `).run(bizNo, name, item, today);
        inserted++;
      }

      db.prepare(`
        UPDATE vendors SET 인증수 = (${CERT_SUM_EXPR}) WHERE 사업자번호 = ?
      `).run(bizNo);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.status(201).json({
    certType,
    certCol,
    inserted,
    updated,
    total: inserted + updated,
  });
});

// ── GET /api/vendors/recommend ────────────────────────────────────────────────

router.get('/recommend', auth, (req, res) => {
  const raw = req.query.insufficientKeys ?? '';
  const keys = raw.split(',').map(k => k.trim()).filter(Boolean);

  // insufficientKeys → 유니크 인증 컬럼 목록
  const certCols = [...new Set(keys.map(k => KEY_TO_COL[k]).filter(Boolean))];

  let vendors;

  if (certCols.length === 0) {
    vendors = db.prepare(
      'SELECT * FROM vendors ORDER BY 인증수 DESC LIMIT 10'
    ).all();
  } else {
    const scoreExpr  = certCols.map(c => `COALESCE(${c}, 0)`).join(' + ');
    const whereClause = certCols.map(c => `${c} = 1`).join(' OR ');

    vendors = db.prepare(`
      SELECT *, (${scoreExpr}) AS match_score
      FROM vendors
      WHERE ${whereClause}
      ORDER BY match_score DESC, 인증수 DESC
      LIMIT 10
    `).all();
  }

  // 보유 인증 레이블 목록 추가
  const result = vendors.map(v => ({
    id:          v.id,
    사업자번호:  v['사업자번호'],
    업체명:      v['업체명'],
    취급품목:    v['취급품목'],
    인증수:      v['인증수'],
    match_score: v.match_score ?? null,
    데이터기준일:v['데이터기준일'],
    보유인증: ALL_CERT_COLS
      .filter(c => v[c] === 1)
      .map(c => CERT_LABEL[c]),
  }));

  res.json(result);
});

// ── GET /api/vendors/list ─────────────────────────────────────────────────────

router.get('/list', auth, (req, res) => {
  const search    = req.query.search     ?? '';
  const certFilter= req.query.certFilter ?? '';
  const pageNum   = Math.max(1, parseInt(req.query.page  ?? '1'));
  const limitNum  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20')));
  const offset    = (pageNum - 1) * limitNum;

  const conditions = ['1=1'];
  const params     = [];

  if (search) {
    conditions.push('(업체명 LIKE ? OR 사업자번호 LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (certFilter && CERT_TYPE_TO_COL[certFilter]) {
    conditions.push(`${CERT_TYPE_TO_COL[certFilter]} = 1`);
  }

  const where = conditions.join(' AND ');

  const { total } = db.prepare(
    `SELECT COUNT(*) AS total FROM vendors WHERE ${where}`
  ).get(...params);

  const vendors = db.prepare(
    `SELECT * FROM vendors WHERE ${where} ORDER BY 인증수 DESC, updated_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limitNum, offset);

  const result = vendors.map(v => ({
    id:          v.id,
    사업자번호:  v['사업자번호'],
    업체명:      v['업체명'],
    취급품목:    v['취급품목'],
    인증수:      v['인증수'],
    데이터기준일:v['데이터기준일'],
    보유인증:    ALL_CERT_COLS.filter(c => v[c] === 1).map(c => CERT_LABEL[c]),
    인증상세:    Object.fromEntries(ALL_CERT_COLS.map(c => [CERT_LABEL[c], v[c] === 1])),
  }));

  res.json({ vendors: result, total, page: pageNum, limit: limitNum });
});

module.exports = router;
