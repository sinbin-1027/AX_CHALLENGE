const express  = require('express');
const auth     = require('../middleware/auth');
const { pool } = require('../db/database');

const router = express.Router();

// ── 컬럼 매핑 (DB 컬럼명 → calcEngine 키) ────────────────────────────────────

const DB_TO_CALC = {
  '구매구분':                   '구매구분',
  '물품금액':                   '물품금액',
  '채주지급금액':               '채주지급금액',
  '중소기업제품':               '중소기업제품(연동)',
  '여성기업제품':               '여성기업제품(연동)',
  '사회적기업':                 '사회적기업',
  '사회적협동조합제품여부':     '사회적협동조합제품여부',
  '장애인구매':                 '장애인구매(연동)',
  '장애인표준사업장여부':       '장애인표준사업장여부',
  '중증장애인제품':             '중증장애인제품',
  '창업기업제품':               '창업기업제품',
  '친환경제품':                 '친환경제품',
  '자활용사촌제품':             '자활용사촌제품',
  '시범구매여부':               '시범구매여부',
  '기술개발제품대상품목조회':   '기술개발제품대상품목조회',
  '신제품인증NEP여부':          '신제품인증(NEP)여부',
  '신제품인증NEP대상품목':      '신제품인증(NEP) 대상품목',
  '혁신제품여부':               '혁신제품여부',
};

function toCalcRow(row) {
  const out = { ...row };
  for (const [dbCol, calcCol] of Object.entries(DB_TO_CALC)) {
    out[calcCol] = row[dbCol] ?? '';
  }
  out['물품금액']     = Number(row['물품금액'])     || 0;
  out['채주지급금액'] = Number(row['채주지급금액']) || 0;
  out['집행구분']     = row['집행구분'] ?? 'Y';
  out['제외여부']     = row['제외여부'] ?? 0;
  out.__source        = 'raw';
  out.__결의번호      = row['결의번호'] ?? null;
  return out;
}

function manualToCalcRow(row) {
  return {
    '구매구분':                   row['구매구분']              ?? '물품',
    '물품금액':                   Number(row['물품금액'])       || 0,
    '채주지급금액':               0,
    '중소기업제품(연동)':         row['중소기업제품']          ?? 'N',
    '여성기업제품(연동)':         row['여성기업제품']          ?? 'N',
    '사회적기업':                 row['사회적기업']            ?? 'N',
    '사회적협동조합제품여부':     row['사회적협동조합제품여부'] ?? 'N',
    '장애인구매(연동)':           row['장애인구매']            ?? 'N',
    '장애인표준사업장여부':       row['장애인표준사업장여부']  ?? 'N',
    '중증장애인제품':             row['중증장애인제품']        ?? 'N',
    '창업기업제품':               row['창업기업제품']          ?? 'N',
    '친환경제품':                 row['친환경제품']            ?? 'N',
    '자활용사촌제품':             row['자활용사촌제품']        ?? 'N',
    '시범구매여부':               row['시범구매여부']          ?? 'N',
    '기술개발제품대상품목조회':   row['기술개발제품대상품목조회'] ?? 'N',
    '신제품인증(NEP)여부':        row['신제품인증NEP여부']     ?? 'N',
    '신제품인증(NEP) 대상품목':   row['신제품인증NEP대상품목'] ?? 'N',
    '혁신제품여부':               row['혁신제품여부']          ?? 'N',
    '집행구분':                   row['집행구분']              ?? 'Y',
    '제외여부':                   0,
    __source:                     'manual',
    __id:                         row.id,
  };
}

// ── GET /api/purchases/list ───────────────────────────────────────────────────

router.get('/list', auth, async (req, res, next) => {
  try {
    const deptId = req.query.deptId;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

    const [rawResult, manualResult] = await Promise.all([
      pool.query('SELECT * FROM raw_purchases WHERE dept_id = $1 ORDER BY uploaded_at ASC', [deptId]),
      pool.query('SELECT * FROM manual_purchases WHERE dept_id = $1 ORDER BY created_at ASC', [deptId]),
    ]);

    res.json({
      rows:        [...rawResult.rows.map(toCalcRow), ...manualResult.rows.map(manualToCalcRow)],
      rawCount:    rawResult.rows.length,
      manualCount: manualResult.rows.length,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/purchases/calc ───────────────────────────────────────────────────

router.get('/calc', auth, async (req, res, next) => {
  try {
    const deptId = req.query.deptId;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

    const [rawResult, manualResult] = await Promise.all([
      pool.query('SELECT * FROM raw_purchases WHERE dept_id = $1 AND 제외여부 = 0 ORDER BY uploaded_at ASC', [deptId]),
      pool.query('SELECT * FROM manual_purchases WHERE dept_id = $1 ORDER BY created_at ASC', [deptId]),
    ]);

    res.json({
      rows:        [...rawResult.rows.map(toCalcRow), ...manualResult.rows.map(manualToCalcRow)],
      rawCount:    rawResult.rows.length,
      manualCount: manualResult.rows.length,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/purchases/upload ────────────────────────────────────────────────

router.post('/upload', auth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { deptId, rows } = req.body;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'rows 배열이 필요합니다.' });
    }

    let added = 0, skipped = 0;

    await client.query('BEGIN');

    for (const row of rows) {
      const bizNo = String(row['결의번호'] ?? '').trim();
      if (!bizNo) { skipped++; continue; }

      const { rowCount } = await client.query(`
        INSERT INTO raw_purchases
          (dept_id, 결의번호, 구매구분, 채주지급금액, 물품금액, 적요,
           발의일자, 수령인사업자명, 발주품목명,
           중소기업제품, 여성기업제품, 사회적기업, 사회적협동조합제품여부,
           장애인구매, 장애인표준사업장여부, 중증장애인제품, 창업기업제품,
           친환경제품, 자활용사촌제품, 시범구매여부, 기술개발제품대상품목조회,
           신제품인증NEP여부, 신제품인증NEP대상품목, 혁신제품여부)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
        ON CONFLICT (dept_id, 결의번호) DO NOTHING
      `, [
        deptId, bizNo,
        row['구매구분']                  ?? '',
        Number(row['채주지급금액'])      || 0,
        Number(row['물품금액'])          || 0,
        row['적요']                      ?? '',
        row['발의일자']                  ?? '',
        row['수령인사업자명']            ?? '',
        row['발주품목명']                ?? '',
        row['중소기업제품(연동)']        ?? '',
        row['여성기업제품(연동)']        ?? '',
        row['사회적기업']                ?? '',
        row['사회적협동조합제품여부']    ?? '',
        row['장애인구매(연동)']          ?? '',
        row['장애인표준사업장여부']      ?? '',
        row['중증장애인제품']            ?? '',
        row['창업기업제품']              ?? '',
        row['친환경제품']                ?? '',
        row['자활용사촌제품']            ?? '',
        row['시범구매여부']              ?? '',
        row['기술개발제품대상품목조회']  ?? '',
        row['신제품인증(NEP)여부']       ?? '',
        row['신제품인증(NEP) 대상품목']  ?? '',
        row['혁신제품여부']              ?? '',
      ]);

      if (rowCount > 0) added++; else skipped++;
    }

    await client.query('COMMIT');
    res.status(201).json({ added, skipped });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── PUT /api/purchases/exclude ────────────────────────────────────────────────

router.put('/exclude', auth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { deptId, excludeIds = [] } = req.body;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

    await client.query('BEGIN');

    await client.query(
      'UPDATE raw_purchases SET 제외여부 = 0 WHERE dept_id = $1',
      [deptId],
    );

    if (excludeIds.length > 0) {
      for (const bizNo of excludeIds) {
        await client.query(
          'UPDATE raw_purchases SET 제외여부 = 1 WHERE 결의번호 = $1 AND dept_id = $2',
          [bizNo, deptId],
        );
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true, excludedCount: excludeIds.length });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── POST /api/purchases/manual ────────────────────────────────────────────────

router.post('/manual', auth, async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

    const { rows } = await pool.query(`
      INSERT INTO manual_purchases
        (dept_id, 품목명, 구매구분, 물품금액,
         중소기업제품, 여성기업제품, 사회적기업, 사회적협동조합제품여부,
         장애인구매, 장애인표준사업장여부, 중증장애인제품, 창업기업제품,
         친환경제품, 자활용사촌제품, 시범구매여부, 기술개발제품대상품목조회,
         신제품인증NEP여부, 신제품인증NEP대상품목, 혁신제품여부, 집행구분, 메모)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING id
    `, [
      b.deptId, b.품목명 ?? '', b.구매구분 ?? '물품', Number(b.물품금액) || 0,
      b.중소기업제품 ?? 'N', b.여성기업제품 ?? 'N', b.사회적기업 ?? 'N',
      b.사회적협동조합제품여부 ?? 'N', b.장애인구매 ?? 'N',
      b.장애인표준사업장여부 ?? 'N', b.중증장애인제품 ?? 'N',
      b.창업기업제품 ?? 'N', b.친환경제품 ?? 'N', b.자활용사촌제품 ?? 'N',
      b.시범구매여부 ?? 'N', b.기술개발제품대상품목조회 ?? 'N',
      b.신제품인증NEP여부 ?? 'N', b.신제품인증NEP대상품목 ?? 'N',
      b.혁신제품여부 ?? 'N', b.집행구분 ?? 'Y', b.메모 ?? '',
    ]);

    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/purchases/manual/:id ─────────────────────────────────────────────

router.put('/manual/:id', auth, async (req, res, next) => {
  try {
    const b      = req.body;
    const id     = Number(req.params.id);
    const deptId = b.deptId;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

    const { rows: existing } = await pool.query(
      'SELECT id FROM manual_purchases WHERE id = $1 AND dept_id = $2',
      [id, deptId],
    );
    if (!existing.length) return res.status(404).json({ message: '항목을 찾을 수 없습니다.' });

    await pool.query(`
      UPDATE manual_purchases SET
        품목명 = $1, 구매구분 = $2, 물품금액 = $3,
        중소기업제품 = $4, 여성기업제품 = $5, 사회적기업 = $6,
        사회적협동조합제품여부 = $7, 장애인구매 = $8, 장애인표준사업장여부 = $9,
        중증장애인제품 = $10, 창업기업제품 = $11, 친환경제품 = $12,
        자활용사촌제품 = $13, 시범구매여부 = $14, 기술개발제품대상품목조회 = $15,
        신제품인증NEP여부 = $16, 신제품인증NEP대상품목 = $17,
        혁신제품여부 = $18, 집행구분 = $19, 메모 = $20,
        updated_at = NOW()
      WHERE id = $21 AND dept_id = $22
    `, [
      b.품목명 ?? '', b.구매구분 ?? '물품', Number(b.물품금액) || 0,
      b.중소기업제품 ?? 'N', b.여성기업제품 ?? 'N', b.사회적기업 ?? 'N',
      b.사회적협동조합제품여부 ?? 'N', b.장애인구매 ?? 'N',
      b.장애인표준사업장여부 ?? 'N', b.중증장애인제품 ?? 'N',
      b.창업기업제품 ?? 'N', b.친환경제품 ?? 'N', b.자활용사촌제품 ?? 'N',
      b.시범구매여부 ?? 'N', b.기술개발제품대상품목조회 ?? 'N',
      b.신제품인증NEP여부 ?? 'N', b.신제품인증NEP대상품목 ?? 'N',
      b.혁신제품여부 ?? 'N', b.집행구분 ?? 'Y', b.메모 ?? '',
      id, deptId,
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/purchases/manual/:id ─────────────────────────────────────────

router.delete('/manual/:id', auth, async (req, res, next) => {
  try {
    const id     = Number(req.params.id);
    const deptId = req.body.deptId;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

    const { rowCount } = await pool.query(
      'DELETE FROM manual_purchases WHERE id = $1 AND dept_id = $2',
      [id, deptId],
    );
    if (!rowCount) return res.status(404).json({ message: '항목을 찾을 수 없습니다.' });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/purchases/reset ───────────────────────────────────────────────

router.delete('/reset', auth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const deptId = req.body.deptId;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

    await client.query('BEGIN');
    await client.query('DELETE FROM raw_purchases    WHERE dept_id = $1', [deptId]);
    await client.query('DELETE FROM manual_purchases WHERE dept_id = $1', [deptId]);
    await client.query('COMMIT');

    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
