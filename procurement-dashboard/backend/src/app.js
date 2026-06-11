require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const authRoute    = require('./routes/auth');
const dataRoute    = require('./routes/data');
const vendorsRoute = require('./routes/vendors');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth',    authRoute);
app.use('/api/data',    dataRoute);
app.use('/api/vendors', vendorsRoute);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
