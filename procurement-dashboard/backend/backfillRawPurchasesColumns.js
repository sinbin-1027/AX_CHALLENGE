const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function backfillColumns() {
  const client = await pool.connect();
  try {
    // 컬럼 없으면 추가
    await client.query(`
      ALTER TABLE raw_purchases ADD COLUMN IF NOT EXISTS 출납예정일자 DATE;
      ALTER TABLE raw_purchases ADD COLUMN IF NOT EXISTS 통제일자 DATE;
      ALTER TABLE raw_purchases ADD COLUMN IF NOT EXISTS 예산코드 VARCHAR;
    `);
    console.log('컬럼 확인/추가 완료');

    const data = JSON.parse(fs.readFileSync('./raw_purchases_backfill.json', 'utf-8'));
    console.log(`불러온 행: ${data.length}건`);

    const deptResult = await client.query('SELECT id, name FROM departments');
    const deptMap = {};
    deptResult.rows.forEach(d => { deptMap[d.name] = d.id; });

    let updated = 0, notFoundDept = 0, notFoundRow = 0;
    const notFoundDepts = new Set();

    for (const row of data) {
      const deptId = deptMap[row.dept_name];
      if (!deptId) {
        notFoundDepts.add(row.dept_name);
        notFoundDept++;
        continue;
      }

      const result = await client.query(
        `UPDATE raw_purchases
         SET 회계연도 = COALESCE($1, 회계연도),
             출납예정일자 = $2,
             통제일자 = $3,
             예산코드 = $4
         WHERE dept_id = $5 AND 결의번호 = $6`,
        [row.회계연도, row.출납예정일자, row.통제일자, row.예산코드, deptId, row.결의번호]
      );

      if (result.rowCount > 0) {
        updated += result.rowCount;
      } else {
        notFoundRow++;
      }
    }

    console.log('\n=== 완료 ===');
    console.log(`✅ 업데이트: ${updated}건`);
    console.log(`⏭ 매칭 안 된 행 (dept_id+결의번호 불일치): ${notFoundRow}건`);
    if (notFoundDepts.size > 0) {
      console.log(`❌ DB에 없는 부서 (${notFoundDept}건):`, [...notFoundDepts]);
    }

    // 검증
    const check = await client.query(`
      SELECT 회계연도, COUNT(*) FROM raw_purchases
      WHERE 출납예정일자 IS NOT NULL
      GROUP BY 회계연도 ORDER BY 회계연도
    `);
    console.log('\n=== 이번에 백필된 행들의 회계연도 분포 ===');
    console.log(check.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

backfillColumns().catch(console.error);
