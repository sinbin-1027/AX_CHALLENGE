
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function insertVendors() {
  const data = JSON.parse(fs.readFileSync('./vendors_data.json', 'utf-8'));
  const client = await pool.connect();
  
  try {
    let total = 0;
    
    for (const [certType, vendors] of Object.entries(data)) {
      console.log(`\n${certType} 처리 중... (${vendors.length}개)`);
      let count = 0;
      
      // 배치로 처리 (1000개씩)
      for (let i = 0; i < vendors.length; i += 1000) {
        const batch = vendors.slice(i, i + 1000);
        
        for (const v of batch) {
          await client.query(`
            INSERT INTO vendors (사업자번호, 업체명, 인증종류, 취급품목, 만료일자, 취소일자, 상태, 데이터기준일)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (사업자번호, 인증종류) DO UPDATE SET
              업체명 = EXCLUDED.업체명,
              만료일자 = EXCLUDED.만료일자,
              취소일자 = EXCLUDED.취소일자,
              상태 = EXCLUDED.상태,
              데이터기준일 = EXCLUDED.데이터기준일,
              updated_at = NOW()
          `, [
            v.사업자번호, v.업체명, v.인증종류, v.취급품목 || '',
            v.만료일자 || null, v.취소일자 || null, v.상태, v.데이터기준일
          ]);
          count++;
        }
        console.log(`  ${Math.min(i + 1000, vendors.length)} / ${vendors.length}`);
      }
      total += count;
      console.log(`${certType} 완료: ${count}개`);
    }
    
    console.log(`\n총 ${total}개 처리 완료!`);
  } finally {
    client.release();
    await pool.end();
  }
}

insertVendors().catch(console.error);
