const express      = require('express');
const sessionAuth  = require('../middleware/auth');
const { pool }     = require('../db/database');

const router = express.Router();

// ── 공공구매 실적에서 자동 제외할 예산명 키워드 ─────────────────────────────────
// (체크박스로 사용자가 제외하는 것과 별개로, 이 키워드가 예산명에 포함되면
//  공공구매 실적/지출결의 내역 조회 시 쿼리 단계에서 항상 걸러진다.
//  DB에는 그대로 남아있고, 집행추이분석(execution-trend) 등 다른 용도에는 영향 없음)

const EXCLUDED_BUDGET_KEYWORDS = [
  '공공요금및제세', '급식비', '특근매식비', '일숙직비', '임차료', '학교운영비',
  '복리후생비', '시험연구비', '기타운영비', '여비', '특수활동비', '업무추진비',
];

const EXCLUDED_BUDGET_SQL = EXCLUDED_BUDGET_KEYWORDS
  .map(k => `예산명 LIKE '%${k}%'`)
  .join(' OR ');

function hasExcludedBudgetKeyword(예산명) {
  const name = 예산명 ?? '';
  return EXCLUDED_BUDGET_KEYWORDS.some(k => name.includes(k));
}

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

// 금액 문자열에 콤마가 포함돼 있어도("1,000,000") 정상적으로 숫자로 변환
function parseAmount(value) {
  return Number(String(value ?? '').replace(/,/g, '').trim()) || 0;
}

// DB 행 → calcEngine 형식
function toCalcRow(row, excludedNos) {
  const bizNo = String(row['결의번호'] ?? '').trim();
  const out   = { ...row };
  for (const [dbCol, calcCol] of Object.entries(DB_TO_CALC)) {
    out[calcCol] = row[dbCol] ?? '';
  }
  out['물품금액']     = parseAmount(row['물품금액']);
  out['채주지급금액'] = parseAmount(row['채주지급금액']);
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
    '물품금액':     parseAmount(row['물품금액']),
    '채주지급금액': parseAmount(row['채주지급금액']),
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
    '회계연도':                 row['회계연도']              ?? new Date().getFullYear(),
    '구매구분':                 row['구매구분']              ?? '물품',
    '물품금액':                 parseAmount(row['물품금액']),
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

// ── 서버 메모리 세션 스토어 ───────────────────────────────────────────────────

const sessionStore = new Map();

function getTempData(sessionId) {
  if (!sessionStore.has(sessionId)) {
    sessionStore.set(sessionId, {
      uploadedRows: {},
      manualRows:   {},
      excludedNos:  {},
      rowEdits:     {},
      deletedNos:   {},
    });
  }
  return sessionStore.get(sessionId);
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

    let year = req.query.year ? Number(req.query.year) : null;
    if (!year) {
      const { rows: maxYearRows } = await pool.query(
        'SELECT MAX(회계연도) AS max_year FROM raw_purchases WHERE dept_id = $1',
        [deptId],
      );
      year = maxYearRows[0].max_year ?? new Date().getFullYear();
    }

    const tempData = getTempData(req.user.sessionId);
    const { uploadedRows, manualRows, excludedNos, rowEdits, deletedNos } = getDeptSession(tempData, deptId);

    // DB 읽기 (읽기전용) — 회계연도로 필터링 + 제외 예산명 키워드 필터링
    const { rows: dbRows } = await pool.query(
      `SELECT * FROM raw_purchases
       WHERE dept_id = $1 AND 회계연도 = $2 AND NOT (${EXCLUDED_BUDGET_SQL})
       ORDER BY uploaded_at ASC`,
      [deptId, year],
    );

    // 세션 업로드/수기 행도 동일 회계연도만 대상으로, 제외 예산명 키워드도 동일하게 필터링
    const uploadedRowsInYear = uploadedRows
      .filter(r => Number(r['회계연도']) === year)
      .filter(r => !hasExcludedBudgetKeyword(r['예산명']));
    const manualRowsInYear   = manualRows.filter(r => Number(r['회계연도'] ?? new Date().getFullYear()) === year);

    // DB 행: 삭제·수정·제외 오버레이 적용
    const rawFromDb = dbRows
      .filter(r => !deletedNos.has(String(r['결의번호'] ?? '')))
      .map(r => {
        const bizNo = String(r['결의번호'] ?? '');
        return toCalcRow({ ...r, ...(rowEdits[bizNo] ?? {}) }, excludedNos);
      });

    // 세션 업로드 행: 삭제·수정·제외 오버레이 적용
    const rawFromSession = uploadedRowsInYear
      .filter(r => !deletedNos.has(String(r['결의번호'] ?? '')))
      .map(r => {
        const bizNo = String(r['결의번호'] ?? '');
        return sessionRawToCalcRow({ ...r, ...(rowEdits[bizNo] ?? {}) }, excludedNos);
      });

    // 수기 행
    const calcManual = manualRowsInYear.map(manualToCalcRow);

    res.json({
      rows:        [...rawFromDb, ...rawFromSession, ...calcManual],
      rawCount:    dbRows.length + uploadedRowsInYear.length,
      manualCount: manualRowsInYear.length,
      year,
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

    const tempData = getTempData(req.user.sessionId);

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
      // 엑셀의 회계연도 컬럼 값을 그대로 저장, 없으면 현재 연도로 기본값 처리
      tempData.uploadedRows[deptId].push({ ...row, '회계연도': row['회계연도'] ?? new Date().getFullYear() });
      added++;
    }

    await pool.query(
      `INSERT INTO upload_logs (dept_id, description, uploaded_at) VALUES ($1, $2, NOW())`,
      [deptId, '사용자 엑셀 업로드'],
    );

    res.status(201).json({ added, skipped });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/purchases/manual ────────────────────────────────────────────────

router.post('/manual', sessionAuth, (req, res) => {
  const { deptId, ...rowData } = req.body ?? {};
  if (!deptId) return res.status(400).json({ message: 'deptId가 필요합니다.' });

  const tempData = getTempData(req.user.sessionId);
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

  const tempData = getTempData(req.user.sessionId);
  tempData.excludedNos[deptId] = excludeIds;

  res.json({ ok: true, excludedCount: excludeIds.length });
});

// ── PUT /api/purchases/adjust ─────────────────────────────────────────────────

router.put('/adjust', sessionAuth, (req, res) => {
  const { deptId, 결의번호: bizNo, fields = {} } = req.body ?? {};
  if (!deptId || !bizNo || !Object.keys(fields).length) {
    return res.status(400).json({ message: 'deptId, 결의번호, fields가 필요합니다.' });
  }

  const tempData = getTempData(req.user.sessionId);
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

  const tempData = getTempData(req.user.sessionId);
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

  const tempData = getTempData(req.user.sessionId);
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

  const tempData = getTempData(req.user.sessionId);
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

  const tempData = getTempData(req.user.sessionId);
  tempData.uploadedRows[deptId] = [];
  tempData.manualRows[deptId]   = [];
  tempData.excludedNos[deptId]  = [];
  tempData.rowEdits[deptId]     = {};
  tempData.deletedNos[deptId]   = [];

  res.json({ ok: true });
});

module.exports = router;
