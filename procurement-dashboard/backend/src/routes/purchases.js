const express      = require('express');
const sessionAuth  = require('../middleware/auth');
const { pool }     = require('../db/database');

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

// DB 행 → calcEngine 형식
function toCalcRow(row, excludedNos) {
  const bizNo = String(row['결의번호'] ?? '').trim();
  const out   = { ...row };
  for (const [dbCol, calcCol] of Object.entries(DB_TO_CALC)) {
    out[calcCol] = row[dbCol] ?? '';
  }
  out['물품금액']     = Number(row['물품금액'])     || 0;
  out['채주지급금액'] = Number(row['채주지급금액']) || 0;
  out['집행구분']     = row['집행구분'] ?? 'Y';
  out['제외여부']     = excludedNos.has(bizNo) ? 1 : (row['제외여부'] ?? 0);
  out.__source        = 'raw';
  out.__결의번호      = bizNo || null;
  return out;
}

// 세션 업로드 행(엑셀 원본, calc 컬럼명) → calcEngine 형식
function sessionRawToCalcRow(row, excludedNos) {
  const bizNo = String(row['결의번호'] ?? '').trim();
  return {
    ...row,
    '물품금액':     Number(row['물품금액'])     || 0,
    '채주지급금액': Number(row['채주지급금액']) || 0,
    '집행구분':     row['집행구분'] ?? 'Y',
    '제외여부':     excludedNos.has(bizNo) ? 1 : (row['제외여부'] ?? 0),
    __source:       'raw',
    __결의번호:     bizNo || null,
  };
}

// 수기 행 (장/단 컬럼명 모두 허용) → calcEngine 형식
function manualToCalcRow(row) {
  const f = (long, short) => row[long] ?? row[short] ?? 'N';
  return {
    '구매구분':                 row['구매구분']              ?? '물품',
    '물품금액':                 Number(row['물품금액'])       || 0,
    '채주지급금액':             0,
    '중소기업제품(연동)':       f('중소기업제품(연동)',       '중소기업제품'),
    '여성기업제품(연동)':       f('여성기업제품(연동)',       '여성기업제품'),
    '사회적기업':               row['사회적기업']            ?? 'N',
    '사회적협동조합제품여부':   row['사회적협동조합제품여부'] ?? 'N',
    '장애인구매(연동)':         f('장애인구매(연동)',         '장애인구매'),
    '장애인표준사업장여부':     row['장애인표준사업장여부']  ?? 'N',
    '중증장애인제품':           row['중증장애인제품']        ?? 'N',
    '창업기업제품':             row['창업기업제품']          ?? 'N',
    '친환경제품':               row['친환경제품']            ?? 'N',
    '자활용사촌제품':           row['자활용사촌제품']        ?? 'N',
    '시범구매여부':             row['시범구매여부']          ?? 'N',
    '기술개발제품대상품목조회': row['기술개발제품대상품목조회'] ?? 'N',
    '신제품인증(NEP)여부':      f('신제품인증(NEP)여부',     '신제품인증NEP여부'),
    '신제품인증(NEP) 대상품목': f('신제품인증(NEP) 대상품목','신제품인증NEP대상품목'),
    '혁신제품여부':             row['혁신제품여부']          ?? 'N',
    '집행구분':                 row['집행구분']              ?? 'Y',
    '제외여부':                 0,
    __source:                   'manual',
    __id:                       row.__id,
  };
}

// ── 세션 헬퍼 ─────────────────────────────────────────────────────────────────

function getTempData(session) {
  if (!session.tempData) {
    session.tempData = { uploadedRows: {}, manualRows: {}, excludedNos: {}, rowEdits: {}, deletedNos: {} };
  }
  return session.tempData;
}

function getDeptSession(tempData, deptId) {
  return {
    uploadedRows: tempData.uploadedRows[deptId] ?? [],
    manualRows:   tempData.manualRows[deptId]   ?? [],
    excludedNos:  new Set(tempData.excludedNos[deptId] ?? []),
    rowEdits:     tempData.rowEdits[deptId]     ?? {},
    deletedNos:   new Set(tempData.deletedNos[deptId]  ?? []),
  };
}

// ── GET /api/purchases/list ───────────────────────────────────────────────────

router.get('/list', sessionAuth, async (req, res, next) => {
  try {
    const deptId = req.query.deptId;
    if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

    const tempData = getTempData(req.session);
    const { uploadedRows, manualRows, excludedNos, rowEdits, deletedNos } = getDeptSession(tempData, deptId);

    // DB 읽기 (읽기전용)
    const { rows: dbRows } = await pool.query(
      'SELECT * FROM raw_purchases WHERE dept_id = $1 ORDER BY uploaded_at ASC',
      [deptId],
    );

    // DB 행: 삭제·수정·제외 오버레이 적용
    const rawFromDb = dbRows
      .filter(r => !deletedNos.has(String(r['결의번호'] ?? '')))
      .map(r => {
        const bizNo = String(r['결의번호'] ?? '');
        return toCalcRow({ ...r, ...(rowEdits[bizNo] ?? {}) }, excludedNos);
      });

    // 세션 업로드 행: 삭제·수정·제외 오버레이 적용
    const rawFromSession = uploadedRows
      .filter(r => !deletedNos.has(String(r['결의번호'] ?? '')))
      .map(r => {
        const bizNo = String(r['결의번호'] ?? '');
        return sessionRawToCalcRow({ ...r, ...(rowEdits[bizNo] ?? {}) }, excludedNos);
      });

    // 수기 행
    const calcManual = manualRows.map(manualToCalcRow);

    res.json({
      rows:        [...rawFromDb, ...rawFromSession, ...calcManual],
      rawCount:    dbRows.length + uploadedRows.length,
      manualCount: manualRows.length,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/purchases/upload ────────────────────────────────────────────────

router.post('/upload', sessionAuth, async (req, res, next) => {
  try {
    const { deptId, rows } = req.body;
    if (!deptId)                                   return res.status(400).json({ message: 'deptId가 필요합니다.' });
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: 'rows 배열이 필요합니다.' });

    const tempData = getTempData(req.session);

    // 중복 결의번호: DB + 세션 둘 다 확인
    const { rows: dbRows } = await pool.query(
      'SELECT 결의번호 FROM raw_purchases WHERE dept_id = $1',
      [deptId],
    );
    const existingNos = new Set([
      ...dbRows.map(r => String(r['결의번호'] ?? '')),
      ...(tempData.uploadedRows[deptId] ?? []).map(r => String(r['결의번호'] ?? '')),
    ]);

    let added = 0, skipped = 0;

    for (const row of rows) {
      const bizNo = String(row['결의번호'] ?? '').trim();
      if (!bizNo || existingNos.has(bizNo)) { skipped++; continue; }
      existingNos.add(bizNo);
      if (!tempData.uploadedRows[deptId]) tempData.uploadedRows[deptId] = [];
      tempData.uploadedRows[deptId].push(row);
      added++;
    }

    res.status(201).json({ added, skipped });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/purchases/manual ────────────────────────────────────────────────

router.post('/manual', sessionAuth, (req, res) => {
  const { deptId, ...rowData } = req.body ?? {};
  if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

  const tempData = getTempData(req.session);
  if (!tempData.manualRows[deptId]) tempData.manualRows[deptId] = [];

  const newRow = {
    ...rowData,
    __id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };
  tempData.manualRows[deptId].push(newRow);

  res.status(201).json({ id: newRow.__id });
});

// ── PUT /api/purchases/exclude ────────────────────────────────────────────────

router.put('/exclude', sessionAuth, (req, res) => {
  const { deptId, excludeIds = [] } = req.body ?? {};
  if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

  const tempData = getTempData(req.session);
  tempData.excludedNos[deptId] = excludeIds;

  res.json({ ok: true, excludedCount: excludeIds.length });
});

// ── PUT /api/purchases/adjust ─────────────────────────────────────────────────

router.put('/adjust', sessionAuth, (req, res) => {
  const { deptId, 결의번호: bizNo, fields = {} } = req.body ?? {};
  if (!deptId || !bizNo || !Object.keys(fields).length) {
    return res.status(400).json({ message: 'deptId, 결의번호, fields가 필요합니다.' });
  }

  const tempData = getTempData(req.session);
  if (!tempData.rowEdits[deptId])        tempData.rowEdits[deptId] = {};
  if (!tempData.rowEdits[deptId][bizNo]) tempData.rowEdits[deptId][bizNo] = {};
  Object.assign(tempData.rowEdits[deptId][bizNo], fields);

  res.json({ ok: true });
});

// ── PUT /api/purchases/manual/:id ─────────────────────────────────────────────

router.put('/manual/:id', sessionAuth, (req, res) => {
  const manualId = req.params.id;
  const { deptId, ...rowData } = req.body ?? {};
  if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

  const tempData = getTempData(req.session);
  const rows = tempData.manualRows[deptId];
  if (!rows) return res.status(404).json({ message: '행을 찾을 수 없습니다.' });

  const idx = rows.findIndex(r => r.__id === manualId);
  if (idx === -1) return res.status(404).json({ message: '행을 찾을 수 없습니다.' });

  rows[idx] = { ...rowData, __id: manualId };
  res.json({ ok: true });
});

// ── DELETE /api/purchases/manual/:id ─────────────────────────────────────────

router.delete('/manual/:id', sessionAuth, (req, res) => {
  const manualId = req.params.id;
  const deptId   = req.query.deptId ?? req.body?.deptId;
  if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

  const tempData = getTempData(req.session);
  if (tempData.manualRows[deptId]) {
    tempData.manualRows[deptId] = tempData.manualRows[deptId].filter(r => r.__id !== manualId);
  }
  res.json({ ok: true });
});

// ── DELETE /api/purchases/delete/:bizno ──────────────────────────────────────

router.delete('/delete/:bizno', sessionAuth, (req, res) => {
  const bizNo  = decodeURIComponent(req.params.bizno);
  const deptId = req.body?.deptId ?? req.query.deptId;
  if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

  const tempData = getTempData(req.session);
  if (!tempData.deletedNos[deptId]) tempData.deletedNos[deptId] = [];
  if (!tempData.deletedNos[deptId].includes(bizNo)) {
    tempData.deletedNos[deptId].push(bizNo);
  }

  res.json({ ok: true });
});

// ── DELETE /api/purchases/reset ───────────────────────────────────────────────

router.delete('/reset', sessionAuth, (req, res) => {
  const deptId = req.body?.deptId ?? req.query.deptId;
  if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

  const tempData = getTempData(req.session);
  tempData.uploadedRows[deptId] = [];
  tempData.manualRows[deptId]   = [];
  tempData.excludedNos[deptId]  = [];
  tempData.rowEdits[deptId]     = {};
  tempData.deletedNos[deptId]   = [];

  res.json({ ok: true });
});

module.exports = router;
