// 사회적협동조합 + NEP 인증 데이터를 기존 vendors 테이블에 추가
// 사용법: backend 폴더에 이 파일 + vendors_new_certs.json 넣고
//   node insertVendorsNewCerts.js
//
// 기존 vendors 테이블 스키마 그대로 사용 (컬럼 추가 없음)

const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const data = JSON.parse(fs.readFileSync('./vendors_new_certs.json', 'utf-8'));

  let inserted = 0;
  let failed = 0;

  for (const r of data) {
    try {
      await pool.query(
        `INSERT INTO vendors (사업자번호, 업체명, 인증종류, 취급품목, 만료일자, 취소일자, 상태, 데이터기준일)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          r['사업자번호'], r['업체명'], r['인증종류'], r['취급품목'],
          r['만료일자'], r['취소일자'], r['상태'], r['데이터기준일'],
        ]
      );
      inserted++;
    } catch (e) {
      failed++;
    }
  }

  console.log('=== 완료 ===');
  console.log(`✅ 인서트: ${inserted}건`);
  console.log(`❌ 실패: ${failed}건`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
