const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 예산현황 스냅샷을 새로 받을 때마다 이 날짜만 바꿔서 재실행하면 돼요.
const 회계연도 = 2026;
const 기준일 = '2026-07-22';

async function setSnapshotDate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_snapshot_meta (
        id SERIAL PRIMARY KEY,
        회계연도 INTEGER UNIQUE NOT NULL,
        기준일 DATE NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      INSERT INTO budget_snapshot_meta (회계연도, 기준일)
      VALUES ($1, $2)
      ON CONFLICT (회계연도) DO UPDATE SET 기준일 = $2, updated_at = NOW()
    `, [회계연도, 기준일]);

    console.log(`✅ ${회계연도}년 기준일 = ${기준일} 로 설정 완료`);
  } finally {
    client.release();
    await pool.end();
  }
}

setSnapshotDate().catch(console.error);
