const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const groups = await client.query('SELECT id, name FROM dept_groups');
    console.log('dept_groups 목록:', groups.rows);

    const target = groups.rows.find(g => g.name === '특화기능');
    if (!target) {
      console.log('❌ "특화기능" 그룹을 못 찾았어요. 위 목록에서 정확한 이름 확인해주세요.');
      return;
    }

    const result = await client.query(
      `
      INSERT INTO departments (code, name, group_id, is_active, headcount, green_product_target, jawal_veteran_target)
      VALUES ($1, $2, $3, true, 0, NULL, NULL)
      RETURNING id, name
      `,
      ['ESG_CS', 'ESG고객지원실', target.id]
    );

    console.log('✅ 추가됨:', result.rows[0]);
  } catch (e) {
    console.error('에러:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
