require('dotenv').config();

const express        = require('express');
const cors           = require('cors');
const session        = require('express-session');
const { initDB }     = require('./db/database');
const authRoute        = require('./routes/auth');
const dataRoute        = require('./routes/data');
const vendorsRoute     = require('./routes/vendors');
const purchasesRoute   = require('./routes/purchases');
const departmentsRoute = require('./routes/departments');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: [
    'https://ax-challenge-murex.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}))
app.use(express.json({ limit: '50mb' }));
app.use(session({
  secret:            'procurement_session_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,  // 24시간
  },
}));

app.use('/api/auth',        authRoute);
app.use('/api/data',        dataRoute);
app.use('/api/vendors',     vendorsRoute);
app.use('/api/purchases',   purchasesRoute);
app.use('/api/departments', departmentsRoute);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

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
