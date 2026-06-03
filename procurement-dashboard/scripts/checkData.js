const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'test_raw.xlsx');
const SHEET_NAME = 'RAW';
const PREVIEW_ROWS = 3;

const wb = XLSX.readFile(EXCEL_PATH);
const ws = wb.Sheets[SHEET_NAME];

if (!ws) {
  const available = wb.SheetNames.join(', ');
  console.error(`시트 "${SHEET_NAME}"를 찾을 수 없습니다. 사용 가능: ${available}`);
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }).slice(0, PREVIEW_ROWS);

function hasValue(v) {
  return v !== '' && v !== null && v !== undefined;
}

console.log(`\n[${SHEET_NAME}] 첫 ${PREVIEW_ROWS}개 행\n`);

rows.forEach((row, i) => {
  const allEntries    = Object.entries(row).filter(([, v]) => hasValue(v));
  const numericEntries = allEntries.filter(([, v]) => typeof v === 'number');
  const otherEntries   = allEntries.filter(([, v]) => typeof v !== 'number');

  console.log(`── 행 ${i + 1} ${'─'.repeat(56)}`);

  if (numericEntries.length) {
    console.log('  [숫자 컬럼]');
    numericEntries.forEach(([k, v]) => {
      console.log(`    ${k.padEnd(30)} ${v.toLocaleString('ko-KR')}`);
    });
  }

  console.log('  [문자 컬럼]');
  otherEntries.forEach(([k, v]) => {
    console.log(`    ${k.padEnd(30)} ${v}`);
  });

  console.log('');
});
