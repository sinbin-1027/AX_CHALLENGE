const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function exportVendors() {
  const client = await pool.connect();
  try {
    console.log('vendors 조회 중... (167,000건 정도면 몇 초 걸릴 수 있어요)');
    const result = await client.query('SELECT * FROM vendors');
    console.log(`조회 완료: ${result.rows.length}건`);

    fs.writeFileSync(
      './vendors_export.json',
      JSON.stringify(result.rows),
      'utf-8'
    );

    const stat = fs.statSync('./vendors_export.json');
    console.log(`✅ vendors_export.json 저장 완료 (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
    console.log('이 파일을 VM의 backend 폴더로 옮긴 다음 importVendors.js를 실행하세요.');
  } finally {
    client.release();
    await pool.end();
  }
}

exportVendors().catch(console.error);
