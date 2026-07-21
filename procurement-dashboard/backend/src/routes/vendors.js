const express  = require('express');
const auth     = require('../middleware/auth');
const { pool } = require('../db/database');

const router = express.Router();

// ── 상수 ─────────────────────────────────────────────────────────────────────

// certType → 인증종류 텍스트 (vendors 테이블 인증종류 컬럼값)
const CERT_TYPE_TO_KIND = {
  sme:               '중소기업',
  women:             '여성기업',
  startup:           '창업기업',
  disabled:          '장애인기업',
  severe_disabled:   '중증장애인',
  standard_workshop: '장애인표준사업장',
  social:            '사회적기업',
  cooperative:       '사회적협동조합',
  green:             '녹색제품',
  jawal:             '자활용사촌',
  pilot:             '시범구매',
  tech:              '기술개발',
  nep:               'NEP',
  innovative_product:'혁신제품',
};

// 지표 key → 인증종류 (recommend용)
const KEY_TO_KIND = {
  sme:                 '중소기업',
  women_goods:         '여성기업',
  women_service:       '여성기업',
  women_construction:  '여성기업',
  startup:             '창업기업',
  disabled_enterprise: '장애인기업',
  severe_disabled:     '중증장애인',
  standard_workshop:   '장애인표준사업장',
  social_enterprise:   '사회적기업',
  cooperative:         '사회적협동조합',
  green_product:       '녹색제품',
  jawal_veteran:       '자활용사촌',
  pilot_purchase:      '시범구매',
  tech_development:    '기술개발',
  nep:                 'NEP',
  innovative_product:  '혁신제품',
};

// ── POST /api/vendors/upload ──────────────────────────────────────────────────

router.post('/upload', auth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { certType, rows } = req.body;

    if (!certType || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'certType과 rows 배열이 필요합니다.' });
    }

    const certKind = CERT_TYPE_TO_KIND[certType];
    if (!certKind) {
      return res.status(400).json({ message: `유효하지 않은 certType: ${certType}` });
    }

    let inserted = 0, updated = 0;

    await client.query('BEGIN');

    for (const row of rows) {
      const bizNo = String(row['사업자번호'] ?? '').trim();
      const name  = String(row['업체명']    ?? '').trim();
      if (!bizNo || !name) continue;

      const item     = String(row['취급품목']    ?? '').trim() || null;
      const expires  = row['만료일자']  ? String(row['만료일자'])  : null;
      const canceled = row['취소일자']  ? String(row['취소일자'])  : null;
      const status   = String(row['상태'] ?? '유효');
      const baseDate = row['데이터기준일'] ? String(row['데이터기준일']) : null;

      const { rowCount } = await client.query(`
        INSERT INTO vendors (사업자번호, 업체명, 인증종류, 취급품목, 만료일자, 취소일자, 상태, 데이터기준일)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (사업자번호, 인증종류) DO UPDATE SET
          업체명       = EXCLUDED.업체명,
          취급품목     = EXCLUDED.취급품목,
          만료일자     = EXCLUDED.만료일자,
          취소일자     = EXCLUDED.취소일자,
          상태         = EXCLUDED.상태,
          데이터기준일 = EXCLUDED.데이터기준일,
          updated_at   = NOW()
      `, [bizNo, name, certKind, item, expires, canceled, status, baseDate]);

      if (rowCount > 0) inserted++; else updated++;
    }

    await client.query('COMMIT');
    res.status(201).json({ certType, certKind, inserted, updated, total: inserted + updated });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/vendors/recommend ────────────────────────────────────────────────

router.get('/recommend', auth, async (req, res, next) => {
  try {
    const raw  = req.query.insufficientKeys ?? '';
    const keys = raw.split(',').map(k => k.trim()).filter(Boolean);

    const certKinds = [...new Set(keys.map(k => KEY_TO_KIND[k]).filter(Boolean))];

    let rows;
    if (certKinds.length === 0) {
      const result = await pool.query(`
        SELECT
          사업자번호,
          MAX(업체명)       AS 업체명,
          MAX(취급품목)     AS 취급품목,
          MAX(데이터기준일) AS 데이터기준일,
          array_agg(인증종류 ORDER BY 인증종류) AS certs,
          COUNT(*)          AS cert_count
        FROM vendors
        GROUP BY 사업자번호
        ORDER BY cert_count DESC
        LIMIT 10
      `);
      rows = result.rows;
    } else {
      const result = await pool.query(`
        SELECT
          사업자번호,
          MAX(업체명)       AS 업체명,
          MAX(취급품목)     AS 취급품목,
          MAX(데이터기준일) AS 데이터기준일,
          array_agg(인증종류 ORDER BY 인증종류) AS certs,
          COUNT(*) FILTER (WHERE 인증종류 = ANY($1)) AS match_score,
          COUNT(*) AS cert_count
        FROM vendors
        WHERE 사업자번호 IN (
          SELECT DISTINCT 사업자번호 FROM vendors WHERE 인증종류 = ANY($1)
        )
        GROUP BY 사업자번호
        ORDER BY match_score DESC, cert_count DESC
        LIMIT 10
      `, [certKinds]);
      rows = result.rows;
    }

    const result = rows.map(v => ({
      id:          null,
      사업자번호:  v['사업자번호'],
      업체명:      v['업체명'],
      취급품목:    v['취급품목'],
      인증수:      Number(v.cert_count),
      match_score: v.match_score ? Number(v.match_score) : null,
      데이터기준일:v['데이터기준일'],
      보유인증:    v.certs ?? [],
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/vendors/list ─────────────────────────────────────────────────────

router.get('/list', auth, async (req, res, next) => {
  try {
    const search     = req.query.search     ?? '';
    const certFilter = req.query.certFilter ?? '';
    const pageNum    = Math.max(1, parseInt(req.query.page  ?? '1'));
    const limitNum   = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20')));
    const offset     = (pageNum - 1) * limitNum;

    const params = [];
    const wheres = [];

    if (search) {
      params.push(`%${search}%`);
      const p = `$${params.length}`;
      wheres.push(`(v.업체명 ILIKE ${p} OR v.사업자번호 ILIKE ${p})`);
    }

    if (certFilter && CERT_TYPE_TO_KIND[certFilter]) {
      params.push(CERT_TYPE_TO_KIND[certFilter]);
      wheres.push(`v.사업자번호 IN (SELECT DISTINCT 사업자번호 FROM vendors WHERE 인증종류 = $${params.length})`);
    }

    const whereClause = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

    const [countResult, dataResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT v.사업자번호) AS total FROM vendors v ${whereClause}`,
        params,
      ),
      pool.query(
        `SELECT
           v.사업자번호,
           MAX(v.업체명)       AS 업체명,
           MAX(v.취급품목)     AS 취급품목,
           MAX(v.데이터기준일) AS 데이터기준일,
           array_agg(v.인증종류 ORDER BY v.인증종류) AS certs,
           COUNT(*) AS cert_count
         FROM vendors v
         ${whereClause}
         GROUP BY v.사업자번호
         ORDER BY cert_count DESC, MAX(v.updated_at) DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNum, offset],
      ),
    ]);

    const vendors = dataResult.rows.map(v => ({
      사업자번호:  v['사업자번호'],
      업체명:      v['업체명'],
      취급품목:    v['취급품목'],
      인증수:      Number(v.cert_count),
      데이터기준일:v['데이터기준일'],
      보유인증:    v.certs ?? [],
      인증상세:    Object.fromEntries((v.certs ?? []).map(c => [c, true])),
    }));

    res.json({
      vendors,
      total: Number(countResult.rows[0].total),
      page:  pageNum,
      limit: limitNum,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
