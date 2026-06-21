const express = require('express');
const auth    = require('../middleware/auth');
const db      = require('../db/database');

const router = express.Router();

// ── 컬럼 매핑 ─────────────────────────────────────────────────────────────────

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
    '물품금액':                   Number(row['금액'])          || 0,
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

// ── GET /api/purchases/list (전체 - 화면 표시용) ──────────────────────────────

router.get('/list', auth, (req, res) => {
  const userId = req.user.id;

  const rawRows    = db.prepare('SELECT * FROM raw_purchases WHERE user_id = ? ORDER BY uploaded_at ASC').all(userId);
  const manualRows = db.prepare('SELECT * FROM manual_purchases WHERE user_id = ? ORDER BY created_at ASC').all(userId);

  res.json({
    rows:        [...rawRows.map(toCalcRow), ...manualRows.map(manualToCalcRow)],
    rawCount:    rawRows.length,
    manualCount: manualRows.length,
  });
});

// ── GET /api/purchases/calc (제외여부=0만 - calcEngine용) ─────────────────────

router.get('/calc', auth, (req, res) => {
  const userId = req.user.id;

  const rawRows    = db.prepare('SELECT * FROM raw_purchases WHERE user_id = ? AND 제외여부 = 0 ORDER BY uploaded_at ASC').all(userId);
  const manualRows = db.prepare('SELECT * FROM manual_purchases WHERE user_id = ? ORDER BY created_at ASC').all(userId);

  res.json({
    rows:        [...rawRows.map(toCalcRow), ...manualRows.map(manualToCalcRow)],
    rawCount:    rawRows.length,
    manualCount: manualRows.length,
  });
});

// ── POST /api/purchases/upload ────────────────────────────────────────────────

router.post('/upload', auth, (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'rows 배열이 필요합니다.' });
  }

  // 기존 결의번호를 Set으로 일괄 조회
  const existingSet = new Set(
    db.prepare('SELECT 결의번호 FROM raw_purchases').all().map(r => r['결의번호'])
  );

  const insert = db.prepare(`
    INSERT INTO raw_purchases
      (결의번호, user_id, 구매구분, 채주지급금액, 물품금액, 적요, 부서명,
       발의일자, 수령인사업자명, 발주품목명,
       중소기업제품, 여성기업제품, 사회적기업, 사회적협동조합제품여부,
       장애인구매, 장애인표준사업장여부, 중증장애인제품, 창업기업제품,
       친환경제품, 자활용사촌제품, 시범구매여부, 기술개발제품대상품목조회,
       신제품인증NEP여부, 신제품인증NEP대상품목, 혁신제품여부)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  let added = 0, skipped = 0;

  db.exec('BEGIN');
  try {
    for (const row of rows) {
      const bizNo = String(row['결의번호'] ?? '').trim();
      if (!bizNo)                 { skipped++; continue; }
      if (existingSet.has(bizNo)) { skipped++; continue; }

      insert.run(
        bizNo, req.user.id,
        row['구매구분']                  ?? '',
        Number(row['채주지급금액'])      || 0,
        Number(row['물품금액'])          || 0,
        row['적요']                      ?? '',
        row['부서명']                    ?? '',
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
      );
      existingSet.add(bizNo);
      added++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.status(201).json({ added, skipped });
});

// ── PUT /api/purchases/exclude ────────────────────────────────────────────────

router.put('/exclude', auth, (req, res) => {
  const { excludeIds = [] } = req.body;
  const userId = req.user.id;

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE raw_purchases SET 제외여부 = 0 WHERE user_id = ?').run(userId);

    if (excludeIds.length > 0) {
      const stmt = db.prepare('UPDATE raw_purchases SET 제외여부 = 1 WHERE 결의번호 = ? AND user_id = ?');
      for (const bizNo of excludeIds) {
        stmt.run(bizNo, userId);
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json({ ok: true, excludedCount: excludeIds.length });
});

// ── POST /api/purchases/manual ────────────────────────────────────────────────

router.post('/manual', auth, (req, res) => {
  const b = req.body;
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO manual_purchases
      (user_id, 품목명, 구매구분, 금액,
       중소기업제품, 여성기업제품, 사회적기업, 사회적협동조합제품여부,
       장애인구매, 장애인표준사업장여부, 중증장애인제품, 창업기업제품,
       친환경제품, 자활용사촌제품, 시범구매여부, 기술개발제품대상품목조회,
       신제품인증NEP여부, 신제품인증NEP대상품목, 혁신제품여부, 집행구분, 메모)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    req.user.id, b.품목명 ?? '', b.구매구분 ?? '물품', Number(b.금액) || 0,
    b.중소기업제품 ?? 'N', b.여성기업제품 ?? 'N', b.사회적기업 ?? 'N',
    b.사회적협동조합제품여부 ?? 'N', b.장애인구매 ?? 'N',
    b.장애인표준사업장여부 ?? 'N', b.중증장애인제품 ?? 'N',
    b.창업기업제품 ?? 'N', b.친환경제품 ?? 'N', b.자활용사촌제품 ?? 'N',
    b.시범구매여부 ?? 'N', b.기술개발제품대상품목조회 ?? 'N',
    b.신제품인증NEP여부 ?? 'N', b.신제품인증NEP대상품목 ?? 'N',
    b.혁신제품여부 ?? 'N', b.집행구분 ?? 'Y', b.메모 ?? '',
  );

  res.status(201).json({ id: Number(lastInsertRowid) });
});

// ── PUT /api/purchases/manual/:id ────────────────────────────────────────────

router.put('/manual/:id', auth, (req, res) => {
  const b  = req.body;
  const id = Number(req.params.id);

  const existing = db.prepare('SELECT id FROM manual_purchases WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ message: '항목을 찾을 수 없습니다.' });

  db.prepare(`
    UPDATE manual_purchases SET
      품목명 = ?, 구매구분 = ?, 금액 = ?,
      중소기업제품 = ?, 여성기업제품 = ?, 사회적기업 = ?,
      사회적협동조합제품여부 = ?, 장애인구매 = ?, 장애인표준사업장여부 = ?,
      중증장애인제품 = ?, 창업기업제품 = ?, 친환경제품 = ?,
      자활용사촌제품 = ?, 시범구매여부 = ?, 기술개발제품대상품목조회 = ?,
      신제품인증NEP여부 = ?, 신제품인증NEP대상품목 = ?,
      혁신제품여부 = ?, 집행구분 = ?, 메모 = ?,
      updated_at = datetime('now', 'localtime')
    WHERE id = ? AND user_id = ?
  `).run(
    b.품목명 ?? '', b.구매구분 ?? '물품', Number(b.금액) || 0,
    b.중소기업제품 ?? 'N', b.여성기업제품 ?? 'N', b.사회적기업 ?? 'N',
    b.사회적협동조합제품여부 ?? 'N', b.장애인구매 ?? 'N',
    b.장애인표준사업장여부 ?? 'N', b.중증장애인제품 ?? 'N',
    b.창업기업제품 ?? 'N', b.친환경제품 ?? 'N', b.자활용사촌제품 ?? 'N',
    b.시범구매여부 ?? 'N', b.기술개발제품대상품목조회 ?? 'N',
    b.신제품인증NEP여부 ?? 'N', b.신제품인증NEP대상품목 ?? 'N',
    b.혁신제품여부 ?? 'N', b.집행구분 ?? 'Y', b.메모 ?? '',
    id, req.user.id,
  );

  res.json({ ok: true });
});

// ── DELETE /api/purchases/manual/:id ─────────────────────────────────────────

router.delete('/manual/:id', auth, (req, res) => {
  const id = Number(req.params.id);
  const { changes } = db.prepare('DELETE FROM manual_purchases WHERE id = ? AND user_id = ?').run(id, req.user.id);
  if (!changes) return res.status(404).json({ message: '항목을 찾을 수 없습니다.' });
  res.json({ ok: true });
});

// ── DELETE /api/purchases/reset ───────────────────────────────────────────────

router.delete('/reset', auth, (req, res) => {
  const userId = req.user.id;
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM raw_purchases    WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM manual_purchases WHERE user_id = ?').run(userId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  res.json({ ok: true });
});

module.exports = router;
