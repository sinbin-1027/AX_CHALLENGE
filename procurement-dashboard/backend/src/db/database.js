const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '../../procurement.db'));

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

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
