const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function insertBudget() {
  const data = JSON.parse(fs.readFileSync('./budget_data.json', 'utf-8'));
  const client = await pool.connect();

  try {
    // budget_allocations 테이블 생성
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_allocations (
        id SERIAL PRIMARY KEY,
        dept_id INTEGER REFERENCES departments(id),
        회계연도 INTEGER,
        절명 VARCHAR(100),
        예산과목코드 VARCHAR(50),
        예산과목명 TEXT,
        기금수탁여부 VARCHAR(20),
        년예산 BIGINT DEFAULT 0,
        배정액 BIGINT DEFAULT 0,
        집행액 BIGINT DEFAULT 0,
        잔액 BIGINT DEFAULT 0,
        집행률 DECIMAL(6,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(dept_id, 예산과목코드, 회계연도)
      )
    `);
    console.log('테이블 생성/확인 완료');

    // 부서 목록
    const deptResult = await client.query('SELECT id, name FROM departments');
    const deptMap = {};
    deptResult.rows.forEach(d => { deptMap[d.name] = d.id; });

    let inserted = 0, skipped = 0, notFound = 0;
    const notFoundDepts = new Set();

    for (const row of data) {
      const deptId = deptMap[row.dept_name];
      if (!deptId) {
        notFoundDepts.add(row.dept_name);
        notFound++;
        continue;
      }

      try {
        const result = await client.query(`
          INSERT INTO budget_allocations 
            (dept_id, 회계연도, 절명, 예산과목코드, 예산과목명, 기금수탁여부, 년예산, 배정액, 집행액, 잔액, 집행률)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (dept_id, 예산과목코드, 회계연도) DO UPDATE SET
            절명 = EXCLUDED.절명,
            예산과목명 = EXCLUDED.예산과목명,
            배정액 = EXCLUDED.배정액,
            집행액 = EXCLUDED.집행액,
            잔액 = EXCLUDED.잔액,
            집행률 = EXCLUDED.집행률
        `, [
          deptId, row.회계연도, row.절명, row.예산과목코드, row.예산과목명,
          row.기금수탁여부, row.년예산, row.배정액, row.집행액, row.잔액, row.집행률
        ]);
        inserted++;
      } catch(e) {
        skipped++;
      }
    }

    console.log('\n=== 완료 ===');
    console.log(`✅ 인서트/업데이트: ${inserted}건`);
    console.log(`⏭ 스킵: ${skipped}건`);
    if (notFoundDepts.size > 0) {
      console.log(`❌ DB에 없는 부서 (${notFound}건):`, [...notFoundDepts]);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

insertBudget().catch(console.error);
