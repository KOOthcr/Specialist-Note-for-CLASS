require('dotenv').config();
const express = require('express');
const cors = require('cors');

// 라우터 가져오기
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json()); // JSON Payload 파싱

// API 라우팅
app.use('/api/auth', authRoutes);

// 기본 헬스체크 라우트
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Specialist Note Server is running!' });
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Server starting on: http://localhost:${PORT}`);
  console.log(`Client URL Allowed: ${process.env.CLIENT_URL}`);
  console.log(`===============================================`);
});
