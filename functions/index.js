const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 라우터 가져오기
const authRoutes = require('./src/routes/authRoutes');

const app = express();

// 미들웨어
app.use(cors({ origin: true }));
app.use(express.json());

// API 라우팅
app.use('/auth', authRoutes);

// 기본 헬스체크
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Specialist Note API is running on Firebase Functions!' });
});

// Firebase Functions로 익스포트
exports.api = functions.https.onRequest(app);
