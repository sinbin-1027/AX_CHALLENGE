const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   VARCHAR(100) NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      department TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS uploads (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      filename    TEXT NOT NULL,
      raw_data    TEXT NOT NULL,
      uploaded_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dept_groups (
      id           SERIAL PRIMARY KEY,
      name         VARCHAR(50) UNIQUE NOT NULL,
      score_weight INTEGER NOT NULL,
      total_points DECIMAL(4,1) NOT NULL,
      created_at   TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id                   SERIAL PRIMARY KEY,
      group_id             INTEGER REFERENCES dept_groups(id),
      code                 VARCHAR(20),
      name                 VARCHAR(100) UNIQUE NOT NULL,
      headcount            INTEGER DEFAULT 10,
      green_product_target INTEGER DEFAULT 2000000,
      jawal_veteran_target INTEGER DEFAULT 1200000,
      is_active            BOOLEAN DEFAULT true,
      created_at           TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS raw_purchases (
      id                       SERIAL PRIMARY KEY,
      dept_id                  INTEGER REFERENCES departments(id),
      결의번호                 VARCHAR(50),
      구매구분                 VARCHAR(20),
      물품금액                 BIGINT DEFAULT 0,
      채주지급금액             BIGINT DEFAULT 0,
      적요                     TEXT,
      수령인사업자명           TEXT,
      발주품목명               TEXT,
      발의일자                 VARCHAR(20),
      예산명                   TEXT,
      중소기업제품             VARCHAR(1) DEFAULT 'N',
      여성기업제품             VARCHAR(1) DEFAULT 'N',
      사회적기업               VARCHAR(1) DEFAULT 'N',
      사회적협동조합제품여부   VARCHAR(1) DEFAULT 'N',
      장애인구매               VARCHAR(1) DEFAULT 'N',
      장애인표준사업장여부     VARCHAR(1) DEFAULT 'N',
      중증장애인제품           VARCHAR(1) DEFAULT 'N',
      창업기업제품             VARCHAR(1) DEFAULT 'N',
      친환경제품               VARCHAR(1) DEFAULT 'N',
      자활용사촌제품           VARCHAR(1) DEFAULT 'N',
      시범구매여부             VARCHAR(1) DEFAULT 'N',
      혁신제품여부             VARCHAR(1) DEFAULT 'N',
      기술개발제품대상품목조회 VARCHAR(20) DEFAULT '해당사항없음',
      신제품인증NEP여부        VARCHAR(1) DEFAULT 'N',
      신제품인증NEP대상품목    VARCHAR(50) DEFAULT '해당없음',
      제외여부                 INTEGER DEFAULT 0,
      uploaded_at              TIMESTAMP DEFAULT NOW(),
      UNIQUE(dept_id, 결의번호)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS manual_purchases (
      id                       SERIAL PRIMARY KEY,
      dept_id                  INTEGER REFERENCES departments(id),
      품목명                   TEXT,
      구매구분                 VARCHAR(20),
      물품금액                 BIGINT DEFAULT 0,
      중소기업제품             VARCHAR(1) DEFAULT 'N',
      여성기업제품             VARCHAR(1) DEFAULT 'N',
      사회적기업               VARCHAR(1) DEFAULT 'N',
      사회적협동조합제품여부   VARCHAR(1) DEFAULT 'N',
      장애인구매               VARCHAR(1) DEFAULT 'N',
      장애인표준사업장여부     VARCHAR(1) DEFAULT 'N',
      중증장애인제품           VARCHAR(1) DEFAULT 'N',
      창업기업제품             VARCHAR(1) DEFAULT 'N',
      친환경제품               VARCHAR(1) DEFAULT 'N',
      자활용사촌제품           VARCHAR(1) DEFAULT 'N',
      시범구매여부             VARCHAR(1) DEFAULT 'N',
      혁신제품여부             VARCHAR(1) DEFAULT 'N',
      기술개발제품대상품목조회 VARCHAR(20) DEFAULT 'N',
      신제품인증NEP여부        VARCHAR(1) DEFAULT 'N',
      신제품인증NEP대상품목    VARCHAR(50) DEFAULT 'N',
      메모                     TEXT,
      제외여부                 INTEGER DEFAULT 0,
      집행구분                 VARCHAR(1) DEFAULT 'Y',
      created_at               TIMESTAMP DEFAULT NOW(),
      updated_at               TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendors (
      id           SERIAL PRIMARY KEY,
      사업자번호   VARCHAR(20) NOT NULL,
      업체명       VARCHAR(200),
      인증종류     VARCHAR(50),
      취급품목     TEXT,
      만료일자     DATE,
      취소일자     DATE,
      상태         VARCHAR(20) DEFAULT '유효',
      데이터기준일 DATE,
      created_at   TIMESTAMP DEFAULT NOW(),
      updated_at   TIMESTAMP DEFAULT NOW(),
      UNIQUE(사업자번호, 인증종류)
    )
  `);
}

module.exports = { pool, initDB };
