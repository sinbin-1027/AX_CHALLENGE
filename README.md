# KOSME 전략적 예산관리 시스템

> 공공기관 부서별 공공구매 실적을 실시간으로 관리하고, 지표 달성을 시뮬레이션하는 웹 대시보드

---

## 📌 배경 및 목적

공공기관은 부서별로 배정된 예산 내에서 **공공구매 실적 지표**를 의무적으로 달성해야 한다.
현재는 각 담당자가 엑셀로 수동 관리하고 있어 아래 문제가 발생한다:

- 연말에 실적 달성을 위한 불필요한 물품 구매
- 갑작스러운 지출 변경 시 계획 재수립 어려움
- 지표별 달성 현황을 실시간으로 파악하기 어려움

이 시스템은 내부 시스템에서 추출한 **RAW 엑셀 데이터**를 업로드하면 지표를 자동 계산하고 시각화한다.

---

## 🎯 주요 기능

### 1. 종합현황 대시보드
- KPI 카드 (총구매액, 공공구매 목표액, 지출액, 지표달성률, 점수)
- 유형별 목표 대비 달성률 차트
- 목표대비 상세현황 테이블
- 지표별 부족금액 Top5
- 달성/미달성 지표 현황

### 2. 공공구매 관리
- **지표 현황**: 직군별 지표 카드 형태로 목표액/지출액/달성률 표시
- **지표별 실적 상세**: 지표 선택 → 해당 지출결의 내역 조회
- **실적 등록**: 엑셀 업로드 + 수기 입력, 모수 제외, 행 수정/삭제
- **공공구매 시뮬레이션**: 구매 예정 금액/유형 입력 → 점수 변화 실시간 확인
- **인증 보유 업체 검색**: 미달성 지표 기반 업체 추천, 16만건 인증 데이터

### 3. 예산관리 (준비중)
- 예산 배정 현황
- 예산 집행 현황
- 집행 추이 분석

### 4. 데이터 관리
- 업로드 기록 (준비중)
- 인증 보유 업체 관리 (16만건)

---

## 📊 공공구매 지표 구조

### 직군별 점수 산식

| 직군 | 산식 | 총배점 | 최종점수 |
|------|------|--------|---------|
| 기획관리 | 4X/9.5 | 9.5점 | 4점 |
| 사업 | 4X/9.5 | 9.5점 | 4점 |
| 금융업무지원 | 5X/10 | 10점 | 5점 |
| 지역본지부 | 4X/10 | 10점 | 4점 |
| 연수 | 4X/10 | 10점 | 4점 |
| 특화기능 | 3X/10 | 10점 | 3점 |

### 지표별 산식 (기획관리/사업 기준)

| 항목 | 분모 | 목표% | 배점 |
|------|------|-------|------|
| 중소기업 | 총구매액(물품+용역+공사) | 80% | 1.0 |
| 창업기업 | 총구매액 | 15% | 0.5 |
| 여성기업(물품) | 물품 구매액 | 5% | 0.5 |
| 여성기업(용역) | 용역 구매액 | 5% | 0.5 |
| 여성기업(공사) | 공사 구매액 | 3% | 0.5 * |
| 사회적기업 | 물품+용역 | 5% | 0.7 |
| 사회적협동조합 | 물품+용역 | 0.1% | 0.3 |
| 장애인기업 | 총구매액 | 1% | 0.5 |
| 장애인표준사업장 | 물품+용역 | 0.8% | 0.5 |
| 중증장애인 | 물품+용역 | 1.1% | 0.5 |
| 기술개발제품 | 중소기업 물품 | 20% | 0.5 |
| 시범구매 | 중소기업 물품 | 1.5% | 0.3 |
| NEP | NEP 대상품목 | 20% | 0.2 ** |
| 녹색제품 | 별도 목표액 | - | 1.0 |
| 자활용사촌 | 별도 목표액 | - | 1.0 |
| 온누리상품권 | 부서인원(11월말)×250,000원 | 100% | 1.0 |

> * 여성기업(공사): 공사 실적 없는 부서는 자동 만점
> ** NEP: 대상품목 구매 없으면 자동 만점
> ※ 특화기능 직군: 창업기업/사회적기업/온누리상품권 3개 지표만 적용

---

## 🏗️ 프로젝트 구조

```
AX_CHALLENGE/
├── procurement-dashboard/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── VendorList.jsx
│   │   │   └── VendorRecommend.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DetailsPage.jsx
│   │   │   ├── IndicatorStatusPage.jsx
│   │   │   ├── IndicatorDetailPage.jsx
│   │   │   └── SimulationPage.jsx
│   │   ├── utils/
│   │   │   └── calcEngine.js
│   │   └── App.js
│   └── backend/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.js
│       │   │   ├── purchases.js
│       │   │   ├── vendors.js
│       │   │   └── departments.js
│       │   ├── middleware/
│       │   │   └── auth.js
│       │   └── db/
│       │       └── database.js
│       └── .env
```

---

## ⚙️ 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React |
| 차트 | Recharts |
| 엑셀 파싱 | xlsx (SheetJS) |
| 백엔드 | Node.js + Express |
| DB | PostgreSQL |
| 인증 | JWT |
| 배포 | 앨리스클라우드 VM |

---

## 🚀 로컬 실행 방법

### DB 설정 (PostgreSQL)
```sql
CREATE DATABASE procurement;
CREATE USER procuser WITH PASSWORD 'proc1234';
GRANT ALL PRIVILEGES ON DATABASE procurement TO procuser;
\c procurement
GRANT ALL ON SCHEMA public TO procuser;
```

### 백엔드 실행
```bash
cd procurement-dashboard/backend
npm install
npm run dev
```

### backend/.env
```
DATABASE_URL=postgresql://procuser:proc1234@localhost:5432/procurement
PORT=4001
JWT_SECRET=procurement_secret_key
NODE_ENV=development
```

### 프론트엔드 실행
```bash
cd procurement-dashboard
npm install
npm start
```

### 접속
```
http://localhost:3000
ID: guest / PW: guest1234
```

---

## 🌐 배포 (앨리스클라우드)

### 서버 시작
```bash
sudo service postgresql start
cd /home/elicer/AX_CHALLENGE/procurement-dashboard
npm run build
cd backend
pm2 start src/app.js --name procurement-backend
pm2 save
```

### 접속 URL
```
https://gdtsdahcxamdadzn.tunnel.elice.io
ID: guest / PW: guest1234
```

---

## 🌿 브랜치 전략

```
main                  ← 배포 브랜치
develop               ← 통합 브랜치
feature/[기능명]      ← 기능 개발 브랜치
```

---

## 🔐 보안 참고사항

- JWT 토큰은 localStorage에 저장 (테스트 버전)
- 운영 전환 시 httpOnly 쿠키 방식으로 변경 권장
- 현재 guest 계정 하드코딩 → 운영 시 DB 기반 계정 관리로 전환 필요
