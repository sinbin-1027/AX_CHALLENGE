const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'test_raw.xlsx');
const SHEET_NAME = 'RAW';

const wb = XLSX.readFile(EXCEL_PATH);
const ws = wb.Sheets[SHEET_NAME];

if (!ws) {
  const available = wb.SheetNames.join(', ');
  console.error(`시트 "${SHEET_NAME}"를 찾을 수 없습니다. 사용 가능: ${available}`);
  process.exit(1);
}

const [headerRow] = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log(`\n[${SHEET_NAME}] 시트 헤더 (총 ${headerRow.length}개)\n`);
headerRow.forEach((col, i) => {
  console.log(`  ${String(i + 1).padStart(3, ' ')}  ${col}`);
});
console.log('');
