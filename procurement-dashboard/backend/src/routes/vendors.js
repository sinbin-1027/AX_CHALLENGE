const express     = require('express');
const sessionAuth = require('../middleware/auth');
const { pool }    = require('../db/database');

const router = express.Router();

// ── 매핑 상수 ─────────────────────────────────────────────────────────────────

// certType → 인증종류 (업로드용)
const CERT_TYPE_TO_KIND = {
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
};

// 지표 key → 인증종류 (search용)
const KEY_TO_KIND = {
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
};

// ── 상태 자동 계산 ────────────────────────────────────────────────────────────

function calcStatus(cancelDate, expireDate) {
  if (cancelDate) return '취소';
  if (!expireDate) return '확인필요';
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return expireDate > today ? '유효' : '확인필요';    // 문자열 비교 (ISO날짜는 사전순 = 시간순)
}

// ── POST /api/vendors/upload ──────────────────────────────────────────────────

router.post('/upload', sessionAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { certType, vendors } = req.body;

    if (!certType || !Array.isArray(vendors) || vendors.length === 0) {
      return res.status(400).json({ message: 'certType과 vendors 배열이 필요합니다.' });
    }

    const certKind = CERT_TYPE_TO_KIND[certType];
    if (!certKind) {
      return res.status(400).json({ message: `유효하지 않은 certType: ${certType}` });
    }

    const today = new Date().toISOString().slice(0, 10);
    let inserted = 0, updated = 0;

    await client.query('BEGIN');

    for (const row of vendors) {
      const bizNo = String(row['사업자번호'] ?? '').trim();
      const name  = String(row['업체명']    ?? '').trim();
      if (!bizNo || !name) continue;

      const item       = String(row['취급품목'] ?? '').trim() || null;
      const expireDate = row['만료일자'] ? String(row['만료일자']).trim() || null : null;
      const cancelDate = row['취소일자'] ? String(row['취소일자']).trim() || null : null;
      const status     = calcStatus(cancelDate, expireDate);
      const baseDate   = row['데이터기준일'] ? String(row['데이터기준일']).trim() || today : today;

      const result = await client.query(`
        INSERT INTO vendors (사업자번호, 업체명, 인증종류, 취급품목, 만료일자, 취소일자, 상태, 데이터기준일)
        VALUES ($1, $2, $3, $4, $5::DATE, $6::DATE, $7, $8::DATE)
        ON CONFLICT (사업자번호, 인증종류) DO UPDATE SET
          업체명       = EXCLUDED.업체명,
          취급품목     = EXCLUDED.취급품목,
          만료일자     = EXCLUDED.만료일자,
          취소일자     = EXCLUDED.취소일자,
          상태         = EXCLUDED.상태,
          데이터기준일 = EXCLUDED.데이터기준일,
          updated_at   = NOW()
        RETURNING (xmax::text::int > 0) AS was_updated
      `, [bizNo, name, certKind, item, expireDate, cancelDate, status, baseDate]);

      if (result.rows[0]?.was_updated) updated++; else inserted++;
    }

    await client.query('COMMIT');
    res.status(201).json({ certType, certKind, inserted, updated });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/vendors/search ───────────────────────────────────────────────────
// 부족한 지표 기반 추천 검색. 정렬: 매칭수↓ → 상태(유효우선) → 사업자번호↑

router.get('/search', sessionAuth, async (req, res, next) => {
  try {
    const insufficientKeys = (req.query.insufficientKeys ?? '')
      .split(',').map(k => k.trim()).filter(Boolean);
    const search   = (req.query.search   ?? '').trim();
    const certType = (req.query.certType ?? '').trim();
    const page     = Math.max(1, parseInt(req.query.page  ?? '1'));
    const limit    = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20')));
    const offset   = (page - 1) * limit;

    // 지표 key → 인증종류 변환 (중복 제거)
    const certKinds = [...new Set(insufficientKeys.map(k => KEY_TO_KIND[k]).filter(Boolean))];

    const sharedParams = [];
    const wheres       = [];

    // 부족 지표 필터: 해당 인증 보유 업체만
    let certKindsRef = null;
    if (certKinds.length > 0) {
      sharedParams.push(certKinds);
      certKindsRef = `$${sharedParams.length}`;
      wheres.push(`v.사업자번호 IN (SELECT DISTINCT 사업자번호 FROM vendors WHERE 인증종류 = ANY(${certKindsRef}))`);
    }

    // certType 필터
    if (certType && CERT_TYPE_TO_KIND[certType]) {
      sharedParams.push(CERT_TYPE_TO_KIND[certType]);
      wheres.push(`v.사업자번호 IN (SELECT DISTINCT 사업자번호 FROM vendors WHERE 인증종류 = $${sharedParams.length})`);
    }

    // 업체명/사업자번호 검색
    if (search) {
      sharedParams.push(`%${search}%`);
      const p = `$${sharedParams.length}`;
      wheres.push(`(v.업체명 ILIKE ${p} OR v.사업자번호 ILIKE ${p})`);
    }

    const whereClause   = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
    const matchScoreSQL = certKindsRef
      ? `COUNT(*) FILTER (WHERE v.인증종류 = ANY(${certKindsRef})) AS match_score`
      : `0::bigint AS match_score`;

    const dataParams = [...sharedParams, limit, offset];
    const limitRef   = `$${dataParams.length - 1}`;
    const offsetRef  = `$${dataParams.length}`;

    const [countResult, dataResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT v.사업자번호) AS total FROM vendors v ${whereClause}`,
        sharedParams,
      ),
      pool.query(`
        SELECT
          v.사업자번호,
          MAX(v.업체명)             AS 업체명,
          MAX(v.취급품목)           AS 취급품목,
          MAX(v.데이터기준일::text) AS 데이터기준일,
          array_agg(
            json_build_object(
              '인증종류', v.인증종류,
              '상태',     v.상태,
              '만료일자', v.만료일자::text
            ) ORDER BY v.인증종류
          ) AS 인증목록,
          ${matchScoreSQL},
          MIN(CASE v.상태
            WHEN '유효'     THEN 1
            WHEN '확인필요' THEN 2
            WHEN '취소'     THEN 3
            ELSE 4
          END) AS status_order
        FROM vendors v
        ${whereClause}
        GROUP BY v.사업자번호
        ORDER BY match_score DESC, status_order ASC, v.사업자번호 ASC
        LIMIT ${limitRef} OFFSET ${offsetRef}
      `, dataParams),
    ]);

    const vendors = dataResult.rows.map(v => ({
      사업자번호:   v['사업자번호'],
      업체명:       v['업체명'],
      취급품목:     v['취급품목'],
      데이터기준일: v['데이터기준일'],
      인증목록:     v['인증목록'] ?? [],
      match_score:  Number(v.match_score),
    }));

    res.json({
      vendors,
      total: Number(countResult.rows[0].total),
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/vendors/list ─────────────────────────────────────────────────────

router.get('/list', sessionAuth, async (req, res, next) => {
  try {
    const search   = (req.query.search   ?? '').trim();
    const certType = (req.query.certType ?? '').trim();
    const status   = (req.query.status   ?? '').trim();
    const page     = Math.max(1, parseInt(req.query.page  ?? '1'));
    const limit    = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20')));
    const offset   = (page - 1) * limit;

    const sharedParams = [];
    const wheres       = [];

    if (search) {
      sharedParams.push(`%${search}%`);
      const p = `$${sharedParams.length}`;
      wheres.push(`(v.업체명 ILIKE ${p} OR v.사업자번호 ILIKE ${p})`);
    }

    if (certType && CERT_TYPE_TO_KIND[certType]) {
      sharedParams.push(CERT_TYPE_TO_KIND[certType]);
      wheres.push(`v.사업자번호 IN (SELECT DISTINCT 사업자번호 FROM vendors WHERE 인증종류 = $${sharedParams.length})`);
    }

    if (status && ['유효', '확인필요', '취소'].includes(status)) {
      sharedParams.push(status);
      wheres.push(`v.사업자번호 IN (SELECT DISTINCT 사업자번호 FROM vendors WHERE 상태 = $${sharedParams.length})`);
    }

    const whereClause = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
    const dataParams  = [...sharedParams, limit, offset];
    const limitRef    = `$${dataParams.length - 1}`;
    const offsetRef   = `$${dataParams.length}`;

    const [countResult, dataResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT v.사업자번호) AS total FROM vendors v ${whereClause}`,
        sharedParams,
      ),
      pool.query(`
        SELECT
          v.사업자번호,
          MAX(v.업체명)             AS 업체명,
          MAX(v.취급품목)           AS 취급품목,
          MAX(v.데이터기준일::text) AS 데이터기준일,
          array_agg(
            json_build_object(
              '인증종류', v.인증종류,
              '상태',     v.상태,
              '만료일자', v.만료일자::text
            ) ORDER BY v.인증종류
          ) AS 인증목록,
          COUNT(*) AS 인증수
        FROM vendors v
        ${whereClause}
        GROUP BY v.사업자번호
        ORDER BY 인증수 DESC, MAX(v.updated_at) DESC
        LIMIT ${limitRef} OFFSET ${offsetRef}
      `, dataParams),
    ]);

    const vendors = dataResult.rows.map(v => ({
      사업자번호:   v['사업자번호'],
      업체명:       v['업체명'],
      취급품목:     v['취급품목'],
      데이터기준일: v['데이터기준일'],
      인증목록:     v['인증목록'] ?? [],
      인증수:       Number(v['인증수']),
    }));

    res.json({
      vendors,
      total: Number(countResult.rows[0].total),
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/vendors/stats ────────────────────────────────────────────────────

router.get('/stats', sessionAuth, async (req, res, next) => {
  try {
    const [byKindResult, summaryResult] = await Promise.all([
      pool.query(`
        SELECT
          인증종류,
          COUNT(*)                                       AS total,
          COUNT(*) FILTER (WHERE 상태 = '유효')          AS 유효,
          COUNT(*) FILTER (WHERE 상태 = '확인필요')      AS 확인필요,
          COUNT(*) FILTER (WHERE 상태 = '취소')          AS 취소,
          MAX(데이터기준일::text)                        AS 데이터기준일
        FROM vendors
        GROUP BY 인증종류
        ORDER BY 인증종류
      `),
      pool.query(`
        SELECT
          COUNT(DISTINCT 사업자번호) AS 업체수,
          COUNT(*)                   AS 인증건수,
          MAX(데이터기준일::text)    AS 최신기준일
        FROM vendors
      `),
    ]);

    res.json({
      byKind: byKindResult.rows.map(r => ({
        인증종류:     r['인증종류'],
        total:        Number(r.total),
        유효:         Number(r['유효']),
        확인필요:     Number(r['확인필요']),
        취소:         Number(r['취소']),
        데이터기준일: r['데이터기준일'],
      })),
      summary: {
        업체수:       Number(summaryResult.rows[0]['업체수']),
        인증건수:     Number(summaryResult.rows[0]['인증건수']),
        최신기준일:   summaryResult.rows[0]['최신기준일'],
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
