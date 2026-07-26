// 제조AI지원처 / ICT운영실 / 서울지역본부 raw_purchases 보강 인서트
// 사용법: backend 폴더에 이 파일 + raw_purchases_3depts.json 넣고
//   node insertRawPurchases_3depts.js
//
// 기존 데이터는 건드리지 않고(ON CONFLICT DO NOTHING),
// 예전 방식으로 빠져있던 업추/특매 등 키워드 행만 새로 채워집니다.

const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const data = JSON.parse(fs.readFileSync('./raw_purchases_3depts.json', 'utf-8'));

  // 부서명 -> dept_id 매핑
  const deptRes = await pool.query('SELECT id, name FROM departments');
  const deptMap = {};
  for (const row of deptRes.rows) {
    deptMap[row.name] = row.id;
  }

  let inserted = 0;
  let skipped = 0;
  let noDept = 0;
  const noDeptNames = new Set();

  for (const r of data) {
    const deptId = deptMap[r.dept_name];
    if (!deptId) {
      noDept++;
      noDeptNames.add(r.dept_name);
      continue;
    }

    const res = await pool.query(
      `INSERT INTO raw_purchases (
        dept_id, 결의번호, 구매구분, 물품금액, 채주지급금액, 적요,
        수령인사업자명, 발주품목명, 발의일자, 예산명,
        회계연도, 출납예정일자, 통제일자, 예산코드,
        중소기업제품, 여성기업제품, 사회적기업, 사회적협동조합제품여부,
        장애인구매, 장애인표준사업장여부, 중증장애인제품, 창업기업제품,
        친환경제품, 자활용사촌제품, 시범구매여부, 혁신제품여부,
        기술개발제품대상품목조회, 신제품인증NEP여부, 신제품인증NEP대상품목,
        제외여부
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
      )
      ON CONFLICT (dept_id, 결의번호) DO NOTHING`,
      [
        deptId, r['결의번호'], r['구매구분'], r['물품금액'], r['채주지급금액'], r['적요'],
        r['수령인사업자명'], r['발주품목명'], r['발의일자'], r['예산명'],
        r['회계연도'], r['출납예정일자'], r['통제일자'], r['예산코드'],
        r['중소기업제품'], r['여성기업제품'], r['사회적기업'], r['사회적협동조합제품여부'],
        r['장애인구매'], r['장애인표준사업장여부'], r['중증장애인제품'], r['창업기업제품'],
        r['친환경제품'], r['자활용사촌제품'], r['시범구매여부'], r['혁신제품여부'],
        r['기술개발제품대상품목조회'], r['신제품인증NEP여부'], r['신제품인증NEP대상품목'],
        r['제외여부'],
      ]
    );

    if (res.rowCount > 0) {
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log('=== 완료 ===');
  console.log(`✅ 인서트: ${inserted}건`);
  console.log(`⏭ 중복 스킵: ${skipped}건`);
  if (noDept > 0) {
    console.log(`🚫 부서 매칭 실패: ${noDept}건 (${[...noDeptNames].join(', ')})`);
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
