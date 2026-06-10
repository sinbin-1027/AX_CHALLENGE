# 공공구매 실적 대시보드

공공기관 공공구매 실적을 엑셀 파일로 업로드하면 지표별 달성률과 점수를 자동 계산하는 웹 대시보드입니다.

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React 19, React Router v7, Recharts |
| 계산 엔진 | 순수 JS (xlsx 파싱) |
| 백엔드 | Node.js + Express |
| 데이터베이스 | SQLite (`node:sqlite` 내장 모듈) |
| 인증 | JWT (jsonwebtoken + bcryptjs) |

---

## 프로젝트 구조

```
procurement-dashboard/
├── backend/
│   ├── src/
│   │   ├── app.js               # Express 진입점 (포트 4001)
│   │   ├── db/database.js       # SQLite 연결 및 테이블 초기화
│   │   ├── middleware/auth.js   # JWT 인증 미들웨어
│   │   └── routes/
│   │       ├── auth.js          # 회원가입 / 로그인
│   │       └── data.js          # 엑셀 데이터 저장 / 조회
│   ├── .env                     # 환경변수 (git 제외)
│   └── package.json
│
├── scripts/
│   ├── checkHeaders.js          # 엑셀 헤더 컬럼명 확인
│   └── checkData.js             # 엑셀 데이터 샘플 확인
│
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx        # 메인 대시보드 UI
│   │   ├── FileUpload.jsx       # 엑셀 드래그앤드롭 업로드
│   │   └── Sidebar.jsx          # 좌측 네비게이션
│   ├── data/
│   │   └── targets.js           # 지표별 목표 설정값 및 계산 헬퍼
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── DetailsPage.jsx      # 지출 내역 + 수동 행 추가
│   ├── utils/
│   │   ├── calcEngine.js        # 공공구매 실적 계산 엔진
│   │   └── calcEngine.test.js   # 터미널 계산 테스트 스크립트
│   └── App.js                   # 라우팅 및 전역 상태
│
└── test_raw.xlsx                # 테스트용 엑셀 파일
```

---

## 시작하기

### 1. 의존성 설치

```bash
# 프론트엔드 (루트)
npm install

# 백엔드
cd backend && npm install
```

### 2. 환경변수 설정

`backend/.env` 파일 생성 (팀원 공유 필요, git 제외):

```
JWT_SECRET=procurement_secret_key
PORT=4001
```

### 3. 실행

```bash
# 터미널 1 — 백엔드
cd backend && npm run dev

# 터미널 2 — 프론트엔드 (루트에서)
npm start
```

브라우저 `http://localhost:3000` 접속

---

## 엑셀 파일 형식

- 확장자: `.xlsx`
- 시트명: `RAW` (고정)
- 첫 행: 헤더

### 주요 컬럼

| 컬럼명 | 설명 |
|---|---|
| 구매구분 | 물품 / 용역 / 공사 / 온누리상품권 |
| 물품금액 | 실제 지출액 (숫자, Q열 기준) |
| 중소기업제품(연동) | Y/N |
| 여성기업제품(연동) | Y/N |
| 사회적기업 | Y/N |
| 사회적협동조합제품여부 | Y/N |
| 장애인구매(연동) | Y/N |
| 장애인표준사업장여부 | Y/N |
| 중증장애인제품 | Y/N |
| 창업기업제품 | Y/N |
| 친환경제품 | Y/N |
| 자활용사촌제품 | Y/N |
| 시범구매여부 | Y/N |
| 기술개발제품대상품목조회 | 비어있지 않은 값이면 해당 |
| 신제품인증(NEP)여부 | Y/N |
| 신제품인증(NEP) 대상품목 | 해당없음·해당사항없음 외의 값이면 대상 |

---

## 계산 엔진

### 기준금액 집계

| 변수 | 조건 |
|---|---|
| 총구매액 | 온누리상품권 제외 전체 |
| 물품구매액 | 구매구분 = 물품 |
| 용역구매액 | 구매구분 = 용역 |
| 공사구매액 | 구매구분 = 공사 |
| 중소기업물품구매액 | 물품 AND 중소기업=Y |
| NEP대상품목구매액 | 신제품인증(NEP) 대상품목 ≠ 해당없음 |

### 16개 지표

| 지표 | 분모 | 목표 | 배점 |
|---|---|---|---|
| 중소기업 | 총구매액 | 80% | 1.0 |
| 창업기업 | 총구매액 | 15% | 0.5 |
| 여성기업(물품) | 물품구매액 | 5% | 0.5 |
| 여성기업(용역) | 용역구매액 | 5% | 0.5 |
| 여성기업(공사) | 공사구매액 | 3% | 0.5 |
| 사회적기업 | 물품+용역 | 5% | 0.7 |
| 협동조합 | 물품+용역 | 0.1% | 0.3 |
| 장애인기업 | 총구매액 | 1% | 0.5 |
| 표준사업장 | 물품+용역 | 0.8% | 0.5 |
| 중증장애인 | 물품+용역 | 1.1% | 0.5 |
| 기술개발제품 | 중소기업물품 | 20% | 0.5 |
| 시범구매 | 중소기업물품 | 1.5% | 0.3 |
| NEP | NEP대상품목 | 20% | 0.2 |
| 녹색제품 | 고정 목표액 | 2,247,000원 | 1.0 |
| 자활용사촌 | 고정 목표액 | 1,420,000원 | 1.0 |
| 온누리상품권 | 인원 × 단가 | 14명 × 250,000원 | 1.0 |

**총 배점 9.5점 → 최종 점수 = 4 × 달성배점합계 / 9.5**

### 특이 규칙

- 공사구매액 = 0 이면 여성기업(공사) 자동 만점
- NEP대상품목구매액 = 0 이면 NEP 자동 만점
- 점수는 목표 100% 달성 시 만점, 미달 시 0점 (부분점수 없음)

---

## API

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/auth/register` | 회원가입 | 불필요 |
| POST | `/api/auth/login` | 로그인 → JWT 반환 | 불필요 |
| POST | `/api/data/upload` | 엑셀 rows 저장 | 필요 |
| GET | `/api/data/latest` | 최신 업로드 데이터 조회 | 필요 |
| GET | `/health` | 서버 상태 확인 | 불필요 |

인증 헤더: `Authorization: Bearer <토큰>`

### DB 스키마

```sql
users   (id, username, password, department, created_at)
uploads (id, user_id, filename, raw_data, uploaded_at)
```

---

## 화면 구성

### 사이드바

| 메뉴 | 경로 | 설명 |
|---|---|---|
| 📊 대시보드 | `/` | KPI·차트·순위 |
| 📋 지출 내역 | `/details` | 전체 행 테이블 + 수동 입력 |

### 대시보드 (`/`)

- **KPI 카드 5개**: 총구매액(클릭 시 상세 모달) / 공공구매실적액 / 목표액합산 / 달성지표수 / 최종점수
- **가로 바차트**: 16개 지표 달성률, 100% 빨간 점선 목표선
- **상세 현황 테이블**: 목표액 · 실적액 · 달성률 · 달성여부
- **우수 지표 TOP3 / 개선 필요 TOP3**

### 지출 내역 (`/details`)

- 업로드된 전체 행 테이블
- **행 추가 폼**: 기본정보(발의일자·구매구분·부서명·거래처·품목명·금액) + 구매유형 플래그 체크박스 14개
- 직접 입력 행은 노란 배경 표시, 삭제 가능
- 행 추가 시 대시보드 점수 자동 재계산

---

## 개발 스크립트

```bash
# 엑셀 헤더 컬럼명 전체 출력
node scripts/checkHeaders.js

# 첫 3개 행 실제 데이터 확인
node scripts/checkData.js

# 계산 엔진 결과 터미널 출력
npm run test:calc
```

---

## 팀원 온보딩

```bash
git fetch origin
git checkout develop
git pull origin develop
npm install
cd backend && npm install
```

`backend/.env` 파일을 팀장에게 별도 수령 후 생성하세요.

---

## 주요 설정값 변경

`src/App.js` 상단 `OVERRIDES` 수정:

```js
const OVERRIDES = {
  headcount: 14,              // 온누리상품권 계산 인원수
  fixedTargets: {
    green_product: 2247000,   // 녹색제품 목표액
    jawal_veteran: 1420000,   // 자활용사촌 목표액
  },
};
```

지표 목표 비율·배점 변경은 `src/data/targets.js`의 `TARGETS` 배열을 수정합니다.
