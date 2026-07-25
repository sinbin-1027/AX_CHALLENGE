const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixEsgDuplicate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. id=73(ESG고객지원실, 중복)에 붙어있던 budget_allocations를
    //    id=3(ESG·고객지원실, 원래부터 있던 부서)로 옮기기
    const moved = await client.query(
      `UPDATE budget_allocations SET dept_id = 3 WHERE dept_id = 73`
    );
    console.log(`budget_allocations 이전: ${moved.rowCount}건 (dept_id 73 → 3)`);

    // 2. raw_purchases에도 혹시 73으로 들어간 게 있으면 같이 이전
    const movedRaw = await client.query(
      `UPDATE raw_purchases SET dept_id = 3 WHERE dept_id = 73`
    );
    console.log(`raw_purchases 이전: ${movedRaw.rowCount}건 (dept_id 73 → 3)`);

    // 3. 중복 부서(id=73) 삭제
    const deleted = await client.query(
      `DELETE FROM departments WHERE id = 73 AND name = 'ESG고객지원실'`
    );
    console.log(`중복 부서 삭제: ${deleted.rowCount}건`);

    await client.query('COMMIT');
    console.log('✅ ESG 중복 정리 완료');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ 에러, 롤백함:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixEsgDuplicate();
