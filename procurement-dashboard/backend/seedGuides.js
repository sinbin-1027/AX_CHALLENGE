const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 이 폴더에 아래 4개 파일을 넣어두세요 (backend 폴더 기준 상대경로)
const SOURCE_DIR = './seed_guides';
const TARGET_DIR = './uploads/guides';

// 파일명 -> 목록에 표시될 제목 매핑 (마음에 안 들면 여기서 수정)
const FILES = [
  {
    filename: "공공구매 및 자산관리 교육자료('25.10).hwp",
    title: '공공구매 및 자산관리 교육자료 (25.10)',
  },
  {
    filename: '★.26년 공공구매 운영 가이드라인-260312-담당완(일반인쇄).hwp',
    title: '26년 공공구매 운영 가이드라인',
  },
  {
    filename: '2026년 중소기업제품 구매목표비율제도 운영매뉴얼(배포용).hwpx',
    title: '2026년 중소기업제품 구매목표비율제도 운영매뉴얼',
  },
  {
    filename: '2026년도 예산 및 기금운용계획 집행지침_게시용.hwp',
    title: '2026년도 예산 및 기금운용계획 집행지침',
  },
];

async function seedGuides() {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  const client = await pool.connect();
  try {
    for (const { filename, title } of FILES) {
      const sourcePath = path.join(SOURCE_DIR, filename);

      if (!fs.existsSync(sourcePath)) {
        console.log(`❌ 파일 없음: ${sourcePath} (SOURCE_DIR에 넣었는지 확인해주세요)`);
        continue;
      }

      const ext = path.extname(filename);
      const storedFilename = `${crypto.randomUUID()}${ext}`;
      const targetPath = path.join(TARGET_DIR, storedFilename);

      fs.copyFileSync(sourcePath, targetPath);
      const fileSize = fs.statSync(targetPath).size;

      await client.query(
        `INSERT INTO guides (title, original_filename, stored_filename, file_path, file_size, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [title, filename, storedFilename, targetPath, fileSize]
      );

      console.log(`✅ ${title} (${(fileSize / 1024).toFixed(0)}KB)`);
    }

    console.log('\n완료!');
  } finally {
    client.release();
    await pool.end();
  }
}

seedGuides().catch(console.error);
