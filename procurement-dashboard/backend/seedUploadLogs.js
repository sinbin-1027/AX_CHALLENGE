require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedUploadLogs() {
  const client = await pool.connect();

  try {
    // upload_logs 테이블이 없으면 생성 (database.js의 initDB()와 동일한 정의)
    await client.query(`
      CREATE TABLE IF NOT EXISTS upload_logs (
        id          SERIAL PRIMARY KEY,
        dept_id     INTEGER REFERENCES departments(id),
        description TEXT,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('upload_logs 테이블 생성/확인 완료');

    const { rows: depts } = await client.query('SELECT id, name FROM departments');
    console.log(`부서 ${depts.length}개 확인`);

    let inserted = 0, skipped = 0;

    for (const dept of depts) {
      const { rows: existing } = await client.query(
        'SELECT 1 FROM upload_logs WHERE dept_id = $1 LIMIT 1',
        [dept.id],
      );

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await client.query(
        `INSERT INTO upload_logs (dept_id, description, uploaded_at) VALUES
          ($1, '사용자 엑셀 업로드', NOW() - INTERVAL '1 day'),
          ($1, '사용자 엑셀 업로드', NOW() - INTERVAL '2 day')`,
        [dept.id],
      );
      inserted += 2;
    }

    console.log(`\n=== 완료 ===`);
    console.log(`더미 업로드 기록 삽입: ${inserted}건`);
    console.log(`이미 기록이 있어 스킵된 부서: ${skipped}개`);
  } finally {
    client.release();
    await pool.end();
  }
}

seedUploadLogs().catch(err => {
  console.error('실패:', err);
  process.exit(1);
});
