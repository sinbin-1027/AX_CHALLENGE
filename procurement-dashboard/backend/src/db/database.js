const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '../../procurement.db'));

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

// raw_purchases 누락 컬럼 마이그레이션 (이미 있으면 무시)
['발의일자 TEXT', '수령인사업자명 TEXT', '발주품목명 TEXT'].forEach(col => {
  try { db.exec(`ALTER TABLE raw_purchases ADD COLUMN ${col}`); } catch {}
});

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    department  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS uploads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    filename    TEXT    NOT NULL,
    raw_data    TEXT    NOT NULL,
    uploaded_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

// ── 구매 실적 관련 테이블 ─────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS raw_purchases (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    결의번호                    TEXT    UNIQUE,
    user_id                     INTEGER,
    구매구분                    TEXT,
    채주지급금액                REAL,
    물품금액                    REAL,
    적요                        TEXT,
    부서명                      TEXT,
    중소기업제품                TEXT,
    여성기업제품                TEXT,
    사회적기업                  TEXT,
    사회적협동조합제품여부      TEXT,
    장애인구매                  TEXT,
    장애인표준사업장여부        TEXT,
    중증장애인제품              TEXT,
    창업기업제품                TEXT,
    친환경제품                  TEXT,
    자활용사촌제품              TEXT,
    시범구매여부                TEXT,
    기술개발제품대상품목조회    TEXT,
    신제품인증NEP여부           TEXT,
    신제품인증NEP대상품목       TEXT,
    혁신제품여부                TEXT,
    uploaded_at                 TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS deleted_numbers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    결의번호    TEXT    NOT NULL UNIQUE,
    user_id     INTEGER,
    삭제사유    TEXT,
    deleted_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS purchase_adjustments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    결의번호    TEXT    NOT NULL,
    user_id     INTEGER,
    컬럼명      TEXT    NOT NULL,
    원본값      TEXT,
    수정값      TEXT,
    adjusted_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS manual_purchases (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                     INTEGER,
    품목명                      TEXT,
    구매구분                    TEXT,
    금액                        REAL,
    중소기업제품                TEXT    NOT NULL DEFAULT 'N',
    여성기업제품                TEXT    NOT NULL DEFAULT 'N',
    사회적기업                  TEXT    NOT NULL DEFAULT 'N',
    사회적협동조합제품여부      TEXT    NOT NULL DEFAULT 'N',
    장애인구매                  TEXT    NOT NULL DEFAULT 'N',
    장애인표준사업장여부        TEXT    NOT NULL DEFAULT 'N',
    중증장애인제품              TEXT    NOT NULL DEFAULT 'N',
    창업기업제품                TEXT    NOT NULL DEFAULT 'N',
    친환경제품                  TEXT    NOT NULL DEFAULT 'N',
    자활용사촌제품              TEXT    NOT NULL DEFAULT 'N',
    시범구매여부                TEXT    NOT NULL DEFAULT 'N',
    기술개발제품대상품목조회    TEXT    NOT NULL DEFAULT 'N',
    신제품인증NEP여부           TEXT    NOT NULL DEFAULT 'N',
    신제품인증NEP대상품목       TEXT    NOT NULL DEFAULT 'N',
    혁신제품여부                TEXT    NOT NULL DEFAULT 'N',
    집행구분                    TEXT    NOT NULL DEFAULT 'Y',
    메모                        TEXT,
    created_at                  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at                  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

// ── 업체 인증 테이블 ──────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS vendors (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    사업자번호         TEXT    NOT NULL UNIQUE,
    업체명            TEXT    NOT NULL,
    취급품목          TEXT,
    인증_중소기업      INTEGER NOT NULL DEFAULT 0,
    인증_여성          INTEGER NOT NULL DEFAULT 0,
    인증_창업          INTEGER NOT NULL DEFAULT 0,
    인증_장애인        INTEGER NOT NULL DEFAULT 0,
    인증_중증장애인    INTEGER NOT NULL DEFAULT 0,
    인증_표준사업장    INTEGER NOT NULL DEFAULT 0,
    인증_사회적기업    INTEGER NOT NULL DEFAULT 0,
    인증_협동조합      INTEGER NOT NULL DEFAULT 0,
    인증_녹색          INTEGER NOT NULL DEFAULT 0,
    인증_자활용사촌    INTEGER NOT NULL DEFAULT 0,
    인증_시범구매      INTEGER NOT NULL DEFAULT 0,
    인증_기술개발      INTEGER NOT NULL DEFAULT 0,
    인증_NEP           INTEGER NOT NULL DEFAULT 0,
    인증_혁신제품      INTEGER NOT NULL DEFAULT 0,
    인증수            INTEGER NOT NULL DEFAULT 0,
    데이터기준일      TEXT,
    updated_at        TEXT
  )
`);

module.exports = db;
