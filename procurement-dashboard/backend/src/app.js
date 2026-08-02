require('dotenv').config();

const express        = require('express');
const cors           = require('cors');
const path           = require('path');
const { initDB }     = require('./db/database');
const ipWhitelist       = require('./middleware/ipWhitelist');
const authRoute        = require('./routes/auth');
const dataRoute        = require('./routes/data');
const vendorsRoute     = require('./routes/vendors');
const purchasesRoute   = require('./routes/purchases');
const departmentsRoute = require('./routes/departments');
const budgetRoute       = require('./routes/budget');
const uploadsRoute      = require('./routes/uploads');
const guidesRoute       = require('./routes/guides');
const yearsRoute        = require('./routes/years');

const app  = express();
const PORT = process.env.PORT || 4000;

// Elice Cloud 터널(리버스 프록시)을 거치므로 X-Forwarded-For 기준으로 실제 클라이언트 IP를 인식
app.set('trust proxy', true);

// IP 화이트리스트 (ENABLE_IP_WHITELIST=true일 때만 동작) — 정적 파일/로그인 페이지 포함 전체 앱 최상단에 적용
app.use(ipWhitelist);

app.use(cors({
  origin: [
    'https://ax-challenge-murex.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}))
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth',        authRoute);
app.use('/api/data',        dataRoute);
app.use('/api/vendors',     vendorsRoute);
app.use('/api/purchases',   purchasesRoute);
app.use('/api/departments', departmentsRoute);
app.use('/api/budget',      budgetRoute);
app.use('/api/uploads',     uploadsRoute);
app.use('/api/guides',      guidesRoute);
app.use('/api/years',       yearsRoute);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// React 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../../build')));

// React Router 처리
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build', 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: '서버 오류가 발생했습니다.' });
});

initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('DB 초기화 실패:', err);
    process.exit(1);
  });
