const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 성과보상처 제외 (공공구매 데이터 아님)
const EXCLUDE_DEPTS = ['성과보상처'];

async function insertRawPurchases() {
  const data = JSON.parse(fs.readFileSync('./raw_purchases_data.json', 'utf-8'));
  const client = await pool.connect();

  try {
    // 부서 목록 조회
    const deptResult = await client.query('SELECT id, name FROM departments');
    const deptMap = {};
    deptResult.rows.forEach(d => { deptMap[d.name] = d.id; });
    console.log('부서 목록 로드:', Object.keys(deptMap).length, '개');

    let inserted = 0, skipped = 0, notFound = 0, excluded = 0;
    const notFoundDepts = new Set();

    for (const row of data) {
      // 제외 부서 스킵
      if (EXCLUDE_DEPTS.includes(row.dept_name)) {
        excluded++;
        continue;
      }

      const deptId = deptMap[row.dept_name];
      if (!deptId) {
        notFoundDepts.add(row.dept_name);
        notFound++;
        continue;
      }

      if (!row.결의번호) {
        skipped++;
        continue;
      }

      try {
        await client.query(`
          INSERT INTO raw_purchases (
            dept_id, 결의번호, 구매구분, 물품금액, 채주지급금액,
            적요, 수령인사업자명, 발주품목명, 발의일자, 예산명,
            중소기업제품, 여성기업제품, 사회적기업, 사회적협동조합제품여부,
            장애인구매, 장애인표준사업장여부, 중증장애인제품,
            창업기업제품, 친환경제품, 자활용사촌제품, 시범구매여부,
            혁신제품여부, 기술개발제품대상품목조회,
            신제품인증NEP여부, 신제품인증NEP대상품목, 제외여부
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
            $21,$22,$23,$24,$25,$26
          )
          ON CONFLICT (dept_id, 결의번호) DO NOTHING
        `, [
          deptId, row.결의번호, row.구매구분, row.물품금액, row.채주지급금액,
          row.적요, row.수령인사업자명, row.발주품목명, row.발의일자, row.예산명,
          row.중소기업제품 || 'N', row.여성기업제품 || 'N',
          row.사회적기업 || 'N', row.사회적협동조합제품여부 || 'N',
          row.장애인구매 || 'N', row.장애인표준사업장여부 || 'N',
          row.중증장애인제품 || 'N', row.창업기업제품 || 'N',
          row.친환경제품 || 'N', row.자활용사촌제품 || 'N',
          row.시범구매여부 || 'N', row.혁신제품여부 || 'N',
          row.기술개발제품대상품목조회 || '해당사항없음',
          row.신제품인증NEP여부 || 'N', row.신제품인증NEP대상품목 || '해당없음',
          0
        ]);
        inserted++;
      } catch (e) {
        skipped++;
      }

      if (inserted % 1000 === 0 && inserted > 0) {
        console.log(`  진행중... ${inserted}건 완료`);
      }
    }

    console.log('\n=== 완료 ===');
    console.log(`✅ 인서트: ${inserted}건`);
    console.log(`⏭ 중복 스킵: ${skipped}건`);
    console.log(`🚫 제외 부서: ${excluded}건 (성과보상처)`);
    if (notFoundDepts.size > 0) {
      console.log(`❌ DB에 없는 부서 (${notFound}건):`, [...notFoundDepts]);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

insertRawPurchases().catch(console.error);
