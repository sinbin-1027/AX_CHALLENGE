import * as XLSX from 'xlsx';
import * as path from 'path';
import { calcEngine } from './calcEngine.js';

const EXCEL_PATH = path.join(process.cwd(), 'test_raw.xlsx');
const SHEET_NAME = 'RAW';

const OVERRIDES = {
  headcount: 14,
  fixedTargets: {
    green_product: 2247000,
    jawal_veteran:  1420000,
  },
};

// ── 엑셀 읽기 ───────────────────────────────────────────────────────────────

function readSheet(filePath, sheetName) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    const available = wb.SheetNames.join(', ');
    throw new Error(`시트 "${sheetName}"를 찾을 수 없습니다. 사용 가능: ${available}`);
  }
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

// ── 출력 포맷터 ─────────────────────────────────────────────────────────────

const KRW  = n  => `${Math.round(n).toLocaleString('ko-KR')}원`;
const PCT  = r  => `${(r * 100).toFixed(1)}%`;
const PTS  = n  => n.toFixed(1);

function printResults({ results, totalScore, finalScore }) {
  const SEP  = '─'.repeat(80);
  const HDR  = ['지표', '목표액', '실적액', '달성률', '배점', '획득', '달성'].map(s => s.padEnd(14)).join('  ');

  console.log('\n' + SEP);
  console.log(' 공공구매 실적 계산 결과');
  console.log(SEP);
  console.log(' ' + HDR);
  console.log(SEP);

  for (const r of results) {
    const cols = [
      r.label.padEnd(12),
      KRW(r.targetAmount).padStart(14),
      KRW(r.actual).padStart(14),
      PCT(r.achievementRate).padStart(8),
      PTS(r.points).padStart(5),
      PTS(r.score).padStart(5),
      (r.achieved ? '✓' : '').padStart(5),
    ];
    console.log(' ' + cols.join('  '));
  }

  console.log(SEP);
  console.log(` 획득 배점 합계  : ${totalScore.toFixed(2)} / 9.5`);
  console.log(` 최종 점수 (4점) : ${finalScore.toFixed(4)}`);
  console.log(SEP + '\n');
}

// ── main ────────────────────────────────────────────────────────────────────

try {
  console.log(`\n파일 읽는 중: ${EXCEL_PATH}`);
  const rows = readSheet(EXCEL_PATH, SHEET_NAME);
  console.log(`총 ${rows.length}개 행 로드 완료`);

  const output = calcEngine(rows, OVERRIDES);
  printResults(output);
} catch (err) {
  console.error('\n오류:', err.message);
  process.exit(1);
}
